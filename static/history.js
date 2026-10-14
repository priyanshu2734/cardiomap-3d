/* CardioMap 3D prediction history.
   Wraps fetch() so every prediction any page requests is saved in THIS browser only (localStorage "cm-history-v1").
   Nothing is sent anywhere or stored on the server, which keeps the app's "inputs are not stored" statements true.
   Idempotent: safe to load from <head> and again from shell.js. Also exposes window.cmHistory for the /history page. */
(function(){
if(window.cmHistory)return;
var KEY="cm-history-v1",MAX=500,TG=["CAD","LAD","LCX","RCA"],DRAG_MS=4000,DEDUPE_LOOKBACK=10;
var KINDS={"/predict":"predict","/api/stress-test/run":"stress","/api/case-replay/run":"replay","/nexttest/rank":"nexttest","/whatif/search":"whatif-search"};
var SECTIONS={"/app":"Dashboard","/":"Dashboard","/whatif":"What-If Simulator","/digital-twin":"Digital Twin Lab","/app/digital_twin":"Digital Twin Lab",
 "/detective":"AI Detective","/stress-test":"AI Trust Stress Test","/case-replay":"Case Replay","/what-next":"What Next","/signal-trace":"Signal Trace","/research-lab":"Cardiac Research Lab"};
var KIND_LABEL={"predict":"Prediction","stress":"Stress-test baseline","replay":"Replay run","nexttest":"Next-test baseline","whatif-search":"What-if search baseline","research":"Research Lab run"};

function path(){return location.pathname.replace(/\/$/,"")||"/"}
function sectionOf(p){return SECTIONS[p]||p.replace(/^\//,"").replace(/[-_]/g," ")||"Dashboard"}
function list(){try{var a=JSON.parse(localStorage.getItem(KEY));return Array.isArray(a)?a.filter(function(x){return x&&x.kind!=="heartfn"}):[]}catch(e){return[]}}
function save(a){a=a.slice(0,MAX);
 try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){try{localStorage.setItem(KEY,JSON.stringify(a.slice(0,Math.floor(MAX/4))))}catch(x){}}}
function num(x){return typeof x=="number"&&isFinite(x)?x:null}
function sig(o){return JSON.stringify(Object.keys(o).sort().map(function(k){return[k,o[k]]}))}
function same(a,b){return sig(a.inputs)==sig(b.inputs)&&a.kind==b.kind&&(a.target||"")==(b.target||"")&&JSON.stringify(a.res)==JSON.stringify(b.res)&&JSON.stringify(a.markedSegments||null)==JSON.stringify(b.markedSegments||null)&&(a.hrSource||"")==(b.hrSource||"")&&(a.efSource||"")==(b.efSource||"")}

function record(kind,inputs,res,extra){
 if(!inputs||typeof inputs!="object"||!res)return;
 var clean={},r={},any=false;
 Object.keys(inputs).forEach(function(k){var x=num(inputs[k]);if(x!==null)clean[k]=x});
 TG.forEach(function(t){var s=res[t],p=s&&num(s.p);if(p===null||p===undefined)return;
  r[t]={p:p};var lo=num(s.lo),hi=num(s.hi);if(lo!==null&&hi!==null){r[t].lo=lo;r[t].hi=hi}any=true});
 if(!any)return;
 var p=path(),e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:Date.now(),path:p,section:sectionOf(p),
  kind:kind,inputs:clean,res:r};
 if(extra){
    if(extra.label)e.label=String(extra.label).slice(0,80);
    if(extra.target)e.target=extra.target;
    if(extra.metric)e.metric=String(extra.metric).slice(0,20);
    if(extra.hrSource==='input'||extra.hrSource==='reference')e.hrSource=extra.hrSource;
    if(extra.efSource==='input'||extra.efSource==='reference')e.efSource=extra.efSource;
    if(Array.isArray(extra.markedSegments))e.markedSegments=extra.markedSegments.filter(function(n){return typeof n==='number'&&isFinite(n)&&n>=1&&n<=17}).map(Number).sort(function(a,b){return a-b}).slice(0,17);
  }
 var a=list(),mine=a.filter(function(x){return x.path==p});
 /* The same inputs and results seen recently on the same page are not logged twice (e.g. reloads, A/B toggling). */
 if(kind!="research"&&mine.slice(0,DEDUPE_LOOKBACK).some(function(x){return same(x,e)}))return;
 /* While a slider is being dragged on the dashboard, keep only the last value of the burst. */
 var top=a[0];
 if(kind=="predict"&&p=="/app"&&top&&top.path==p&&top.kind=="predict"&&e.t-top.t<DRAG_MS){e.id=top.id;a[0]=e}else a.unshift(e);
 save(a)}

function probs(map,pick){var o={};TG.forEach(function(t){var s=map&&map[t];if(!s)return;var iv=s.interval||{};
 var p=pick?pick(s):s.p;o[t]={p:p,lo:iv.lo,hi:iv.hi}});return o}

function handle(kind,body,j){
 if(!j||typeof j!="object")return;
 if(kind=="predict")record(kind,body,probs(j));
 else if(kind=="stress"){var b={};TG.forEach(function(t){if(j.baseline_predictions)b[t]={p:j.baseline_predictions[t]}});record(kind,body.inputs,b)}
 else if(kind=="replay")record(kind,j.input_snapshot||body.inputs,probs(j.outputs,function(s){return s.probability}),{label:j.label});
 else if(kind=="nexttest"){if(j.targets)record(kind,body.profile,probs(j.targets))}
 else if(kind=="whatif-search"){var t=body.target,r={};if(t&&j.baseline){r[t]={p:j.baseline.p};if(j.baseline.interval)r[t].interval=j.baseline.interval;
  record(kind,body.profile,probs(r),{target:t})}}}

window.cmHistory={record:record,KEY:KEY,TARGETS:TG,KIND_LABEL:KIND_LABEL,list:list,sectionOf:sectionOf,
 remove:function(id){save(list().filter(function(x){return x.id!==id}))},
 clear:function(){try{localStorage.removeItem(KEY)}catch(e){}}};

if(!window.fetch)return;
var of=window.fetch.bind(window);
window.fetch=function(u,o){
 var r=of.apply(null,arguments);
 try{
  var url=typeof u=="string"?u:(u&&u.url)||"",kind=KINDS[new URL(url,location.href).pathname.replace(/\/$/,"")];
  if(kind&&o&&typeof o.body=="string"){
   var body=JSON.parse(o.body);
   r.then(function(resp){if(!resp.ok)return;resp.clone().json().then(function(j){try{handle(kind,body,j)}catch(e){}},function(){})},function(){});
  }
 }catch(e){}
 return r};
})();
