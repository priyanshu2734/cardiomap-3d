/* CardioMap Heart Function Lab: uncertainty sweep helpers.
   Pure browser + Node module. Uses the existing estimate, suggestion rule, and shared effective-flow model. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./coronary-flow.js'),require('./heart-effects.js'),require('./heart-anatomy.js'));
  else root.HeartUncertainty=factory(root.CoronaryFlow,root.HeartEffects,root.HeartAnatomy);
})(typeof self!=='undefined'?self:this,function(CF,HE,AN){
  'use strict';
  const VIDS=['LAD','LCX','RCA'];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=x=>typeof x==='number'&&isFinite(x);
  function stateRank(s){return s===0?0:s===1?1:2}
  function summary(points){
    if(!points||!points.length)return '';
    const labels=points.map(x=>x.stateLabel);
    if(labels.every(x=>x===labels[0]))return "Across the 80% range the example flow state stays '"+labels[0]+"'.";
    const order=points.slice().sort((a,b)=>stateRank(a.state)-stateRank(b.state));
    return "Across the 80% range the example flow state ranges from '"+order[0].stateLabel+"' to '"+order[order.length-1].stateLabel+"'.";
  }
  function usesContext(context){
    if(!context||typeof context!=='object')return false;
    const n=context.narrow2||{};return context.dominance!=='right'||Number(context.collateral||0)!==0||Number(n.LAD||0)!==0||Number(n.LCX||0)!==0||Number(n.RCA||0)!==0;
  }
  function point(est,id,p,mode,context){
    /* HE.suggest is intentionally called with its existing {p:{LAD,LCX,RCA}} shape. */
    const sug=HE.suggest({p:{[id]:p}},id);
    const r=context&&AN?AN.effective(id,sug.narrowing,context.narrow2&&context.narrow2[id]||0,mode,{dominance:context.dominance,collateral:context.collateral,branches:context.branches}):CF.solve(id,sug.narrowing,mode);
    const sev=HE.severity(r);
    return {p,narrowing:sug.narrowing,flowPct:r.flowPct,reservePct:r.reservePct,state:r.state,stateLabel:r.stateLabel,severity:sev,symbol:r.state===2?'▲':r.state===1?'◆':'●',collateralAdded:r.collateralAdded||0};
  }
  function sweep(est,vesselId,mode,context){
    if(!est||typeof est!=='object'||!est.p||VIDS.indexOf(vesselId)<0)return null;
    const mid=est.p[vesselId],range=est.range&&est.range[vesselId];
    if(!finite(mid)||mid<0||mid>1)return null;
    let pts;
    if(Array.isArray(range)&&range.length>=2&&finite(range[0])&&finite(range[1])){
      let lo=clamp(range[0],0,1),hi=clamp(range[1],0,1);if(lo>hi){const t=lo;lo=hi;hi=t;}
      const p=clamp(mid,lo,hi);
      pts=[point(est,vesselId,lo,mode,context),point(est,vesselId,p,mode,context),point(est,vesselId,hi,mode,context)];
      const out={vessel:vesselId,mode,rangeAvailable:true,points:pts,summary:summary(pts)};if(usesContext(context))out.contextUsed=true;return out;
    }
    pts=[point(est,vesselId,clamp(mid,0,1),mode,context)];
    const out={vessel:vesselId,mode,rangeAvailable:false,points:pts,summary:'No 80% range is available; showing the model estimate only.'};if(usesContext(context))out.contextUsed=true;return out;
  }
  return {VIDS,sweep,summary};
});
