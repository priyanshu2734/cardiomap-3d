/* CardioMap Heart Function Lab: A-vs-B comparison helpers.
   Pure browser + Node module. Uses the shared effective-flow model when optional anatomy fields are supplied. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./coronary-flow.js'),require('./heart-effects.js'),require('./heart-anatomy.js'));
  else root.HeartCompare=factory(root.CoronaryFlow,root.HeartEffects,root.HeartAnatomy);
})(typeof self!=='undefined'?self:this,function(CF,HE,AN){
  'use strict';
  const VIDS=['LAD','LCX','RCA'],MODES=['rest','exercise'];
  const sane=x=>x&&typeof x==='object';
  function narrowValue(x){const n=Number(x);return isFinite(n)?Math.max(0,Math.min(99,n)):0;}
  function basicNormalise(c){const x=sane(c)?c:{};return {narrow:{LAD:narrowValue(x.narrow&&x.narrow.LAD),LCX:narrowValue(x.narrow&&x.narrow.LCX),RCA:narrowValue(x.narrow&&x.narrow.RCA)},mode:x.mode==='exercise'?'exercise':'rest'};}
  function hasOptional(c){return sane(c)&&('narrow2' in c||'dominance' in c||'collateral' in c)}
  function fullNormalise(c){const b=basicNormalise(c),x=sane(c)?c:{};if(!hasOptional(x))return b;const n2={LAD:narrowValue(x.narrow2&&x.narrow2.LAD),LCX:narrowValue(x.narrow2&&x.narrow2.LCX),RCA:narrowValue(x.narrow2&&x.narrow2.RCA)},dominance=x.dominance==='left'?'left':'right',collateral=isFinite(Number(x.collateral))?Math.max(0,Math.min(AN?AN.COLLATERAL_MAX:.35,Number(x.collateral))):0;return Object.assign(b,{narrow2:n2,dominance,collateral});}
  function artery(id,c){
    const n2=c.narrow2&&c.narrow2[id]||0,dom=c.dominance||'right',coll=c.collateral||0;
    const r=AN?AN.effective(id,c.narrow[id],n2,c.mode,{dominance:dom,collateral:coll}):CF.solve(id,c.narrow[id],c.mode);
    const s=HE.severity(r),stMap={LAD:id==='LAD'?s:0,LCX:id==='LCX'?s:0,RCA:id==='RCA'?s:0},st=HE.stDepressionMv(stMap);
    return {narrowing:c.narrow[id],narrowing2:n2,flowPct:r.flowPct,reservePct:r.reservePct,state:r.state,stateLabel:r.stateLabel,severity:s,stDepression:st,collateralAdded:r.collateralAdded||0};
  }
  function compare(A,B){const a=fullNormalise(A),b=fullNormalise(B),arteries={};VIDS.forEach(id=>{const aa=artery(id,a),bb=artery(id,b);arteries[id]={A:aa,B:bb,delta:{flowPct:bb.flowPct-aa.flowPct,reservePct:bb.reservePct-aa.reservePct,severity:bb.severity-aa.severity,stDepression:bb.stDepression-aa.stDepression}}});
    const stA=HE.stDepressionMv({LAD:arteries.LAD.A.severity,LCX:arteries.LCX.A.severity,RCA:arteries.RCA.A.severity}),stB=HE.stDepressionMv({LAD:arteries.LAD.B.severity,LCX:arteries.LCX.B.severity,RCA:arteries.RCA.B.severity});
    const deltaSt=stB-stA,sentences=VIDS.map(id=>{const r=arteries[id],dir=r.delta.flowPct<0?'falls':r.delta.flowPct>0?'rises':'stays';const extra=r.delta.narrowing2? ' and the distal example narrowing also changes':'';return id+': flow as a share of demand '+dir+' from '+Math.round(r.A.flowPct)+'% to '+Math.round(r.B.flowPct)+'%'+extra+'.'});
    return {A:a,B:b,arteries,stDepression:{A:stA,B:stB,delta:deltaSt},sentences};
  }
  function restVsExercise(narrow,extra){const base={narrow,mode:'rest'},bb={narrow,mode:'exercise'};return Object.keys(extra||{}).length?{A:fullNormalise(Object.assign(base,extra)),B:fullNormalise(Object.assign(bb,extra))}:{A:basicNormalise(base),B:basicNormalise(bb)};}
  function noNarrowingVsCurrent(narrow,mode,extra){const zero={LAD:0,LCX:0,RCA:0},base={narrow:zero,mode:'rest'},bb={narrow,mode};return Object.keys(extra||{}).length?{A:fullNormalise(Object.assign(base,extra)),B:fullNormalise(Object.assign(bb,extra))}:{A:basicNormalise(base),B:basicNormalise(Object.assign(bb,{}))};}
  return {VIDS,MODES,normalise:basicNormalise,fullNormalise,compare,restVsExercise,noNarrowingVsCurrent};
});
