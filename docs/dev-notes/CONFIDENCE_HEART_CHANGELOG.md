# Confidence Heart — Changelog

## 2026-10-03

### Added
- `build_uncertainty.py`: stratified bootstrap replicas, width cutoffs, atomic model artifact update, and repeated stratified 5-fold OOF calibration/ROC diagnostics.
- `core.interval()`: additive 80% bootstrap model-variability ranges with target-specific narrow/moderate/wide labels.
- `core.predict()`: additive `interval` and `uncertainty_note` fields; existing `p` and `c` values remain byte-for-byte compatible with the captured baseline fixture.
- Dashboard **Confidence halo** control with localStorage persistence, requestAnimationFrame-throttled geometry rebuilds, disposal of old halo geometry/materials, and an offline/API-required fallback.
- Dashboard numeric range bars, selected-vessel range readout, `aria-live` selected-vessel status, and **Live preview** with a 250 ms debounce and AbortController.
- Trust Center inline SVG reliability diagram and ROC curve from `metrics.json`, with ECE, Brier, and AUC readouts.
- `report.py` range (80% bootstrap) column when interval data is present.
- `provenance.py` and `case_replay.py` bootstrap metadata and explicit documentation of the model-artifact hash change.
- `tests/test_uncertainty.py` baseline-output regression coverage, interval/leakage assertions, and mock `/predict` contract checks.
- `UNCERTAINTY_AND_CALIBRATION_NOTES.md` with method, limits, measured metrics, rebuild instructions, and performance measurements.

### Preserved
- Existing routes, element IDs, model fields, SHAP/Sensitivity view, HRA heart support, themes, responsive layout, and clinical/research disclaimers.
- Leakage invariant: `LAD`, `LCX`, `RCA`, and `Cath` remain excluded from model inputs.
- Primary selected model pipelines and headline probability calculations were not retrained or intentionally altered.

### Verification notes
- `tests/test_uncertainty.py` passes.
- JavaScript syntax checks and Python byte-compilation are run as part of the release verification.
- Full FastAPI import/end-to-end backend verification is environment-dependent because the current verification environment does not contain the existing `groq` Python package.
- The final measured `/predict` p95 on the available CPU is above the requested 400 ms budget despite using the minimum B/tree settings; this is disclosed in the uncertainty notes rather than concealed.

- Added `CONFIDENCE_HEART_VERIFICATION.md` with measured artifact/latency/metric results and an explicit not-verified list.
