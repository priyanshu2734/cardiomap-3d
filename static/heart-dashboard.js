/* CardioMap heart dashboard v2 - builds side panels and wires them to EXISTING controls. Heart rendering untouched. */
(function(){
 function ready(f){document.readyState!=="loading"?f():document.addEventListener("DOMContentLoaded",f)}
 ready(function(){
  var st=document.getElementById("stage"),cv=document.getElementById("cv");if(!st||!cv)return;
  var $=function(i){return document.getElementById(i)};
  var S=function(p){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>'};
  var IC={cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',beam:'<circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 000 10M17 7a7 7 0 010 10M4 4a11 11 0 000 16M20 4a11 11 0 010 16"/>',book:'<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>',cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',heart:'<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',ruler:'<path d="M3 17L17 3l4 4L7 21z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',drag:'<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',wheel:'<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/>',click:'<path d="M5 3l14 7-6 2-2 6z"/>',view:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'};
  /* 1. icons on toolbar buttons */
  var map={rc:"cam",loadReference:"pulse",haloToggle:"shield",whyToggle:"beam",tourStart:"book"};
  Object.keys(map).forEach(function(id){var b=$(id);if(b&&!b.querySelector("svg"))b.insertAdjacentHTML("afterbegin",S(IC[map[id]]))});
  var fl=st.querySelector("label.b");if(fl&&!fl.querySelector("svg"))fl.insertAdjacentHTML("afterbegin",S(IC.user));
  /* The page script rewrites some labels with textContent (e.g. "HRA heart active \u2713"), which wipes the icon: put it back. */
  Object.keys(map).forEach(function(id){var b=$(id);if(!b||!window.MutationObserver)return;new MutationObserver(function(){if(!b.querySelector("svg"))b.insertAdjacentHTML("afterbegin",S(IC[map[id]]))}).observe(b,{childList:true})});
  /* 2. left panel */
  var left=document.createElement("aside");left.className="hd-side hd-left";left.setAttribute("aria-label","View controls");
  left.innerHTML='<h4>'+S(IC.view)+'VIEW CONTROLS</h4><div class="hd-tip-group">'+
   '<div class="hd-tip">'+S(IC.drag)+'<span><b>Drag</b>to rotate</span></div>'+
   '<div class="hd-tip">'+S(IC.wheel)+'<span><b>Scroll</b>to zoom</span></div>'+
   '<div class="hd-tip">'+S(IC.click)+'<span><b>Click</b>a vessel to focus</span></div></div>'+
   '<div class="hd-sep"></div><h4>'+S(IC.cube)+'QUICK VIEWS</h4><div class="hd-qv" role="group" aria-label="Quick camera views"></div>';
  var qv=left.querySelector(".hd-qv");
  /* [label, x tilt, y rotation] */
  var V=[["Front View",0,0,"heart"],["Left View",0,-Math.PI/2],["Right View",0,Math.PI/2],["Top View",-.8,0],["Bottom View",.8,0]];
  V.forEach(function(v,i){var b=document.createElement("button");b.type="button";b.setAttribute("aria-pressed",i?"false":"true");b.innerHTML=S(i?IC.cube:IC.heart)+v[0];
   b.onclick=function(){if(!window.cmView)return;window.cmHoldView=true;window.cmView.set(v[1],v[2]);var c=$("cv");if(c&&c.dataset)c.dataset.view=i;
    qv.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))})};qv.appendChild(b)});
  /* returning control to the user releases the held view */
  cv.addEventListener("pointerdown",function(){window.cmHoldView=false;qv.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed","false")})});
  var rc=$("rc");if(rc)rc.addEventListener("click",function(){window.cmHoldView=false;qv.querySelectorAll("button").forEach(function(x,i){x.setAttribute("aria-pressed",String(i===0))})});
  /* 3. right panel */
  var right=document.createElement("aside");right.className="hd-side hd-right";right.setAttribute("aria-label","Display options");
  right.innerHTML='<h4>'+S(IC.eye)+'DISPLAY OPTIONS</h4>'+
   '<div class="hd-sw"><span>'+S(IC.eye)+'Show labels</span><button type="button" role="switch" id="hdLabels" aria-checked="true" aria-label="Show labels"></button></div>'+
   '<div class="hd-sw"><span>'+S(IC.shield)+'Confidence halo</span><button type="button" role="switch" id="hdHalo" aria-checked="true" aria-label="Confidence halo"></button></div>'+
   '<div class="hd-sw"><span>'+S(IC.beam)+'Why-Beams</span><button type="button" role="switch" id="hdWhy" aria-checked="false" aria-label="Why-Beams"></button></div>'+
      '<div class="hd-sep"></div><h4>'+S(IC.info)+'MODEL INFO</h4>'+
   '<dl class="hd-info"><dt>Model:</dt><dd id="hdModel">Generic heart</dd><dt>Scale:</dt><dd id="hdScale">100%</dd></dl>';
  var wrap=document.createElement("div");wrap.className="hd-panels";wrap.appendChild(left);wrap.appendChild(right);cv.insertAdjacentElement("afterend",wrap);
  /* measure the toolbar so panels always start below it, even when it wraps to two rows */
  var tl=st.querySelector(".tools");
  function measure(){if(tl)st.style.setProperty("--hd-tools-h",tl.offsetHeight+"px")}
  if(tl){measure();if(window.ResizeObserver)new ResizeObserver(measure).observe(tl);new MutationObserver(measure).observe(tl,{subtree:true,attributes:true,attributeFilter:["hidden"]})}
  window.addEventListener("resize",measure);
  /* 4. toggles mirror and drive the existing buttons */
  function mirror(sw,btn){var s=$(sw);if(!s)return;
   function sync(){var b=$(btn);if(!b)return;s.setAttribute("aria-checked",b.getAttribute("aria-pressed")==="true"?"true":"false");s.disabled=b.disabled}
   s.onclick=function(){var b=$(btn);if(b&&!b.disabled)b.click();setTimeout(sync,30)};
   var b=$(btn);if(b)new MutationObserver(sync).observe(b,{attributes:true,attributeFilter:["aria-pressed","disabled"]});sync()}
  mirror("hdHalo","haloToggle");mirror("hdWhy","whyToggle");
  $("hdLabels").onclick=function(){var on=this.getAttribute("aria-checked")!=="true";this.setAttribute("aria-checked",String(on));window.cmLabelsOn=on;if(window.cmView)window.cmView.refresh()};
    /* 5. model info live values */
  function info(){var sc=$("asValue");
   $("hdScale").textContent=sc?sc.textContent:"100%";
   var lr=$("loadReference");$("hdModel").textContent=lr&&/active/i.test(lr.textContent)?"HRA heart":"Generic heart";
}
  ["as","ay","az"].forEach(function(i){var e=$(i);if(e)e.addEventListener("input",info)});
  st.addEventListener("click",function(){setTimeout(info,50)});
  setInterval(info,700);info();
 });
})();

/* ===== v2.2: backend connection control (re-homes the existing #apiurl / #conn / #src so original logic keeps working) ===== */
(function(){
 function ready(f){document.readyState!=="loading"?f():document.addEventListener("DOMContentLoaded",f)}
 ready(function(){
  var hdr=document.querySelector("body>.wrap>header")||document.querySelector("header");
  var api=hdr&&hdr.querySelector(".api"),src=document.getElementById("src"),conn=document.getElementById("conn"),inp=document.getElementById("apiurl");
  if(!hdr||!api||!src||!conn||!inp||document.getElementById("beBtn"))return;
  var box=document.createElement("div");box.className="be";box.dataset.state="off";
  box.innerHTML='<button type="button" class="be-btn" id="beBtn" aria-haspopup="dialog" aria-expanded="false" aria-controls="bePop">'+
   '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></svg>'+
   '<i class="be-dot" aria-hidden="true"></i><span class="be-lbl" id="beLbl">Connect backend</span></button>'+
   '<div class="be-pop" id="bePop" role="dialog" aria-label="Backend connection"><h4>Backend connection</h4>'+
   '<p>Point the dashboard at your CardioMap API (FastAPI). Without it, the in-browser model is used.</p><div id="beSlot"></div>'+
   '<div class="be-row"><button type="button" id="beLocal">Use this server</button><button type="button" id="beOff">Disconnect</button></div></div>';
  api.parentNode.insertBefore(box,api);
  var slot=box.querySelector("#beSlot");slot.appendChild(api);slot.appendChild(src);
  var btn=box.querySelector("#beBtn"),lbl=box.querySelector("#beLbl");
  function setOpen(o){box.classList.toggle("open",o);btn.setAttribute("aria-expanded",String(o))}
  btn.onclick=function(e){e.stopPropagation();setOpen(!box.classList.contains("open"));if(box.classList.contains("open"))setTimeout(function(){inp.focus()},30)};
  document.addEventListener("click",function(e){if(!box.contains(e.target))setOpen(false)});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&box.classList.contains("open")){setOpen(false);btn.focus()}});
  inp.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();conn.click()}});
  box.querySelector("#beLocal").onclick=function(){inp.value=location.origin;conn.click()};
  box.querySelector("#beOff").onclick=function(){inp.value="";conn.click()};
  function sync(){var on=src.classList.contains("api");box.dataset.state=on?"on":"off";lbl.textContent=on?"Backend connected":"Connect backend";btn.title=src.textContent||""}
  new MutationObserver(sync).observe(src,{attributes:true,childList:true,characterData:true,subtree:true});sync();
 });
})();
