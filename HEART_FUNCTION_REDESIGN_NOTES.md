# Heart Function Lab: design pass (changelog)
- Cohort check: headline rate + k/n + Wilson CI; per-row shared 0–N% scale; coral = Narrowed, teal = Not narrowed; boxed amber "fewer than 5" chip; stacked cards below 760px.
- Page: two-column hero with 3-step guide; sticky jump nav; segmented heart toolbar; compact LAD/LCX/RCA tiles; tabbed workbench (Artery, Flow, Wall & ECG, Estimate, Compare, Setup); unselected flow rows collapse; Physics vs data + Cohort in one card; consistent cards below.
- Bug fix: renderRow crashed ("reading 'total'") when a narrowing was applied (r.drop1/drop2 undefined on the single-lesion path). Now guarded.
- All element ids, data hooks and test-checked strings unchanged. No new dependencies.
## Not verified
- Live 3D heart (three.js CDN unreachable in my sandbox): stage sticky offset and toolbar over the real mesh.
- tests needing FastAPI/httpx (HTTP route tests) were skipped.

## v3: no tabs
- Removed the tabbed workbench. Flow sliders and a sticky "Live response" card (ECG + ST reading, per-artery wall effect in a collapsible) sit together; on phones the ECG stays pinned at the bottom.
- Compare, Estimate and Setup are full-width sections (jump nav updated). Compare cells are structured (narrowing, state chip, Flow/Reserve/ST tiles, coloured change column) and stack as cards on phones.
- "What does this artery feed?" is a collapsible under the vessel tiles.
- Hero visual (static/pro.js): particle heart + helix + ECG + orbiting LAD/LCX/RCA (see earlier notes).

## v4: ECG on demand
- Live ECG is hidden by default; "Show ECG" (Flow controls) opens it as a floating window you drag by its header (mouse/touch, arrow keys, double-click resets). Close with x or Esc.

## v5: typed inputs and flow conditions
- Flow conditions card (in "Add a blockage"): exercise intensity 1.0–4.0×, mean aortic pressure 60–120 mmHg, narrowing length 5–30 mm, hematocrit 25–60% (→ viscosity, teaching map). Number box + slider each; out-of-range or wrongly-formatted text is rejected with a message, never clamped. 4 presets, "Back to reference", Reference/Custom tag, effort sweep (1.0–4.0×) for the selected artery.
- Number boxes beside every narrowing slider (first and second lesion). Typed heart rate (40–130) and EF (15–65) in Setup, with "Back to reference".
- Model: CoronaryFlow.setContext/resolve (static/coronary-flow.js); K stays the reference set. Small-vessel Rmin is calibrated once at reference conditions, so pressure/length/viscosity change capacity only. With defaults every output is identical to v4 (5,760-point check). tests/test_flow_conditions.js.
- Heart rate and EF still do not change coronary flow numbers (stated in the UI). Compare/History use the live conditions for both A and B.
- Not verified: live 3D mesh (three.js CDN unreachable here); server routes (FastAPI not installed).

## v6: realistic flow layer (display only)
- New `static/heart-flowfx.js` (pure helpers, no physics) + hooks in `heart_function.html`. Every flow, pressure and reserve number is unchanged.
- Blood cells (60 per artery, was 36 white dots) now fill the lumen cross-section, move fastest in the middle, speed up through a narrowing (continuity) and swirl just beyond a 50%+ narrowing. Colour: Blood cells (dark to bright red by speed) or Speed map (blue to red).
- A translucent plaque sleeve keeps the vessel's outer wall at normal size while the coloured lumen narrows inside it; "Plaque & clot" toggle shows the old pinched tube when off.
- "Block selected artery" sets the second narrowing to 99% (model flow about 0); a clot plug is drawn from 97%, blood stagnates behind it and distal cells vanish unless collateral flow is set.
- One-sentence readout under the stage (peak speed, pressure drop, flow share) taken from the solver result.
- Tests: `node tests/test_flowfx.js`, `node tests/test_flow_conditions.js`. Inline script syntax-checked; particle/plaque/clot code smoke-tested with stubs.
## Not verified
- Live 3D look (three.js CDN unreachable here): cell size, plaque opacity and clot size are untuned guesses; check in the browser at 390 / 768 / 1360 px.

## v7: realistic heart look (display only)
- Cause: the heart was a pale lilac smooth shell with the coronaries half-buried in it, so it did not read as a real heart.
- New `static/heart-realism.js`: muscle-red tissue (ventricles vs darker atria) with a mottle, plus yellow epicardial fat painted along the three coronary grooves (per-vertex colours, computed once, about 70 ms). The ischaemia darkening shader still works on top of it.
- Coronaries: drawn about 1.5x wider and lifted onto the surface; arterial red when idle, identity colour when selected, band colour when narrowed.
- Aorta (with arch and 3 branches), pulmonary trunk and left/right pulmonary arteries, superior vena cava and 4 pulmonary veins added as schematic tubes from `great_vessels` in `static/models/heart_function_mesh.json`, placed from this mesh's valve landmarks (checked on a preview render from front, side and back). Aorta/veins red, pulmonary arteries/vena cava blue. Not selectable; caption says they are schematic.
- Framing now includes the great vessels (heart is drawn a little smaller; home camera distance 6.9).
- Tests: `node tests/test_heart_realism.js`.
## Not verified
- Live 3D render in the browser (three.js CDN unreachable here). Colours, fat band width and vessel placement were checked only on an off-screen preview; tune in the browser.
- The heartbeat is still rigid-part motion (no wall thickening); no valves or blood inside the chambers.


## v8: valves and chamber blood (display only)
What changed
- `static/heart-chambers.js` (pure, no globals; THREE is passed in): valve opening from the same phi and `HeartPhysio.timing`; chamber flow from the Wiggers volume; baked cavity waypoints (`CAVITY`, [x,y,z,r] in mesh metres) recomputed from the GLB; `makeDefs(great_vessels)` joins them to the manifest vessels (vessel r = tube radius x 0.6): right = SVC (reversed) > RA cavity > tricuspid > RV cavity > pulmonary > pulm_trunk; left = each of the 4 pulmonary veins (reversed) > LA cavity > mitral > LV cavity > aortic > aorta. `leafletGeometry` (3 cusps, mitral 2; closed dome on the axis, open = free edge swung to the wall) and `createView(THREE,cfg)`.
- View: one morph-target mesh + thin ring per valve (parented to `ventG`, oriented with `valveAxis`); 600 particles (300 per side, blue right, red left) in three Points buffers: vessel stubs in `world`, atrial segments in `atriaG` (positions scaled about each atrium's own pivot with the same `cs.atria` as `pose()`), ventricular segments in `ventG`. Same cell style as the coronary cells (PointsMaterial, size from the same formula). Walls turn translucent (opacity 0.3, no depth write) while Valves or Chamber blood is on and are restored when both are off.
- `heart_function.html`: "Valves" and "Chamber blood" toggles (aria-pressed, default on, 44 px), legend, `#valveHud` (aria-live="off") from `describeOpen`, caption and About wording (schematic; atrial squeeze is a schematic addition; only the SVC is a venous inlet; lungs not drawn). Inline code is about 20 lines: `buildChambers`, `chamberStep`, two click handlers. Particles advance with `sdt / beatSec`, so pause and 0.25x / 0.5x / 1x apply; with reduced motion the page starts paused, so valves show a still pose and particles do not move until the person presses Play (same rule as the heartbeat). Off-screen work is skipped by the existing `S.inView` check in `frame()`.
- No coronary flow, pressure, reserve or ECG number, `heart-wiggers.js`, `core.py`, `model.joblib`, `train.py`, API shape or disclaimer was touched. `app.py` unchanged this pass (the allow-list already had `heart-chambers.js`).
- Script URLs: every `/static/*.js|css` in `heart_function.html` is on the `app.py` allow-list (checked by script); `heart-chambers.js` is new in the page at `?v=20261008c`. External: three.js r128 and GLTFLoader only.
What was verified (Node only)
- Tests pass: `test_flow_conditions.js`, `test_flowfx.js`, `test_heart_realism.js`, `test_heart_chambers.js` (adds path structure: 4 segments, valve centres at segment ends, radii >= 0 and below the exact clearance from the mesh), `test_heart_chambers_view.js` (new; stand-in THREE, bookkeeping only), `test_chamber_containment.js` (new, real mesh).
- Containment against the real mesh (rest pose, 48 poses over 3 beats, 600 particles): **99.20%** of 27,782 visible particle samples are inside the enclosed cavity (outside every wall solid and blocked by a wall on at least 4 of 6 axis rays) or inside a vessel tube. The 221 outside samples are all in atrial segments on the left side, near the pulmonary-vein openings where the path crosses the atrial wall. They are not hidden. The test requires >= 95%.
- Cavity recompute: 4 mm lattice gave LV 403, RV 590, LA 218, RA 657 points with max clearance 15.6, 20.2, 16.3, 20.4 mm (your earlier figures were 420, 518, 141, 695 and 17, 17, 11, 21). Differences come from my voxel method and chamber labelling; the baked waypoints use a 2 mm lattice and 70% of the clearance as radius.
- Inline script syntax-checked with `node --check`; no duplicate ids; tag balance checked.
## Not verified
- Everything visual and in a browser. This sandbox has no three.js (CDN unreachable), no browser binary and no FastAPI, so there are NO Playwright screenshots (390 / 768 / 1360, light and dark), no frames at systole, diastole or atrial squeeze, no console-error check, and no fps measurement (50+ desktop, 30+ mobile is untested). Leaflet shape, morph targets (r128 `morphTargets`/`morphNormals`), wall translucency with the ischaemia shader, particle size and colour, and the caption height at 390 px are untested.
- Valves are parented to `ventG` and do not follow the per-vertex "weaker squeeze" shader of the ischaemia effect; atria blood is scaled about the atrium pivot, so a 1 to 2 mm mismatch with the valve ring is expected.
- Containment was measured at the rest pose; the page moves ventricles (up to 12% / 7%) and atria (about 5%) while particles move with them.
- Phase 2 (radial shortening and wall thickening) is NOT done: it was to start only after 1 to 6 were verified in a browser, which was not possible here.


## v9: decluttered stage + toolbar, wall motion (display only)
Files: `heart_function.html`, `static/heart-realism.js` (`?v=20261009a`), `tests/mesh_solids.js`, `tests/test_chamber_containment.js`, `tests/test_heart_realism.js`, new `tests/test_wall_motion.js`, new `tests/test_heart_function_page.js`. No new static file, so `app.py` is unchanged (`heart-realism.js` was already on the allow-list). No coronary flow, pressure, reserve or ECG number, `core.py`, `model.joblib`, `train.py`, `heart-wiggers.js` or API shape was touched. No element id or `data-*` hook was removed (ids added: `stageCap`, `aboutView`, `liveBlock`).

### Part A: stage and toolbar
- A1 Valves "unpressed": NOT reproduced. Markup, handler and CSS are identical for Valves and Chamber blood (both `aria-pressed="true"`, same rules), so I could not find a cause without a browser. Hardened instead: one `syncShow()` rewrites both `aria-pressed` values from the real view state (`CV.state`) after build and after every click; the three Show toggles have their own rules keyed only to `aria-pressed` (true = filled dot + filled button, false = outlined), so colour and attribute cannot disagree; both buttons are disabled (and false) if the chamber view fails to build. Needs your eyes in a browser.
- A2 Overlay: 2 lines on 768 / 1360 (disclaimer 1 + mesh credit on line 1, disclaimer 2 on line 2), 3 short lines at 390 (the credit does not fit beside a disclaimer there). Both disclaimers verbatim, not in a disclosure or tooltip. Computed height: about 36 px at 11 px type (min stage 320 px = 11%) and about 46 px at 10 px type on phones (min stage 400 px = 11.5%). "About this view" is a collapsed `<details>` directly under the stage with the schematic wording; the same wording is in "About this page" (heartbeat item rewritten for wall motion).
- A3 Framing: `HeartRealism.fitCamera` + `refit()` compute the home distance and a small world shift from the projected extents of the heart and great vessels, centred, with the bottom strip kept clear for the caption. `HOME.rad` is the single value used for the first view, resize and Reset view. Finding: at the old distance 6.9 my projection shows the shape already spans more than the full stage height (apex about 6% below the frame at wide aspects) and only about 40% of a wide stage's width, so the camera cannot make the heart bigger without cropping. The gain therefore comes from the stage: phones 400-520 px (was 320-440), tablets 380-620, short desktop windows 64% of the window height with a non-sticky card, tall windows `100vh - 370px` (min 480). The fitted distance is 6.2 (390), 7.8 (768), 8.0 (1360 stage 620x440), i.e. farther than 6.9, because nothing may be cropped or under the caption. Tags: `updateTags` now pushes overlapping tags apart; at the fitted home view LAD / LCX / RCA anchors are already 18 px or more apart vertically and 79 px or more between LAD and RCA (Node projection), so the nudge is a safeguard.
- A4 Toolbar: row 1 = Pause, Speed, Reset view; row 2 = "Show" (Plaque & clot, Valves, Chamber blood) + Flow look (lighter, right-aligned). 2 rows at 1360; at 390 the Speed label becomes screen-reader-only so row 1 fits, Show toggles share one row, Flow look wraps to a third row. 44 px targets (speed segments 40 px inside a padded 50 px group). Same ids, `data-*`, `aria-pressed`, `aria-label`.
- A5 Under the stage: legend as two colour dots on one line + `#valveHud`. `#flowHud`, `#lookKey`, `#rate` moved into "About this view" (still `aria-live="off"`, still updated by the same code).

### Part B: wall motion
- Per vertex (mesh metres): `d = uSys * (1 - kLocal) * aThick * A * (n - 0.5 * aRad)`. `n` = the mesh's outward normal (checked on all 22,477 vertices: it agrees with the triangle winding; no duplicated vertices, so no cracks), so the endocardium moves into the cavity by up to 1.5 A, the epicardium moves out by up to 0.5 A, and the wall is up to 2 A thicker; `-0.5 aRad` is the extra shortening toward the long axis. `aRad` (unit, outward from the long axis through P along u) and `aThick` (sin of the normalised axial position over the union of LV, RV and septum: 1 mid-wall, exactly 0 at base ring and apex) are computed once per wall mesh; one new uniform `uSys` (0..1 = `cycleState.s`, set in `pose()`, no allocation). Atria untouched. `uSys = 0` adds exactly 0.
- Compatibility: injected inside the existing `onBeforeCompile` after the `kLocal` line; ischaemia darkening, per-vertex colour, 17-segment highlight and raycast picking untouched (picking uses the undisplaced geometry, so it is up to 3 mm off at peak systole). `customProgramCacheKey` is `hf-wall-segment-motion1` (shader source changed; `hf-wall-segment` is used when the attributes are absent).
- Math is in `static/heart-realism.js` (`WALL_AMP_M`, `thickWeight`, `axialRange`, `wallAttributes`, `wallDisplacement`, `capAmp`, `ampLimit`, `fitCamera`).
- Amplitude: requested 3.0 mm, capped to 2.0 mm. Measured on the exact mesh (`tests/test_wall_motion.js`): no ventricular blood sample (7,154 samples, 24 poses) is inside the displaced wall up to 1.25 x the cap (2.5 mm); at 2 x the cap 82 samples are, so the limit is real. Endocardium moves in at most 3.0 mm, wall gets up to 4 mm thicker (exaggerated on purpose; a real LV thickens by a few mm).
- Containment (`tests/test_chamber_containment.js`, 48 poses, 27,782 samples): rest wall 99.20%, displaced wall at peak systole 99.20% (same 221 atrial samples near the pulmonary-vein openings as in v8; 0 ventricular samples outside). Remaining mismatch, stated: valves and ventricular blood stay rigid in `ventG` (valve rings sit at the base where the taper is 0); coronary tubes ride `ventG`, so at peak systole the epicardium moves up to 1 mm outward and they sit up to 1 mm deeper; the weak-territory pose-undo term is unchanged.
- Reduced motion, pause, 0.25 / 0.5 / 1x and the off-screen check use the existing paths (`uSys` only changes in `pose()`, which only runs when `frame()` runs).

### Verified (Node only)
- Pass: `test_flow_conditions.js`, `test_flowfx.js`, `test_heart_realism.js` (now incl. camera fit), `test_heart_chambers.js`, `test_heart_chambers_view.js`, `test_chamber_containment.js` (rest + displaced), `test_wall_motion.js` (bounded, zero at s = 0, zero where aThick = 0, zero at kLocal = 1, never above the clearance limit, real-mesh attributes), `test_heart_function_page.js` (ids kept, disclaimers verbatim in the overlay, overlay holds at most disclaimers + credit, details collapsed, toolbar order, defaults pressed, all `/static` URLs on the allow-list, version bumped, shader hooks present). All 3 inline scripts pass `node --check`; no duplicate ids.
- `attachWall` was run in Node against stub objects: the injected vertex shader text is well formed (balanced, declarations present, `uSys` uniform shared).

## Not verified
- NO browser, NO three.js CDN and NO FastAPI in this sandbox: no Playwright run, no screenshots at 390 / 768 / 1360 in light or dark, no diastole / peak-systole frames, no console-error check, no fps measurement (50+ desktop, 30+ mobile untested), no measured overlay height (the 11% figures are computed from font size and line count), no horizontal-overflow check, no check of reduced motion in a browser.
- The GLSL was never compiled: `objectNormal` is assumed available at `<begin_vertex>` (it is in three r128's `meshphysical_vert`, but unconfirmed here); the first thing to check is a clean console on load.
- Camera fit and tag positions are a Node projection, not a render; the stage heights and the sticky/static switch at 860 px window height are untested.
- The Valves "unpressed" cause is not known (see A1).
- The page already had two stray `</div>` (lines shift only; same two as in v8); I did not touch them.


## v10: layout pass (display only)
- Bug: `#liveBlock` (legend + valve line under the toolbar) reused the class `.hf-live`, which is the floating ECG window (`position:fixed`, bottom-right). It floated over the Show toggles / Flow look. Renamed to `.hf-stagenote`; the ECG window is untouched.
- Stage card: one flex column with a definite height (`min(100vh - 144px, 920px)`), sticky at 128 px; the 3D stage takes what the controls leave, so the toolbar and About row are never cut off. Windows shorter than 690 px: static card, stage 62vh. Order: stage, legend/valve line, toolbar, About.
- Toolbar: 38 px buttons on fine-pointer desktops (44 px kept on touch), small-caps group labels, divider above the Show row. About row is a full-width slim bar.
- Flow card: the three artery sliders now come right after the Activity buttons. Flow conditions moved below them into a disclosure (`#condWrap`, open on desktop, closed under 960 px) whose summary mirrors the Reference/Custom tag. All ids, data hooks and test strings unchanged; effort sweep tiles use auto-fit columns.
- Checked headless at 1918x996, 1360, 768, 390, light and dark: no horizontal overflow, no overlap. `node tests/*.js` pass.
## Not verified
- Live 3D mesh (three.js CDN unreachable here): the stage was checked with the WebGL fallback message only; ResizeObserver already resizes the renderer when the stage height changes.

## v10b: stutter fix (display only)
- Cause (from the screen recording: repeated 0.3-0.5 s freezes while the heart animated): the full-screen animated background (`static/bg.js`) sat under many `backdrop-filter` blurred panels (nav, jump bar, cards). Every background frame forced the browser to re-blur all of them while the 3D view also rendered. Headless timing at 1918x996: 149 ms/frame before, about 25 ms after (software rendering, so absolute numbers are inflated; the ratio is the point).
- This page now sets `window.__cmBgStatic=true`: `bg.js` draws the background once and redraws on scroll/theme change only (throttled to 50 ms, like its reduced-motion mode). Other pages are unchanged. `shell.js` and `bg.js` cache keys bumped to 20261008b.
- Backdrop blur is switched off on this page (panels keep their translucent fill).
- Per-frame cleanup in the 3D loop: label sizes are cached (no forced layout each frame), ECG drawing is skipped while the ECG window is closed, the cycle-trace cursor is skipped while that card is off-screen.
## Not verified
- Real GPU frame rate with the live 3D mesh (three.js CDN unreachable here). If it still hitches on your machine, `powerPreference:'low-power'` in the WebGLRenderer call is the next thing to try changing.

## v10c: adaptive quality (display only)
- The recording still hitched after v10b, with 0.3-0.5 s stalls only while the 3D heart moved. Page CSS/JS work is now small, so the remaining cost is rendering 127k triangles with translucent double-sided walls (Valves / Chamber blood), which is very slow on a weak or software GPU.
- `glIsSoftware()` reads WEBGL_debug_renderer_info; on SwiftShader/llvmpipe/Basic Render the renderer starts without MSAA at pixel ratio 0.7 with Valves and Chamber blood off, and a small note says so.
- `qGov` watches the frame interval while the heart plays and is in view; after 20 frames above 50 ms it steps down: 0.85, then 0.7 plus Valves/Chamber blood off (translucent walls), then 0.55. It never steps back up on its own; the note in the stage says what changed. Unit-checked with stubs (smooth input never steps; slow input stops at level 3).
## Not verified
- Real GPU behaviour with the live mesh (three.js unreachable here). Check chrome://gpu: if "Graphics Feature Status" says Software only, turn on hardware acceleration in the browser.

## v10d: GPU preference and ?perf=1 readout
- User's chrome://gpu shows WebGL hardware accelerated, so the hitching is not software rendering. `powerPreference` changed from 'low-power' to 'high-performance' (on laptops with two GPUs 'low-power' picks the weaker one).
- `heart_function.html?perf=1` shows a small readout bottom-left: GPU name, frame avg/p95/worst ms, JS+submit ms, pixel ratio, quality step, triangles, draw calls, Valves/Chamber blood state. Off by default.
## Not verified
- Live 3D on a real GPU (three.js unreachable here).
