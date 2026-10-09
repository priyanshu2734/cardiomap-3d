/* CardioMap 3D: current-case handoff for the Explain pages.
   The dashboard publishes the case to localStorage ("cm-case-v1", same-origin, same pattern as the Trust Center's "cm-xai-v1").
   This script rebuilds the few globals the moved panels expect (U, v, NM, sel, res, API, ...) from it. No case -> res stays null. */
var CM_CASE=null,CM_Q=new URLSearchParams(location.search),CM_KEY=CM_Q.get("case")==="twin"?"cm-case-twin":"cm-case-v1",CM_EMBED=CM_Q.get("embed")==="1";
if(CM_EMBED)document.documentElement.classList.add("cm-embed");
(function(){try{var j=JSON.parse(localStorage.getItem(CM_KEY)||"null");if(j&&j.res&&j.res.CAD&&Array.isArray(j.ui))CM_CASE=j}catch(e){}})();
var TG=["CAD","LAD","LCX","RCA"],U=CM_CASE?CM_CASE.ui:[],byCol={},v={},NM=new Set(),
 sel=(CM_CASE&&TG.indexOf(CM_CASE.sel)>=0)?CM_CASE.sel:"CAD",res=CM_CASE?CM_CASE.res:null,
 API=(new URLSearchParams(location.search).get("api"))||(CM_CASE&&CM_CASE.api)||location.origin,
 $=function(id){return document.getElementById(id)},
 lvl=function(p){return p<.4?["\u25CF","Low","#3ddc97"]:p<.65?["\u25C6","Moderate","#ffb84d"]:["\u25B2","High","#ff5a6e"]},
 xOnline=function(){return !!(res&&res.shap&&res.shap.targets)};
U.forEach(function(u){byCol[u.column]=u});
if(CM_CASE){Object.keys(CM_CASE.vals||{}).forEach(function(k){v[k]=CM_CASE.vals[k]});(CM_CASE.nm||[]).forEach(function(k){NM.add(k)})}
try{var _s=JSON.parse(sessionStorage.getItem("cm-case-sel")||"null");if(CM_CASE&&_s&&_s.t===CM_CASE.t&&TG.indexOf(_s.sel)>=0)sel=_s.sel}catch(e){}
var CM_SEGMENTS=[
 {n:1,name:'Basal anterior',ring:'basal',vessel:'LAD',alt:null},
 {n:2,name:'Basal anteroseptal',ring:'basal',vessel:'LAD',alt:null},
 {n:3,name:'Basal inferoseptal',ring:'basal',vessel:'RCA',alt:null},
 {n:4,name:'Basal inferior',ring:'basal',vessel:'RCA',alt:null},
 {n:5,name:'Basal inferolateral',ring:'basal',vessel:'LCX',alt:'RCA'},
 {n:6,name:'Basal anterolateral',ring:'basal',vessel:'LCX',alt:null},
 {n:7,name:'Mid anterior',ring:'mid',vessel:'LAD',alt:null},
 {n:8,name:'Mid anteroseptal',ring:'mid',vessel:'LAD',alt:null},
 {n:9,name:'Mid inferoseptal',ring:'mid',vessel:'RCA',alt:null},
 {n:10,name:'Mid inferior',ring:'mid',vessel:'RCA',alt:null},
 {n:11,name:'Mid inferolateral',ring:'mid',vessel:'LCX',alt:'RCA'},
 {n:12,name:'Mid anterolateral',ring:'mid',vessel:'LCX',alt:null},
 {n:13,name:'Apical anterior',ring:'apical',vessel:'LAD',alt:null},
 {n:14,name:'Apical septal',ring:'apical',vessel:'LAD',alt:null},
 {n:15,name:'Apical inferior',ring:'apical',vessel:'RCA',alt:'LAD'},
 {n:16,name:'Apical lateral',ring:'apical',vessel:'LCX',alt:'LAD'},
 {n:17,name:'Apex',ring:'apex',vessel:'LAD',alt:['RCA','LCX']}
];
window.CM_SEGMENTS=CM_SEGMENTS;
function syncSelectedVesselToParent(){}
/* Same role as the dashboard's paint(): selection changes re-render every panel on the page. */
function paint(){
 try{if(CM_CASE)sessionStorage.setItem("cm-case-sel",JSON.stringify({t:CM_CASE.t,sel:sel}))}catch(e){}
 [].slice.call(document.querySelectorAll("[data-case-vessel]")).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.caseVessel===sel))});
 if(window.cmSignalTracePaint)window.cmSignalTracePaint();
 if(window.ntSchedule)window.ntSchedule();
}
/* Shared page behaviour: empty state, case age, vessel bar. */
document.addEventListener("DOMContentLoaded",function(){
 var none=$("noCase"),wrap=$("caseWrap"),age=$("caseAge");
 if(!CM_CASE){if(none)none.hidden=false;if(wrap)wrap.hidden=true;return}
 if(none)none.hidden=true;if(wrap)wrap.hidden=false;
 if(age){var m=Math.max(0,Math.round((Date.now()-CM_CASE.t)/60000));age.textContent=m<1?"just now":m<60?m+" min ago":Math.round(m/60)+" h ago"}
 [].slice.call(document.querySelectorAll("[data-case-vessel]")).forEach(function(b){b.addEventListener("click",function(){sel=b.dataset.caseVessel;paint()})});
 paint();
});

/* Embedded mode: live-refresh when the host page publishes a new case, and report height to the host. */
(function(){
 var tm=0;window.addEventListener("storage",function(e){if(e.key!==CM_KEY||location.pathname==="/heart-function")return;clearTimeout(tm);tm=setTimeout(function(){location.reload()},250)});
 if(!CM_EMBED)return;
 if(CM_KEY==="cm-case-twin")document.addEventListener("DOMContentLoaded",function(){var n=document.getElementById("noCase");if(!n)return;var p=n.querySelector("p"),a=n.querySelector("a");if(p)p.textContent="Enter some baseline inputs above (or switch on the Confidence halo). This panel then updates automatically.";if(a)a.hidden=true});
 document.addEventListener("DOMContentLoaded",function(){[].slice.call(document.querySelectorAll("a[href]")).forEach(function(a){a.target="_top"})});
 function post(){var b=document.body;if(!b)return;var h=Math.ceil(b.getBoundingClientRect().height);try{parent.postMessage({cmEmbedH:h},"*")}catch(e){}}
 document.addEventListener("DOMContentLoaded",function(){post();if(window.ResizeObserver)new ResizeObserver(post).observe(document.body);setTimeout(post,500);setTimeout(post,1500)});
 window.addEventListener("load",post);
})();
