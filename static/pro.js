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

/* "Genome -> heart": a double helix runs through a rotating particle-cloud heart. Data packets climb the strands, every heartbeat sends a wave up through helix + heart, an ECG trace scrolls underneath, the three target arteries orbit, and the particles part around the cursor. Theme-aware (additive glow in dark, deep inks in light), pauses off-screen / hidden tab, static frame under reduced motion. */
function cmDna(cv){
 var ctx=cv.getContext("2d"),W=0,H=0,DPR=1,vis=true,run=false,t0=performance.now(),root=document.documentElement,PX=-1e4,PY=-1e4;
 function size(){var r=cv.getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,r.height);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
 function kick(){if(!run&&vis&&!document.hidden){run=true;requestAnimationFrame(frame)}}
 size();if("ResizeObserver" in window)new ResizeObserver(size).observe(cv);else addEventListener("resize",size);
 if("IntersectionObserver" in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(!RM)kick()}).observe(cv);
 document.addEventListener("visibilitychange",function(){if(!RM)kick()});
 if(!RM)addEventListener("pointermove",function(e){var r=cv.getBoundingClientRect();PX=e.clientX-r.left;PY=e.clientY-r.top},{passive:true});
 function pal(){return root.dataset.theme==="dark"?
  {dark:1,a:[104,226,255],b:[166,146,255],h:[255,112,148],h2:[132,236,255],warm:[255,200,130],glow:[96,230,255],ink:[255,255,255]}:
  {dark:0,a:[6,120,150],b:[84,72,226],h:[208,36,88],h2:[8,108,170],warm:[196,106,8],glow:[20,140,190],ink:[6,40,70]}}
 var ART=[["LAD",[255,102,133],[214,40,90]],["LCX",[83,201,255],[10,110,190]],["RCA",[181,154,255],[100,70,220]]];
 function rgba(c,a){return"rgba("+c[0]+","+c[1]+","+c[2]+","+Math.max(0,Math.min(1,a)).toFixed(3)+")"}
 function mix(a,b,t){t=Math.max(0,Math.min(1,t));return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t].map(Math.round)}
 function g(x,m,s){var d=(x-m)/s;return Math.exp(-d*d)}
 /* heart cloud: points on a pillow-shaped surface inside the classic heart outline (notch preserved), plus a dense rim */
 var OUT=[],HPT=[],EDG=[],i,j,th;
 for(i=0;i<240;i++){th=i/240*6.2832;OUT.push([16*Math.pow(Math.sin(th),3)/16,(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th)+17)/28.1*2-1])}
 function inside(x,y){var c=false,k,a,b;for(k=0,j=OUT.length-1;k<OUT.length;j=k++){a=OUT[k];b=OUT[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
 function dmin(x,y){var m=9,k,d;for(k=0;k<OUT.length;k++){d=(OUT[k][0]-x)*(OUT[k][0]-x)+(OUT[k][1]-y)*(OUT[k][1]-y);if(d<m)m=d}return Math.sqrt(m)}
 var rs=1234567;function rnd(){rs=(rs*16807)%2147483647;return(rs-1)/2147483646}
 while(HPT.length<1050){var x=rnd()*2-1,y=rnd()*2.1-1.05;if(!inside(x,y))continue;var s=Math.min(1,dmin(x,y)/.42),z=Math.sqrt(1-(1-s)*(1-s))*.58*(rnd()<.5?-1:1);HPT.push({x:x,y:y,z:z,p:rnd()*6.28,r:rnd()})}
 for(i=0;i<240;i++)for(j=0;j<2;j++)HPT.push({x:OUT[i][0]+(rnd()-.5)*.02,y:OUT[i][1]+(rnd()-.5)*.02,z:(rnd()-.5)*.06,p:rnd()*6.28,r:rnd(),rim:1});
 (function(){var sub=[],a,b,d,best,k,seen={};for(i=0;i<HPT.length;i+=3)sub.push(i);
  sub.forEach(function(ia){var n=[];sub.forEach(function(ib){if(ia===ib)return;a=HPT[ia];b=HPT[ib];d=(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y)+(a.z-b.z)*(a.z-b.z);n.push([d,ib])});n.sort(function(p,q){return p[0]-q[0]});
   for(k=0;k<2;k++){var key=Math.min(ia,n[k][1])+"-"+Math.max(ia,n[k][1]);if(!seen[key]&&n[k][0]<.05){seen[key]=1;EDG.push([ia,n[k][1]])}}})})();
 var PR=[],LET="ATCG",N=24,TURNS=3,SEG=N*7;
 function frame(now){
  run=false;if(!vis||document.hidden)return;
  var T=RM?3.2:(now-t0)/1000,P=pal(),dk=P.dark,k,i,e;ctx.clearRect(0,0,W,H);
  var cx=W/2,cy=H*.47,Hr=Math.min(W*.34,H*.29),Hh=Hr*.93,Rs=Math.min(W*.07,Hr*.2),L=H*1.02,Zs=Hr*5;
  var bp=T%1.25,beat=g(bp,.12,.07)+.65*g(bp,.36,.08),bob=Math.sin(T*.8)*2,wv=bp<.7?-1.15+bp/.7*2.5:9;
  var ang=Math.sin(T*.33)*.8,ca=Math.cos(ang),sa=Math.sin(ang),spin=T*.7,pulse=1.15-((T*.4)%1.3);
  if(dk)ctx.globalCompositeOperation="source-over";
  /* ambient bloom behind the heart on every beat */
  (function(){var r=Hr*(1.5+.1*beat),gr=ctx.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,rgba(P.h,(dk?.16:.1)*(.45+.55*beat)));gr.addColorStop(.55,rgba(P.glow,dk?.05:.04));gr.addColorStop(1,rgba(P.glow,0));ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)})();
  /* project heart cloud */
  var bs=1+.06*beat,pts=HPT.map(function(p){var X=p.x*Hr*bs,Y=-p.y*Hh*bs,Z=p.z*Hr*bs,xr=X*ca+Z*sa,zr=-X*sa+Z*ca,sc=1/(1-zr/Zs),sx=cx+xr*sc,sy=cy+bob+Y*sc,dx=sx-PX,dy=sy-PY,d=Math.sqrt(dx*dx+dy*dy);
   if(d<80&&d>.01){var f=Math.pow(1-d/80,2)*20;sx+=dx/d*f;sy+=dy/d*f}
   return{x:sx,y:sy,z:zr,dp:Math.max(0,Math.min(1,zr/(Hr*.6)*.5+.5)),w:g(p.y,wv,.22),p:p}});
  function drawPts(front){
   if(dk)ctx.globalCompositeOperation="lighter";
   pts.forEach(function(q){if((q.z>=0)!==front)return;var p=q.p,tw=.82+.18*Math.sin(T*2+p.p),bo=q.w*.9+beat*.12,a=(.2+.5*q.dp)*tw*(p.rim?1.25:1)+bo,col=mix(mix(P.h,P.h2,p.r*.35),P.ink,bo*.45),r=(.65+1.05*q.dp)*(1+q.w*.7)*(p.rim?.9:1);
    if(!dk)a*=1.15;ctx.fillStyle=rgba(col,a);ctx.beginPath();ctx.arc(q.x,q.y,r,0,7);ctx.fill()});
   ctx.globalCompositeOperation="source-over"}
  function drawEdges(){if(dk)ctx.globalCompositeOperation="lighter";ctx.lineWidth=.6;
   EDG.forEach(function(ed){var a=pts[ed[0]],b=pts[ed[1]],w=(a.w+b.w)/2,al=.035+.07*(a.dp+b.dp)/2+w*.2+beat*.03;ctx.strokeStyle=rgba(mix(P.h,P.h2,w),dk?al:al*1.5);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()});ctx.globalCompositeOperation="source-over"}
  /* orbit of the three target arteries */
  var OR=[];(function(){var Ro=Hr*1.22,tl=-.38,ct=Math.cos(tl),st=Math.sin(tl);
   function op(a){var X=Ro*Math.cos(a),Y=Ro*Math.sin(a)*.3,Z=Ro*Math.sin(a),x=X*ct-Y*st,y=X*st+Y*ct;return{x:cx+x,y:cy+bob+y+Hh*.05,z:Z}}
   for(i=0;i<90;i++){var a=i/90*6.2832,q=op(a);OR.push({x:q.x,y:q.y,z:q.z,ring:1})}
   ART.forEach(function(A,n){var q=op(T*.32+n*2.0944);q.art=A;q.n=n;OR.push(q)})})();
  function drawOrbit(front){
   OR.forEach(function(q){if((q.z>=0)!==front)return;var d=Math.max(0,Math.min(1,q.z/(Hr*1.22)*.5+.5));
    if(q.ring){ctx.fillStyle=rgba(P.glow,(dk?.1:.18)+.2*d*(dk?1:.7));ctx.fillRect(q.x-.6,q.y-.6,1.2,1.2);return}
    var c=dk?q.art[1]:q.art[2],r=3+1.8*d;
    if(dk){ctx.globalCompositeOperation="lighter";var gg=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r*4.5);gg.addColorStop(0,rgba(c,.5*(.4+.6*d)));gg.addColorStop(1,rgba(c,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(q.x,q.y,r*4.5,0,7);ctx.fill();ctx.globalCompositeOperation="source-over"}
    ctx.fillStyle=rgba(mix(c,[255,255,255],.35),.55+.45*d);ctx.beginPath();ctx.arc(q.x,q.y,r,0,7);ctx.fill();
    ctx.strokeStyle=rgba(c,(.4+.4*d)*(dk?1:1.2));ctx.lineWidth=1;ctx.beginPath();ctx.arc(q.x,q.y,r+3,0,7);ctx.stroke();
    ctx.font="600 10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";ctx.textBaseline="middle";ctx.fillStyle=rgba(dk?mix(c,[255,255,255],.45):c,.5+.5*d);ctx.fillText(q.art[0],q.x+r+7,q.y)})}
  /* helix */
  function hp(t,ph){var y=(t-.5)*L,r=Rs*(1+.16*beat*g(t,.5,.28)),x=r*Math.cos(ph),z=Math.sin(ph),sc=1+z*.16;return{x:x*sc+cx,y:y+cy+bob,z:z}}
  function edge(t){return Math.max(0,Math.min(1,Math.min(t,1-t)/.15))}
  function heat(t){return g(t,pulse,.05)}
  var items=[];
  for(k=0;k<2;k++)for(i=0;i<SEG;i++)(function(i,k){var t1=i/SEG,t2=(i+1)/SEG,tm=(t1+t2)/2,a=hp(t1,t1*TURNS*6.2832+spin+k*3.1416),b=hp(t2,t2*TURNS*6.2832+spin+k*3.1416),z=(a.z+b.z)/2,h=heat(tm),ee=edge(tm),d=(z+1)/2;
   items.push({z:z,f:function(){var col=k?P.b:P.a,al=(.22+.7*d)*ee;
    if(dk){ctx.globalCompositeOperation="lighter";ctx.strokeStyle=rgba(col,al*.1+h*.12);ctx.lineWidth=5+3*d;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalCompositeOperation="source-over"}
    ctx.strokeStyle=rgba(mix(col,P.ink,h*.5),Math.min(1,al+h*.3));ctx.lineWidth=1.1+1.3*d;ctx.lineCap="butt";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}})})(i,k);
  for(i=0;i<N;i++)(function(i){var t=(i+.5)/N,ph=t*TURNS*6.2832+spin,a=hp(t,ph),b=hp(t,ph+3.1416),z=(a.z+b.z)/2,h=heat(t),ee=edge(t),d=(z+1)/2,at=(i*7)%4<2,c1=at?P.a:P.warm,c0=at?P.b:P.h,ch=(i*5)%4,l1=LET[ch],l2=LET[[1,0,3,2][ch]];
   items.push({z:z-.001,f:function(){var al=(.2+.6*Math.max(d,.25))*ee,gr=ctx.createLinearGradient(a.x,a.y,b.x,b.y);gr.addColorStop(0,rgba(c0,al));gr.addColorStop(.5,rgba(mix(c1,P.ink,h*.6),al+h*.35));gr.addColorStop(1,rgba(c1,al));
    ctx.strokeStyle=gr;ctx.lineWidth=.8+1*d+h*1.2;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    [[a,c0],[b,c1]].forEach(function(n){var p=n[0],c=n[1],r=1.6+1.9*d;if(dk){ctx.globalCompositeOperation="lighter";var gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.4);gg.addColorStop(0,rgba(P.glow,(.2*d+.04)*ee+h*.25));gg.addColorStop(1,rgba(P.glow,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(p.x,p.y,r*3.4,0,7);ctx.fill();ctx.globalCompositeOperation="source-over"}
     ctx.fillStyle=rgba(mix(c,P.ink,.35+h*.4),(.5+.5*d)*ee);ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill()});
    if(d>.62){ctx.font="600 8px ui-monospace,Menlo,Consolas,monospace";ctx.textBaseline="middle";ctx.fillStyle=rgba(mix(c0,P.ink,.3),.75*ee*(d-.55)/.45);ctx.fillText(l1,a.x-(a.x<b.x?12:-5),a.y);ctx.fillStyle=rgba(mix(c1,P.ink,.3),.75*ee*(d-.55)/.45);ctx.fillText(l2,b.x+(b.x>a.x?5:-12),b.y)}}})})(i);
  /* data packets climbing the strands */
  for(i=0;i<8;i++)(function(i){var t=1-((T*.1+i/8)%1),kk=i%2,a=hp(t,t*TURNS*6.2832+spin+kk*3.1416),ee=edge(t),d=(a.z+1)/2;
   items.push({z:a.z+.002,f:function(){var r=2.2+1.6*d;if(dk)ctx.globalCompositeOperation="lighter";var gg=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,r*5);gg.addColorStop(0,rgba(P.warm,(dk?.65:.3)*ee));gg.addColorStop(1,rgba(P.warm,0));ctx.fillStyle=gg;ctx.beginPath();ctx.arc(a.x,a.y,r*5,0,7);ctx.fill();ctx.globalCompositeOperation="source-over";ctx.fillStyle=rgba(mix(P.warm,P.ink,dk?.7:0),.9*ee);ctx.beginPath();ctx.arc(a.x,a.y,r*.8,0,7);ctx.fill()}})})(i);
  items.sort(function(p,q){return p.z-q.z});
  drawEdges();drawOrbit(false);drawPts(false);
  items.forEach(function(it){it.f()});
  drawPts(true);drawOrbit(true);
  /* ECG trace scrolling under the heart, locked to the same beat */
  (function(){var y0=cy+Hh*1.14+bob,amp=Math.min(30,H*.07),spd=W*.22,x0=W*.05,x1=W*.95,n=130,pr=[],xx,tt,ph,v;
   for(i=0;i<=n;i++){xx=x0+(x1-x0)*i/n;tt=T-(x1-xx)/spd;ph=((tt%1.25)+1.25)%1.25;v=.14*g(ph,.02,.035)-.12*g(ph,.105,.012)+1*g(ph,.125,.011)-.26*g(ph,.148,.012)+.3*g(ph,.36,.05);pr.push([xx,y0-v*amp])}
   function path(){ctx.beginPath();pr.forEach(function(q,m){m?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])})}
   var lg=ctx.createLinearGradient(x0,0,x1,0);lg.addColorStop(0,rgba(P.h,0));lg.addColorStop(.7,rgba(P.h,dk?.55:.7));lg.addColorStop(1,rgba(mix(P.h,P.ink,.5),1));
   ctx.lineJoin="round";ctx.lineCap="round";
   if(dk){ctx.globalCompositeOperation="lighter";ctx.strokeStyle=lg;ctx.globalAlpha=.25;ctx.lineWidth=5;path();ctx.stroke();ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over"}
   ctx.strokeStyle=lg;ctx.lineWidth=1.4;path();ctx.stroke();
   var h=pr[n];if(dk)ctx.globalCompositeOperation="lighter";var hg=ctx.createRadialGradient(h[0],h[1],0,h[0],h[1],10);hg.addColorStop(0,rgba(P.h,.8));hg.addColorStop(1,rgba(P.h,0));ctx.fillStyle=hg;ctx.beginPath();ctx.arc(h[0],h[1],10,0,7);ctx.fill();ctx.globalCompositeOperation="source-over";ctx.fillStyle=rgba(mix(P.h,P.ink,.6),1);ctx.beginPath();ctx.arc(h[0],h[1],2.2,0,7);ctx.fill();
   ctx.font="600 9px ui-monospace,Menlo,Consolas,monospace";ctx.textBaseline="alphabetic";ctx.fillStyle=rgba(P.glow,dk?.55:.8);ctx.fillText("72 BPM",x0,y0+amp+14)})();
  if(!RM){run=true;requestAnimationFrame(frame)}}
 if(RM){frame(0);new MutationObserver(function(){frame(0)}).observe(root,{attributes:true,attributeFilter:["data-theme"]})}else kick()}
var hero=document.querySelector(".hero .hero-note");var __cv=null;
if(hero&&!document.querySelector(".cm3d")){var w=document.createElement("div");w.className="cm3d";w.setAttribute("aria-hidden","true");w.innerHTML='<canvas class="cm-dna" aria-hidden="true"></canvas>';cmDna(w.firstChild);hero.parentNode.insertBefore(w,hero);w.appendChild(hero);hero.classList.add("badge");
 if(!RM)w.addEventListener("pointermove",function(e){var r=w.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;w.style.transform="rotateY("+x*18+"deg) rotateX("+(-y*18)+"deg)"});w.addEventListener("pointerleave",function(){w.style.transform=""});w.style.transition="transform .3s"}
})();
