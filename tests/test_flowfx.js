/* HeartFlowFx: display-only helpers. Run: node tests/test_flowfx.js */
const F=require('../static/heart-flowfx.js'),CF=require('../static/coronary-flow.js'),assert=require('assert');
const ok=(c,m)=>{assert(c,m)};
let m=0;for(let i=0;i<10000;i++)m+=F.profile(i/10000);ok(Math.abs(m/10000-1)<1e-3,'cross-section profile keeps mean flow = 1');
ok(F.turbulence(40,0.01)===0&&F.turbulence(90,-0.1)===0,'no turbulence below 50% or upstream');
ok(F.turbulence(90,0)>F.turbulence(90,0.3)&&F.turbulence(95,0)>F.turbulence(60,0),'turbulence strongest just beyond a tight narrowing and fades');
ok(F.plaqueScale(1.9,1.9)===F.PLAQUE_OFF&&F.plaqueScale(1.9,0.9)===1,'plaque only where the lumen is narrowed');
const pos={lesion1:.36,lesion2:.66};
ok(F.clotAt(0,99,pos)===.66&&F.clotAt(95,0,pos)===null&&F.clotAt(97,0,pos)===.36,'clot plug only at a near-total blockage');
const v=CF.VESSELS.LAD,r=CF.solve('LAD',70,'rest');
ok(F.relSpeed(r.flow,v.qRest,v.r0,v.r0,1)===1,'healthy resting speed = 1');
ok(F.relSpeed(r.flow,v.qRest,v.r0,CF.radiusMm('LAD',70,v.at),1)>5,'jet through a 70% narrowing is several times faster');
ok(F.relSpeed(0,v.qRest,v.r0,v.r0*.1,1)===0,'no flow, no speed');
const c=F.color('blood',.5,[0,0,0]);ok(c.every(x=>x>=0&&x<=1),'colours in 0..1');
ok(/completely blocked/.test(F.hudText('LAD',{d:99,areaPct:.01,flow:0,flowPct:0,dropMmHg:85},v,true)),'blocked sentence');
ok(/open artery/.test(F.hudText('LAD',CF.solve('LAD',0,'rest'),v,false)),'open-artery sentence');
console.log('all flowfx tests passed');
