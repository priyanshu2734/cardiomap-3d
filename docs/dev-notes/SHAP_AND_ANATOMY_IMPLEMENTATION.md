# SHAP + Open Anatomy implementation

## SHAP
CardioMap now exposes real local SHAP explanations from the fitted estimators.

- `LogisticRegression`: `shap.LinearExplainer`, exact decomposition in log-odds/model-linear output.
- `RandomForestClassifier` / `GradientBoostingClassifier`: `shap.TreeExplainer`.
- `/predict` now includes `shap`.
- `/explain` returns SHAP only.
- The existing one-feature sensitivity explanation remains unchanged and is displayed beside SHAP.
- SHAP values are predictive explanations, not causal effects.

The training artifact contains a compact 100-row SHAP background sampled deterministically from the supplied training data for linear-model reference calculations.

## Open reference anatomy
The app supports HuBMAP / Human Reference Atlas CCF v1.2 reference models:
- `VH_M_Heart.glb`
- `VH_M_Skin.glb` (optional torso context)

The app serves these only through an allow-listed `/static/models/...` route.
Run:

    python scripts/download_anatomy_assets.py

Then refresh `/app` or `/digital-twin`.

The models are generic reference anatomy, not patient-specific imaging. License/attribution: CC BY 4.0; see `static/models/ATTRIBUTION.txt`.

If the assets are not installed, the existing manual `.glb/.gltf/.obj` loader continues to work.
