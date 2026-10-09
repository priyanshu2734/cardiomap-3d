/* CoronaryFlow2: additive two-lesion series extension for the Heart Function Lab.
   Pure browser + Node module. It reuses CoronaryFlow's constants, pressure-drop terms and teaching bands.
   Default d2=0 delegates to CoronaryFlow.solve(), so today's single-lesion numbers remain unchanged.
   Simplification: the two example lesions are far enough apart that they do not interact
   (no pressure-recovery or shared-jet effects). */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./coronary-flow.js'));
  else root.CoronaryFlow2=factory(root.CoronaryFlow);
})(typeof self!=='undefined'?self:this,function(CF){
  'use strict';
  if(!CF) throw new Error('CoronaryFlow2 requires CoronaryFlow');
  const PI=Math.PI,MMHG=133.322,ML_MIN=1e-6/60;
  const clampD=d=>{d=Number(d);return !isFinite(d)?0:Math.max(0,Math.min(99,d))};
  const finite=x=>typeof x==='number'&&isFinite(x);
  const POSITIONS=Object.freeze(Object.keys(CF.VESSELS).reduce((o,id)=>{
    const v=CF.VESSELS[id];o[id]={lesion1:v.at,lesion2:Math.min(0.86,v.at+0.30)};return o;
  },{}));
  const K=Object.freeze({minCenterGap:0.30});
  function vessel(id){const v=CF.VESSELS[id];if(!v)throw new Error('Unknown vessel '+id);return v;}
  function qRestFor(id,opts){const q=opts&&Number(opts.qRest);return finite(q)&&q>0?q:vessel(id).qRest}
  function exFactor(mode,opts){return mode==='exercise'?CF.resolve(opts).ex:1}
  function rminFor(id,qRest){
    const v=vessel(id),p0=CF.partsRef(id,0),dp=(CF.K.paMmHg-CF.K.pvMmHg)*MMHG;   /* calibrated at reference conditions, like CoronaryFlow.rmin */
    return dp/(CF.K.cfrMax*qRest*ML_MIN)-p0.Rp;
  }
  function localRadiusMm(id,d,u,at){
    const v=vessel(id),r0=v.r0,rs=CF.stenosisRadiusMm(id,d),half=CF.resolve().ls/v.L,x=Math.abs(u-at)/half;
    if(x>=1)return r0;
    return r0-(r0-rs)*0.5*(1+Math.cos(PI*x));
  }
  function radiusSeriesMm(id,d1,d2,u){
    d1=clampD(d1);d2=clampD(d2);
    if(d2===0)return CF.radiusMm(id,d1,u);
    if(d1===0)return localRadiusMm(id,d2,u,POSITIONS[id].lesion2);
    const v=vessel(id),r0=v.r0;
    const r1=localRadiusMm(id,d1,u,POSITIONS[id].lesion1),r2=localRadiusMm(id,d2,u,POSITIONS[id].lesion2);
    return Math.max(0.12*v.r0,r1+r2-r0);
  }
  function partsSeries(id,d1,d2){
    d1=clampD(d1);d2=clampD(d2);const c=CF.resolve(),v=vessel(id),mu=c.mu,r0=v.r0*1e-3,L=v.L*1e-3,Ls=c.ls*1e-3;
    const p1=CF.parts(id,d1),p2=CF.parts(id,d2),A0=Math.PI*r0*r0,two=d1>0&&d2>0,active=two?2:1;
    const Rv=two?p1.Rv+p2.Rv:(d1>0?p1.Rv:d2>0?p2.Rv:p1.Rv);
    const Rt=two?p1.Rt+p2.Rt:(d1>0?p1.Rt:d2>0?p2.Rt:p1.Rt);
    return {r0,rs1:p1.rs,rs2:p2.rs,A0,As1:p1.As,As2:p2.As,
      Rp:8*mu*Math.max(0,L-active*Ls)/(Math.PI*Math.pow(r0,4)),
      Rv,Rt};
  }
  function dropZeroOrStenosis(id,d,q,o){return clampD(d)===0?{viscous:0,turbulent:0,total:0}:CF.stenosisDrop(id,d,q,o)}
  function capacitySeries(id,d1,d2,opts){
    const c=CF.resolve(opts),p=partsSeries(id,d1,d2),qRest=qRestFor(id,opts),dp=(c.pa-c.pv)*MMHG,a=p.Rt,b=p.Rp+rminFor(id,qRest)+p.Rv;
    const root=a<1e-30?dp/b:(-b+Math.sqrt(b*b+4*a*dp))/(2*a);return Math.max(0,root/ML_MIN);
  }
  function plainSeries(state,ex,widened,d1,d2){
    const act=ex?'During exercise':'At rest',two=d1>0&&d2>0;
    const tag=two?' with the two example narrowings in series':'';
    if(Math.max(d1,d2)<=0&&state===2)return act+(CF.resolve().pa<CF.K.paMmHg-1e-9?' even this healthy artery cannot deliver what its part of the heart wall asks for at the chosen aortic pressure: too little pressure is available to push the blood through, even with the small vessels fully widened.':' the heart wall asks for about the most blood even a healthy artery can deliver (peak capacity is about '+CF.K.cfrMax+' times resting flow), so no spare capacity is left.');
    if(Math.max(d1,d2)<=0&&state===1)return act+' this healthy artery still meets demand, but at the chosen pressure and effort the small vessels downstream are nearly fully widened and little spare capacity is left.';
    if(Math.max(d1,d2)<=0)return act+' this artery delivers all the blood its part of the heart wall asks for'+(ex?'; the small vessels downstream widen to meet the higher demand.':'.');
    if(state===0)return act+' this artery still delivers all the blood its part of the heart wall asks for'+(widened>0.02?', with the small vessels downstream widened a little to make up for the narrowing.':'.')+tag;
    if(state===1)return act+' this artery still meets demand, but the small vessels downstream have widened to hold flow and little spare capacity is left.'+tag;
    return act+' this artery can no longer deliver what its part of the heart wall asks for, even with the small vessels fully widened.'+tag+(ex?'':' Flow falls short even at rest.');
  }
  function directSingle(id,d,mode,opts){return CF.solve(id,d,mode,opts)}
  function solveSeries(id,d1,d2,mode,opts){
    d1=clampD(d1);d2=clampD(d2);vessel(id);const baseOpts=opts||{};
    const hasCustomQ=finite(Number(baseOpts.qRest))&&Number(baseOpts.qRest)>0;
    /* Preserve today's exact single-lesion numbers whenever the second lesion is off and no optional demand split is active. */
    if(!hasCustomQ&&d2===0){
      const r=directSingle(id,d1,mode,baseOpts),drop1=dropZeroOrStenosis(id,d1,r.flow,baseOpts);
      return Object.assign({},r,{d1,d2,drop1,drop2:dropZeroOrStenosis(id,0,r.flow,baseOpts),limitingLesion:d1>0?'proximal':null});
    }
    if(!hasCustomQ&&d1===0){
      const r=directSingle(id,d2,mode,baseOpts),drop2=dropZeroOrStenosis(id,d2,r.flow,baseOpts);
      return Object.assign({},r,{d1,d2,drop1:dropZeroOrStenosis(id,0,r.flow,baseOpts),drop2,limitingLesion:d2>0?'distal':null});
    }
    const v=vessel(id),qRest=qRestFor(id,baseOpts),m=exFactor(mode,baseOpts),qd=qRest*m,qcap=capacitySeries(id,d1,d2,baseOpts),qcap0=capacitySeries(id,0,0,baseOpts),q=Math.min(qd,qcap),flowPct=100*q/qd,headroom0=qcap0-qd;
    const h=headroom0>1e-9?Math.max(0,Math.min(1,(qcap-qd)/headroom0)):(qcap>=qd?1:0),limiting=q<qd*(1-CF.K.flowTol),state=limiting?2:(h<CF.K.reserveOkFrac?1:0);
    const p=partsSeries(id,d1,d2),cx=CF.resolve(baseOpts),drop1=dropZeroOrStenosis(id,d1,q,baseOpts),drop2=dropZeroOrStenosis(id,d2,q,baseOpts),dp=(cx.pa-cx.pv),rs=Math.min(p.rs1,p.rs2),areaPct=100*rs*rs/(p.r0*p.r0);
    const rmn=rminFor(id,qRest),rmn0=rminFor(id,qRest),rrest=dp*MMHG/(q*0+qRest*ML_MIN)-partsSeries(id,0,0).Rp;
    const qq=q*ML_MIN,healthyRp=partsSeries(id,0,0).Rp,dropNarrow=(p.Rv*qq+p.Rt*qq*qq)/MMHG;
    const rmNeeded=q>0?((dp*MMHG)-(p.Rp*qq+dropNarrow*MMHG))/qq:rmn;
    const widened=rrest-rmn0>1e-12?Math.max(0,Math.min(1,(rrest-Math.max(rmNeeded,rmn0))/(rrest-rmn0))):1;
    const maxD=Math.max(d1,d2),band=CF.bandFor(maxD),limitingLesion=(d1===0&&d2===0)?null:(drop1.total>drop2.total+1e-9?'proximal':drop2.total>drop1.total+1e-9?'distal':'both');
    return {id,mode:mode==='exercise'?'exercise':'rest',d:maxD,band,rsMm:rs*1,areaPct,demand:qd,capacity:qcap,flow:q,flowPct,
      cfr:qcap/qRest,cfrHealthy:qcap0/qRest,reservePct:100*h,widenedPct:100*widened,
      dropMmHg:drop1.total+drop2.total,dropViscMmHg:drop1.viscous+drop2.viscous,dropTurbMmHg:drop1.turbulent+drop2.turbulent,
      state,stateLabel:CF.STATES[state],plain:plainSeries(state,mode==='exercise',widened,d1,d2),d1,d2,drop1,drop2,limitingLesion,
      conditions:{exerciseFactor:cx.ex,paMmHg:cx.pa,lesionLenMm:cx.ls,muMPas:cx.mu*1000}};
  }
  function volumeTableSeries(id,d1,d2){
    if(clampD(d2)===0)return CF.volumeTable(id,d1);
    d1=clampD(d1);d2=clampD(d2);const key=id+':'+d1+':'+d2+':'+CF.resolve().ls,cache=volumeTableSeries._cache||(volumeTableSeries._cache={});if(cache[key])return cache[key];
    const n=240,us=new Array(n+1),cum=new Array(n+1);let acc=0;us[0]=0;cum[0]=0;
    for(let i=1;i<=n;i++){const u0=(i-1)/n,u1=i/n,r=radiusSeriesMm(id,d1,d2,(u0+u1)/2);acc+=PI*r*r*(u1-u0)*vessel(id).L;us[i]=u1;cum[i]=acc}
    return cache[key]={id,d1,d2,us,cum,volMm3:acc};
  }
  function distalEndU(id,d1,d2){const v=vessel(id),h=CF.resolve().ls/v.L;return Math.min(1,Math.max(POSITIONS[id].lesion1+h*(d1>0),POSITIONS[id].lesion2+h*(d2>0)))}
  return {K:K,POSITIONS,partsSeries,capacitySeries,radiusSeriesMm,solveSeries,volumeTableSeries,distalEndU};
});
