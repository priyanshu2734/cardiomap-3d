/* Logic test of HeartChambers.createView with a minimal stand-in for THREE (no WebGL here, so this checks bookkeeping, NOT rendering).
   Run: node tests/test_heart_chambers_view.js */
const C=require('../static/heart-chambers.js'),HP=require('../static/heart-physio.js'),assert=require('assert'),M=require('../static/models/heart_function_mesh.json');
const ok=(c,m)=>assert(c,m);
/* ---- leaflet geometry ---- */
C.VALVE_IDS.forEach(id=>{
  const g=C.leafletGeometry(id),V=C.VALVES[id],nv=(8+1)*(5+1);ok(g.cusps===V.n,id+' has '+V.n+' cusps');ok(g.count===nv*V.n,'vertex count');
  const R=g.ring,N=new Float32Array(g.count*3);C.vertexNormals(g.closed,g.index,N);
  ok(g.index.every(i=>i<g.count),'indices in range');
  for(let c=0;c<V.n;c++)for(let i=0;i<=8;i++){
    const tip=(c*nv+5*9+i)*3,ring=(c*nv+i)*3;     /* free edge (v=1) and ring (v=0) */
    ok(Math.hypot(g.closed[tip],g.closed[tip+1])<1e-6&&g.closed[tip+2]<0,id+' closed: free edge on the axis, bulging upstream');
    ok(Math.abs(Math.hypot(g.closed[ring],g.closed[ring+1])-R)<1e-6&&g.closed[ring+2]===0,id+' closed: root on the ring');
    ok(Math.abs(Math.hypot(g.open[tip],g.open[tip+1])-0.82*R)<1e-6&&g.open[tip+2]>0.5*R,id+' open: free edge swung to the wall, downstream');
    ok(Math.abs(Math.hypot(g.open[ring],g.open[ring+1])-R)<1e-6,id+' open: root stays on the ring');
  }
  for(let i=0;i<g.count;i++)ok(Math.abs(Math.hypot(N[i*3],N[i*3+1],N[i*3+2])-1)<1e-4,'unit normals');
  for(let i=0;i<g.closed.length;i++)ok(Math.abs(g.closed[i])<0.03&&Math.abs(g.open[i])<0.03,'leaflet stays within 3 cm of the valve centre');
});
/* ---- stand-in THREE ---- */
class Vec3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.needsUpdate=false}}
class Geo{constructor(){this.attributes={};this.morphAttributes={};this.index=null}setAttribute(n,a){this.attributes[n]=a;return this}setIndex(a){this.index=a;return this}}
class Obj{constructor(){this.children=[];this.visible=true;this.position=new Vec3();this.quaternion={setFromUnitVectors(a,b){this.a=a;this.b=b}};this.renderOrder=0}add(...c){c.forEach(x=>{this.children.push(x);x.parent=this});return this}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;if(g&&g.morphAttributes&&g.morphAttributes.position)this.morphTargetInfluences=g.morphAttributes.position.map(()=>0)}}
class Points extends Obj{constructor(g,m){super();this.geometry=g;this.material=m}}
class Mat{constructor(p){Object.assign(this,p)}}
const T={Group:Obj,Vector3:Vec3,BufferGeometry:Geo,BufferAttribute:Attr,Mesh,Points,MeshStandardMaterial:Mat,PointsMaterial:Mat,TorusGeometry:class extends Geo{},DoubleSide:2};
const world=new Obj(),ventG=new Obj(),atriaG=new Obj();world.add(ventG,atriaG);
const wall=()=>new Mesh(new Geo(),new Mat({transparent:false,opacity:1,depthWrite:true,needsUpdate:false}));
const walls=[wall(),wall(),wall()],cl=[0.015,0.49,0.008],cr=[-0.02,0.48,0.035];
const V=C.createView(T,{world,ventG,atriaG,atriaCentres:{left:cl,right:cr},walls,greatVessels:M.great_vessels,perSide:300,cellSize:0.1});
ok(V.count<=600,'at most 600 particles ('+V.count+')');
ok(V.buffers.stub.pts.parent===world&&V.buffers.atria.pts.parent===atriaG&&V.buffers.vent.pts.parent===ventG,'three Points buffers: static group, atriaG, ventG');
ok(V.valveGroup.parent===ventG&&V.valveGroup.children.length===4,'four valves, parented to the ventricle group');
ok(walls.every(w=>w.material.transparent&&w.material.opacity<0.5&&w.material.depthWrite===false),'walls translucent while valves/blood are on');
/* a beat: every particle is in exactly one buffer (or hidden), atrial ones are scaled about their own atrium, valve openings feed the morph influence */
const hr=72,sv=72,tm=HP.timing(hr),beat=60/hr;let phi=0,sMax=0;const o={};
for(let f=0;f<240;f++){
  const dphi=(1/60)/beat;phi+=dphi;const s=1-0.05*Math.max(0,Math.sin(phi*6.28)),rt=V.update(phi,dphi,hr,sv,s);
  C.valveOpenings(phi,tm,o);ok(Math.abs(rt.mitral-o.mitral)<1e-9&&Math.abs(rt.aortic-o.aortic)<1e-9,'view returns the same openings as valveOpenings');
  ['mitral','aortic','tricuspid','pulmonary'].forEach(id=>ok(Math.abs(V.leaf[id].mesh.morphTargetInfluences[0]-rt[id])<=0.0021,id+' morph influence follows the opening'));
  const P=V.blood.pos;
  for(let i=0;i<V.count;i++){
    const k=i*3,inB=[V.buffers.stub,V.buffers.atria,V.buffers.vent].map(b=>b.pos[k]<1e3);
    const n=inB.filter(Boolean).length;ok(n===(V.blood.vis[i]?1:0),'particle '+i+' is in exactly one buffer when visible, none when hidden');
    if(V.blood.vis[i]){const g=V.blood.seg[i];ok(inB[g===1?1:g===2?2:0],'particle is in the buffer of its segment');
      if(g===1){const c=V.blood.side[i]?cl:cr;for(let a=0;a<3;a++)ok(Math.abs(V.buffers.atria.pos[k+a]-(c[a]+(P[k+a]-c[a])*s))<1e-6,'atrial particle scaled about its atrium');sMax=Math.max(sMax,Math.abs(1-s))}}
  }
}
/* reduced motion / pause: dphi=0 keeps every particle where it is */
const before=Float32Array.from(V.blood.w);V.update(phi,0,hr,sv,1);ok(before.every((x,i)=>x===V.blood.w[i]),'no particle motion when dphi = 0');
/* toggles */
V.setBlood(false);ok(!V.buffers.vent.pts.visible&&walls.every(w=>w.material.transparent),'blood off, valves still on: walls stay translucent');
V.setValves(false);ok(!V.valveGroup.visible&&walls.every(w=>!w.material.transparent&&w.material.opacity===1&&w.material.depthWrite===true),'both off: walls restored');
V.setValves(true);ok(V.valveGroup.visible&&walls.every(w=>w.material.transparent),'valves back on: translucent again');
V.setBlood(true);ok(V.buffers.atria.pts.visible,'blood back on');
ok(/Open now|valves/i.test(V.describe()),'describe() returns a plain sentence');
console.log('view logic tests passed (stand-in THREE: bookkeeping only, rendering not checked)');
