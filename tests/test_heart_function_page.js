/* Static checks of heart_function.html (no browser): ids kept, disclaimers verbatim on the stage, toolbar grouping, toggles default to pressed,
   About disclosure collapsed, inline scripts parse, /static URLs on the app.py allow-list. Run: node tests/test_heart_function_page.js */
const fs=require('fs'),assert=require('assert'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'heart_function.html'),'utf8'),ok=(c,m)=>assert(c,m);
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);const seen=new Set(),dup=ids.filter(i=>seen.has(i)||!seen.add(i));ok(!dup.length,'duplicate ids: '+dup);
/* every id the v8 page had that the JS or tests may use must still exist */
['stage','cv','tags','credit','chamberCap','chamberLegend','valveHud','flowHud','lookKey','rate','play','reset','wallToggle','valvesToggle','chamberBloodToggle','phase','phaseSub','cyc','fxBadge','msg','msgText'].forEach(i=>ok(seen.has(i),'id kept: '+i));
const stage=html.slice(html.indexOf('<div class="hf-stage" id="stage">'),html.indexOf('<details class="hf-about"'));
ok(stage.includes('Reference anatomy, not your heart.'),'disclaimer 1 verbatim on the stage');
ok(stage.includes('Simplified physics model, not patient-specific or clinical.'),'disclaimer 2 verbatim on the stage');
ok(!/<details|title=/.test(stage.slice(stage.indexOf('id="stageCap"'))),'disclaimers are not inside a disclosure or tooltip');
const cap=stage.slice(stage.indexOf('id="stageCap"'));const capEnd=cap.slice(0,cap.indexOf('</div>'));const capText=capEnd.replace(/^[^>]*>/,'').replace(/<[^>]+>/g,'|').split('|').filter(s=>s.trim());
ok(capText.length<=3,'overlay holds only the two disclaimers and the credit: '+JSON.stringify(capText));
ok(/id="credit"/.test(capEnd),'credit stays in the overlay');
const det=html.slice(html.indexOf('<details class="hf-about"'),html.indexOf('</details>')+10);
ok(!/<details[^>]*\sopen/.test(det),'About this view is collapsed by default');
['Aorta, pulmonary artery, veins and coronary widths are schematic additions','Motion is exaggerated for visibility','atrial squeeze is a schematic addition','only the SVC is drawn as a venous inlet','lungs are not drawn'].forEach(t=>ok(det.includes(t),'About this view keeps: '+t));
['id="flowHud"','id="lookKey"','id="rate"','id="chamberCap"'].forEach(t=>ok(det.includes(t),'moved into the disclosure: '+t));
['Aorta, pulmonary artery, veins and coronary widths are schematic additions','thickens'].forEach(t=>ok(/<h2[^>]*>About this page|About this page/.test(html)&&html.includes(t),'About this page text: '+t));
/* live lines stay aria-live=off */
['flowHud','lookKey','valveHud'].forEach(i=>ok(new RegExp('id="'+i+'"[^>]*aria-live="off"').test(html),i+' aria-live off'));
const live=html.slice(html.indexOf('id="liveBlock"'),html.indexOf('</section>',html.indexOf('id="liveBlock"')));
ok((live.match(/<p /g)||[]).length<=2,'at most 2 lines by default under the toolbar');
/* toolbar: 2 rows, same hooks */
const tb=html.slice(html.indexOf('<div class="hf-ctl hf-toolbar"'),html.indexOf('id="liveBlock"'));
ok((tb.match(/class="hf-tbrow/g)||[]).length===2,'toolbar has two rows');
ok(/id="play"[\s\S]*data-speed="0\.25"[\s\S]*id="reset"/.test(tb.slice(0,tb.indexOf('hf-tb-show'))),'primary row: Pause, Speed, Reset view');
const show=tb.slice(tb.indexOf('hf-tb-show'));ok(/>Show</.test(show)&&show.indexOf('wallToggle')<show.indexOf('valvesToggle')&&show.indexOf('valvesToggle')<show.indexOf('chamberBloodToggle'),'Show row: Plaque & clot, Valves, Chamber blood');
ok(/data-look="blood"/.test(show)&&/data-look="speed"/.test(show)&&/aria-label="Blood flow look"/.test(show),'Flow look kept, in the secondary row');
['wallToggle','valvesToggle','chamberBloodToggle'].forEach(i=>ok(new RegExp('id="'+i+'"[^>]*aria-pressed="true"').test(html),i+' defaults to aria-pressed=true'));
ok(!/id="valvesToggle"[^>]*aria-pressed="false"/.test(html),'Valves is not rendered unpressed');
/* the visual state is keyed only to aria-pressed */
ok(/\.hf-tog\[aria-pressed=true\]/.test(html)&&/\.hf-tog\[aria-pressed=false\]/.test(html),'CSS covers both pressed states of the Show toggles');
/* inline scripts parse */
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new vm.Script(m[1])}catch(e){throw new Error('inline script '+i+': '+e.message)}});
/* /static URLs on the allow-list */
const app=fs.readFileSync(path.join(root,'app.py'),'utf8'),allow=new Set([...app.slice(app.indexOf('if name not in {')).split('}')[0].matchAll(/"([^"]+)"/g)].map(m=>m[1]));
const urls=[...html.matchAll(/\/static\/([A-Za-z0-9_.\-]+\.(?:js|css))\?v=([0-9a-z]+)/g)];
ok(urls.length>10,'found script urls');urls.forEach(([,f,v])=>ok(allow.has(f),'/static/'+f+' is on the app.py allow-list'));
ok(urls.some(([,f,v])=>f==='heart-realism.js'&&v==='20261009a'),'heart-realism.js version bumped');
/* shader: motion is behind uSys and the weak-territory term */
ok(/uSys/.test(html)&&/\(1\.0-kLocal\)\*aThick/.test(html),'wall motion uses uSys and (1 - kLocal)');
ok(/customProgramCacheKey=\(\)=>motion\?'hf-wall-segment-motion1':'hf-wall-segment'/.test(html),'cache key bumped with the shader source');
ok(/WU\.uSys\.value=/.test(html),'uSys is set in pose() without allocation');
console.log('heart_function.html static checks passed ('+ids.length+' ids, '+urls.length+' /static urls)');
