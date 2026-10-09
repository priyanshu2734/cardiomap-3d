/* CardioMap Heart Function Lab: pure AHA 17-segment bullseye helpers.
   The segment table is NOT duplicated here: browser code reads window.CM_SEGMENTS from case-handoff.js. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.HeartSegments=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const CENTER=75,GAP=1.1;
  const RINGS=[
    {key:'basal',label:'Basal',r0:41,r1:55,count:6,first:1},
    {key:'mid',label:'Mid',r0:27.5,r1:41,count:6,first:7},
    {key:'apical',label:'Apical',r0:14,r1:27.5,count:4,first:13},
    {key:'apex',label:'Apex',r0:0,r1:14,count:1,first:17}
  ];
  const BANDS=[
    {key:'low',label:'Low',symbol:'●',min:0,max:.4},
    {key:'moderate',label:'Moderate',symbol:'◆',min:.4,max:.65},
    {key:'high',label:'High',symbol:'▲',min:.65,max:1}
  ];
  function segments(source){
    const s=source||(typeof window!=='undefined'&&window.CM_SEGMENTS);
    return Array.isArray(s)?s.slice():[];
  }
  function altList(s){return s&&s.alt?(Array.isArray(s.alt)?s.alt.slice():[s.alt]):[]}
  function band(p){
    if(typeof p!=='number'||!isFinite(p)||p<0||p>1)return {key:'neutral',label:'Neutral',symbol:'○'};
    return p<.4?BANDS[0]:p<.65?BANDS[1]:BANDS[2];
  }
  function polar(r,deg){const a=deg*Math.PI/180;return [CENTER+r*Math.sin(a),CENTER-r*Math.cos(a)];}
  function sectorPath(r0,r1,a0,a1){
    const i0=r0+GAP,o1=r1-GAP,da0=r0>0?(GAP/Math.max(r0,1))*57.3:0,da1=(GAP/o1)*57.3;
    const p1=polar(o1,a0+da1),p2=polar(o1,a1-da1),p3=polar(i0,a1-da0),p4=polar(i0,a0+da0);
    return 'M'+p1.map(x=>x.toFixed(2)).join(' ')+'A'+o1+' '+o1+' 0 0 1 '+p2.map(x=>x.toFixed(2)).join(' ')+'L'+p3.map(x=>x.toFixed(2)).join(' ')+'A'+i0+' '+i0+' 0 0 0 '+p4.map(x=>x.toFixed(2)).join(' ')+'Z';
  }
  function geometry(n,source){
    const s=segments(source).find(x=>x.n===n);if(!s)return null;
    const rg=RINGS.find(x=>x.key===s.ring);if(!rg)return null;
    const j=n-rg.first;
    if(rg.key==='apex'){
      const r=rg.r1-GAP;
      return {ring:rg.key,path:'M'+CENTER+' '+(CENTER-r)+'A'+r+' '+r+' 0 1 1 '+(CENTER-.01)+' '+(CENTER-r)+'Z',center:[CENTER,CENTER]};
    }
    const span=360/rg.count,c=-span*j;
    return {ring:rg.key,path:sectorPath(rg.r0,rg.r1,c-span/2,c+span/2),center:polar((rg.r0+rg.r1)/2,c)};
  }
  function segmentNumberForPolar(angleDeg,t){
    let u=((Number(angleDeg)+180)%360+360)%360-180;
    const h=Math.max(0,Math.min(1,Number(t)));
    if(h>=.86)return 17;
    if(h>=.62){const j=Math.floor((((-u)+45)%360+360)%360/90);return 13+(j%4);}
    if(h>=.32){const j=Math.floor((((-u)+30)%360+360)%360/60);return 7+(j%6);}
    const j=Math.floor((((-u)+30)%360+360)%360/60);return 1+(j%6);
  }
  function segmentForPolar(angleDeg,t,source){
    const n=segmentNumberForPolar(angleDeg,t),s=segments(source).find(x=>x.n===n);return s||null;
  }
  function labelFor(s,p){
    const b=band(p),alt=altList(s);
    return 'Segment '+s.n+', '+s.name+', usually '+s.vessel+(alt.length?' (supply varies)':'')+', model estimate '+(typeof p==='number'?p.toFixed(2):'not available')+', '+b.label.toLowerCase();
  }
  /* estimate: either a flat map {LAD,LCX,RCA} of probabilities or the object from HeartEffects.parseCase ({p:{...},range,...}). */
  function probs(estimate){
    const m=estimate&&typeof estimate==='object'?(estimate.p&&typeof estimate.p==='object'?estimate.p:estimate):null;
    if(!m)return null;
    const out={};let ok=true;
    ['LAD','LCX','RCA'].forEach(id=>{const x=m[id];if(typeof x==='number'&&isFinite(x))out[id]=x;else ok=false;});
    return ok?out:null;
  }
  function concordance(estimate,markedNumbers,rwmaCount,source){
    const ss=segments(source),marks=(Array.isArray(markedNumbers)?markedNumbers:[]).map(Number).filter(Number.isInteger);
    const marked=ss.filter(s=>marks.indexOf(s.n)>=0),vessels=[...new Set(marked.map(s=>s.vessel))],p=probs(estimate);
    let outcome='Not enough information',best=null;
    if(p&&marks.length){
      best=['LAD','LCX','RCA'].reduce((b,id)=>b==null||p[id]>p[b]+1e-12?id:b,null);
      outcome=vessels.indexOf(best)>=0?"Consistent with the model's highest-ranked vessel":"Marked territory differs from the model's ranking";
    }
    return {outcome,best,vessels,countMismatch:typeof rwmaCount==='number'&&marks.length>0&&rwmaCount!==marks.length,marked};
  }
  function allNumbers(source){return segments(source).map(x=>x.n).sort((a,b)=>a-b);}
  return {CENTER,GAP,RINGS,BANDS,segments,altList,band,polar,sectorPath,geometry,segmentNumberForPolar,segmentForPolar,labelFor,concordance,allNumbers};
});
