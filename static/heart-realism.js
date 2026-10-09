/* HeartRealism: display-only look for the Heart Function Lab heart (muscle colour, epicardial fat along the coronary grooves,
   outward lift for the surface arteries, great-vessel colours and framing). Pure browser + Node module: no THREE, no DOM, no physics.
   Schematic teaching visuals, not patient anatomy. Positions of the great vessels live in static/models/heart_function_mesh.json. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.HeartRealism=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const MUSCLE={v:[0.60,0.19,0.18],a:[0.50,0.19,0.26]},FAT=[0.88,0.70,0.32];
  const FAT_NEAR=0.0035,FAT_FAR=0.0095;                 /* metres: full fat within 3.5 mm of a groove path, none beyond 9.5 mm */
  const ARTERY_HEX=0xcf2f3a,GV_HEX={artery:0xc8504c,vein_deoxy:0x5d78b8,vein_oxy:0xc8504c,artery_deoxy:0x5d78b8};
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
  /* cheap deterministic value noise from a position: 0..1 */
  function hash(x,y,z){const s=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;return s-Math.floor(s)}
  function noise(x,y,z){  /* two octaves, ~5 mm and ~2 mm cells */
    const f=(k)=>{const X=x*k,Y=y*k,Z=z*k;return hash(Math.floor(X),Math.floor(Y),Math.floor(Z))};
    return 0.65*f(200)+0.35*f(520);
  }
  /* pos: Float32Array xyz (mesh metres); groove: Float32Array xyz points along the three coronary paths; kind 'v' ventricle / 'a' atrium.
     Returns a Float32Array of vertex colours. Fat sits along the grooves with a ragged edge; muscle gets a slight mottle. */
  function paintVertices(pos,groove,kind){
    const n=pos.length/3,out=new Float32Array(n*3),base=MUSCLE[kind==='a'?'a':'v'],g=groove?groove.length/3:0,near2=FAT_FAR*FAT_FAR;
    for(let i=0;i<n;i++){
      const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];let best=near2;
      for(let j=0;j<g;j++){const dx=groove[j*3]-x,dy=groove[j*3+1]-y,dz=groove[j*3+2]-z,d=dx*dx+dy*dy+dz*dz;if(d<best)best=d}
      const nz=noise(x,y,z),dist=Math.sqrt(best),w=best<near2?smooth(FAT_FAR,FAT_NEAR,dist)*clamp(0.55+nz*0.9,0,1)*0.88:0,m=0.93+0.14*nz;
      for(let c=0;c<3;c++)out[i*3+c]=clamp((base[c]*m)*(1-w)+FAT[c]*w*(0.9+0.2*nz),0,1);
    }
    return out;
  }
  /* push path points outward from a centre so the artery sits ON the surface instead of half buried */
  function lift(points,centre,amount){
    return points.map(p=>{const d=[p[0]-centre[0],p[1]-centre[1],p[2]-centre[2]],l=Math.hypot(d[0],d[1],d[2])||1;return [p[0]+d[0]/l*amount,p[1]+d[1]/l*amount,p[2]+d[2]/l*amount]});
  }
  function gvHex(kind){return GV_HEX[kind]!=null?GV_HEX[kind]:GV_HEX.artery}
  /* bounding box [min,max] of the great-vessel paths including their radii */
  function gvBox(gv){
    const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
    Object.keys(gv||{}).forEach(k=>gv[k].points.forEach(p=>{for(let c=0;c<3;c++){lo[c]=Math.min(lo[c],p[c]-gv[k].radius);hi[c]=Math.max(hi[c],p[c]+gv[k].radius)}}));
    return {lo,hi};
  }

  /* ---------- Phase 2: ventricular wall motion (radial shortening + thickening), display only ----------
     Per vertex, in mesh metres: d = uSys * (1 - kLocal) * aThick * AMP * (n - KRAD * aRad)
       n      = outward surface normal of the wall solid (endocardium faces the cavity, so it moves INTO the cavity; epicardium moves out)
       aRad   = unit vector from the long axis P + h u to the vertex (outward from the axis); the -KRAD * aRad term is the extra radial shortening
       aThick = 0..1 axial taper: 1 mid-wall, 0 at the base ring and at the apex
       kLocal = the weak-territory term of the ischaemia shader (0 = healthy, 1 = no squeeze), so a weak wall thickens less.
     uSys = 0 gives d = 0 exactly. The amplitude is exaggerated for visibility and is capped by the measured clearance to the blood
     (tests/test_wall_motion.js, tests/test_chamber_containment.js). Schematic, not patient-specific. */
  const KRAD=0.5;            /* extra radial shortening, as a fraction of the thickening amplitude */
  const AMP_REQUESTED_M=0.0030;   /* wanted: 3.0 mm (endocardium moves in up to 1.5 x this, the wall gets up to 2 x this thicker) */
  const AMP_LIMIT_M=0.0020;       /* BAKED from tests/test_wall_motion.js: the exact-mesh search keeps every ventricular blood sample clear of the displaced wall up to about 2.5 mm; 2.0 mm leaves a safety margin of about 20% */
  const capAmp=(requested,limit)=>Math.max(0,Math.min(requested,limit));
  const WALL_AMP_M=capAmp(AMP_REQUESTED_M,AMP_LIMIT_M);
  const INWARD_FACTOR=1+KRAD;     /* largest endocardial move per unit of amplitude (normal and radial terms point the same way there) */
  /* axial taper: t = 0 at the base ring, 1 at the apex; 1 at mid-wall, exactly 0 at both ends and outside */
  function thickWeight(t){return !(t>0&&t<1)?0:Math.sin(Math.PI*t)}
  /* axial extent (h = (p - P) . u) over several position arrays, so all three ventricular meshes share one taper */
  function axialRange(arrays,P,u){
    let lo=Infinity,hi=-Infinity;
    for(const a of arrays)for(let i=0;i<a.length;i+=3){const h=(a[i]-P[0])*u[0]+(a[i+1]-P[1])*u[1]+(a[i+2]-P[2])*u[2];if(h<lo)lo=h;if(h>hi)hi=h}
    return {lo,hi};
  }
  /* once per mesh: aRad (Float32Array n*3) and aThick (Float32Array n). u must be a unit vector. */
  function wallAttributes(pos,P,u,range){
    const n=pos.length/3,aRad=new Float32Array(n*3),aThick=new Float32Array(n),span=range.hi-range.lo||1;
    for(let i=0;i<n;i++){
      const dx=pos[i*3]-P[0],dy=pos[i*3+1]-P[1],dz=pos[i*3+2]-P[2],h=dx*u[0]+dy*u[1]+dz*u[2];
      const rx=dx-h*u[0],ry=dy-h*u[1],rz=dz-h*u[2],l=Math.hypot(rx,ry,rz);
      if(l>1e-9){aRad[i*3]=rx/l;aRad[i*3+1]=ry/l;aRad[i*3+2]=rz/l}
      aThick[i]=thickWeight((h-range.lo)/span);
    }
    return {aRad,aThick};
  }
  /* the vertex-shader formula in plain maths (the page injects the same expression). out: [x,y,z], allocation-free when passed. */
  function wallDisplacement(nx,ny,nz,rx,ry,rz,thick,sys,kLocal,amp,out){
    const o=out||[0,0,0],w=clamp(sys,0,1)*(1-clamp(kLocal,0,1))*clamp(thick,0,1)*amp;
    o[0]=w*(nx-KRAD*rx);o[1]=w*(ny-KRAD*ry);o[2]=w*(nz-KRAD*rz);return o;
  }
  /* largest amplitude that keeps the endocardium clear of a blood sample: margin = distance(sample, wall) - tolerance, w = taper weight at the nearest wall point */
  function ampLimit(margins){let a=Infinity;for(const m of margins){const w=Math.max(m.weight,1e-6);a=Math.min(a,Math.max(0,m.margin)/(INWARD_FACTOR*w))}return a}

  /* ---------- camera fit (display only): home distance from the projected extents of the heart + great vessels ----------
     pts: Float32Array/Array of [x,y,z,r] in WORLD units (r = tube radius, 0 for wall vertices). Camera on the sphere (th, ph) around the origin,
     looking at the origin, vertical field of view fovDeg, aspect = width/height. Returns NDC extents (-1..1 is the frame). */
  function projectExtents(pts,th,ph,rad,fovDeg,aspect,off){
    const cx=rad*Math.sin(ph)*Math.sin(th),cy=rad*Math.cos(ph),cz=rad*Math.sin(ph)*Math.cos(th),fl=rad||1,f0=-cx/fl,f1=-cy/fl,f2=-cz/fl;
    let r0=f1*0-f2*1,r1=f2*0-f0*0,r2=f0*1-f1*0;const rl=Math.hypot(r0,r1,r2)||1;r0/=rl;r1/=rl;r2/=rl;
    const u0=r1*f2-r2*f1,u1=r2*f0-r0*f2,u2=r0*f1-r1*f0,th2=Math.tan(fovDeg*Math.PI/360),ox=off?off[0]:0,oy=off?off[1]:0,oz=off?off[2]:0;
    let mnX=Infinity,MxX=-Infinity,mnY=Infinity,MxY=-Infinity;
    for(let i=0;i<pts.length;i+=4){
      const dx=pts[i]+ox-cx,dy=pts[i+1]+oy-cy,dz=pts[i+2]+oz-cz,z=dx*f0+dy*f1+dz*f2;if(z<=0.05)continue;
      const x=(dx*r0+dy*r1+dz*r2)/(z*th2*aspect),y=(dx*u0+dy*u1+dz*u2)/(z*th2),m=pts[i+3]/(z*th2);
      if(x-m/aspect<mnX)mnX=x-m/aspect;if(x+m/aspect>MxX)MxX=x+m/aspect;if(y-m<mnY)mnY=y-m;if(y+m>MxY)MxY=y+m;
    }
    return {mnX,MxX,mnY,MxY};
  }
  /* distance + world shift so the whole shape is centred and fills `fill` (0..1) of the limiting axis */
  function fitCamera(pts,th,ph,fovDeg,aspect,fill,padBottom){
    fill=fill||0.94;padBottom=Math.max(0,Math.min(0.5,padBottom||0));const cyT=padBottom/2,fillY=fill*(1-padBottom/2);   /* padBottom (NDC): keep the bottom strip clear for the caption */
    let rad=7,off=[0,0,0];const th2=Math.tan(fovDeg*Math.PI/360);
    const sx=Math.sin(th),cxx=Math.cos(th),sp=Math.sin(ph),cp=Math.cos(ph);
    const f=[-sp*sx,-cp,-sp*cxx];let r=[-f[2],0,f[0]];const rl=Math.hypot(r[0],r[1],r[2])||1;r=r.map(v=>v/rl);
    const u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
    for(let it=0;it<8;it++){
      const e=projectExtents(pts,th,ph,rad,fovDeg,aspect,off),mx=(e.mnX+e.MxX)/2,my=(e.mnY+e.MxY)/2;
      /* centre: move the shape by -(centre) in camera right/up at the plane distance */
      const dx=-mx*rad*th2*aspect,dy=-(my-cyT)*rad*th2;for(let c=0;c<3;c++)off[c]+=dx*r[c]+dy*u[c];
      const e2=projectExtents(pts,th,ph,rad,fovDeg,aspect,off),hx=(e2.MxX-e2.mnX)/2,hy=(e2.MxY-e2.mnY)/2;
      rad=Math.max(2.5,Math.min(30,rad*Math.max(hx/fill,hy/fillY)));
    }
    return {rad,off,extents:projectExtents(pts,th,ph,rad,fovDeg,aspect,off)};
  }
  return {projectExtents,fitCamera,MUSCLE,FAT,ARTERY_HEX,paintVertices,lift,gvHex,gvBox,noise,KRAD,WALL_AMP_M,AMP_LIMIT_M,AMP_REQUESTED_M,INWARD_FACTOR,capAmp,thickWeight,axialRange,wallAttributes,wallDisplacement,ampLimit};
});
