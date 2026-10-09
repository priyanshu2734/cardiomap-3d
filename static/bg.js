/* CardioMap animated background: 3D atoms (nucleus + tilted orbits + electrons) drifting with scroll, and a travelling heartbeat line. */
(function(){
if(window.__cmBg)return;window.__cmBg=1;
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches||window.__cmBgStatic===true,root=document.documentElement;
var cv=document.createElement("canvas");cv.id="cmBgCanvas";cv.setAttribute("aria-hidden","true");
function mount(){document.body.insertBefore(cv,document.body.firstChild)}
if(document.body)mount();else document.addEventListener("DOMContentLoaded",mount);
var ctx=cv.getContext("2d"),W=0,H=0,DPR=1,sy=0,tsy=0,t0=performance.now(),run=true;
function size(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
size();addEventListener("resize",size);
addEventListener("scroll",function(){tsy=scrollY},{passive:true});
document.addEventListener("visibilitychange",function(){run=!document.hidden;if(run)requestAnimationFrame(frame)});
var atoms=[{x:.10,y:.22,R:150,sp:.12,ph:0,orb:3},{x:.92,y:.62,R:190,sp:.2,ph:2.1,orb:3},{x:.55,y:1.05,R:110,sp:.3,ph:4.2,orb:2}];
function pal(){var d=root.dataset.theme!=="light";return d?{a:"121,224,255",b:"140,130,255",n:"150,245,235",l:"110,225,255",aa:.5,la:.9}:{a:"10,143,166",b:"59,110,246",n:"10,160,180",l:"10,130,170",aa:.4,la:.8}}
function rot(p,ax,ay,az){var c,s,x=p[0],y=p[1],z=p[2],t;c=Math.cos(ax);s=Math.sin(ax);t=y*c-z*s;z=y*s+z*c;y=t;c=Math.cos(ay);s=Math.sin(ay);t=x*c+z*s;z=-x*s+z*c;x=t;c=Math.cos(az);s=Math.sin(az);t=x*c-y*s;y=x*s+y*c;x=t;return[x,y,z]}
function drawAtom(a,T,P){
 var span=H+2*a.R,y=((a.y*H-sy*a.sp+a.R)%span+span)%span-a.R,x=a.x*W+Math.sin(T*.2+a.ph)*18+Math.sin(sy*.0015+a.ph)*30,R=a.R,spin=T*.35+sy*.0022;
 var g=ctx.createRadialGradient(x,y,0,x,y,R*.55);g.addColorStop(0,"rgba("+P.n+","+(P.aa*.9)+")");g.addColorStop(.35,"rgba("+P.a+","+(P.aa*.3)+")");g.addColorStop(1,"rgba("+P.a+",0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R*.55,0,7);ctx.fill();
 ctx.fillStyle="rgba("+P.n+",.95)";ctx.beginPath();ctx.arc(x,y,5+Math.sin(T*2.4+a.ph)*1.2,0,7);ctx.fill();
 for(var o=0;o<a.orb;o++){
  var ax=1.05+o*.75+Math.sin(T*.15)*.1,ay=o*1.05+spin*(o%2?-1:1),az=o*.9+spin*.4,N=72,pts=[];
  for(var i=0;i<=N;i++){var th=i/N*6.2832;pts.push(rot([R*Math.cos(th),R*.62*Math.sin(th),0],ax,ay,az))}
  ctx.lineWidth=1.2;
  for(i=0;i<N;i++){var p=pts[i],q=pts[i+1],dep=(p[2]/R+1)/2;ctx.strokeStyle="rgba("+(o%2?P.b:P.a)+","+(P.aa*(.25+.55*dep)).toFixed(3)+")";ctx.beginPath();ctx.moveTo(x+p[0],y+p[1]);ctx.lineTo(x+q[0],y+q[1]);ctx.stroke()}
  var th2=T*(.9+o*.35)+a.ph+o*2,e=rot([R*Math.cos(th2),R*.62*Math.sin(th2),0],ax,ay,az),d=(e[2]/R+1)/2,er=3+3*d;
  var eg=ctx.createRadialGradient(x+e[0],y+e[1],0,x+e[0],y+e[1],er*4);eg.addColorStop(0,"rgba("+P.l+","+(.9*P.la).toFixed(2)+")");eg.addColorStop(1,"rgba("+P.l+",0)");ctx.fillStyle=eg;ctx.beginPath();ctx.arc(x+e[0],y+e[1],er*4,0,7);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,"+(.5+.5*d).toFixed(2)+")";ctx.beginPath();ctx.arc(x+e[0],y+e[1],er*.6,0,7);ctx.fill()}
}
function beat(u){ /* ECG shape, u in 0..1 within one beat */
 if(u<.12)return 0;if(u<.2)return Math.sin((u-.12)/.08*3.1416)*.12; if(u<.3)return 0;
 if(u<.34)return -(u-.3)/.04*.18; if(u<.40)return -.18+(u-.34)/.06*1.18; if(u<.46)return 1-(u-.40)/.06*1.35; if(u<.52)return -.35+(u-.46)/.06*.35;
 if(u<.64)return 0; if(u<.78)return Math.sin((u-.64)/.14*3.1416)*.22; return 0}
function drawEcg(T,P){
 var base=H*.78-((sy*.05)%40),amp=H*.1,beatW=Math.max(260,W*.22),head=((T*140+sy*.6)%(W+beatW*2))-beatW;
 ctx.lineWidth=1.6;ctx.lineJoin="round";
 var steps=Math.ceil(W/3);
 ctx.beginPath();for(var i=0;i<=steps;i++){var x=i*3,u=((x/beatW)%1+1)%1;var y=base-beat(u)*amp;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle="rgba("+P.a+","+(P.aa*.22)+")";ctx.stroke();
 ctx.beginPath();var first=true;for(i=0;i<=steps;i++){x=i*3;var dd=head-x;if(dd<0||dd>beatW*1.6)continue;u=((x/beatW)%1+1)%1;y=base-beat(u)*amp;first?(ctx.moveTo(x,y),first=false):ctx.lineTo(x,y)}
 var gr=ctx.createLinearGradient(head-beatW*1.6,0,head,0);gr.addColorStop(0,"rgba("+P.l+",0)");gr.addColorStop(1,"rgba("+P.l+","+P.la+")");ctx.strokeStyle=gr;ctx.lineWidth=2.4;ctx.shadowColor="rgba("+P.l+",.9)";ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
 var hu=((head/beatW)%1+1)%1,hy=base-beat(hu)*amp;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(head,hy,3.2,0,7);ctx.fill();
}
function frame(now){
 if(!run)return;var T=(now-t0)/1000;sy+=(tsy-sy)*.08;
 ctx.clearRect(0,0,W,H);var P=pal();atoms.forEach(function(a){drawAtom(a,T,P)});drawEcg(T,P);
 if(!RM)requestAnimationFrame(frame)}
if(RM){frame(performance.now()+3000);(function(){var q=0,lt=0;addEventListener("scroll",function(){if(q)return;q=requestAnimationFrame(function(){q=0;var n=performance.now();if(n-lt<50)return;lt=n;frame(n+3000)})},{passive:true})})();new MutationObserver(function(){frame(performance.now()+3000)}).observe(root,{attributes:true,attributeFilter:["data-theme"]})}else requestAnimationFrame(frame);
})();
