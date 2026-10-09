# Frontend v2 changelog (stage 1: effects + accessibility layer, UNTESTED in a browser)
Files changed: static/cardiomap.css (appended "v2 layer"), static/shell.js (appended second IIFE). Nothing else touched; no backend, model, API or disclaimer changes. Nothing removed.
Added (lab pages): spacing/radius/type tokens; skip link; focus rings; parallax orbs left+right; scroll-driven ECG line; staggered reveal; card hover scale .985 + teal border; dark hover/pressed buttons; .cm-busy button spinner; brand conic border + heartbeat + shimmer; chips + ECG hero accent (added only if page lacks chips); table-row hover; .cm-skel/.cm-state/.cm-notice components (classes available, not yet wired into pages); theme cross-fade; page fade; keyboard menus (arrows/Home/End/Esc); aria-label fallback for icon buttons; % count-up for .kpi/.stat/.metric/[data-countup]. All motion disabled under prefers-reduced-motion.
Not done yet: index/whatif CSS dedupe, hard-coded hex cleanup in page scripts, validation-table mobile fix, wiring state/notice components, effects on index/whatif/assistant, audit + Playwright verification + screenshots.
Run: pip install -r requirements.txt ; uvicorn app:app --port 8000 ; open http://localhost:8000/app/

## Stage 2 (also untested in a browser)
- index.html / whatif.html: 456 identical leading CSS rules (~44 KB each) moved verbatim, same order, into static/cardiomap-app.css (linked before the inline style, so the cascade is unchanged; rule-for-rule parity checked with a script). app.py: allow-list now also serves cardiomap-app.css (only backend change).
- Hard-coded colours in lab pages replaced by tokens (digital_twin .notice, pre blocks -> .cm-pre). Remaining hex in index/whatif scripts left alone (3D model colours).
- Every table is wrapped in a keyboard-focusable .cm-tablewrap scroll region (fixes validation table on phones).
- Lab pages get a shared .cm-notice medical notice unless the page already states one.
- Removed: nothing deleted; dead-rule pruning NOT done (needs a DOM to prove a rule is unused).
- Still not done: wiring .cm-skel/.cm-state into each page's API states, effects on assistant.html (index/whatif already have their own orbs/progress), audit, Playwright run, screenshots.

## Stage 3 (verified in headless Chrome against tests/mock_server.py, which uses the real model)
- Added: spinner on the button that starts an API call (fetch wrapper only adds a class; behaviour unchanged); shared empty/error state look on lab pages; assistant.html now gets orbs + ECG.
- Fixed a REAL defect found by the audit: dashboard (index.html) scrolled sideways by 368px at 390px wide (grid children could not shrink). Now 0px at 390/768/1360 on all 12 pages.
- tests/mock_server.py (stdlib backend: /schema /metrics /trust /predict via real core.py; other routes return 503) and tests/verify.py (Playwright: 12 pages x 3 widths x 2 themes, JS errors, sideways scroll, keyboard menu). Screenshots: tests/shots (1360 and 390 wide, light+dark), tests/before_after (4 pages, before vs after).
- Results: full 72-run sweep (12 pages x 3 widths x 2 themes) showed 368px sideways scroll only on /app/ at 390px; after the fix /app/, /whatif and /validation were re-tested at 390/768/1360 and show 0px. The other pages were 0px in the sweep; the full sweep was not re-run after the fix. Keyboard menu: ArrowDown opens and focuses, Escape returns focus: pass. Detective predict through mock backend: pass.
- Reported honestly: "THREE is not defined" JS errors on /app, /whatif, /explorer, /digital-twin because this sandbox has no internet for the three.js CDN (not a code defect; re-run with internet). Console "resource" errors are blocked CDN/fonts and un-mocked routes (503).
- NOT verified: What-If run, assistant chat, report PDF, case replay (their routes are not mocked and FastAPI could not be installed here); touch interaction; WCAG contrast measured by a tool (not run).
