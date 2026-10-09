/* CardioMap Heart Function Lab: patient-driven physiology teaching helpers.
   Pure browser + Node module. No patient-specific clinical inference. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.HeartPhysio=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const HR_REF=72,HR_MIN=40,HR_MAX=130,EF_REF=60,EF_MIN=15,EF_MAX=65;
  const EDV_REF_ML=120; /* fixed illustrative end-diastolic volume; not measured */
  const SYS_REF=0.35,SYS_SHIFT=0.08,RELAX_REF=0.20,ATRIAL_FRAC=0.12;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function finite(x){return typeof x==='number'&&isFinite(x);}
  function usable(x,nm,key){return finite(x)&&!(nm&&typeof nm.has==='function'&&nm.has(key));}
  function heartRate(vals,nm){
    const x=vals&&vals.PR!=null&&vals.PR!==''?Number(vals.PR):null;
    if(usable(x,nm,'PR')&&x>=HR_MIN&&x<=HR_MAX)return {value:x,unit:'bpm',source:'input'};
    return {value:HR_REF,unit:'bpm',source:'reference'};
  }
  function ejectionFraction(ef,nm){
    const x=ef==null?null:(typeof ef==='number'?ef:Number(ef));
    if(usable(x,nm,'EF-TTE')&&x>=EF_MIN&&x<=EF_MAX)return {value:x,unit:'%',source:'input'};
    return {value:EF_REF,unit:'%',source:'reference'};
  }
  function contractionFactor(ef,nm){
    const e=ejectionFraction(ef,nm);
    return {value:clamp(e.value,EF_MIN,EF_MAX)/EF_REF,source:e.source,ef:e.value};
  }
  function strokeVolume(ef,nm){
    const e=ejectionFraction(ef,nm),value=EDV_REF_ML*e.value/100;
    return {value,unit:'mL/beat',source:e.source};
  }
  function cardiacOutput(vals,nm){
    const hr=heartRate(vals,nm),sv=strokeVolume(vals&&vals['EF-TTE'],nm),value=sv.value*hr.value/1000;
    return {value,unit:'L/min',source:(hr.source==='input'||sv.source==='input')?'input':'reference'};
  }
  function timing(hr){
    const h=clamp(Number(hr)||HR_REF,HR_MIN,HR_MAX);
    const systole=clamp(SYS_REF+SYS_SHIFT*(h-HR_REF)/(HR_MAX-HR_REF),SYS_REF-SYS_SHIFT*0.5,SYS_REF+SYS_SHIFT);
    const diastole=1-systole;
    return {hr:h,beatSec:60/h,systole,diastole,relaxEnd:Math.min(0.9,systole+RELAX_REF),atrialStart:1-ATRIAL_FRAC};
  }
  function squeeze(phi,hr){
    const tm=timing(hr),p=((phi%1)+1)%1,s=tm.systole,re=tm.relaxEnd;
    if(p<s)return .5*(1-Math.cos(Math.PI*p/s));
    if(p<re)return .5*(1+Math.cos(Math.PI*(p-s)/(re-s)));
    return 0;
  }
  const NORM=Object.create(null),NORM_CACHE_MAX=384;
  function pulseFactor(id,phi,hr,vessel){
    const v=vessel||(typeof window!=='undefined'&&window.CoronaryFlow&&window.CoronaryFlow.VESSELS);
    const rec=v&&v[id],k=rec?rec.sysImpede:0;
    const tm=timing(hr),key=id+':'+tm.hr;
    let norm=NORM[key];
    if(norm==null){
      let sum=0,n=2000;
      for(let i=0;i<n;i++)sum+=1-k*squeeze((i+.5)/n,tm.hr);
      norm=n/sum;
      if(Object.keys(NORM).length>=NORM_CACHE_MAX){for(const oldKey in NORM){delete NORM[oldKey];break;}}
      NORM[key]=norm;
    }
    return (1-k*squeeze(phi,tm.hr))*norm;
  }
  /* The dashboard snapshot (cm-case-v1) stores vals and nm keyed by field ID (pr, ef, rwma). The helpers here use dataset COLUMNS
     (PR, EF-TTE, Region RWMA). Map ids to columns through the snapshot's own ui table; keys that are already columns pass through. */
  function normaliseCase(j){
    const byId={};
    if(j&&Array.isArray(j.ui))j.ui.forEach(u=>{if(u&&typeof u.id==='string'&&typeof u.column==='string')byId[u.id]=u.column;});
    const vals={},nm=new Set(),src=(j&&j.vals&&typeof j.vals==='object')?j.vals:{};
    Object.keys(src).forEach(k=>{vals[byId[k]||k]=src[k];});
    (j&&Array.isArray(j.nm)?j.nm:[]).forEach(k=>{nm.add(byId[k]||k);});
    return {vals,nm};
  }
  function snapshot(vals,nm){
    const hr=heartRate(vals,nm),ef=ejectionFraction(vals&&vals['EF-TTE'],nm),cf=contractionFactor(vals&&vals['EF-TTE'],nm),sv=strokeVolume(vals&&vals['EF-TTE'],nm),co=cardiacOutput(vals,nm);
    return {hr,ef,contraction:cf,strokeVolume:sv,cardiacOutput:co,timing:timing(hr.value)};
  }
  return {HR_REF,HR_MIN,HR_MAX,EF_REF,EF_MIN,EF_MAX,EDV_REF_ML,SYS_REF,SYS_SHIFT,RELAX_REF,ATRIAL_FRAC,NORM_CACHE_MAX,heartRate,ejectionFraction,contractionFactor,strokeVolume,cardiacOutput,timing,squeeze,pulseFactor,normaliseCase,snapshot};
});
