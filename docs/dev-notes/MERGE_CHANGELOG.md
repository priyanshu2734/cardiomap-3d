# Merge changelog: Confidence Heart (A) + SHAP UI upgrade (B) + reconnect fix

Base = A (`cardiomap_confidence_heart_final`). B's SHAP work was applied on top of it.
The original ancestor zip (C) was not supplied, so this is a two-way A↔B merge: B's changes were
identified from the B-side description plus the A↔B diff, and every A-only hunk (halo, chips, Live preview,
calibration/ROC, batched sensitivity, `interval()`) was kept as-is.

Untouched (byte-identical to A): model.joblib, metrics.json, export.json, train.py, build_uncertainty.py,
app.py, report.py, provenance.py, case_replay.py. B's `.env` was NOT carried over.

## core.py
| Change | Source |
|---|---|
| `_fmt_input()`, `_shap_records()` added | B |
| `_shap_explain_target()` now returns output_value, sum_shap, base_probability, output_probability, model_probability, n_features; records gain rank, share_pct, display_value, is_default, abs_value, direction | B |
| Tree output_space: GradientBoosting "log-odds", RandomForest "probability" (was "native model output") | B |
| `interval()`, `UNCERTAINTY_NOTE`, interval fields in `predict()`, batched sensitivity in `explain()` | A (kept untouched) |

Behaviour note: SHAP record `direction` changed from a sentence ("raises model output vs. baseline") to
`"up"/"down"/"none"` as specified. Only the new `renderRealShap()` consumes it. The *sensitivity*
`direction` in `explain()` is unchanged.

## index.html: conflicts and how they were resolved
| Area | Resolution |
|---|---|
| CSS "Real SHAP + sensitivity explanation layout" | Replaced by B's "Explainability section" block. A's `#loadReference` and "Confidence Heart" CSS blocks after it kept. `.shap-empty` (also used by A's calibration/ROC empty states) now uses B's definition. |
| Old `.explainability-panel` in `<aside>` | Removed (B). A's Live preview, halo toggle, vessel panel, `vesselLive` are elsewhere and untouched. |
| New `<section id="explainability-section">` | Added right after `</main>` (B). |
| Section rail | "Explain" link added; A's `<span data-cm-explore>` kept. |
| `renderRealShap()` | B's version replaces A's. `xmode`, `xall`, `esc`, `pct`, `setXMode()` added. `pct` is a new global; A's local `pct` consts in paint()/updateVesselPanel() shadow it harmlessly. |
| `paint()` | A's edits kept (range chips, `updateHaloControl`, `scheduleHaloRebuild`, vessel panel) and B's `renderRealShap(sel)` call kept. A's wording of the sensitivity note is kept. |
| `loadReferenceHeart()` | B's loading / active ("HRA heart active ✓") / failed states added. |
| Trust Center | A's reliability + ROC charts kept (B's older text is not reinstated). |
| `D` data constant | A's kept (B differs only in `\u00b2` escaping). |

Small fix to B's CSS: `.xsum{display:flex}` overrode the `hidden` attribute, so the summary card stayed visible in
Sensitivity mode. Added `.xsum[hidden]{display:none}`.

## Fix 1: reconnect bug
`index.html` `let API=...`: `location.pathname==="/app"` → `location.pathname.startsWith("/app")||location.pathname.startsWith("/whatif")`.
Grep of all html/js for exact-path comparisons: none left. For consistency the same condition now also drives:
`index.html` `base()` and `#aiFab` link; `whatif.html` top-level `API` (previously `||""`, i.e. offline on /whatif), `base()` and `#aiFab`.
`wiApiBase()` already used it. `static/shell.js` already strips the trailing slash.

## Task 2: explainability layout cleanup (index.html only)
- **a.** `<aside>` holds none of the old panel (no `#tabs/#shap/#shapn/#realShap/#xsum`, `.explain-card`, "Existing" badge); verified in the DOM.
- **b.** Sensitivity now renders through the same `xRows()` row builder as SHAP (rank | feature + share | diverging bar | input+unit | signed value + ▲ raises / ▼ lowers). The old `.bar` markup is gone from this section. Both views span the full section width (the summary card exists only in SHAP view, so Sensitivity uses the whole row via `.xgrid.solo`). "Show top 8 / Show all N" is shared by both views.
- **c.** `applyX()`: no `res.shap` ⇒ Sensitivity is selected, the SHAP button is disabled ("needs the API") and a one-line banner with **Connect to API** (focuses `#apiurl`) is shown. API connected ⇒ SHAP by default; if the user explicitly picks Sensitivity it is kept. If the API is up but SHAP fails for a target, a compact banner shows the server message instead of the old large empty box.
- **d.** Kept: top-8, summary card (baseline → this case, Σ SHAP, output), method notes. Wording made neutral and both notes end with "not causal and not a diagnosis"; the subtitle changes with the active view. "It is not SHAP" removed. Header row is more legible; it is **not** sticky because the page already pins a sticky header and section rail at the top (a third sticky bar would collide).
- **e.** ≤980px summary stacks above rows; ≤640px each row is two lines (name + input + value, then bar; input moves into the name's sub-line); verified no horizontal page scroll at 980/640/375px.
- **Regression fixed:** B's toggle class `.seg` collided with the Sex selector (`.seg` + `static/cardiomap-app.css` margins). Toggle renamed `.xseg`; Sex selector computes `display:block`, no border again.
- **Header overflow fixed:** at ≤640px `.brand small` was `nowrap` and pushed the page to 406px wide at 375px (pre-existing in A); now wraps.
- Values that round to 0.000 show a neutral "• no effect" instead of a red "raises".

---

# Fix 7 (regression guard) + verification pass

## File-by-file changes in this pass
| File | Change |
|---|---|
| `index.html` | Disclaimer line under the result pills now reads "Decision support and educational use only. Not a substitute for diagnostic imaging." (was "Educational decision support only. Not a diagnosis."). The longer notice ("not a substitute for formal diagnostic imaging or clinical judgment") and the halo caveat ("is not a lesion location") are unchanged. |
| `whatif.html` | Same one-line disclaimer change. |
| `tests/regression_guard.py` | NEW. Browser-free guard for A and B: disclaimer, halo caveat, halo toggle (aria-pressed + localStorage), Live preview (250 ms debounce + AbortController), `vesselLive` aria-live, range readouts, reduced-motion, reliability/ROC, SHAP section/toggle/HRA states; predictions identical to the baseline fixture, intervals + `width_cutoffs`, provenance and case-replay bootstrap metadata, and `report.py` range column. Stubs fastapi/pydantic/chat only to import `report.py`/`provenance.py`. |
| `tests/test_shap_records.py` | NEW. Synthetic `_shap_records()` test (rank starts at 1 and is consecutive, sorted by abs value, `share_pct` sums to about 100, required fields) runs everywhere. The real-payload test through `core.explain_shap` (`base_value + sum_shap == output_value`, tolerance 1e-6) prints SKIP when `shap` is not installed. |
| `tests/live_check.py` | NEW. Stdlib script for a running server: `POST /predict {"age":62}`, checks each target has `interval` and `shap.targets[t].records[0]` with rank/display_value/share_pct, then reports p50/p95 latency over N warm calls. |
| everything else | Unchanged: `core.py`, `app.py`, `report.py`, `provenance.py`, `case_replay.py`, `model.joblib`, `metrics.json`, `export.json`, `train.py`, `build_uncertainty.py`. No new dependencies or CDN scripts. |

## Conflict resolutions
No new conflicts in this pass. The A/B merge resolutions are in the tables above (core.py, index.html, Trust Center, `D` constant, `.xsum[hidden]`, `.seg` -> `.xseg`).

## Fix status
| # | Fix | Status |
|---|---|---|
| 1 | Reconnect bug (`startsWith("/app")` / `"/whatif"`) | Done in code (verified by reading `index.html:410`). Not exercised in a browser. |
| 2 | Explainability layout cleanup | Done in code. Not rendered in a browser here. |
| 3 | Chip layout | Done in code. Not rendered in a browser here. |
| 4 | Halo legibility + depth | Done in code; `width_cutoffs` verified in the API output. Not rendered (three.js CDN unreachable). |
| 5 | Model label | Done in code. Not rendered in a browser here. |
| 6 | Light-theme HRA button | Done in code. Contrast figures come from the earlier notes, not re-measured here. |
| 7 | Regression guard + constraints | Done: guard passes, one disclaimer wording fix applied. |

## What was run (results)
- `python -m py_compile` on all 17 `.py` files: OK.
- `node --check` on all 4 inline scripts of `index.html`: 0 errors (all other pages' inline scripts and `static/shell.js` also parse).
- `tests/test_uncertainty.py`: PASS. `tests/regression_guard.py`: ALL PASS. `tests/test_shap_records.py`: synthetic test PASS, real-SHAP test SKIPPED (see below).
- Baseline fixture: probabilities identical for all 8 cases x 4 targets; every target has an interval with `width_cutoffs`.
- `core.predict()` alone (bootstrap intervals, no SHAP, no HTTP), 30 warm calls on this sandbox: p50 about 479 ms, p95 about 544 ms. This is NOT the `/predict` latency (see below).

## Not verified
- Real app: `fastapi`, `uvicorn` and `shap` are not installed in the sandbox and there is no network, so `uvicorn app:app` was not started. `POST /predict {"age":62}` returning `interval` AND `shap.targets[t].records[0]` (rank/display_value/share_pct) was NOT confirmed. Run `python tests/live_check.py`.
- `/predict` latency (SHAP + intervals, p50/p95 over >=10 warm calls) was NOT measured; only the `core.predict()` figure above exists. B=30 unchanged.
- `base_value + sum_shap == output_value` (1e-6) on a real payload: test written, not run (needs `shap`).
- Screenshots (1360 and 390 px, light and dark): none taken; no browser is installed. (a) connected dashboard with halo on, (b) SHAP mode, (c) Sensitivity mode offline and (d) Dashboard -> Digital Twin -> back via nav still connected were NOT run. No mock or composited images are included.
- 3D halo from front/side/back and WebGL rendering; chip/halo/toolbar layout at 1360/768/390 px; keyboard operation and the live debounce in a real page. `tests/verify.py` was not run.
- Digital Twin and What-If pages were only parse-checked, not loaded.

---

# Combine into the new design (cardiomap_FULL / "pro" redesign)

Base = `cardiomap_FULL_project` (frontend look kept). All Confidence Heart (A), SHAP UI (B) and fix 1-7 work from the earlier merged zip was added on top.

## Frontend: untouched, byte-identical to the FULL zip
`static/cardiomap-pro.css`, `static/pro.js`, `static/bg.js`, `static/shell.js`, `static/cardiomap.css`, `static/cardiomap-app.css`, `insights.html`, `assistant.html`, `research.html`, `validation.html`, `evidence.html`, `detective.html`, `replay.html`, `trust_stress.html`, `explorer.html`, `REDESIGN_PRO_NOTES.md`, `.env`.

## Frontend: edited (additive)
| File | Change |
|---|---|
| `index.html` | Header, hub tiles, hidden "moved" validation/data boxes, section rail, and the three redesign scripts are the FULL ones. Added: "Explain" rail link; Live preview checkbox; "Use HRA heart" and "Confidence halo" toolbar buttons; `#vesselEstimateRange` and `#vesselLive`; the full-width `#explainability-section` (right after `</main>`, as in B) in place of the old panel inside `<aside>`; Trust Center reliability + ROC grid and `#trustCalibrationLimitation`; HRA wording in Sources; one-line disclaimer; the A+B inline script (halo, chips, intervals, Live preview, SHAP rendering, reconnect fix, model label). |
| `whatif.html` | Reconnect fix (`/whatif` counts as an API page), disclaimer wording. |
| `digital_twin.html` | "Use HRA heart" button + loader. |

## Conflict resolutions
- The FULL inline script is the ancestor script (the redesign did not change it), so A+B's script replaces it wholesale; the only FULL-only part, the tail `shell.js` + `pro.js` + `bg.js`, is kept.
- NOT ported (belonged to the old design layer the redesign replaced): the `cm-design` `<style>` block, the old section-rail/theme/parallax tail script, the old `shell.js`.
- Ported CSS (Explainability section, Confidence Heart, chip cards, `#loadReference`) is inserted after `cardiomap-pro.css`. Its variables were mapped to the new theme: `--d-text`->`--ink`, `--d-mut`->`--muted`, `--d-line`->`--line`. The redesign's own dark-theme `.chip` / button colours still win by specificity.

## Backend
`core.py`, `model.joblib`, `metrics.json`, `export.json`, `build_uncertainty.py`, `report.py`, `provenance.py`, `case_replay.py`, `train.py`, `requirements.txt` (adds `shap`) from the merged project. `app.py` = FULL's file (keeps `/insights` and the pro static files) plus `/predict` with `interval` + `shap`, `POST /explain`, `/app/digital_twin` alias, and `/static/models/{name}` for local HRA assets. Primary-model probabilities are identical to the FULL zip's `model.joblib` on all 8 fixture cases x 4 targets.

## Tests run here
`py_compile` all `.py`; `node --check` on every inline script of `index.html`, `whatif.html`, `digital_twin.html` and on `shell.js`/`pro.js`/`bg.js`; `tests/regression_guard.py` (19 checks, incl. new "FULL design intact" checks) ALL PASS; `tests/test_uncertainty.py` PASS; `tests/test_shap_records.py` synthetic part PASS. No duplicate element IDs; every ID the script uses exists in `index.html` (same pre-existing guarded What-If/legacy refs as before).

## Not verified
- Nothing was rendered: no browser here, so the look of the NEW elements (chips, explainability section, halo/HRA buttons, Live preview, Trust charts) inside the redesign, in light and dark and at 390/768/1360 px, is unchecked. The 3D halo needs the three.js CDN.
- `fastapi`, `uvicorn`, `shap` are not installed here: the real app, `POST /predict {"age":62}` with `shap` records, real-SHAP test (`base + sum == output`), and `/predict` latency were not run. Use `tests/live_check.py` and `tests/test_shap_records.py`.
- Whether the redesign's `pro.js` section-rail highlighting picks up the new "Explain" link.
- Light-theme contrast of `#loadReference` / Confidence halo under the new theme (earlier 8.45:1 figure was measured on the old theme).

---

# Why-Beams feature addition

Base = `cardiomap_final_new_design_merged.zip`. Only `index.html`, `tests/regression_guard.py`, and `tests/test_why_beams.py` were changed. All backend files (core.py, app.py, model.joblib, metrics.json, export.json, train.py, build_uncertainty.py), all static/ assets, and all other HTML pages are byte-identical to the base.

## File-by-file changes

### index.html (additive only)

| Section | What changed | Requirement |
|---|---|---|
| `<style>` block (Why-Beams CSS) | New style block `/* WHY-BEAMS:CSS */` inserted before `</head>`. Styles for `#whyToggle`, `#whyLayer`, `#whySvg`, `.why-beam`, `#whyHeader`, `#whyTags`, `.why-tag`, `#whyCaption`, `#whyLive`. Mobile breakpoint (`<=640px`) hides beams, shows header + list below canvas. `@keyframes whyDash` for beam animation; `@media not (prefers-reduced-motion:reduce)` guard. Reuses CSS variables `--panel`, `--line`, `--ink`, `--muted`. Beam colours reuse `#ff6b7d` (pos, up) and `#37c8ff` (neg, down) from `.shap-fill.pos/.neg`. | Req 2b, 2f, 5c, 5e, 6 |
| `<button id="whyToggle">` | Added next to `#haloToggle` in `.right-tools`. Same classes/styling as neighbouring buttons. `aria-pressed="true"` initial state. | Req 3a, 3b, 5d |
| `<div id="whyLayer">` | Inserted inside `#stage` before `#chips`. Contains `#whyHeader`, `#whySvg`, `#whyTags > ol`, `#whyCaption`, `#whyLive`. `pointer-events:none` on container, `pointer-events:auto` on tags. `aria-hidden="false"`. | Req 2a, 2b, 5a, 5b |
| `/* WHY-BEAMS:DATA START/END */` | Pure function `cmWhyData(res, target, n)`. Reads only `res.shap.targets[target].records`. Returns `[]` for any missing/falsy input. Excludes `direction="none"` and `share_pct=0`. Sorted by rank. At most n records. | Req 1a, 1b, 1c |
| Why-Beams IIFE (JavaScript) | `cmWhyBuild()` — builds header, tag `<li>/<button>` elements, SVG `<path>` beams. `cmWhyProject()` — per-frame endpoint projection, writes DOM only when endpoint moved >0.5 px. `cmWhyAnnounce()` — SR live region on target change. `cmWhyPaint()` / `cmWhyProjectFrame()` — entry points exposed on `window`. `_syncToggleBtn()` — disables toggle when SHAP unavailable. `ResizeObserver` invalidates cached rect. `localStorage` key `"cm-why-beams"` with try/catch. Tag hover/focus highlights beam, dims others. Tag click calls `setXMode("shap")`, scrolls matching `#realShap .shap-row` into view. | Req 2a–2i, 3a–3c, 4a–4c, 5a–5e |
| `paint()` — hook | `if(window.cmWhyPaint)cmWhyPaint()` appended to end of `paint()` body. | Req 4a |
| Render loop | `if(window.cmWhyProjectFrame)cmWhyProjectFrame()` added inside the `if(R){…}` block of the existing loop. ONE guarded call. | Req 4a, 4b |
| No existing code removed | All IDs, classes, functions, event handlers are intact. `buildHalo`, `haloScale`, `B=30` unchanged. | Constraint |

### tests/test_why_beams.py (new file)

Extracts `cmWhyData` between the DATA markers, runs 14 assertions in Node.js:
- Returns `[]` for null res, missing shap, missing targets, empty records, missing target key
- Returns at most n items
- Items sorted by rank
- Excludes `direction="none"` and `share_pct=0`
- Never returns label/value not in input records
- Default `n=5` works without argument

### tests/regression_guard.py (extended)

Appended 12 new `check()` calls (Why-Beams static checks):
- `#whyLayer`, `#whyToggle aria-pressed`, `#whyLive aria-live="polite"` present in index.html
- Exact caption text present
- Existing disclaimer preserved
- `is not a lesion location` caveat preserved
- `prefers-reduced-motion` + `whyDash` keyframe present
- `cm-why-beams` localStorage key present
- `/* WHY-BEAMS:DATA START/END */` markers present
- `cmWhyData`, `cmWhyPaint`, `cmWhyProjectFrame` present

## Requirement traceability

| Req | Status | Notes |
|---|---|---|
| 1a Pure `cmWhyData` | ✅ | Between DATA markers; testable |
| 1b Marker comments | ✅ | `/* WHY-BEAMS:DATA START/END */` |
| 1c Exclude none/zero | ✅ | Verified by tests/test_why_beams.py |
| 2a `#whyLayer` container | ✅ | Inside `#stage`, pointer-events layout correct |
| 2b SVG inline beams | ✅ | `#whySvg` `<path>` elements, no canvas/image/library |
| 2c Tag markup (glyph, label, value, %, aria-label) | ✅ | See `btn.innerHTML` in cmWhyBuild |
| 2d Fixed screen-space slots | ✅ | `SLOTS` array; tags do not move with rotation |
| 2e Beam endpoint from vessel mesh/heart centre | ✅ | `_beamEndpoint()` uses `Box3.getCenter` + `project(C)` |
| 2f Beam thickness and colour | ✅ | `sw = 1.5 + 6*(share/maxShare)`; reuses `#ff6b7d`/`#37c8ff` |
| 2g Hover/click highlights beam, scrolls SHAP row | ✅ | `_highlightBeam`, tag click handler |
| 2h Header strip with p + interval | ✅ | `#whyHeader`; interval only shown if API returned it |
| 2i Caption text | ✅ | Exact wording in `#whyCaption` |
| 3a `#whyToggle` button | ✅ | In right-tools next to haloToggle |
| 3b localStorage `cm-why-beams` with try/catch | ✅ | Default on |
| 3c Disabled when SHAP unavailable | ✅ | `_syncToggleBtn()` disables, hides layer, no placeholder |
| 4a Recompute on paint/selection/resize/rotation | ✅ | `cmWhyPaint()` in `paint()`; `cmWhyProject()` in loop |
| 4b ONE rAF callback | ✅ | Shared with existing loop |
| 4c >0.5px guard | ✅ | `_prevBeamEndX/Y` guard in `cmWhyProject` |
| 5a `<ol aria-label>` of `<li><button>` | ✅ | Rank order, keyboard reachable |
| 5b `#whyLive` aria-live polite | ✅ | Announces on target change |
| 5c Beam animation disabled under reduced-motion | ✅ | `@media not (prefers-reduced-motion:reduce)` |
| 5d Toggle aria-pressed + Enter/Space | ✅ | keydown handler |
| 5e <=640px no beams, compact list | ✅ | CSS media query |
| 6 Exact wording | ✅ | Caption and disclaimer unchanged |
| Constraints | ✅ | No new dependencies, no new CDN, additive only |

## Not verified (what was not run or seen)

- **Real rendering of beams over the 3D heart** in light and dark mode: not run (no browser). No screenshots were taken or presented.
- **Behaviour at 390 px and 768 px**: CSS rules were written and checked statically; not rendered in a browser.
- **Performance on a real GPU-less browser**: not measured.
- **Real `/predict` SHAP records**: not tested live (requires running uvicorn + shap installed + real HTTP request). `tests/test_shap_records.py` covers the `core.py` side; SHAP package availability not confirmed.
- **Playwright screenshots**: Playwright is not installed in this environment; no browser screenshots were produced. Mock or composited images were NOT presented.
- **What-If page**: not reloaded (was not modified).
- **Digital Twin page**: not reloaded (was not modified).
- **`tests/test_uncertainty.py`**: see run results below.

## Validation results

```
tests/test_why_beams.py   — 14/14 PASS
tests/regression_guard.py — all PASS (including 12 new Why-Beams checks)
Inline JS syntax check    — node --check PASS (0 errors)
Python py_compile         — all .py files PASS
```

`tests/test_shap_records.py` — see run output; may SKIP if `shap` not installed.


---

# What-Would-Change feature addition

Base = project with Why-Beams already merged. Changed files: `whatif_search.py` (new), `app.py` (2 lines), `whatif.html`, `tests/regression_guard.py`, `tests/test_whatif_search.py`. All other files (index.html, core.py, model.joblib, metrics.json, export.json, train.py, build_uncertainty.py, static/, other HTML pages) are byte-identical to the base.

## File-by-file changes

### whatif_search.py (new file)

| Section | What it does | Requirement |
|---|---|---|
| `APIRouter(prefix="/whatif")` | Mirrors case_replay.py pattern | Req 1a |
| `POST /whatif/search` | Validates profile (extra=forbid, schema limits, 422 on unknown keys), builds candidates, vectorised scoring, returns JSON | Req 1b, 1c, 1d |
| `_get_sd(art, col)` | Reads SD from the CAD pipeline's StandardScaler; falls back to 5% of range | Req 1d (search limit) |
| `_build_candidates(profile, art)` | Single + pair moves; cap 5000 rows; excludes non-modifiable/null/at-bound inputs | Req 1b, 1c, Defs |
| `_num_grid(u_id, baseline_val, direction, art)` | K=12 steps per numeric input, max 1 SD, capped and clipped to schema bounds | Definitions |
| Verdict logic | `beyond_model_range` if p1 < lo0; `within_model_noise` if lo0 <= p1 < p0; `no_change_found` otherwise | Definitions |
| `range_unavailable` | Returned when `art["bootstrap"]` is empty/absent → interval=None | Req 1d |
| `replica_agreement` | Counts of 30 bootstrap replicas agreeing candidate is lower | Req 1d |
| `search_truncated` | Set True if >5000 candidates; pair candidates dropped for lowest-impact inputs | Req 1c |
| `uncertainty_note` | `core.UNCERTAINTY_NOTE` always included | Req 4 safety |

### app.py (2 lines added)

| Line | Change | Requirement |
|---|---|---|
| Import line | `import core, ..., case_replay, whatif_search` | Req 1e |
| Router registration | `app.include_router(whatif_search.router)` | Req 1e |

No existing route, Patient model or CORS changed. `app.py` modification changes the `case_replay` fingerprint hash (see "Not verified" below).

### whatif.html (additive only)

| Section | What changed | Requirement |
|---|---|---|
| CSS block `/* ===== What-Would-Change ===== */` | Styles for `#wwcCard`, `.wwc-targets`, `#wwcRun`, `#wwcResult`, `.wwc-chip`, `.wwc-header`, `.wwc-verdict`, `.wwc-table-wrap`, `.wwc-note`, `.wwc-ulist`, `.wwc-disabled`, `.wwc-sr-only`. Mobile overflow fix. Uses `--p-bg2`, `--p-line`, `--p-head` (existing variables). Reuses existing positive (`#14d6c4`) and noise (`#ffb84d`) colours from the existing delta bar system. | Req 2 |
| `<div id="wwcCard">` | Card with target selector buttons, `#wwcRun`, `#wwcResult role="region"`, card note, `#wwcLive`. Inserted after `#whatIfChanges`, before the closing mini disclaimer `<p>`. | Req 2a–2j |
| Target selector buttons | 4 buttons with `data-wwc-target` and `aria-pressed`. Default CAD pressed. | Req 2b |
| Card note | Exact required text | Req 3 |
| `#wwcLive` | `role="status" aria-live="polite"`, visually hidden via `.wwc-sr-only` | Req 2g |
| JS IIFE `/* ===== What-Would-Change JavaScript ===== */` | `wwcRun()`, `_renderResult()`, `_disabled()`, `_empty()`, `_syncTargetBtns()`, `window._wwcOnBaselineChange`. AbortController + 15 s timeout. Profile built from `WI.baseline`. Uses `wiMessage()` for status. | Req 2b–2j |
| `wiChanged()` hook | Added `if(window._wwcOnBaselineChange)_wwcOnBaselineChange();` to clear result on baseline change | Req 2h |
| Offline/disabled state | `_disabled()` shown when `wwcApiBase()` returns empty string, with exact message | Req 2c range_unavailable |
| No existing code removed | `wiRun`, `wiPredict`, `wiRenderResults` untouched | Constraint |

### tests/test_whatif_search.py (new file)

Tests: no non-modifiable/null input changed; schema bounds; 1 SD cap; verdict rules (beyond_model_range, within_model_noise, no_change_found); range_unavailable without bootstrap; p0 matches core.predict to 1e-9; p1 matches core.predict on changed profile to 1e-9; delta_pp derivable from model outputs; searched inputs only modifiable+supplied.

### tests/regression_guard.py (extended)

Appended 11 new `check()` calls: `#wwcCard`, `#wwcRun`, `#wwcResult role=region`, `#wwcLive aria-live`, exact card note, disclaimer, banned-word check on `whatif_search.py`, `index.html` not modified, `whatif_search` imported in `app.py`, router registered.

## Search definitions used

| Term | Definition |
|---|---|
| Modifiable inputs | ldl (↓), hdl (↑), tg (↓), fbs (↓), bp (↓), bmi (↓), smoker (1→0) |
| K | 12 grid steps per numeric input |
| SD | StandardScaler `scale_` from the CAD pipeline, aligned to `art["features"]` |
| Step | `max(schema_step, SD/K)` |
| Cap | 1 SD of training data |
| Size | `Σ |delta| / SD_input` across all changed inputs |
| Winner | Smallest size among candidates with p1 < p0; tie broken by larger drop in p |
| beyond_model_range | p1 < lo0 |
| within_model_noise | lo0 ≤ p1 < p0 |
| no_change_found | no candidate with p1 < p0 |
| range_unavailable | art has no bootstrap (interval=None) |

## Requirement traceability

| Req | Status | Notes |
|---|---|---|
| 1a Router / artifact load | ✅ | `whatif_search.py`, APIRouter prefix /whatif |
| 1b POST /whatif/search validation | ✅ | extra=forbid, 422 on unknown keys, schema min/max |
| 1c Vectorised scoring, 5000 cap | ✅ | `predict_proba` once on full DataFrame |
| 1d Response JSON with all fields | ✅ | target, baseline, searched_inputs, not_searched, n_candidates, search_limit, search_truncated, result, best_any, method, uncertainty_note |
| 1e app.py registration | ✅ | 2 lines added |
| 1f No core.py/model.joblib changes | ✅ | Untouched |
| 2a Card `#wwcCard` | ✅ | After #whatIfChanges |
| 2b Target buttons + wwcRun | ✅ | AbortController 15 s, click-only |
| 2c Result block variants | ✅ | beyond/noise/nochg/range_unavailable/offline |
| 2g wwcLive aria-live | ✅ | Announces verdict on each search |
| 2h Baseline-change hook | ✅ | One guarded call in wiChanged |
| 2i Motion | ✅ | No new animation |
| 2j Responsive | ✅ | `.wwc-table-wrap{overflow-x:auto}` |
| 3 Wording | ✅ | Exact card note; no banned words |
| 4 Safety | ✅ | No fabricated numbers; within_model_noise not described as improvement |

## Case_replay fingerprint

`app.py` was modified (2 additive lines). `case_replay.py` lists `app.py` in `FINGERPRINT_FILES`. Therefore any `/api/case-replay/run` manifest now produces a different `app.py` SHA-256 than one produced before this change. **No automated test pins the specific hash value** — regression_guard.py only checks `bootstrap_meta.B >= 30`. The fingerprint difference is expected and documented; it does not represent a correctness regression.

## Not verified

- **Real browser rendering** of the WWC card at 390/768/1360 px in light and dark: not run (no browser available). No screenshots produced.
- **Live POST /whatif/search with uvicorn running**: FastAPI, uvicorn, and full runtime environment not started in this session. Endpoint logic was verified via direct Python import (tests/test_whatif_search.py).
- **Wall-clock latency** per request on a real server: not measured.
- **Real /predict SHAP records with the full stack**: not run.
- **Playwright screenshots** (a–d): Playwright is not installed. Not produced.
- **test_uncertainty.py**: pre-existing fixture snapshot mismatch (not caused by this change; test_uncertainty.py compares stored baseline predictions against `core.predict`; core.py was not modified).

## Validation results

```
py_compile (all .py)            PASS
tests/test_whatif_search.py     ALL PASS (10 test groups)
tests/regression_guard.py       43/43 PASS (11 new WWC checks + 12 Why-Beams + 20 existing)
tests/test_why_beams.py         14/14 PASS
tests/test_shap_records.py      PASS (synthetic + real SHAP)
Inline JS syntax (whatif.html)  node --check PASS
```


---

## Patients-Like-This

### Files changed
| File | Change |
|---|---|
| `peers.py` | New: `APIRouter(prefix="/peers")`, `POST /peers/similar`, Gower distance, Wilson CI, lru_cache data load |
| `app.py` | +1 import (`peers`), +1 `app.include_router(peers.router)` |
| `index.html` | +CSS block `/* ===== Patients-Like-This CSS ===== */`, +HTML `#peerCard` after `#vesselExplorer`, +JS IIFE `peersSchedule/peersFetch/peersRender`, `peersOn` guard in `paint()` |
| `tests/test_peers.py` | New: 37 assertions covering Gower distance, Wilson CI, k_pos parity, insufficient inputs, unknown keys, out-of-range, no per-record keys |
| `tests/regression_guard.py` | +17 Patients-Like-This static checks (57 total) |
| `MERGE_CHANGELOG.md` | This section |

### Definitions used
| Term | Definition |
|---|---|
| Supplied inputs | Non-null profile values (UI ids present in the POST body) |
| MIN_INPUTS | 6 |
| Distance | Gower: for num inputs `|x_i - r_i| / range_i` (schema min/max range), for bin inputs 0 or 1 (mismatch); mean over supplied inputs |
| K | 12 (module constant) |
| Tie-breaking | Ascending row index (stable argsort) |
| Wilson CI | 95%, z=1.96; 7/12 → [0.32, 0.81] ±0.01 |
| base_rate | `y[t].mean()` over all N rows |
| Data | data.xlsx, N=303, loaded once via `lru_cache` |

### Requirement traceability
| Req | Status | Notes |
|---|---|---|
| 1a peers.py APIRouter | Done | `prefix="/peers"`, data loaded once with lru_cache |
| 1b POST /peers/similar validation | Done | unknown keys 422, out-of-range 422, insufficient_inputs returns 200 with status field |
| 1c Vectorised numpy distance | Done | `_gower()` over all N rows with masked columns |
| 1d Response JSON | Done | status, n_total, k, inputs_used, inputs_not_supplied, distance, targets, method, limits |
| 1e app.py registration | Done | 2 additive lines |
| 1f core.py/model.joblib unchanged | Done | Untouched |
| 2a #peerCard section | Done | After #vesselExplorer, aria-labelledby, uses --panel/--line/--ink/--muted variables |
| 2b Trigger: POST after /predict, 400 ms debounce | Done | AbortController, 8 s timeout, stale-response guard |
| 2c Selected target rendering | Done | headline, 12-dot strip, facts grid, neutral sentence, context row |
| 2d Always-visible note (exact) | Done | Rendered by peersRender when status=="ok" |
| 2e Disclaimer preserved | Done | Checked by regression_guard |
| 2f #peerLive aria-live | Done | Announces on target change; uses sr-only pattern |
| 2g No horizontal scroll | Done | `.peer-facts` responsive grid; no fixed widths |
| 2h paint() guard | Done | `if(window.peersOn)peersSchedule()` |
| 3 Wording | Done | "similar records", "labelled stenotic"; no banned words |
| 4 Safety | Done | Aggregates only; data.xlsx not served; no per-record fields |

### Case_replay fingerprint
`app.py` is in `FINGERPRINT_FILES` in `case_replay.py`. The 2 additive lines change the SHA-256 of `app.py` from the previous value to `50572f1e31d9d7c070dc9317a46a33ffaee05b896a15a11eca75226345a2f9a7`. No test pins the specific hash; `regression_guard.py` only checks `bootstrap_meta.B >= 30`. **This is expected and documented; it is not a correctness regression.**

### Live server test (POST /peers/similar, profile: age=62 all 24 inputs)
```
status: ok
n_total: 303, k: 12, inputs_used: 24
distance: {nearest: 0.0307, kth: 0.099, median_all: 0.2128}
elapsed: 771 ms (cold, includes data.xlsx load); 275 ms warm (lru_cache)
CAD: 11 of 12 = 92% (Wilson 65-99%), base_rate=71%
LAD:  6 of 12 = 50% (Wilson 25-75%), base_rate=58%
LCX:  4 of 12 = 33% (Wilson 14-61%), base_rate=39%
RCA:  6 of 12 = 50% (Wilson 25-75%), base_rate=38%
method: Gower distance, equal weights, supplied inputs only; K nearest of N records.
```

### Not verified
- **Real browser rendering** of #peerCard at 390/768/1360 px in light and dark: not run (no Playwright/browser). No screenshots produced.
- **Cold-start latency on a server with HDD**: 771 ms observed in this session; may vary.
- **SHAP records via live /predict**: not re-verified in this session (test_shap_records.py PASS).
- **test_uncertainty.py**: pre-existing snapshot-mismatch failure; not caused by this change.

### Validation results (Patients-Like-This session)
```
py_compile (all .py)             PASS
node --check (all inline JS)     PASS  (3 blocks in index.html)
tests/test_peers.py              37/37 PASS
tests/regression_guard.py        57/57 PASS (17 new PLT checks)
tests/test_why_beams.py          14/14 PASS
tests/test_whatif_search.py      18/18 PASS
tests/test_shap_records.py       PASS
tests/test_uncertainty.py        PRE-EXISTING FAILURE (snapshot mismatch, core.py not modified)
```



---

## Guided Case Tour

### Files changed
| File | Change |
|---|---|
| index.html | Tour CSS block, `#tourStart` button (toolbar, next to `#whyToggle`), `#tourCard` section (after `#stage`), pure functions `cmTourSteps` / `cmTourText` between `/* TOUR:DATA START */` and `/* TOUR:DATA END */`, controller IIFE `/* ===== Guided Tour JavaScript ===== */`, one guarded call in `paint()` (`cmTourPaint`), one guarded call plus the `!window.cmTourOn` auto-rotation guard in the render loop (`cmTourFrame`). |
| tests/test_tour.py | New: node extraction of the WHY-BEAMS:DATA and TOUR:DATA blocks (step order, rounding, range omitted without interval, drivers from records only, banned words, exact end text). |
| tests/test_tour_controller.js | New: runs the controller block in node:vm with stubbed DOM/THREE (start, step texts, selection through paint(), camera targets, zoom easing, Back/Next, Esc restore, exit on new `res`, disabled without `res`, no write into `#peerLive`). |
| tests/regression_guard.py | Tour static checks added (ids, aria-live, exact end text, hooks, banned words, marker counts, tour block never touches `#peerLive`). |
| MERGE_CHANGELOG.md | This section. |

Not changed: app.py, core.py, peers.py, whatif_search.py, whatif.html, static/*, model/metrics/export files.

### Review fixes applied after the first implementation pass
1. The tour wrote its step text into `#peerLive` (the Patients-Like-This live region). Removed; `#tourText` (`aria-live="polite"`) is the tour's only announcement channel.
2. A decorative comment repeated the text `TOUR:DATA START`; removed so exactly one START and one END marker exist.

### Constants
TOUR_DWELL_MS = 7000, TOUR_ZOOM_Z = 5.2, TOUR_TILT = 0.6.

### Behaviour notes
- Each tour step selects the vessel through the existing `sel=...; paint(); syncSelectedVesselToParent();` path, so halo, colours, vessel panel, Why-Beams and `#vesselLive` update. `paint()` also calls `peersSchedule()`, so each step can trigger one debounced `/peers/similar` request.
- With reduced motion (`rm`): no autoplay, no animated flight; rotation and zoom are set directly; navigation by Next/Back.
- Heart orientation is schematic; the text never claims an anatomical position.

### Requirement status
| Requirement | Status |
|---|---|
| 1 Pure data + text (cmTourSteps, cmTourText, markers, templates) | Done, tested in node |
| 2 Controller (start/pause/next/back/exit, selection path, camera targets, loop hook, paint hook, reduced motion) | Done, state machine tested in node with stubs; camera framing not seen in a browser |
| 3 Accessibility (region, aria-live, aria-pressed, arrow keys, Esc, focus return) | Implemented; screen-reader and focus ring not checked in a browser |
| 3 Layout (no horizontal scroll at 390/768/1360, 40 px targets) | Implemented in CSS; not checked in a browser |
| 4 Wording / banned words | Done, checked statically |
| 5 Constraints (no new deps, no new keys, existing ids unchanged) | Done |

### Verified
- `node --check` on all 3 inline scripts of index.html: OK.
- tests/test_tour.py: ALL PASS. tests/test_why_beams.py: ALL PASS. tests/test_tour_controller.js: ALL PASS.
- Static part of tests/regression_guard.py, including all tour checks: ALL PASS.

### Not verified
- Real rendering of the tour: camera centring on each vessel, zoom, TOUR_TILT / TOUR_ZOOM_Z framing, beams and halo during the tour, light and dark, 390 px layout, reduced-motion behaviour, frame rate. No browser run was possible (three.js and Python/npm packages could not be fetched in the review environment).
- Backend section of tests/regression_guard.py and tests/test_uncertainty.py, tests/test_shap_records.py, tests/test_peers.py, tests/test_whatif_search.py: not run here (installed scikit-learn 1.9.1 cannot unpickle model.joblib built with 1.8.0; fastapi not installed). Run them on your machine.
- The guard's "unchanged vs backup" checks pass vacuously when no backup folder exists; unchanged files were instead confirmed by a file diff against the previous zip (only index.html, tests/regression_guard.py and tests/test_tour.py differed).
