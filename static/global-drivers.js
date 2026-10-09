/* Global drivers card: "What drives the model overall" (mean |SHAP| per input, per target).
   Shared by index.html and digital_twin.html.
   CmGlobalDrivers.mount(rootEl, {getState:()=>({sel,res}), setTarget:t=>void, online:()=>bool, api:()=>string})
   Returns {paint}. GET /shap/global once; redraws for the selected target and this case's values. */
(function(){
var TS=["CAD","LAD","LCX","RCA"],NAMES={CAD:"Overall CAD",LAD:"LAD",LCX:"LCX",RCA:"RCA"},PAL=["#14a3a0","#3b8df0","#8a6cf0","#e0892b","#e0475b","#18b27a","#c75bd0","#7a8aa0"];
function X(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/></svg>';
function mount(root,o){
 var G={data:null,state:"idle",err:""},limit=10,grp=null,lastKey="",tried=false;
 root.classList.add("gd-card");
 root.innerHTML='<div class="gd-top"><div class="gd-title"><span class="gd-badge">'+ICON+'</span><div><h3 id="cmGlobalTitle" class="has-ico">What drives the model overall</h3><p>Average impact of each input across all training records (mean |SHAP|), for the selected target. This describes how the fitted model behaves in general, not this patient and not cause and effect.</p></div></div>'+
  '<div class="gd-seg" role="group" aria-label="Target for global importance" data-r="tabs">'+TS.map(function(t){return'<button type="button" data-g="'+t+'" aria-pressed="false">'+t+"</button>"}).join("")+'</div></div>'+
  '<div data-r="body" aria-live="polite"></div><p class="gd-foot" data-r="foot"></p>';
 function q(n){return root.querySelector('[data-r="'+n+'"]')}
 var tabs=q("tabs"),body=q("body"),foot=q("foot");
 tabs.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button[data-g]");if(!b)return;var t=b.dataset.g;if(t!==o.getState().sel){grp=null;o.setTarget(t)}});
 body.addEventListener("click",function(e){
  var c=e.target.closest&&e.target.closest("[data-grp]");if(c){var g=c.dataset.grp;grp=grp===g?null:g;draw();return}
  var l=e.target.closest&&e.target.closest("[data-lim]");if(l){limit=+l.dataset.lim||0;draw();return}
  if(e.target.closest&&e.target.closest(".gd-retry")){G.state="idle";draw();load()}});
 function load(){
  if(G.state==="loading"||G.state==="ready")return;G.state="loading";draw();
  fetch((o.api?o.api():"")+"/shap/global").then(function(r){if(!r.ok)return r.json().catch(function(){return{}}).then(function(j){throw new Error(j.detail||("HTTP "+r.status))});return r.json()})
  .then(function(d){G.data=d;G.state="ready";G.err="";draw()}).catch(function(e){G.state="error";G.err=String(e.message||e);draw()})}
 function caseRec(res,t){var s=res&&res.shap&&res.shap.targets&&res.shap.targets[t];if(!s||!Array.isArray(s.records))return{};var m={};s.records.forEach(function(r){m[r.feature]=r});return m}
 function msg(h){body.innerHTML=h;foot.textContent=""}
 function draw(){
  var st=o.getState(),sel=st.sel||"CAD",res=st.res;root.dataset.t=sel;
  [].forEach.call(tabs.children,function(b){b.setAttribute("aria-pressed",b.dataset.g===sel?"true":"false")});
  if(!o.online()){msg('<p class="gd-msg">Global SHAP importance needs the Python API (SHAP is not available in the offline browser fallback). Start the API and reconnect to see it.</p>');return}
  if(G.state==="error"){msg('<p class="gd-msg">Global importance is unavailable: '+X(G.err)+'. <button type="button" class="gd-retry">Try again</button></p>');return}
  if(G.state!=="ready"||!G.data){msg('<div class="gd-skel" style="width:92%"></div><div class="gd-skel" style="width:70%"></div><div class="gd-skel" style="width:81%"></div><div class="gd-skel" style="width:48%"></div>');return}
  var T=G.data.targets&&G.data.targets[sel];
  if(!T||!T.records||!T.records.length){msg('<p class="gd-msg">No global importance is available for '+X(sel)+'.</p>');return}
  var all=T.records,mine=caseRec(res,sel),have=Object.keys(mine).length>0;
  var gs={},order=[];all.forEach(function(r){if(!(r.group in gs)){gs[r.group]=0;order.push(r.group)}gs[r.group]+=r.share_pct});
  order.sort(function(a,b){return gs[b]-gs[a]});
  var col={};order.forEach(function(g,i){col[g]=PAL[i%PAL.length]});
  if(grp&&!(grp in gs))grp=null;
  var pool=grp?all.filter(function(r){return r.group===grp}):all,rows=limit?pool.slice(0,limit):pool,
   mx=Math.max.apply(null,rows.map(function(r){return r.share_pct}))||1,
   top3=all.slice(0,3).reduce(function(a,r){return a+r.share_pct},0),
   rest=all.slice(rows.length).reduce(function(a,r){return a+r.share_pct},0);
  var t10=all.slice(0,10),ent=0,ups=0,dns=0;
  t10.forEach(function(r){var c=mine[r.feature];if(c&&!c.is_default){ent++;if(c.direction==="up")ups++;else if(c.direction==="down")dns++}});
  var mdl=String(T.model||"").replace("Classifier","").replace(/([a-z])([A-Z])/g,"$1 $2");
  var h='<div class="gd-stats">'+
   '<div class="gd-stat"><small>Top driver</small><b title="'+X(all[0].label)+'">'+X(all[0].label)+'</b><span>'+all[0].share_pct.toFixed(1)+'% of total impact</span></div>'+
   '<div class="gd-stat"><small>Top 3 combined</small><b>'+top3.toFixed(1)+'%</b><span>of '+all.length+' inputs</span></div>'+
   '<div class="gd-stat"><small>Model</small><b>'+X(mdl||"-")+'</b><span>'+X(NAMES[sel]||sel)+' &middot; '+G.data.n_rows+' records</span></div>'+
   '<div class="gd-stat"><small>This case, top 10</small>'+(have?'<b>'+ent+' of 10 entered</b><span><i class="u">&#9650;</i> '+ups+' raise &middot; <i class="d">&#9660;</i> '+dns+' lower</span>':'<b>&mdash;</b><span>Run a prediction to compare</span>')+'</div></div>';
  h+='<div class="gd-groups"><div class="gd-groups-h"><span>Impact by input group</span><span>Tap a group to filter</span></div><div class="gd-stack" aria-hidden="true">'+order.map(function(g){return'<i class="'+(grp&&grp!==g?"off":"")+'" style="flex:'+gs[g].toFixed(2)+' 1 0;background:'+col[g]+'" title="'+X(g)+' '+gs[g].toFixed(1)+'%"></i>'}).join("")+'</div><div class="gd-legend">'+
   order.map(function(g){var w=(100*gs[g]/(gs[order[0]]||1)).toFixed(1);return'<button type="button" class="gd-chip" data-grp="'+X(g)+'" aria-pressed="'+(grp===g)+'" style="--gc:'+col[g]+'"><span class="gd-chip-t"><i></i><span class="gd-chip-n">'+X(g)+'</span></span><em>'+gs[g].toFixed(1)+'<small>%</small></em><span class="gd-chip-bar" aria-hidden="true"><b style="width:'+w+'%"></b></span></button>'}).join("")+'</div></div>';
  var step=mx<=10?2:mx<=25?5:mx<=50?10:20,amax=Math.max(step,Math.ceil(mx*1.12/step)*step),nint=Math.round(amax/step),ticks=[];
  for(var tv=0;tv<=amax;tv+=step)ticks.push(tv);
  var shown=rows.reduce(function(a,r){return a+r.share_pct},0),poolTot=pool.reduce(function(a,r){return a+r.share_pct},0);
  h+='<div class="gd-bar-h"><div><p class="gd-meta"><b>'+X(NAMES[sel]||sel)+'</b> &middot; '+(grp?X(grp)+' inputs &middot; ':'')+(rows.length<pool.length?'top '+rows.length+' of '+pool.length:'all '+pool.length)+' inputs</p><p class="gd-sub">Bar length = share of the model&#39;s total impact. The first '+rows.length+' inputs account for <b>'+shown.toFixed(1)+'%</b>.</p></div><div class="gd-seg sm" role="group" aria-label="Number of inputs shown">'+
   [10,20,0].map(function(n){return'<button type="button" data-lim="'+n+'" aria-pressed="'+(limit===n)+'">'+(n?"Top "+n:"All")+"</button>"}).join("")+'</div></div>';
  h+='<div class="gd-cols'+(have?' has-case':'')+'" aria-hidden="true"><span>#</span><span>Input</span><span>Share</span><span class="gd-ax">'+ticks.map(function(t,i){return'<em class="'+(i===0?"f":i===ticks.length-1?"l":"")+'" style="left:'+(100*t/amax).toFixed(2)+'%">'+t+'%</em>'}).join("")+'</span>'+(have?'<span>This case</span>':'')+'</div><ol class="gd-list'+(have?' has-case':'')+'" style="--gd-n:'+nint+'">';
  var key=sel+"|"+limit+"|"+(grp||""),anim=key!==lastKey;lastKey=key;
  rows.forEach(function(r,i){
   var c=mine[r.feature],cc="";
   if(c){
    if(c.is_default)cc='<span class="gd-cc def" title="Not entered: the model uses the training median"><b>'+X(c.display_value)+'</b><em>Not entered</em></span>';
    else{var d=c.direction;
     cc='<span class="gd-cc"><b>'+X(c.display_value)+'</b>'+(d==="up"?'<em class="up" title="Raises this case&#39;s estimate"><i>&#9650;</i> Raises</em>':d==="down"?'<em class="down" title="Lowers this case&#39;s estimate"><i>&#9660;</i> Lowers</em>':'<em class="neu" title="Neutral for this case&#39;s estimate"><i>&ndash;</i> Neutral</em>')+'</span>'}}
   else if(have)cc='<span class="gd-cc def"><b>&mdash;</b></span>';
   h+='<li class="gd-row'+(anim?" in":"")+(i<3&&!grp?" top":"")+'" style="animation-delay:'+(anim?Math.min(i,14)*28:0)+'ms" aria-label="'+X(r.label)+': '+r.share_pct.toFixed(1)+' percent of total model impact'+(c&&!c.is_default?(c.direction==="up"?", raises this case":c.direction==="down"?", lowers this case":""):"")+'"><span class="gd-rank">'+r.rank+'</span><span class="gd-name">'+X(r.label)+'<small><i style="background:'+col[r.group]+'"></i>'+X(r.group)+'</small></span><span class="gd-pct">'+r.share_pct.toFixed(1)+'%</span><span class="gd-track" aria-hidden="true"><i class="gd-fill" data-w="'+(100*r.share_pct/amax).toFixed(1)+'"></i></span>'+cc+"</li>"});
  if(rows.length<pool.length){var restN=pool.length-rows.length,restP=poolTot-shown;
   h+='<li class="gd-sum" aria-label="'+restN+' other inputs share '+restP.toFixed(1)+' percent"><span></span><span class="gd-name">'+restN+' other inputs<small>combined</small></span><span class="gd-pct">'+restP.toFixed(1)+'%</span><span class="gd-track" aria-hidden="true"><i class="gd-fill sum" data-w="'+(100*restP/amax).toFixed(1)+'"></i></span></li>'}
  h+='</ol>';
  if(have)h+='<p class="gd-key"><span><i class="u">&#9650;</i> Raises this case&#39;s estimate</span><span><i class="d">&#9660;</i> Lowers it</span><span>Grey italic = not entered (training median used)</span><span>Colour shows direction only, not good or bad</span></p>';
  body.innerHTML=h;
  var fills=body.querySelectorAll(".gd-fill");
  if(anim)requestAnimationFrame(function(){requestAnimationFrame(function(){[].forEach.call(fills,function(b){b.style.width=b.dataset.w+"%"})})});
  else[].forEach.call(fills,function(b){b.style.transition="none";b.style.width=b.dataset.w+"%"});
  foot.textContent=(have?"\u25B2/\u25BC marks how each entered value moves this case\u2019s estimate. ":"")+"Averaged over "+G.data.n_rows+" records from the training file ("+(G.data.source||"training data")+"). Model-linked explanation for research and education; not causal and not a diagnosis."}
 function paint(){draw();if(o.online()&&(G.state==="idle"||G.state==="error"&&!tried)){if(G.state==="error")tried=true;load()}}
 draw();
 return{paint:paint};
}
window.CmGlobalDrivers={mount:mount};
})();
