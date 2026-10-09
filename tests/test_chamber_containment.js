/* Containment of the chamber-blood particles against the REAL mesh. Run: node tests/test_chamber_containment.js
   Every visible particle placed by HeartChambers.createBlood().place() must be (a) outside all five wall solids of VH_M_Heart.glb (exact
   ray parity) and also enclosed (blocked by a wall on at least 4 of the 6 axis rays, i.e. in a cavity and not out in the open), or (b) inside a
   great-vessel tube (distance to the vessel centreline <= tube radius).
   Two wall states are checked: the rest pose (the mesh as stored) and PEAK SYSTOLE with the Phase 2 wall motion (ventricular walls displaced
   exactly as the vertex shader does at uSys = 1, healthy wall, amplitude HeartRealism.WALL_AMP_M). The page moves the ventricles and atria by a
   few percent while beating; the particles move with them, so the relative position stays the same. Atria are not displaced by Phase 2. */
const C=require('../static/heart-chambers.js'),HP=require('../static/heart-physio.js'),HR=require('../static/heart-realism.js'),assert=require('assert'),MS=require('./mesh_solids.js');
const M=require('../static/models/heart_function_mesh.json'),ok=(c,m)=>assert(c,m);
const GLB=MS.loadGlb(__dirname+'/../static/models/VH_M_Heart.glb');
const VW=['VH_M_heart_left_ventricle','VH_M_heart_right_ventricle','VH_M_interventricular_septum'];
function displacedSolids(amp){
  const an=M.animation,P=an.ventricle_pivot,ul=Math.hypot(...an.long_axis_unit),u=an.long_axis_unit.map(x=>x/ul),rg=HR.axialRange(VW.map(n=>GLB[n].P),P,u),G={};
  Object.keys(GLB).forEach(n=>{G[n]=GLB[n]});
  VW.forEach(n=>{const Pp=new Float64Array(GLB[n].P),I=GLB[n].I,at=HR.wallAttributes(Pp,P,u,rg),N=MS.vertexNormals(Pp,I),o=[0,0,0];
    for(let i=0;i<Pp.length/3;i++){HR.wallDisplacement(N[i*3],N[i*3+1],N[i*3+2],at.aRad[i*3],at.aRad[i*3+1],at.aRad[i*3+2],at.aThick[i],1,0,amp,o);Pp[i*3]+=o[0];Pp[i*3+1]+=o[1];Pp[i*3+2]+=o[2]}
    G[n]={P:Pp,I}});
  return MS.makeSolidsFrom(G);
}
const defs=C.makeDefs(M.great_vessels),per=300,blood=C.createBlood(defs,per);
const tubes=Object.keys(M.great_vessels).map(k=>({k,r:M.great_vessels[k].radius,poly:MS.centripetal(M.great_vessels[k].points,40)}));
const hr=72,sv=72,beat=60/hr;let phi=0;
const dt=1/60;for(let f=0;f<120;f++){phi+=dt/beat;blood.step(phi,dt/beat,hr,sv)}   /* warm-up: two seconds */
const FR=48,STRIDE=Math.round(beat*60*3/FR);       /* 48 poses spread over three beats */
const samples=[];let hidden=0;
for(let n=0;n<FR;n++){
  for(let f=0;f<STRIDE;f++){phi+=dt/beat;blood.step(phi,dt/beat,hr,sv)}
  blood.place();
  for(let i=0;i<blood.count;i++){if(!blood.vis[i]){hidden++;continue}samples.push({seg:blood.seg[i],side:blood.side[i],p:[blood.pos[i*3],blood.pos[i*3+1],blood.pos[i*3+2]]})}
}
const MIN=+(process.env.CONTAIN_MIN||95),results={};
[['rest wall',MS.makeSolidsFrom(GLB)],['peak-systole wall, amplitude '+(HR.WALL_AMP_M*1000).toFixed(1)+' mm',displacedSolids(HR.WALL_AMP_M)]].forEach(([label,S])=>{
  let tot=0,inCav=0,inTube=0,bad=0,inWall=0;const badBySeg=[0,0,0,0],totBySeg=[0,0,0,0],worst=[];
  for(const s of samples){
    const p=s.p,sg=s.seg;tot++;totBySeg[sg]++;
    const wall=S.inside(p);let good=false;
    if(!wall){let enc=0;for(let ax=0;ax<3;ax++)for(const d of[1,-1])if(S.hits(p,ax,d))enc++;if(enc>=4){good=true;inCav++}}
    if(!good){for(const t of tubes)if(MS.distToPolyline(p,t.poly)<=t.r){good=true;inTube++;break}}
    if(!good){bad++;badBySeg[sg]++;if(wall)inWall++;if(worst.length<4)worst.push({seg:sg,side:s.side,p:p.map(x=>+x.toFixed(4)),wall})}
  }
  const pct=100*(tot-bad)/tot;results[label]={pct,badBySeg,inWall};
  console.log('['+label+'] visible particle samples',tot,'(hidden at the stub ends:',hidden+')');
  console.log('  in an enclosed cavity:',inCav,' inside a vessel tube:',inTube,' outside both:',bad,' (of which inside a wall solid:',inWall+')');
  console.log('  by segment (0 inlet stub, 1 atrium, 2 ventricle, 3 outlet stub): not contained',badBySeg.join(' / '),'of',totBySeg.join(' / '));
  console.log('  CONTAINMENT: '+pct.toFixed(2)+'% of visible particle samples are inside the cavity or a vessel tube');
  if(worst.length)console.log('  examples outside:',JSON.stringify(worst));
  ok(pct>=MIN,label+': containment '+pct.toFixed(2)+'% is below the required '+MIN+'%');
});
const keys=Object.keys(results);
ok(results[keys[1]].badBySeg[2]===0,'no ventricular blood sample may be outside the cavity with the displaced wall');
ok(results[keys[1]].pct>=results[keys[0]].pct-0.05,'wall motion must not lower containment by more than 0.05 percentage points');
console.log('containment test passed');
