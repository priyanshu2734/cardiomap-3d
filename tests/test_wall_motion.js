/* Phase 2 wall motion: pure maths + real-mesh checks. Run: node tests/test_wall_motion.js
   Checks: bounded, zero at s=0, zero at base and apex, weak territory reduces it, never above the clearance limit measured on the exact mesh. */
const HR=require('../static/heart-realism.js'),C=require('../static/heart-chambers.js'),MS=require('./mesh_solids.js'),assert=require('assert');
const M=require('../static/models/heart_function_mesh.json'),ok=(c,m)=>assert(c,m),near=(a,b,e,m)=>ok(Math.abs(a-b)<=e,m+' ('+a+' vs '+b+')');
const AMP=HR.WALL_AMP_M;

/* ---- pure maths ---- */
ok(AMP>0&&AMP<=HR.AMP_LIMIT_M&&AMP<=HR.AMP_REQUESTED_M,'amplitude is capped by the baked clearance limit');
near(HR.capAmp(0.01,0.002),0.002,0,'capAmp caps');near(HR.capAmp(0.001,0.002),0.001,0,'capAmp keeps a smaller request');near(HR.capAmp(-1,0.002),0,0,'capAmp never negative');
near(HR.thickWeight(0),0,0,'taper zero at the base ring');near(HR.thickWeight(1),0,0,'taper zero at the apex');near(HR.thickWeight(-0.2),0,0,'taper zero outside');near(HR.thickWeight(1.3),0,0,'taper zero beyond');near(HR.thickWeight(0.5),1,1e-12,'taper 1 mid-wall');
for(let t=0;t<=1.0001;t+=0.01){const w=HR.thickWeight(t);ok(w>=0&&w<=1,'taper within 0..1 at '+t)}
const o=[0,0,0];
HR.wallDisplacement(0.3,-0.5,0.8,0.1,0.9,0.2,1,0,0,AMP,o);ok(o[0]===0&&o[1]===0&&o[2]===0,'zero displacement at s=0 (uSys = 0 reproduces today\'s look exactly)');
HR.wallDisplacement(0.3,-0.5,0.8,0.1,0.9,0.2,0,1,0,AMP,o);ok(o[0]===0&&o[1]===0&&o[2]===0,'zero displacement where aThick = 0 (base ring, apex)');
HR.wallDisplacement(0.3,-0.5,0.8,0.1,0.9,0.2,1,1,1,AMP,o);ok(o[0]===0&&o[1]===0&&o[2]===0,'zero displacement where the wall is fully weak (kLocal = 1)');
const mag=(s,k)=>{HR.wallDisplacement(0,0,-1,0,0,1,1,s,k,AMP,o);return Math.hypot(o[0],o[1],o[2])};
let prev=-1;for(let s=0;s<=1.0001;s+=0.05){const m=mag(s,0);ok(m>=prev-1e-15,'monotonic in s');prev=m}
prev=1e9;for(let k=0;k<=1.0001;k+=0.1){const m=mag(1,k);ok(m<=prev+1e-15,'monotonic decreasing in kLocal');prev=m}
near(mag(1,0.5),0.5*mag(1,0),1e-15,'kLocal = 0.5 halves the thickening');
near(mag(1,0),AMP*HR.INWARD_FACTOR,1e-12,'endocardium moves AMP x (1 + KRAD) at most');
/* out-of-range inputs are clamped, never amplified */
HR.wallDisplacement(0,0,-1,0,0,1,5,9,-3,AMP,o);ok(Math.hypot(o[0],o[1],o[2])<=AMP*HR.INWARD_FACTOR+1e-15,'clamped inputs stay bounded');
/* random unit vectors: |d| <= AMP*(1+KRAD) */
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,unit=()=>{const a=[rnd()-.5,rnd()-.5,rnd()-.5],l=Math.hypot(...a)||1;return a.map(x=>x/l)};
for(let i=0;i<5000;i++){const n=unit(),r=unit();HR.wallDisplacement(n[0],n[1],n[2],r[0],r[1],r[2],rnd(),rnd(),rnd(),AMP,o);ok(Math.hypot(o[0],o[1],o[2])<=AMP*HR.INWARD_FACTOR+1e-12,'bounded for random inputs')}
/* thickening: endo and epi surfaces move apart (outward normal moves the surface out, the endocardium faces the cavity) */
HR.wallDisplacement(0,0,-1,0,0,1,1,1,0,AMP,o);ok(o[2]<0,'endocardium (normal toward the axis) moves toward the axis');
HR.wallDisplacement(0,0,1,0,0,1,1,1,0,AMP,o);ok(o[2]>0&&o[2]<AMP,'epicardium moves out by less than the amplitude (net inward shortening vs the endocardium)');
ok((AMP*1.0)-(-AMP*HR.KRAD)>0,'wall gets thicker');
/* ampLimit */
near(HR.ampLimit([{margin:0.003,weight:1},{margin:0.006,weight:0.5}]),0.003/HR.INWARD_FACTOR,1e-12,'ampLimit takes the tightest sample');
near(HR.ampLimit([{margin:-1,weight:1}]),0,0,'no clearance gives zero amplitude');

/* ---- real mesh ---- */
const GLB=MS.loadGlb(__dirname+'/../static/models/VH_M_Heart.glb');
const VW=['VH_M_heart_left_ventricle','VH_M_heart_right_ventricle','VH_M_interventricular_septum'];
const an=M.animation,P=an.ventricle_pivot,ul=Math.hypot(...an.long_axis_unit),u=an.long_axis_unit.map(x=>x/ul),rg=HR.axialRange(VW.map(n=>GLB[n].P),P,u);
let zeroEnds=0,maxD=0,nV=0,minThick=1,maxThick=0;const att={};
VW.forEach(n=>{
  const Pp=GLB[n].P,at=HR.wallAttributes(Pp,P,u,rg),N=MS.vertexNormals(Pp,GLB[n].I);att[n]={at,N};
  for(let i=0;i<Pp.length/3;i++){nV++;
    const rl=Math.hypot(at.aRad[i*3],at.aRad[i*3+1],at.aRad[i*3+2]);ok(rl===0||Math.abs(rl-1)<1e-5,'aRad is a unit vector (or 0 on the axis)');
    const dx=Pp[i*3]-P[0],dy=Pp[i*3+1]-P[1],dz=Pp[i*3+2]-P[2],h=dx*u[0]+dy*u[1]+dz*u[2];ok(Math.abs(at.aRad[i*3]*u[0]+at.aRad[i*3+1]*u[1]+at.aRad[i*3+2]*u[2])<1e-5,'aRad is perpendicular to the long axis');
    const w=at.aThick[i];ok(w>=0&&w<=1,'aThick within 0..1');minThick=Math.min(minThick,w);maxThick=Math.max(maxThick,w);
    HR.wallDisplacement(N[i*3],N[i*3+1],N[i*3+2],at.aRad[i*3],at.aRad[i*3+1],at.aRad[i*3+2],w,1,0,AMP,o);const d=Math.hypot(o[0],o[1],o[2]);maxD=Math.max(maxD,d);
    ok(d<=AMP*HR.INWARD_FACTOR+1e-12,'vertex displacement bounded');
    if(h<=rg.lo+0.02*(rg.hi-rg.lo)||h>=rg.hi-0.02*(rg.hi-rg.lo)){ok(d<=AMP*HR.INWARD_FACTOR*Math.sin(Math.PI*0.02)+1e-12,'tiny displacement within 2% of the base ring and apex');zeroEnds++}
    HR.wallDisplacement(N[i*3],N[i*3+1],N[i*3+2],at.aRad[i*3],at.aRad[i*3+1],at.aRad[i*3+2],w,0,0,AMP,o);ok(o[0]===0&&o[1]===0&&o[2]===0,'zero at s=0 on the real mesh');
  }
});
ok(minThick===0,'some vertex reaches taper 0 (base ring / apex)');ok(maxThick>0.99,'taper reaches 1 mid-wall');
console.log('real mesh: '+nV+' ventricular vertices, max displacement '+(maxD*1000).toFixed(2)+' mm (limit '+(AMP*HR.INWARD_FACTOR*1000).toFixed(2)+' mm), '+zeroEnds+' vertices within 2% of base/apex');

/* ---- clearance on the exact mesh: no ventricular blood sample may enter the displaced wall ---- */
const defs=C.makeDefs(M.great_vessels),blood=C.createBlood(defs,300),hr=72,beat=60/hr,dt=1/60;let phi=0;
for(let f=0;f<120;f++){phi+=dt/beat;blood.step(phi,dt/beat,hr,72)}
const samples=[];for(let n=0;n<24;n++){for(let f=0;f<Math.round(beat*60*3/24);f++){phi+=dt/beat;blood.step(phi,dt/beat,hr,72)}blood.place();for(let i=0;i<blood.count;i++)if(blood.vis[i]&&blood.seg[i]===2)samples.push([blood.pos[i*3],blood.pos[i*3+1],blood.pos[i*3+2]])}
function intrusions(amp){
  const G={};Object.keys(GLB).forEach(n=>G[n]=GLB[n]);
  VW.forEach(n=>{const Pp=new Float64Array(GLB[n].P),{at,N}=att[n],q=[0,0,0];for(let i=0;i<Pp.length/3;i++){HR.wallDisplacement(N[i*3],N[i*3+1],N[i*3+2],at.aRad[i*3],at.aRad[i*3+1],at.aRad[i*3+2],at.aThick[i],1,0,amp,q);Pp[i*3]+=q[0];Pp[i*3+1]+=q[1];Pp[i*3+2]+=q[2]}G[n]={P:Pp,I:GLB[n].I}});
  const S=MS.makeSolidsFrom(G);let bad=0;for(const p of samples)if(S.inside(p))bad++;return bad;
}
const atCap=intrusions(AMP),headroom=intrusions(AMP*1.25),over=intrusions(AMP*2);
console.log('ventricular blood samples inside the displaced wall: at the cap '+atCap+', at 1.25x the cap '+headroom+', at 2x the cap '+over+' (of '+samples.length+')');
ok(atCap===0,'no ventricular blood sample inside the wall at the capped amplitude');
ok(headroom===0,'the cap keeps at least 25% headroom to the first intrusion');
ok(over>0,'the limit is real: twice the cap does push the wall into the blood');
console.log('wall motion tests passed');
