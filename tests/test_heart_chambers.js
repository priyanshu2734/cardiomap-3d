/* HeartChambers: display-only valves and chamber blood. Run: node tests/test_heart_chambers.js */
const C=require('../static/heart-chambers.js'),HP=require('../static/heart-physio.js'),WG=require('../static/heart-wiggers.js'),assert=require('assert'),fs=require('fs');
const ok=(c,m)=>assert(c,m);
const IDS=C.VALVE_IDS,HRS=[40,60,72,100,130];

/* 1. valve centres re-derived from the GLB (mean of each valve mesh) agree with the module to 1 mm */
(function(){
  const b=fs.readFileSync(__dirname+'/../static/models/VH_M_Heart.glb'),jl=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+jl).toString('utf8')),bin=b.slice(20+jl+8);
  const want={mitral:'VH_M_mitral_valve',tricuspid:'VH_M_tricuspid_valve',aortic:'VH_M_aortic_valve',pulmonary:'VH_M_pulmonary_valve'};
  IDS.forEach(id=>{
    const node=j.nodes.find(n=>n.name===want[id]),prim=j.meshes[node.mesh].primitives[0],acc=j.accessors[prim.attributes.POSITION],bv=j.bufferViews[acc.bufferView],off=(bv.byteOffset||0)+(acc.byteOffset||0);
    const m=[0,0,0];for(let i=0;i<acc.count;i++)for(let k=0;k<3;k++)m[k]+=bin.readFloatLE(off+(i*3+k)*4);
    for(let k=0;k<3;k++)ok(Math.abs(m[k]/acc.count-C.VALVES[id].c[k])<0.001,id+' centre matches the GLB on axis '+k);
  });
})();

/* 2. opening is within 0..1, never snaps, and the valve pairs follow the beat */
HRS.forEach(hr=>{
  const tm=HP.timing(hr),o={},N=20000;let prev=null,allClosed=0,bothOpen=0,avOpenSpan=0,slOpenSpan=0,maxSlope=0;
  for(let i=0;i<N;i++){
    const p=i/N;C.valveOpenings(p,tm,o);
    IDS.forEach(k=>ok(o[k]>=0&&o[k]<=1,k+' opening in 0..1 at hr '+hr));
    ok(o.mitral===o.tricuspid&&o.aortic===o.pulmonary,'AV valves move together and so do the semilunar valves');
    if(prev!==null)IDS.forEach(k=>{maxSlope=Math.max(maxSlope,Math.abs(o[k]-prev[k])*N)});
    prev={tricuspid:o.tricuspid,pulmonary:o.pulmonary,mitral:o.mitral,aortic:o.aortic};
    if(o.mitral>0.02&&o.aortic>0.02)bothOpen++;
    if(o.mitral===0&&o.aortic===0)allClosed++;
    if(o.mitral>0.5)avOpenSpan++;if(o.aortic>0.5)slOpenSpan++;
  }
  ok(maxSlope<120,'valve motion is smooth (no snap): steepest change '+maxSlope.toFixed(1)+' per beat at hr '+hr);
  ok(bothOpen===0,'AV and semilunar valves are never open together at hr '+hr);
  ok(allClosed/N>0.08,'isovolumic phases: all four valves closed for a visible share of the beat at hr '+hr+' ('+(allClosed/N).toFixed(3)+')');
  ok(avOpenSpan/N>0.3&&slOpenSpan/N>0.1,'AV open through diastole, semilunar through ejection at hr '+hr);
  /* closed at the very start of systole (AV) and at the start of diastole (semilunar) */
  C.valveOpenings(0,tm,o);ok(o.mitral===0&&o.aortic===0,'all closed at phi 0');
  C.valveOpenings(tm.systole+0.001,tm,o);ok(o.aortic===0,'semilunar closed when diastole starts');
  C.valveOpenings(tm.systole*0.5,tm,o);ok(o.aortic>0.99&&o.mitral===0,'mid-systole: semilunar open, AV shut');
  C.valveOpenings(0.6,tm,o);ok(o.mitral>0.99&&o.aortic===0,'mid-diastole: AV open, semilunar shut');
  C.valveOpenings(0.99999,tm,o);ok(o.mitral<0.01,'AV valve is closing by the end of the beat');
});

/* 3. flows: volume per beat equals the stroke volume, gated by the valves, shaped like -dV/dt of the Wiggers volume */
HRS.forEach(hr=>[35,72].forEach(sv=>{
  const tm=HP.timing(hr),o={},N=20000;let ej=0,fill=0,kick=0;
  for(let i=0;i<N;i++){
    const p=(i+0.5)/N;C.rates(p,hr,sv,o);ej+=o.qej/N;fill+=o.qav/N;
    ok(o.qej>=0&&o.qav>=0,'flows are never negative');
    if(o.aortic===0)ok(o.qej===0,'no ejection through a shut semilunar valve');
    if(o.mitral===0)ok(o.qav===0,'no filling through a shut AV valve');
    ok(o.qv===sv,'venous return is the steady mean flow');
  }
  ok(Math.abs(ej-sv)/sv<0.01,'ejected volume per beat = stroke volume at hr '+hr+' ('+ej.toFixed(2)+' vs '+sv+')');
  ok(Math.abs(fill-sv)/sv<0.01,'filled volume per beat = stroke volume at hr '+hr+' ('+fill.toFixed(2)+' vs '+sv+')');
}));
(function(){  /* ejection follows the Wiggers volume: flow / (-dV/dphi) is the constant ke wherever the valve is fully open */
  const hr=72,tm=HP.timing(hr),ef=60,sv=HP.strokeVolume(ef,new Set()).value,o={},eps=1e-5,n=C.norms(tm);
  [0.12,0.18,0.25].forEach(p=>{
    const dv=-(WG.lvVolume(p+eps,hr,ef)-WG.lvVolume(p-eps,hr,ef))/(2*eps);C.rates(p,hr,sv,o);
    ok(o.aortic>0.999,'valve fully open at '+p);ok(Math.abs(o.qej/dv-n.ke)<0.01,'ejection flow = ke x (-dV/dphi) of the Wiggers volume at phi '+p);
  });
  ok(n.ke>=1&&n.ke<1.5,'the gate rescales the Wiggers ejection by a modest factor ('+n.ke.toFixed(3)+')');
  [0.45,0.5].forEach(p=>{
    const dv=(WG.lvVolume(p+eps,hr,ef)-WG.lvVolume(p-eps,hr,ef))/(2*eps);C.rates(p,hr,sv,o);
    ok(o.mitral>0.999&&Math.abs(o.qav/dv-n.kf)<0.02,'rapid filling = kf x (+dV/dphi) of the Wiggers volume at phi '+p);
  });
  C.rates(0.95,hr,sv,o);ok(o.qav>0&&o.mitral>0.5,'the atrial kick adds filling after the rapid-filling phase');
  C.rates(0.7,hr,sv,o);ok(o.qav===0&&o.qej===0,'diastasis: valves open but no ventricular volume change');
})();

/* 4. the plain-language line names the right valves */
(function(){
  const tm=HP.timing(72),o={};
  C.valveOpenings(0.6,tm,o);ok(/Open now: tricuspid and mitral/.test(C.describeOpen(o)),'diastole text');
  C.valveOpenings(0.2,tm,o);ok(/Open now: aortic and pulmonary/.test(C.describeOpen(o)),'ejection text');
  C.valveOpenings(0.02,tm,o);ok(/All four valves are closed/.test(C.describeOpen(o)),'isovolumic text');
})();

/* 5. allocation-free: passing an output object returns the same object */
(function(){const o={};ok(C.rates(0.3,72,72,o)===o&&C.valveOpenings(0.3,HP.timing(72),o)===o,'no new object when an output is supplied')})();

/* 6. path structure: makeDefs joins the baked cavity waypoints to the manifest vessels; valve points sit at the segment ends; radii fit the cavity */
(function(){
  const M=require('../static/models/heart_function_mesh.json'),MS=require('./mesh_solids.js'),S=MS.makeSolids(__dirname+'/../static/models/VH_M_Heart.glb'),gv=M.great_vessels;
  const d=C.makeDefs(gv);ok(d.right.length===1&&d.left.length===4,'one right path (SVC) and four left paths (pulmonary veins)');
  const near=(a,b,t)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<t;
  const lim=[['svc','tricuspid','pulmonary','pulm_trunk',d.right],['','mitral','aortic','aorta',d.left]];
  lim.forEach(row=>row[4].forEach((path,pi)=>{
    const segs=C.buildPath(path),e=path.segEnd,V=C.VALVES;ok(segs.length===4,'4 segments');ok(e.length===3&&e[0]<e[1]&&e[1]<e[2]&&e[2]<path.wp.length-1,'segment ends increase');
    path.wp.forEach(w=>{ok(w.length===4&&w.every(Number.isFinite),'waypoint is [x,y,z,r]');ok(w[3]>=0,'radius >= 0')});
    ok(near(path.wp[e[1]],V[row[1]].c,1e-6),row[1]+' centre is the end of the atrium segment');ok(near(path.wp[e[2]],V[row[2]].c,1e-6),row[2]+' centre is the end of the ventricle segment');
    const K=C.K,P=(sg,i)=>[segs[sg].P[i*3],segs[sg].P[i*3+1],segs[sg].P[i*3+2]];
    ok(near(P(1,K),V[row[1]].c,2e-4)&&near(P(2,0),V[row[1]].c,2e-4),'segments 1 and 2 meet at the '+row[1]+' valve');ok(near(P(2,K),V[row[2]].c,2e-4)&&near(P(3,0),V[row[2]].c,2e-4),'segments 2 and 3 meet at the '+row[2]+' valve');
    for(let sg=0;sg<4;sg++)for(let i=0;i<=K;i++)ok(segs[sg].R[i]>=0&&Number.isFinite(segs[sg].R[i]),'resampled radius >= 0');
    /* vessel stubs use 0.6 x the tube radius */
    const vin=row[0]||['lpv_up','lpv_low','rpv_up','rpv_low'][pi];ok(Math.abs(path.wp[0][3]-gv[vin].radius*0.6)<1e-9,'inlet vessel r = tube radius x 0.6');ok(Math.abs(path.wp[path.wp.length-1][3]-gv[row[3]].radius*0.6)<1e-9,'outlet vessel r = tube radius x 0.6');
    /* chamber waypoints (between the vessel stub end and the semilunar valve): outside the walls and r < clearance */
    for(let i=e[0]+1;i<=e[2];i++){const w=path.wp[i],c=S.distance(w);
      if(c>0.0005)ok(!S.inside(w),'cavity waypoint '+i+' is outside every wall solid');
      ok(w[3]<c||w[3]===0,'waypoint '+i+' radius '+(w[3]*1000).toFixed(1)+' mm is below the clearance '+(c*1000).toFixed(1)+' mm')}
  }));
})();
console.log('valve, flow and path tests passed');
