/* HeartRealism: display-only helpers. Run: node tests/test_heart_realism.js */
const FR=require('../static/heart-realism.js'),assert=require('assert'),fs=require('fs');
const groove=Float32Array.from([0,0,0, 0.01,0,0]);
const pos=Float32Array.from([0.005,0.001,0, 0.005,0.05,0]);          /* on the groove, then 5 cm away */
const c=FR.paintVertices(pos,groove,'v');
assert(c.length===6&&[...c].every(x=>x>=0&&x<=1),'colours stay in 0..1');
assert(c[0]>0.4&&c[1]>0.25,'on the groove the colour is fat-yellow (green channel up)');
assert(c[4]<0.3,'far from any groove the colour is muscle red (low green)');
assert(Math.abs(FR.paintVertices(pos,null,'a')[0]-FR.paintVertices(pos,null,'a')[0])===0,'deterministic');
const l=FR.lift([[1,0,0]],[0,0,0],0.5);assert(Math.abs(l[0][0]-1.5)<1e-9,'lift pushes outward from the centre');
const m=JSON.parse(fs.readFileSync(__dirname+'/../static/models/heart_function_mesh.json','utf8'));
const g=m.great_vessels;assert(g&&g.aorta&&g.pulm_trunk&&g.svc,'manifest has great vessels');
Object.values(g).forEach(v=>{assert(v.points.length>=3&&v.radius>0.003&&v.radius<0.02,v.label+' sane size');assert(typeof v.kind==='string')});
const b=FR.gvBox(g);assert(b.hi[1]-b.lo[1]>0.1&&b.hi[1]<0.64,'great-vessel box height sane');
console.log('all realism tests passed');

/* ---- camera fit (v9): extents stay inside the frame, centred, with the caption strip clear ---- */
{
  const assert2=require('assert'),R2=require('../static/heart-realism.js');
  const pts=[];for(let i=0;i<=40;i++){const t=i/40;pts.push(-0.6+1.5*t,-1.8+3.6*t,0.2*Math.sin(6*t),0.05)}   /* tall, narrow shape like the heart + vessels */
  for(const [asp,fov] of [[0.79,44],[1.5,34],[2,34]]){
    const f=R2.fitCamera(pts,0.32,1.36,fov,asp,0.97,0.2),e=f.extents;
    assert2(e.mnX>=-1&&e.MxX<=1&&e.MxY<=1.0001,'shape inside the frame at aspect '+asp);
    assert2(e.mnY>=-1+0.2-0.01,'caption strip (bottom 10% of the height) stays clear at aspect '+asp+': '+e.mnY);
    assert2(Math.max((e.MxX-e.mnX)/2,(e.MxY-e.mnY)/2/(1-0.1))>0.9,'shape fills most of the limiting axis at aspect '+asp);
    assert2(f.rad>2.5&&f.rad<30,'sane distance');
  }
  const a=R2.fitCamera(pts,0.32,1.36,34,1.5,0.97,0).rad,b=R2.fitCamera(pts,0.32,1.36,34,1.5,0.97,0.3).rad;assert2(b>a,'a caption strip moves the camera back, never forward');
  console.log('camera fit tests passed');
}
