# Model Trust & Reliability Center — Implementation Notes

- Added a Trust Center section and navigation entry to `index.html`.
- Reuses the bundled evaluation artifacts (`metrics.json` and metadata in `export.json`) and can refresh from `GET /trust` when connected to the backend.
- Displays the selected model and all candidate models' mean ± standard deviation across the existing 15 repeated stratified folds.
- Displays the stored five-fold out-of-fold confusion matrix at a 0.50 threshold. Specificity is derived from TN / (TN + FP); the matrix is labelled separately from repeated-fold means because it comes from a separate evaluation run.
- Shows stored Brier scores, but does not claim calibrated probabilities or render a calibration curve because the supplied artifacts do not include calibration-curve data.
- Includes methodology, dataset prevalence, feature count, target definitions, and limitations. The clinical validation warning remains visible.
- Added `GET /trust` to `app.py`; it returns current `metrics.json` and `meta` from `export.json` when available. Missing metadata is left undocumented rather than guessed.

## Verification
- Python syntax compilation: `app.py`, `core.py`, `train.py`, `chat.py`, and `report.py`.
- Frontend inline JavaScript syntax check with Node.js.
- Verified that existing key frontend IDs remain present and that all four stored confusion matrices sum to the recorded dataset size (303).
- No model retraining was performed; displayed values come from the supplied artifacts.
