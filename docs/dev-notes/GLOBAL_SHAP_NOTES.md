# Global SHAP importance (dashboard card "What drives the model overall")

- **API:** `GET /shap/global` returns mean |SHAP| per feature for CAD, LAD, LCX and RCA (`core.global_shap`). It uses the same explainers as the per-patient view (LinearExplainer for logistic regression, path-dependent TreeExplainer for trees).
- **Share, not raw units:** output spaces differ by model (log-odds for logreg and gradient boosting, probability for random forest), so each feature also carries `share_pct`, its percentage of that target's total mean |SHAP|. The dashboard draws the top 10 as bars.
- **Caching:** the first request computes it (a few seconds) and writes `global_shap.json`. The cache is keyed on `model.joblib`'s size and mtime, so retraining refreshes it automatically. `python build_global_shap.py` pre-computes it, and `train.py --rebuild-extras` runs it.
- **Data used:** all rows of `data.xlsx`; if that file is not shipped, the 100-record SHAP background sample stored in the model (the card footer says which).
- **Dashboard card:** tabs follow the vessel selection (clicking a tab selects that vessel). When the per-patient SHAP is available, a "This case" column shows the entered value with a ▲/▼ for how it moves this case's estimate. Offline browser fallback and API errors show a plain message instead.
- **Wording:** SHAP explains the fitted model; it is not causal and not a diagnosis. The card says so.
- **Tests:** `tests/test_global_shap.py` (needs the real `shap` package; skipped otherwise).
