/* CardioMap Heart Function Lab: Wiggers-style teaching traces.
   Pure browser + Node module. Pressure, volume and inflow are analytic teaching forms. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./coronary-flow.js'),require('./heart-effects.js'),require('./heart-physio.js'),require('./heart-anatomy.js'));
  else root.HeartWiggers=factory(root.CoronaryFlow,root.HeartEffects,root.HeartPhysio,root.HeartAnatomy);
})(typeof self!=='undefined'?self:this,function(CF,HE,HP,AN){
  'use strict';
  const SYS_REF=120,DIA_REF=80,DIA_MIN_GAP=25,LV_DIA=8,EJECT_START=.18,EJECT_END=.85;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>t<=0?0:t>=1?1:.5*(1-Math.cos(Math.PI*t));
  function phases(hr){const t=HP.timing(hr);return {hr:t.hr,beatSec:t.beatSec,systole:t.systole,diastole:t.diastole,relaxEnd:t.relaxEnd,atrialStart:t.atrialStart};}
  function pressureInputs(snapshot){
    const n=HP.normaliseCase(snapshot),vals=n.vals||{},nm=n.nm||new Set(),x=Number(vals.BP),usable=isFinite(x)&&x>=80&&x<=200&&!nm.has('BP');
    const sys=usable?x:SYS_REF,dia=Math.min(DIA_REF,sys-DIA_MIN_GAP);
    return {systolic:sys,diastolic:dia,systolicSource:usable?'input':'reference',diastolicSource:'teaching-assumption'};
  }
  /* Pressure forms (teaching shapes, all continuous and periodic in phase):
     - isovolumic rise 0..e0 (e0 = systole*EJECT_START): LV pressure climbs from LV_DIA to the aortic diastolic value; aortic stays at diastolic.
     - ejection e0..e1: LV pressure equals aortic pressure; aortic rises to systolic at 58% of systole, then eases.
     - relaxation e1..relaxEnd: LV pressure falls to LV_DIA; aortic eases to a small notch level (8% of pulse pressure).
     - then aortic decays to diastolic by phase 0.88 and holds (minimum at end diastole). */
  const NOTCH=.08,DECAY_END=.88;
  function aorticPressure(phi,hr,sys,dia){
    const tm=HP.timing(hr),p=((phi%1)+1)%1,se=tm.systole,re=tm.relaxEnd,e0=se*EJECT_START;
    const peak=se*.58;
    let q;
    if(p<e0)q=0;
    else if(p<peak)q=smooth((p-e0)/(peak-e0));
    else if(p<re)q=1-(1-NOTCH)*smooth((p-peak)/(re-peak));
    else if(p<DECAY_END)q=NOTCH*(1-(p-re)/(DECAY_END-re));
    else q=0;
    return dia+(sys-dia)*clamp(q,0,1);
  }
  function lvPressure(phi,hr,sys,dia){
    const tm=HP.timing(hr),p=((phi%1)+1)%1,se=tm.systole,re=tm.relaxEnd,e0=se*EJECT_START,e1=se*EJECT_END;
    if(p<e0)return LV_DIA+(dia-LV_DIA)*smooth(p/Math.max(e0,1e-6));
    const ao=aorticPressure(p,hr,sys,dia);
    if(p<=e1)return ao;
    if(p<re){const s=smooth((p-e1)/Math.max(re-e1,1e-6));return Math.max(LV_DIA,ao*(1-s)+LV_DIA*s);}
    return LV_DIA;
  }
  function lvVolume(phi,hr,ef){
    const sv=HP.strokeVolume(ef,new Set()).value,q=HP.squeeze(phi,hr);return HP.EDV_REF_ML-sv*q;
  }
  function ecg(phi,stMv){return HE.ecg(phi,stMv||0)}
  function inflow(phi,vesselId,narrowing,mode,hr,context){
    const r=context&&AN?AN.effective(vesselId,narrowing,context.narrow2&&context.narrow2[vesselId]||0,mode,{dominance:context.dominance,collateral:context.collateral}):CF.solve(vesselId,narrowing,mode);
    return r.flow*HP.pulseFactor(vesselId,phi,hr,CF.VESSELS);
  }
  function sample(snapshot,physio,vesselId,narrowing,mode,stMv,n,context){
    const p=pressureInputs(snapshot),hr=physio&&physio.hr?physio.hr.value:HP.HR_REF,ef=physio&&physio.ef?physio.ef.value:HP.EF_REF,N=n||240;
    const aortic=[],lv=[],vol=[],ec=[],inf=[];for(let i=0;i<N;i++){const ph=i/N;aortic.push(aorticPressure(ph,hr,p.systolic,p.diastolic));lv.push(lvPressure(ph,hr,p.systolic,p.diastolic));vol.push(lvVolume(ph,hr,ef));ec.push(ecg(ph,stMv));inf.push(inflow(ph,vesselId,narrowing,mode,hr,context));}
    const sv=HP.strokeVolume(ef,new Set()).value,tm=HP.timing(hr);
    return {inputs:p,phases:phases(hr),series:{aortic,lv,volume:vol,ecg:ec,inflow:inf},stats:{peakAortic:p.systolic,minAortic:p.diastolic,maxLV:p.systolic,minLV:LV_DIA,edv:HP.EDV_REF_ML,esv:HP.EDV_REF_ML-sv,strokeVolume:sv,beatSec:tm.beatSec,systoleSec:tm.systole*tm.beatSec,diastoleSec:tm.diastole*tm.beatSec}};
  }
  return {SYS_REF,DIA_REF,DIA_MIN_GAP,LV_DIA,EJECT_START,EJECT_END,NOTCH,DECAY_END,phases,pressureInputs,aorticPressure,lvPressure,lvVolume,ecg,inflow,sample};
});
