/* HeartConditions: typed-input rules and presets for the Heart Function Lab.
   Pure browser + Node module. Out-of-range values are REJECTED with a message, never silently clamped or rounded.
   Ranges for heart rate and ejection fraction match HeartPhysio; the flow ranges are teaching ranges for CoronaryFlow's what-if context. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.HeartConditions=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const FIELDS=Object.freeze({
    hr:{label:'Heart rate',unit:'bpm',min:40,max:130,def:72,dec:0},
    ef:{label:'Ejection fraction',unit:'%',min:15,max:65,def:60,dec:0},
    exerciseFactor:{label:'Exercise intensity',unit:'× resting demand',min:1,max:4,def:3.5,dec:1},
    paMmHg:{label:'Mean aortic pressure',unit:'mmHg',min:60,max:120,def:90,dec:0},
    lesionLenMm:{label:'Narrowing length',unit:'mm',min:5,max:30,def:10,dec:0},
    hct:{label:'Hematocrit',unit:'%',min:25,max:60,def:45,dec:0},
    narrow:{label:'Narrowing',unit:'%',min:0,max:95,def:0,dec:0},
    narrow2:{label:'Second narrowing',unit:'%',min:0,max:99,def:0,dec:0}
  });
  function fmt(f,x){return f.dec?x.toFixed(f.dec):String(x)}
  function decimalsOf(str){const m=/^[+-]?\d*\.?(\d*)$/.exec(str);return m?m[1].length:null}
  /* returns {ok:true,empty:true} for blank input (meaning: back to reference), {ok:true,value} for a good number, or {ok:false,message} */
  function validate(key,raw){
    const f=FIELDS[key];if(!f)throw new Error('Unknown field '+key);
    const str=String(raw==null?'':raw).trim();
    if(str==='')return {ok:true,empty:true};
    const range=fmt(f,f.min)+' to '+fmt(f,f.max)+' '+f.unit;
    if(!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(str))return {ok:false,message:f.label+' must be a number from '+range+'. "'+str+'" was rejected.'};
    const x=Number(str);
    if(!isFinite(x)||x<f.min||x>f.max)return {ok:false,message:f.label+' must be from '+range+'. '+str+' was rejected, not adjusted.'};
    const d=decimalsOf(str);
    if(d!=null&&d>f.dec)return {ok:false,message:f.label+' accepts '+(f.dec===0?'whole numbers':f.dec+' decimal place'+(f.dec>1?'s':''))+' ('+range+'). '+str+' was rejected, not rounded.'};
    return {ok:true,value:x};
  }
  function rangeText(key){const f=FIELDS[key];return fmt(f,f.min)+' to '+fmt(f,f.max)+' '+f.unit}
  /* conditions: null = reference. Keys: exerciseFactor, paMmHg, lesionLenMm, hct */
  const REFERENCE=Object.freeze({exerciseFactor:null,paMmHg:null,lesionLenMm:null,hct:null});
  const PRESETS=Object.freeze([
    {id:'healthy',label:'Healthy',note:'No narrowing, exercise at the reference effort: plenty of reserve.',narrow:{LAD:0,LCX:0,RCA:0},narrow2:{LAD:0,LCX:0,RCA:0},mode:'exercise',cond:{}},
    {id:'moderate-lad-ex',label:'Moderate LAD at exercise',note:'60% LAD narrowing at 2.5× effort: demand is still met but little reserve is left. Raise the effort to 3.5× to see flow fall short.',narrow:{LAD:60,LCX:0,RCA:0},narrow2:{LAD:0,LCX:0,RCA:0},mode:'exercise',cond:{exerciseFactor:2.5}},
    {id:'severe-long',label:'Severe long lesion',note:'80% LAD narrowing over 30 mm (a long, diffuse lesion): flow falls short even at rest.',narrow:{LAD:80,LCX:0,RCA:0},narrow2:{LAD:0,LCX:0,RCA:0},mode:'rest',cond:{lesionLenMm:30}},
    {id:'low-pressure',label:'Low pressure + effort',note:'50% LAD narrowing with aortic pressure 65 mmHg at 3.0× effort: less pressure pushes less blood through the same narrowing.',narrow:{LAD:50,LCX:0,RCA:0},narrow2:{LAD:0,LCX:0,RCA:0},mode:'exercise',cond:{paMmHg:65,exerciseFactor:3}}
  ]);
  const EFFORT_STEPS=Object.freeze([1,1.5,2,2.5,3,3.5,4]);
  return {FIELDS,validate,rangeText,REFERENCE,PRESETS,EFFORT_STEPS};
});
