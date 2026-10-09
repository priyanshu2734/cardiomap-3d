/* Test helper (Node only): the five wall solids of VH_M_Heart.glb as exact point-in-solid / distance queries.
   Used by test_heart_chambers.js and test_chamber_containment.js. Mesh metres, +x left, +y superior, +z anterior. */
const fs=require('fs');
const WALLS=['VH_M_heart_left_ventricle','VH_M_heart_right_ventricle','VH_M_left_cardiac_atrium','VH_M_right_cardiac_atrium','VH_M_interventricular_septum'];
function loadGlb(path){
  const b=fs.readFileSync(path),jl=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+jl).toString('utf8')),bin=b.slice(20+jl+8),out={};
  j.nodes.forEach(n=>{
    if(n.mesh==null)return;const prim=j.meshes[n.mesh].primitives[0],acc=j.accessors[prim.attributes.POSITION],bv=j.bufferViews[acc.bufferView],off=(bv.byteOffset||0)+(acc.byteOffset||0);
    const P=new Float64Array(acc.count*3);for(let i=0;i<P.length;i++)P[i]=bin.readFloatLE(off+i*4);
    const ia=j.accessors[prim.indices],ib=j.bufferViews[ia.bufferView],io=(ib.byteOffset||0)+(ia.byteOffset||0),I=new Uint32Array(ia.count);
    for(let i=0;i<ia.count;i++)I[i]=ia.componentType===5125?bin.readUInt32LE(io+i*4):ia.componentType===5123?bin.readUInt16LE(io+i*2):bin.readUInt8(io+i);
    out[n.name]={P,I};
  });
  return out;
}
const CELL=0.002;
/* axis ray caster: triangles binned by their bounding box projected along `ax` (0,1,2) */
function buildBins(P,I,ax){
  const u=(ax+1)%3,v=(ax+2)%3,bins=new Map(),nt=I.length/3;
  for(let t=0;t<nt;t++){
    const a=I[t*3],b=I[t*3+1],c=I[t*3+2];
    const u0=Math.min(P[a*3+u],P[b*3+u],P[c*3+u]),u1=Math.max(P[a*3+u],P[b*3+u],P[c*3+u]),v0=Math.min(P[a*3+v],P[b*3+v],P[c*3+v]),v1=Math.max(P[a*3+v],P[b*3+v],P[c*3+v]);
    for(let i=Math.floor(u0/CELL);i<=Math.floor(u1/CELL);i++)for(let k=Math.floor(v0/CELL);k<=Math.floor(v1/CELL);k++){const key=i*100003+k;let l=bins.get(key);if(!l){l=[];bins.set(key,l)}l.push(t)}
  }
  return {bins,u,v,ax};
}
/* number of crossings of the ray from p in direction +s along axis ax (s=+1/-1); origin is jittered by ~1e-7 m so edge hits count once */
function crossings(S,p,ax,s){
  const B=S.bins[ax],u=B.u,v=B.v,pu=p[u]+1.3e-7,pv=p[v]+0.7e-7,l=B.bins.get(Math.floor(pu/CELL)*100003+Math.floor(pv/CELL));if(!l)return 0;
  const P=S.P,I=S.I;let n=0;
  for(let q=0;q<l.length;q++){
    const t=l[q],a=I[t*3]*3,b=I[t*3+1]*3,c=I[t*3+2]*3;
    const au=P[a+u]-pu,av=P[a+v]-pv,bu=P[b+u]-pu,bv=P[b+v]-pv,cu=P[c+u]-pu,cv=P[c+v]-pv;
    const d1=au*bv-av*bu,d2=bu*cv-bv*cu,d3=cu*av-cv*au;
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)))continue;
    const den=d1+d2+d3;if(den===0)continue;
    const w0=d2/den,w1=d3/den,w2=d1/den,x=w0*P[a+ax]+w1*P[b+ax]+w2*P[c+ax];
    if(s>0?x>p[ax]:x<p[ax])n++;
  }
  return n;
}
function makeSolids(path){return makeSolidsFrom(loadGlb(path))}
/* g: {name: {P,I}} with P positions (xyz, metres) and I indices; lets a test build the solids from DISPLACED vertices */
function makeSolidsFrom(g){
  const solids=WALLS.map(n=>{const m=g[n],S={P:m.P,I:m.I,bins:[0,1,2].map(ax=>buildBins(m.P,m.I,ax))};return S});
  /* inside any wall solid? parity of +z crossings (exact for closed meshes) */
  function inside(p){for(let k=0;k<solids.length;k++)if(crossings(solids[k],p,2,1)%2===1)return true;return false}
  /* does the ray from p along axis ax, direction s, hit any wall solid? (only meaningful when p is outside every solid) */
  function hits(p,ax,s){for(let k=0;k<solids.length;k++)if(crossings(solids[k],p,ax,s)>0)return true;return false}
  /* exact distance from p to the nearest wall-solid surface (brute force; use for a few dozen points only) */
  function distance(p){
    let best=1e9;
    for(let k=0;k<solids.length;k++){const {P,I}=solids[k];for(let t=0;t<I.length;t+=3){const d=ptri(p,P,I[t]*3,I[t+1]*3,I[t+2]*3);if(d<best)best=d}}
    return Math.sqrt(best);
  }
  return {inside,hits,distance,solids};
}
/* squared distance from p to triangle (Ericson, Real-Time Collision Detection) */
function ptri(p,P,a,b,c){
  const ax=P[a],ay=P[a+1],az=P[a+2],abx=P[b]-ax,aby=P[b+1]-ay,abz=P[b+2]-az,acx=P[c]-ax,acy=P[c+1]-ay,acz=P[c+2]-az,apx=p[0]-ax,apy=p[1]-ay,apz=p[2]-az;
  const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;let x,y,z;
  const dd=(qx,qy,qz)=>{const X=p[0]-qx,Y=p[1]-qy,Z=p[2]-qz;return X*X+Y*Y+Z*Z};
  if(d1<=0&&d2<=0)return dd(ax,ay,az);
  const bpx=p[0]-P[b],bpy=p[1]-P[b+1],bpz=p[2]-P[b+2],d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
  if(d3>=0&&d4<=d3)return dd(P[b],P[b+1],P[b+2]);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return dd(ax+abx*v,ay+aby*v,az+abz*v)}
  const cpx=p[0]-P[c],cpy=p[1]-P[c+1],cpz=p[2]-P[c+2],d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
  if(d6>=0&&d5<=d6)return dd(P[c],P[c+1],P[c+2]);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return dd(ax+acx*w,ay+acy*w,az+acz*w)}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return dd(P[b]+(P[c]-P[b])*w,P[b+1]+(P[c+1]-P[b+1])*w,P[b+2]+(P[c+2]-P[b+2])*w)}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return dd(ax+abx*v+acx*w,ay+aby*v+acy*w,az+abz*v+acz*w);
}
/* centripetal Catmull-Rom through points (same parametrisation as THREE.CatmullRomCurve3(points,false,'centripetal')), sampled densely: array of [x,y,z] */
function centripetal(pts,per){
  const out=[],n=pts.length,d=(a,b)=>Math.pow(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),0.5);
  for(let i=0;i<n-1;i++){
    const p1=pts[i],p2=pts[i+1],p0=i>0?pts[i-1]:[2*p1[0]-p2[0],2*p1[1]-p2[1],2*p1[2]-p2[2]],p3=i<n-2?pts[i+2]:[2*p2[0]-p1[0],2*p2[1]-p1[1],2*p2[2]-p1[2]];
    let dt0=d(p0,p1),dt1=d(p1,p2),dt2=d(p2,p3);if(dt1<1e-4)dt1=1;if(dt0<1e-4)dt0=dt1;if(dt2<1e-4)dt2=dt1;
    for(let j=0;j<per;j++){
      const t=j/per,q=[0,0,0];
      for(let c=0;c<3;c++){
        let t1=(p1[c]-p0[c])/dt0-(p2[c]-p0[c])/(dt0+dt1)+(p2[c]-p1[c])/dt1,t2=(p2[c]-p1[c])/dt1-(p3[c]-p1[c])/(dt1+dt2)+(p3[c]-p2[c])/dt2;
        t1*=dt1;t2*=dt1;const c2=-3*p1[c]+3*p2[c]-2*t1-t2,c3=2*p1[c]-2*p2[c]+t1+t2;q[c]=p1[c]+t1*t+c2*t*t+c3*t*t*t;
      }
      out.push(q);
    }
  }
  out.push(pts[n-1].slice(0,3));return out;
}
function distToPolyline(p,poly){let best=1e9;for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],l2=abx*abx+aby*aby+abz*abz||1e-12;let t=((p[0]-a[0])*abx+(p[1]-a[1])*aby+(p[2]-a[2])*abz)/l2;t=Math.max(0,Math.min(1,t));const x=a[0]+abx*t-p[0],y=a[1]+aby*t-p[1],z=a[2]+abz*t-p[2],d=x*x+y*y+z*z;if(d<best)best=d}return Math.sqrt(best)}
/* area-weighted unit vertex normals from the triangle winding (outward for these closed solids; the GLB NORMAL attribute agrees on every vertex) */
function vertexNormals(P,I){
  const A=new Float64Array(P.length);
  for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3,e1x=P[b]-P[a],e1y=P[b+1]-P[a+1],e1z=P[b+2]-P[a+2],e2x=P[c]-P[a],e2y=P[c+1]-P[a+1],e2z=P[c+2]-P[a+2],nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x;
    for(const v of[a,b,c]){A[v]+=nx;A[v+1]+=ny;A[v+2]+=nz}}
  for(let i=0;i<A.length;i+=3){const l=Math.hypot(A[i],A[i+1],A[i+2])||1;A[i]/=l;A[i+1]/=l;A[i+2]/=l}
  return A;
}
module.exports={loadGlb,makeSolids,makeSolidsFrom,vertexNormals,centripetal,distToPolyline,WALLS};
