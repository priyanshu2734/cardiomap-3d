/* CardioMap 3D shell: one navigation, theme toggle, scroll progress and footer for every page. */
(function(){
if(/[?&]embed=1/.test(location.search)){document.documentElement.classList.add("cm-embed");return}
var T=[{n:"Dashboard",h:"/app/"},
 {n:"History",h:"/history"},
 {n:"Simulate",g:[["What-If Simulator","/whatif","Compare hypothetical profiles"],["Case Replay","/case-replay","Reproduce a saved run"]]},
 {n:"Labs",g:[["Digital Twin Lab","/digital-twin","Explore the coronary twin"],["AI Trust Stress Test","/stress-test","Probe sensitivity to inputs"]]},
 {n:"Explain",g:[["AI Detective","/detective","Why did the model say this?"],["Architecture Map","/architecture","How CardioMap works end to end"]]},
 {n:"Trust",g:[["Trust Center","/trust-center","Metrics, ROC and calibration"],["Validation Report","/validation","Cross-validation results and methods"]]},
 {n:"Research",g:[["Cardiac Research Lab","/research-lab","Pre-angiography triage experiments"],["Research Evidence Library","/evidence","Source-grounded answers and file hashes"]]}];
var p=location.pathname.replace(/\/$/,"")||"/",al={"/app":"/app","/":"/app"};p=al[p]||p;
var on=function(h){return h.replace(/\/$/,"")===p||(h=="/app/"&&p=="/app")};
var ic=function(d){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>'};
function logo(){return '<svg viewBox="0 0 100 100" aria-hidden="true" style="stroke-width:6;width:23px;height:23px"><path d="M32 62C21 52 21 34 33 28c7-3 14-1 17 5 3-6 10-8 17-5 12 6 12 24 1 34"/><path d="M33 70 50 52 66 68"/><path d="M38 74 50 84 62 74"/><path d="M47 60h12M53 54v12"/><circle cx="31" cy="71" r="6" fill="#fff" stroke="none"/></svg>'}
function nav(){var o="";T.forEach(function(t){if(t.h)o+='<a href="'+t.h+'"'+(on(t.h)?' class="on" aria-current="page"':"")+">"+t.n+"</a>";else{var a=t.g.some(function(x){return on(x[1])});o+='<div class="cm-grp'+(a?" on":"")+'"><button type="button" aria-expanded="false" aria-haspopup="true">'+t.n+'</button><div class="cm-menu">'+t.g.map(function(x){return '<a href="'+x[1]+'"'+(on(x[1])?' class="on" aria-current="page"':"")+"><b>"+x[0]+"</b><small>"+x[2]+"</small></a>"}).join("")+"</div></div>"}});return o}
function bar(){var b=document.createElement("div");b.className="cm-bar";b.setAttribute("role","banner");
 b.innerHTML='<a class="cm-brand" href="/app/"><i>'+logo()+"</i>CardioMap 3D</a><nav class=\"cm-nav\" aria-label=\"Site\">"+nav()+'</nav><div class="cm-tools"><a class="cm-ai" href="/assistant">'+ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')+'<span>AI Assistant</span></a><button type="button" class="cm-th" aria-label="Toggle theme">'+'<span class="cm-moon">'+ic('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>')+'</span><span class="cm-sun">'+ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')+'</span></button><button type="button" class="cm-burger" aria-label="Menu" aria-expanded="false">'+ic('<path d="M4 6h16M4 12h16M4 18h16"/>')+"</button></div>";
 return b}
function wire(b){var g=[].slice.call(b.querySelectorAll(".cm-grp"));
 var close=function(){g.forEach(function(x){x.classList.remove("open");x.firstChild.setAttribute("aria-expanded","false")})};
 g.forEach(function(x){var bt=x.firstChild;var hoverOK=function(){return matchMedia("(min-width:961px)").matches},tmr=0;bt.onclick=function(e){e.stopPropagation();clearTimeout(tmr);var o=hoverOK()?true:!x.classList.contains("open");close();x.classList.toggle("open",o);bt.setAttribute("aria-expanded",o)};x.onmouseenter=function(){clearTimeout(tmr);if(hoverOK()){close();x.classList.add("open");bt.setAttribute("aria-expanded","true")}};x.onmouseleave=function(){if(hoverOK()){clearTimeout(tmr);tmr=setTimeout(close,260)}}});
 document.addEventListener("click",close);document.addEventListener("keydown",function(e){if(e.key=="Escape"){close();b.classList.remove("open")}});
 var bu=b.querySelector(".cm-burger");if(bu)bu.onclick=function(e){e.stopPropagation();var o=b.classList.toggle("open");this.setAttribute("aria-expanded",o)};
 var th0=b.querySelector(".cm-th");if(th0)th0.onclick=function(){var d=document.documentElement.dataset.theme=="dark"?"light":"dark";document.documentElement.dataset.theme=d;try{localStorage.setItem("cm-theme",d)}catch(x){}}}
function init(){if(!window.__cmBg){var B=document.createElement("script");B.src="/static/bg.js?v=20261008b";document.body.appendChild(B)}if(!document.querySelector('link[href*="cardiomap-pro.css"]')){var L=document.createElement("link");L.rel="stylesheet";L.href="/static/cardiomap-pro.css?v=20261004a";document.head.appendChild(L)}
 try{document.documentElement.dataset.theme=localStorage.getItem("cm-theme")||document.documentElement.dataset.theme||"light"}catch(e){document.documentElement.dataset.theme=document.documentElement.dataset.theme||"light"}
 var lab=document.body.classList.contains("cm-lab"),b;
 if(lab){b=bar();document.body.insertBefore(b,document.body.firstChild);wire(b);
  [].slice.call(document.querySelectorAll("header nav, header .links, nav.links, nav.nav, nav.actions")).forEach(function(n){if(!n.closest(".cm-bar"))n.remove()});
  [].slice.call(document.body.children).forEach(function(a){if(a.tagName=="A"&&!a.closest(".cm-bar"))a.remove()});
  var f=document.createElement("footer");f.className="cm-foot";if(document.body.hasAttribute("data-no-foot"))f=null;if(f){f.innerHTML='<span>CardioMap 3D · educational research prototype. Not a diagnostic device or medical advice.</span><span><a href="/app/">Dashboard</a> · <a href="/assistant">AI Assistant</a> · <a href="/validation">Validation Report</a></span>';document.body.appendChild(f)}
  var p=document.createElement("div");p.className="cm-prog";p.innerHTML="<i></i>";document.body.appendChild(p);var bar_=p.firstChild;
  var up=function(){var m=document.documentElement.scrollHeight-innerHeight;bar_.style.width=(m>0?Math.min(100,scrollY/m*100):0)+"%"};up();addEventListener("scroll",up,{passive:true});
  var els=[].slice.call(document.querySelectorAll("body.cm-lab .panel,body.cm-lab .card,body.cm-lab .hero-card"));
  if("IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.06});els.forEach(function(e){e.setAttribute("data-cm-reveal","");io.observe(e)})}}
 var dh=document.querySelector("body>.wrap>header");
 if(dh&&!lab&&!dh.querySelector(".cm-nav")){var ob=dh.querySelector(".brand"),rl=dh.querySelector(".section-rail"),ac=dh.querySelector(".hd-actions");
  if(ob&&rl&&ac){var nb=document.createElement("a");nb.className="cm-brand";nb.href="/app/";nb.setAttribute("aria-label","CardioMap 3D dashboard");nb.innerHTML="<i>"+logo()+"</i>CardioMap 3D";ob.replaceWith(nb);
   var nn=document.createElement("nav");nn.className="cm-nav";nn.setAttribute("aria-label","Site");nn.innerHTML=nav();rl.replaceWith(nn);
   var bg=document.createElement("button");bg.type="button";bg.className="cm-burger";bg.setAttribute("aria-label","Menu");bg.setAttribute("aria-expanded","false");bg.innerHTML=ic('<path d="M4 6h16M4 12h16M4 18h16"/>');ac.appendChild(bg);
   dh.classList.add("hd-unified");wire(dh);
   var ai=ac.querySelector(".hd-ai");if(ai)ai.classList.add("cm-ai");}}
 [].slice.call(document.querySelectorAll("[data-cm-explore]")).forEach(function(h){h.className="cm-explore";
  var IC={Overview:'<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',Simulate:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',Labs:'<path d="M9 3v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9V3M8 3h8"/>',Explain:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',Trust:'<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',Reference:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>'};
  var G=[],cur=null;T.forEach(function(t){if(t.g){G.push({n:t.n,i:t.g});cur=null}else{var k=t.n=="Dashboard"||t.n=="History"?"Overview":"Reference";var f=G.filter(function(x){return x.n==k})[0];if(!f){f={n:k,i:[]};if(k=="Overview")G.unshift(f);else G.push(f)}f.i.push([t.n,t.h,t.n=="Dashboard"?"Main prediction workspace":t.n=="History"?"Every saved prediction and its inputs":"Methods, data and limitations"])}});
  var html=G.map(function(g){return '<div class="cm-mg" role="group" aria-label="'+g.n+'"><div class="cm-mgl"><i aria-hidden="true">'+ic(IC[g.n]||IC.Reference)+'</i>'+g.n+'</div>'+g.i.map(function(x){return '<a href="'+x[1]+'"'+(on(x[1])?' class="on" aria-current="page"':"")+'><b>'+x[0]+'</b>'+(x[2]?'<small>'+x[2]+'</small>':"")+'</a>'}).join("")+'</div>'}).join("");
  h.innerHTML='<div class="cm-grp"><button type="button" aria-expanded="false" aria-haspopup="true">Explore</button><div class="cm-menu" role="menu">'+html+'</div></div>';
  var g=h.firstChild,bt=g.firstChild;bt.onclick=function(e){e.stopPropagation();var o=!g.classList.contains("open");g.classList.toggle("open",o);bt.setAttribute("aria-expanded",o)};document.addEventListener("click",function(e){if(!g.contains(e.target)){g.classList.remove("open");bt.setAttribute("aria-expanded","false")}});
  g.querySelector(".cm-menu").style.cssText=""})}
if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",init);else init()})();

/* CardioMap 3D shell v2: skip link, keyboard menus, parallax orbs, scroll-driven ECG, stagger, count-up (additive). */
(function(){if(/[?&]embed=1/.test(location.search))return;
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches,NS="http://www.w3.org/2000/svg";
function ready(f){document.readyState=="loading"?document.addEventListener("DOMContentLoaded",f):f()}
ready(function(){
 var lab=document.body.classList.contains("cm-lab"),main=document.querySelector("main,.wrap,[role=main]");
 if(main&&!main.id)main.id="main-content";
 if(main&&!document.querySelector(".cm-skip")){var s=document.createElement("a");s.className="cm-skip";s.href="#"+main.id;s.textContent="Skip to content";s.addEventListener("click",function(){main.setAttribute("tabindex","-1");main.focus()});document.body.insertBefore(s,document.body.firstChild)}
 /* brand text -> shimmer span */
 var br=document.querySelector(".cm-brand");if(br){[].slice.call(br.childNodes).forEach(function(n){if(n.nodeType==3&&n.textContent.trim()){var t=document.createElement("span");t.className="cm-t";t.textContent=n.textContent;br.replaceChild(t,n)}})}
 /* keyboard-accessible menus */
 [].slice.call(document.querySelectorAll(".cm-grp")).forEach(function(g){
  var bt=g.querySelector("button"),items=function(){return [].slice.call(g.querySelectorAll(".cm-menu a"))},open=function(){return g.classList.contains("open")};
  bt.addEventListener("keydown",function(e){if(e.key=="ArrowDown"||e.key=="ArrowUp"){e.preventDefault();if(!open())bt.click();var i=items();(e.key=="ArrowUp"?i[i.length-1]:i[0]).focus()}});
  g.addEventListener("keydown",function(e){var i=items(),k=i.indexOf(document.activeElement);if(k<0&&e.target!==bt)return;
   if(e.key=="Escape"&&open()){e.stopPropagation();g.classList.remove("open");bt.setAttribute("aria-expanded","false");bt.focus();return}
   if(k<0)return;var n=null;
   if(e.key=="ArrowDown")n=i[(k+1)%i.length];else if(e.key=="ArrowUp")n=i[(k-1+i.length)%i.length];else if(e.key=="Home")n=i[0];else if(e.key=="End")n=i[i.length-1];
   if(n){e.preventDefault();n.focus()}});
  g.addEventListener("focusout",function(e){if(!g.contains(e.relatedTarget)){g.classList.remove("open");bt.setAttribute("aria-expanded","false")}})});
 /* theme cross-fade */
 var th=document.querySelector(".cm-th");if(th&&!RM)th.addEventListener("click",function(){var h=document.documentElement;h.classList.add("cm-switching");setTimeout(function(){h.classList.remove("cm-switching")},450)},true);
 /* aria-labels for icon-only buttons */
 [].slice.call(document.querySelectorAll("button,a[role=button]")).forEach(function(b){if(!b.textContent.trim()&&!b.getAttribute("aria-label")&&!b.getAttribute("aria-labelledby"))b.setAttribute("aria-label",b.title||"Action")});
 if(!lab&&document.querySelector(".orb,.parallax-stage"))return;
 /* hero: status chips + ECG accent (only if page has none) */
 var h1=document.querySelector("body.cm-lab h1");
 if(h1&&!document.querySelector(".cm-chips")){var host=h1.parentElement;host.style.position=host.style.position||"relative";
  var ch=document.createElement("div");ch.className="cm-chips";["Educational prototype","Local model","Not medical advice"].forEach(function(t){var c=document.createElement("span");c.className="cm-chip";c.textContent=t;ch.appendChild(c)});h1.insertAdjacentElement("afterend",ch);
  var a=document.createElementNS(NS,"svg");a.setAttribute("class","cm-hero-art");a.setAttribute("viewBox","0 0 260 90");a.setAttribute("aria-hidden","true");a.innerHTML='<path d="M0 50h70l12-30 18 60 16-45 10 15h134"/>';host.insertBefore(a,host.firstChild)}
 /* background orbs + ECG */
 var fx=document.createElement("div");fx.className="cm-fx";fx.setAttribute("aria-hidden","true");
 fx.innerHTML='<i class="cm-orb l1"></i><i class="cm-orb l2"></i><i class="cm-orb r1"></i><i class="cm-orb r2"></i><svg class="cm-ecg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path pathLength="1" d="M0 60h300l20-8 20 8h120l16-6 12 6 24-50 28 100 24-70 16 20h620"/></svg>';
 document.body.insertBefore(fx,document.body.firstChild);
 var orbs=[].slice.call(fx.querySelectorAll(".cm-orb")),sp=[.05,.12,-.07,-.14],ecg=fx.querySelector(".cm-ecg path"),tick=false;
 function frame(){tick=false;var y=scrollY,m=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  orbs.forEach(function(o,i){o.style.transform="translate3d(0,"+(y*sp[i]).toFixed(1)+"px,0)"});
  ecg.style.setProperty("--cm-ecg",(1-Math.min(1,.15+y/m*.85)).toFixed(3))}
 if(!RM){addEventListener("scroll",function(){if(!tick){tick=true;requestAnimationFrame(frame)}},{passive:true});frame()}else ecg.style.strokeDashoffset=0;
 /* stagger index for reveal (existing observer adds .in) */
 [].slice.call(document.querySelectorAll("[data-cm-reveal]")).forEach(function(e,i){e.style.setProperty("--cm-i",i%6)});
 /* count-up for static percentages */
 if(!RM&&"IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);var el=e.target,m=el.textContent.trim().match(/^(\d+(?:\.\d+)?)%$/);if(!m)return;var end=parseFloat(m[1]),d=(m[1].split(".")[1]||"").length,t0=performance.now();
   (function st(t){var k=Math.min(1,(t-t0)/900);el.textContent=(end*(1-Math.pow(1-k,3))).toFixed(d)+"%";if(k<1)requestAnimationFrame(st)})(t0)})},{threshold:.4});
  [].slice.call(document.querySelectorAll("[data-countup],.kpi b,.kpi strong,.stat b,.metric b,.metric strong")).forEach(function(e){if(/^\d+(\.\d+)?%$/.test(e.textContent.trim()))io.observe(e)})}
});
})();

/* v2 part 2: wrap wide tables so phones scroll the table, not the page; shared safety notice on lab pages. */
(function(){function r(f){document.readyState=="loading"?document.addEventListener("DOMContentLoaded",f):f()}
r(function(){
 [].slice.call(document.querySelectorAll("table")).forEach(function(t){var p=t.parentElement;if(!p||p.classList.contains("cm-tablewrap")||t.closest(".cm-bar,.cm-menu"))return;var w=document.createElement("div");w.className="cm-tablewrap";w.setAttribute("tabindex","0");w.setAttribute("role","region");w.setAttribute("aria-label","Scrollable table");p.insertBefore(w,t);w.appendChild(t)});
 if(document.body.classList.contains("cm-lab")){var m=document.querySelector("main,.wrap"),h=m&&m.querySelector("h1");
  if(m&&h&&!m.querySelector(".cm-notice")&&!/not\s+(a\s+)?(diagnos|medical)|not\s+for\s+clinical/i.test(m.textContent)){var n=document.createElement("div");n.className="cm-notice";n.setAttribute("role","note");n.textContent="Educational research prototype. Outputs are model estimates, not a diagnosis or medical advice. Consult a qualified clinician for health decisions.";var c=m.querySelector(".cm-chips");(c||h).insertAdjacentElement("afterend",n)}}
})})();

/* v2 part 3: spinner on the button that started an API call (does not alter fetch behaviour). */
(function(){if(!window.fetch||window.__cmFetch)return;window.__cmFetch=1;var of=window.fetch.bind(window),last=null,t0=0;
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button");last=b&&!b.closest(".cm-bar,.cm-menu")?b:null;t0=Date.now()},true);
window.fetch=function(){var b=last&&Date.now()-t0<80&&!last.classList.contains("cm-busy")?last:null,r=of.apply(null,arguments);
 if(b){b.classList.add("cm-busy");var d=function(){b.classList.remove("cm-busy")};r.then(d,d)}return r}})();

/* v2 part 4: prediction history recorder. Pages that make predictions load /static/history.js from <head>; this is the fallback for the rest. */
(function(){if(window.cmHistory)return;var s=document.createElement("script");s.src="/static/history.js?v=20261006b";(document.head||document.documentElement).appendChild(s)})();
