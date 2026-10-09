# Cardiac Signal Trace — implementation notes

## 1. What it does
A dashboard card (`#signalTraceCard`, directly after the Myocardial Territory Map, before "Similar records in the dataset") that lays out one transparent chain for the **selected vessel**:

    patient input → model attribution (real SHAP) → vessel estimate → typical myocardial territory

It is a **model-linked explanation, not lesion localization**.

## 2. Why it exists
The prediction, SHAP, 3D heart, Territory Map and vessel chips were separate widgets. The trace reads the state they already share and presents it as one story, without adding a model, endpoint or number.

## 3. Data flow
    patient input (v / byCol)  ──┐
    res.shap.targets[sel].records ─► top-3 SHAP drivers (rank order, direction ≠ "none")
    res[sel].p / .interval       ─► vessel node (lvl(p) glyph/label/colour, range line)
    window.CM_SEGMENTS           ─► typical territory segment numbers + count

Everything is rendered by one IIFE exposing `window.cmSignalTracePaint`, called once from the existing `paint()` (after `cmTerritoryPaint`). It makes no request and has no debounce of its own.

## 4. Fields consumed from `res`
`res[T].p`, `res[T].interval.{lo,hi,level,range_label}` and, for SHAP, `res.shap.targets[T].records[].{rank,label,feature,display_value,is_default,value,direction}` (T ∈ CAD, LAD, LCX, RCA). `byCol` and the `#form` DOM are used only to find the matching input control.

## 5. Selection synchronization
Only the existing `sel` is used. The trace's vessel buttons run `sel=vessel; paint(); syncSelectedVesselToParent();`. Anything that changes `sel` (3D heart, chips, tabs, Territory Map segments, vessel buttons) runs `paint()`, which updates the trace. The Three.js code is untouched. "View X territory" uses the same path, then scrolls `#territoryCard` into view.

## 6. Offline behaviour
With the browser fallback (`res.shap` absent) the attribution area shows "SHAP attribution unavailable offline." and "Real SHAP attribution needs the Python API." Probability, range line (or "Uncertainty ranges need the API.") and territory still render. Sensitivity values are never shown as SHAP; "View sensitivity instead" just clicks the existing `#xmSens` toggle and scrolls to `#explainability-section`.

## 7–8. Clinical honesty limits
The data has vessel-level labels only: no lesion coordinates, segment labels or myocardium-at-risk measure. So the card shows no combined/weighted/segment risk, infarct size or "affected myocardium"; segment colour is just `lvl(res[vessel].p)`; RWMA is shown as an ordinary input. Arrows mean "feeds the model explanation", not anatomical causation. SHAP wording is "contribution" / "raises or lowers model output". The card carries the three required disclaimers.

## 9. Testing
Start the stdlib mock server and run the visual QA (Playwright + Chromium):

    python tests/mock_server.py 8000
    python tests/visual_qa/signal_trace.py

It covers 1360/1024/768/390 px × light/dark, plus offline at 1360 light and 390 dark: empty state, exact probability/range, top-3 SHAP order, segment counts (7/5/5), two-way selection sync, Enter/Space, trace button, input highlight without state change, no extra `/predict` call, offline wording, no horizontal overflow, no overlap with `.ai-fab`, no JS errors.

## Known limits
- What-If scenarios live on `whatif.html` (a separate page), so Baseline/A/B is **not** shown in the trace; `whatif.html` was deliberately not modified.
- Card width is ~660 px at 1360/1024 (three-column workspace), so the horizontal chain uses a compact 3-block layout (Input+Model | Vessel | Territory); it stacks below ~600 px of card width.

## Typical territory redesign (v17)
Both the dashboard (`/signal-trace?embed=1`) and the Digital Lab Twin (`/signal-trace?embed=1&case=twin`) embed `signal_trace.html`, so the redesign lives in that one file.

- The old one-line "1 · 2 · 7 · 8 · 13 · 14 · 17" list is replaced by an AHA 17-segment **bullseye** (inline SVG, built once from `window.CM_SEGMENTS`) with ANT / INF / SEP / LAT orientation labels.
- Segments the selected vessel typically supplies are filled with the existing vessel-estimate colour (`lvl(p)`); other segments are dimmed. Segments the vessel can *also* supply in some patients (the `alt` field already in `CM_SEGMENTS`) get a dashed outline and a legend line. No new data, numbers or combined segment risk.
- Next to it, segments are grouped by ring (Basal / Mid / Apical / Apex) as numbered chips with plain names ("1 Anterior", "2 Anteroseptal", ...). Hovering or focusing a chip highlights its bullseye segment, and vice versa.
- Colour-on-fill uses dark numerals (#07151f), readable on the green, amber and red fills in both themes.
- Layout: bullseye left, rings right at card widths above ~560 px; stacked and centred below. CAD still shows the "applies to individual vessels" message and hides the map.
- Existing hooks kept: `#stTCount` text (e.g. "7 typical myocardial segments"), `#stSegLine`/`#stSegNums` (now screen-reader text), `#stDot`, `#stTNote`, `#stView`. New nodes: `#stTBody`, `#stBull`, `#stRings`, `#stKeyAlt`.
- Class `st-sg` is used for the chips to avoid the existing `.st-chip` header badge.
- Note: `tests/visual_qa/signal_trace.py` still expects the pre-iframe inline card and fails before reaching this block; it was not changed.
