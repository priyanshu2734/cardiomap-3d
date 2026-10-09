/* Marks every Yes/No <select> (options "No" and "Yes", optionally with a blank/"Not specified" first option) and mirrors its value into data-v for styling. */
(function(){
  function isYN(s){var t=[].map.call(s.options,function(o){return o.textContent.trim().toLowerCase()});
    return ((t.indexOf("yes")>-1&&t.indexOf("no")>-1)||(t.indexOf("female")>-1&&t.indexOf("male")>-1))&&t.filter(function(x){return x!=="yes"&&x!=="no"&&x!=="female"&&x!=="male"&&x!==""&&!/^(not (specified|provided|supplied)|—|-)$/.test(x)}).length===0}
  function sync(s){s.setAttribute("data-v",s.value)}
  function scan(root){(root||document).querySelectorAll("select:not([data-yn])").forEach(function(s){if(isYN(s)){s.setAttribute("data-yn","");sync(s)}})}
  document.addEventListener("change",function(e){var s=e.target;if(s&&s.matches&&s.matches("select[data-yn]"))sync(s)},true);
  var mo=new MutationObserver(function(m){var go=false;m.forEach(function(r){if(r.addedNodes.length)go=true;if(r.type==="attributes"&&r.target.matches&&r.target.matches("select[data-yn]"))sync(r.target)});if(go)scan()});
  function start(){scan();mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["value"]});
    setInterval(function(){document.querySelectorAll("select[data-yn]").forEach(sync)},600)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
