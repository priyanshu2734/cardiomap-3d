/* CardioMap Pro: auto theme, header elevation, icon tiles on every box, 3D hero, tilt. */
(function(){
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches,root=document.documentElement;
function saved(){try{return localStorage.getItem("cm-theme")}catch(e){return null}}
var mq=matchMedia("(prefers-color-scheme: dark)");
if(!saved())root.dataset.theme=mq.matches?"dark":"light";
mq.addEventListener&&mq.addEventListener("change",function(e){if(!saved())root.dataset.theme=e.matches?"dark":"light"});
var P={shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',heart:'<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',bars:'<path d="M5 20V10M12 20V4M19 20v-7"/>',spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',book:'<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 4v12"/>',node:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7l8 1M7 8l4 8M17 10l-4 6"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'};
var KW=[[/patient|input|profile/i,"user"],[/valid|metric|eval|compar/i,"shield"],[/data|source|licen/i,"db"],[/cad|vessel|coronary|artery|anatom|heart/i,"heart"],[/driv|explain|why|sens/i,"spark"],[/trust|reliab/i,"shield"],[/scenario|what/i,"flask"],[/limit|interpret|method|how/i,"book"],[/matrix|brier|target/i,"bars"]];
function svg(k){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+P[k]+'</svg>'}
function icons(){[].forEach.call(document.querySelectorAll(".panel h3,.trust-panel h3"),function(h){if(h.classList.contains("has-ico")||h.querySelector(".cm-ico"))return;var k="gear";for(var i=0;i<KW.length;i++)if(KW[i][0].test(h.textContent)){k=KW[i][1];break}var s=document.createElement("span");s.className="cm-ico";s.innerHTML=svg(k);h.insertBefore(s,h.firstChild);h.classList.add("has-ico");h.style.display="flex";h.style.alignItems="center";h.style.gap="12px"})}
icons();new MutationObserver(function(){icons()}).observe(document.body,{childList:true,subtree:true});
var hd=document.querySelector("body>.wrap>header");
if(hd){var f=function(){hd.classList.toggle("is-stuck",scrollY>24)};f();addEventListener("scroll",f,{passive:true});
 var rail=hd.querySelector(".section-rail");if(rail){var ic={Workspace:"gear",Explain:"spark","Trust Center":"shield",Explorer:"heart","What-If":"flask"};[].forEach.call(rail.querySelectorAll("a"),function(a){var k=ic[a.textContent.trim()];if(k&&!a.querySelector("svg"))a.insertAdjacentHTML("afterbegin",svg(k))})}}

/* Hero: a single, calm double helix. Two glowing strands twist slowly, base-pair rungs connect them, a few data pulses climb the strands. Tilted slightly, soft-faded at both ends so it never clips, sized from the container so it fits any width. Theme-aware (additive glow in dark, deep inks in light), pauses off-screen / hidden tab, static frame under reduced motion. */
function cmDna(cv){
 var ctx=cv.getContext("2d"),W=0,H=0,DPR=1,vis=true,run=false,t0=performance.now(),root=document.documentElement;
 function size(){var r=cv.getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,r.height);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
 function kick(){if(!run&&vis&&!document.hidden){run=true;requestAnimationFrame(frame)}}
 size();if("ResizeObserver" in window)new ResizeObserver(function(){size();if(RM)frame(0)}).observe(cv);else addEventListener("resize",size);
 if("IntersectionObserver" in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(!RM)kick()}).observe(cv);
 document.addEventListener("visibilitychange",function(){if(!RM)kick()});
 function pal(){return root.dataset.theme==="dark"?
  {dark:1,a:[104,226,255],b:[166,146,255],warm:[255,200,130],glow:[96,230,255],ink:[255,255,255]}:
  {dark:0,a:[6,120,150],b:[84,72,226],warm:[196,106,8],glow:[20,140,190],ink:[6,40,70]}}
 function rgba(c,a){return"rgba("+c[0]+","+c[1]+","+c[2]+","+Math.max(0,Math.min(1,a)).toFixed(3)+")"}
 function mix(a,b,t){t=Math.max(0,Math.min(1,t));return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t].map(Math.round)}
 var N=20,TURNS=2.6,SEG=N*8,TILT=-.2,CT=Math.cos(TILT),ST=Math.sin(TILT);
 function frame(now){
  run=false;if(!vis||document.hidden)return;
  var T=RM?3.2:(now-t0)/1000,P=pal(),dk=P.dark,i,k;ctx.clearRect(0,0,W,H);
  var cx=W/2,cy=H/2,L=Math.min(H*.96,W*2.4),Rs=Math.min(W*.2,L*.19),spin=T*.6,sway=Math.sin(T*.5)*L*.008;
  function hp(t,ph){var y=(t-.5)*L,x=Rs*Math.cos(ph),z=Math.sin(ph),sc=1+z*.12,X=x*sc,Y=y+sway;
   return{x:cx+X*CT-Y*ST,y:cy+X*ST+Y*CT,z:z}}
  function edge(t){var e=Math.max(0,Math.min(1,Math.min(t,1-t)/.16));return e*e*(3-2*e)}
  var items=[];
  for(k=0;k<2;k++)for(i=0;i<SEG;i++)(function(i,k){
   var t1=i/SEG,t2=(i+1)/SEG,tm=(t1+t2)/2,a=hp(t1,t1*TURNS*6.2832+spin+k*3.1416),b=hp(t2,t2*TURNS*6.2832+spin+k*3.1416),d=((a.z+b.z)/2+1)/2,ee=edge(tm),col=k?P.b:P.a;
   items.push({z:(a.z+b.z)/2,f:function(){var al=(.25+.7*d)*ee;
    if(dk){ctx.globalCompositeOperation="lighter";ctx.strokeStyle=rgba(col,al*.12);ctx.lineWidth=6+4*d;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalCompositeOperation="source-over"}
    ctx.strokeStyle=rgba(col,al);ctx.lineWidth=1.4+2.2*d;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}})})(i,k);
  for(i=0;i<N;i++)(function(i){
   var t=(i+.5)/N,ph=t*TURNS*6.2832+spin,a=hp(t,ph),b=hp(t,ph+3.1416),d=((a.z+b.z)/2+1)/2,ee=edge(t),at=(i*5)%3!==0,c1=at?P.a:P.warm,c0=at?P.b:P.glow;
   items.push({z:(a.z+b.z)/2-.001,f:function(){var al=(.14+.4*d)*ee,gr=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
    gr.addColorStop(0,rgba(c0,al));gr.addColorStop(.5,rgba(mix(c1,P.ink,.25),al*.6));gr.addColorStop(1,rgba(c1,al));
    ctx.strokeStyle=gr;ctx.lineWidth=1+1.1*d;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    [[a,c0],[b,c1]].forEach(function(n){var p=n[0],c=n[1],r=2+2.4*((p.z+1)/2);
     if(dk){ctx.globalCompositeOperation="lighter";var gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.2);gg.addColorStop(0,rgba(P.glow,.22*ee*((p.z+1)/2+.2)));gg.addColorStop(1,rgba(P.glow,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(p.x,p.y,r*3.2,0,7);ctx.fill();ctx.globalCompositeOperation="source-over"}
     ctx.fillStyle=rgba(mix(c,P.ink,.3),(.45+.5*((p.z+1)/2))*ee);ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill()})}})})(i);
  /* a few data pulses climbing the strands */
  for(i=0;i<3;i++)(function(i){var t=1-((T*.07+i/3)%1),a=hp(t,t*TURNS*6.2832+spin+(i%2)*3.1416),ee=edge(t),d=(a.z+1)/2;
   items.push({z:a.z+.002,f:function(){var r=2.4+1.4*d;if(dk)ctx.globalCompositeOperation="lighter";
    var gg=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,r*5);gg.addColorStop(0,rgba(P.warm,(dk?.6:.3)*ee));gg.addColorStop(1,rgba(P.warm,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(a.x,a.y,r*5,0,7);ctx.fill();
    ctx.globalCompositeOperation="source-over";ctx.fillStyle=rgba(mix(P.warm,P.ink,dk?.7:0),.9*ee);ctx.beginPath();ctx.arc(a.x,a.y,r,0,7);ctx.fill()}})})(i);
  items.sort(function(p,q){return p.z-q.z});
  items.forEach(function(it){it.f()});
  if(!RM){run=true;requestAnimationFrame(frame)}}
 if(RM){frame(0);new MutationObserver(function(){frame(0)}).observe(root,{attributes:true,attributeFilter:["data-theme"]})}else kick()}
var hero=document.querySelector(".hero .hero-note");var __cv=null;
if(hero&&!document.querySelector(".cm3d")){var w=document.createElement("div");w.className="cm3d";w.setAttribute("aria-hidden","true");w.innerHTML='<canvas class="cm-dna" aria-hidden="true"></canvas>';cmDna(w.firstChild);hero.parentNode.insertBefore(w,hero);w.appendChild(hero);hero.classList.add("badge");
 if(!RM)w.addEventListener("pointermove",function(e){var r=w.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;w.style.transform="rotateY("+x*18+"deg) rotateX("+(-y*18)+"deg)"});w.addEventListener("pointerleave",function(){w.style.transform=""});w.style.transition="transform .3s"}
})();
