# SHAP panel + index.html cleanup

Backend (core.py): SHAP records now carry rank, share_pct, display_value (+unit), is_default (not entered -> training median),
direction, and each target pack adds base/output value, sum_shap, base_probability, output_probability, n_features.
Tree output spaces are labelled precisely (GradientBoosting log-odds, RandomForest probability).

Frontend (index.html): explainability moved from the 300px sidebar into a full-width section ("Explain" in the nav).
SHAP is the default view; the older sensitivity view is behind a SHAP | Sensitivity toggle (no more side-by-side clutter).
Summary card: baseline -> this case probability, sum of SHAP, output. Rows: rank, feature, diverging bar, input+unit, signed SHAP with raises/lowers.
Top 8 shown, "Show all N" expands. "Use HRA heart" button now shows loading/active state.

Needs `pip install -r requirements.txt` (shap) and the FastAPI server to see real SHAP; offline fallback shows an explanatory empty state.
