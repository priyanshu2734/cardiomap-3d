/* Hosts same-origin embedded panels (iframes with class cm-embed-frame): sizes each frame to its content. */
window.addEventListener("message",function(e){var d=e.data;if(!d||typeof d.cmEmbedH!=="number")return;
 [].slice.call(document.querySelectorAll("iframe.cm-embed-frame")).forEach(function(f){if(f.contentWindow===e.source)f.style.height=Math.max(120,d.cmEmbedH+2)+"px"})});
