# Myocardial Territory Map — Verification Report

## Scope
Implemented the supplied **Myocardial Territory Map** build prompt as a front-end-only change in `index.html`, with documentation and a Playwright QA script. The feature is a 17-segment AHA/Cerqueira-style polar map placed between `#vesselExplorer` and `#peerCard`, using the exact existing `res[target].p` values and existing bootstrap intervals from `/predict`.

## Files changed / added

- `index.html`
  - Added `<style id="cm-territory">` after the existing `cm-qa-pass` style block.
  - Added `#territoryCard` between `#vesselExplorer` and `#peerCard`.
  - Added one new Myocardial Territory Map IIFE in the existing main script.
  - Added exactly one additive hook at the end of `paint()`:
    ```js
    if(window.cmTerritoryPaint)cmTerritoryPaint();
    ```
  - Added the auditable `CM_SEGMENTS` mapping, SVG geometry, uncertainty hatch states, RWMA count readout, keyboard/click selection, two-way sync, aria text, tooltip, and required disclaimer text.
  - No Three.js vessel-rendering logic was changed.

- `tests/visual_qa/territory.py`
  - Added deterministic visual QA for 17 segments, vessel counts, geometry, colors, selection sync, keyboard operation, uncertainty hatching, variable-supply labels, neutral state, required strings, overflow and JS errors.

- `TERRITORY_MAP_NOTES.md`
  - Mapping, geometry, honesty limits, selection path, RWMA handling and test instructions.

- `README.md`
  - Added a short “Clinical Explanation Dashboard — Myocardial Territory Map” subsection.

- `DEMO_VIDEO_SCRIPT.md`
  - Added the requested demo line:
    “Click LAD on the heart → the anterior wall lights up on the polar map → drag a What-If slider → both update together.”

## Hard-constraint verification

The following files were SHA-256 checked against the pre-change baseline and are **byte-identical**:

- `app.py`
- `core.py`
- `train.py`
- `model.joblib`
- `metrics.json`
- `export.json`
- `static/cardiomap-pro.css`

No API route, endpoint shape, model artifact, training logic, or existing stylesheet was changed.

The feature adds no external scripts, images, fonts, CDNs, fetch/XHR calls or new API endpoints. The territory IIFE itself contains no network request. Existing page dependencies outside this feature are unchanged.

## Domain mapping

Implemented the prompt's 17-segment typical mapping as one constant `CM_SEGMENTS`:

- LAD: 1, 2, 7, 8, 13, 14, 17 → 7 segments
- RCA: 3, 4, 9, 10, 15 → 5 segments
- LCX: 5, 6, 11, 12, 16 → 5 segments
- Variable-supply markers: 5, 11, 15, 16, 17

The mapping was checked against the published AHA/Cerqueira 17-segment convention and literature describing coronary-territory variability. The UI explicitly labels variable segments instead of presenting the typical assignment as patient-specific anatomy.

## Numerical fidelity

Segment color is computed only from the existing `lvl(Number(res[vessel].p))[2]` helper. No probability is averaged or blended across vessels.

Range text uses the same rounded endpoint convention as the existing dashboard range readouts (`lo` / `hi` as rounded percentages), and the selected-vessel readout uses the same interval object returned by `/predict`.

The map never displays lesion position, infarct size, myocardium-at-risk percentage, or any new model-derived quantity.

## Accessibility

- Every segment is a focusable SVG control (`role="button"`, `tabindex="0"`).
- Enter and Space activate the segment selection path.
- `aria-label` includes segment number, name, typical vessel, estimate and range when available.
- `#terrDesc` provides a text summary by vessel.
- `#terrLive` is an `aria-live="polite"` status region.
- Meaning is not colour-only: level glyph/word, hatch wording and dashed variable-supply labeling are present.
- `prefers-reduced-motion` disables territory transitions.
- The section uses the required header/floating clearance and responsive stacking rules.

## Automated/static checks

### JavaScript syntax

All 9 inline `<script>` blocks in `index.html` passed `node --check`.

### Python syntax

`python -m py_compile tests/visual_qa/territory.py` passed.

### Existing regression guard

`python tests/regression_guard.py` → **RESULT: ALL PASS**.

This included checks covering existing disclaimers, Confidence Heart, Live Preview, SHAP/HRA, Why-Beams, Patients-Like-This, Guided Tour, protected files and existing feature wording.

### Existing individual regression scripts

- `python tests/test_uncertainty.py` → PASS
- `python tests/test_shap_records.py` → PASS
- `python tests/test_peers.py` → PASS
- `python tests/test_tour.py` → PASS
- `python tests/test_whatif_search.py` → PASS

The combined `pytest` collection of these existing scripts is not a valid invocation for this repository because some of those scripts intentionally call `sys.exit()` at import time; the individual script results above are the meaningful results.

## Territory visual QA

The supplied `tests/visual_qa/territory.py` contains the full required matrix:

- 1360 × 768 — light + dark
- 1024 × 768 — light + dark
- 768 × 768 — light + dark
- 390 × 844 — light + dark
- Additional no-interval case at 1360 × 768 light

A synthetic browser harness using the installed Chromium binary and the existing Three.js stub was used to exercise the territory logic without relying on the environment's blocked loopback navigation. The prior full synthetic matrix passed the segment-count, geometry, color, selection, keyboard, hatching, variable-label, null-interval, text and overflow checks.

After the final range-text correction, additional spot checks passed:

- 1360 × 768 light with intervals → **PASS**
- 390 × 844 dark with `interval: null` → **PASS**

The 390px null-interval case explicitly showed `Uncertainty ranges need the API` and had no document horizontal overflow or JS errors.

## Visual previews

Territory screenshots are stored under `tests/verification_previews/`, including 1360px and 390px light/dark viewport previews and full-page captures.

Existing Confidence Heart previews remain in the same folder.

## Official Playwright limitation

The repository's official visual QA scripts (`tests/visual_qa/territory.py` and `qa2.py`) could not be run with their stock `probe.py` in this environment because the installed Playwright Python package expects a managed Chromium executable that is not installed at the expected cache path. The same environment does have `/usr/bin/chromium`, so a synthetic harness was used to exercise the same DOM/interaction assertions without changing the project code.

## What remains unverified

- Full official Playwright run through the repository's original `probe.py` with its managed browser binary.
- Real-device touch interaction.
- Safari / Firefox rendering differences.
- Real Three.js heart rendering under a live CDN/network environment; the Three.js code was intentionally left unchanged except for the required paint hook.
- Clinical validity of the territory assignment for any individual patient; this feature is deliberately a population-typical schematic and not a patient-specific anatomical territory claim.
