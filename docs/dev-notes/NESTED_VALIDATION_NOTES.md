# Nested validation (train.py)

`python train.py data.xlsx` now reports two views per target in `metrics.json`:

- `cv` (unchanged): 5-fold x3 repeated stratified CV for logreg / rf / gb. The best model is *picked* on these numbers, so the picked row is slightly optimistic.
- `nested` (new, additive): outer 5-fold x3 (same splits), inner 5-fold ROC-AUC chooses the model using the outer **training** part only; the choice is scored on the untouched outer test fold. Includes mean±SD of the five required metrics, how often each model was chosen, pooled out-of-fold AUC with a bootstrap 95% CI (1000 resamples), a nested confusion matrix and Brier score.

Results on the 303-record dataset (mean±SD over 15 outer folds):

| Target | Picked | AUC (cv) | AUC (nested) | AUC 95% CI | F1 (cv) | F1 (nested) | Recall (nested) | AUC optimism |
|---|---|---|---|---|---|---|---|---|
| CAD | gb | 0.923±0.039 | 0.918±0.044 | 0.88–0.95 | 0.915±0.029 | 0.907±0.033 | 0.917±0.040 | +0.005 |
| LAD | rf | 0.850±0.027 | 0.849±0.029 | 0.80–0.90 | 0.825±0.025 | 0.824±0.026 | 0.864±0.052 | +0.001 |
| LCX | rf | 0.739±0.057 | 0.733±0.056 | 0.68–0.80 | 0.576±0.092 | 0.560±0.088 | 0.510±0.099 | +0.006 |
| RCA | logreg | 0.728±0.045 | 0.711±0.048 | 0.66–0.78 | 0.589±0.058 | 0.533±0.074 | 0.511±0.136 | +0.017 |

Reading it: selection bias is small (0.001-0.017 AUC), so the earlier numbers were not badly inflated; RCA shows the most. LCX and RCA stay the weak targets (AUC ~0.71-0.73, recall about 0.51), which is a limit of 303 records, not of the pipeline.

Other changes: argparse CLI (`--quick` skips nested, `--jobs`, `--rebuild-extras` re-runs build_uncertainty.py and build_audit.py), outputs written next to the script, and a note printed because train.py overwrites the bootstrap/calibration data those scripts add. The deployed models are unchanged: predictions on all 303 records match the previous model.joblib exactly (max difference 0.0). Nested run time is about 4 minutes on one CPU.
