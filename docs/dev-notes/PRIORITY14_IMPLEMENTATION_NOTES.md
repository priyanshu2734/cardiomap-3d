# Priority 14 — AI Prediction Detective

## Implemented
- Added `/detective` and `/detective/` routes serving `detective.html`.
- Added navigation from the main dashboard and related research pages.
- Loads input field definitions and ranges from `GET /schema`.
- Uses the existing `POST /predict` response for probabilities, estimator identities, and structured explanation records.
- Displays target probabilities, positive/negative one-feature sensitivity records, a detailed ledger, input coverage, and dataset-level validation context from `/trust`.
- Exports timestamp, submitted inputs, full API response, source route, and interpretation limits as JSON.
- Example inputs are editable and never trigger predictions automatically.

## Integrity and limitations
- No prediction logic, model artifacts, training data, estimator parameters, hard-coded outputs, fabricated explanations, or external clinical claims were added.
- The existing explanation is one-feature log-odds sensitivity versus stored training-median reference; it is not SHAP, causal, or additive. The training median is not a healthy/recommended value.
- API errors are displayed rather than represented as successful results. No patient profile is saved server-side by this page.
- Educational/research use only; no diagnosis or treatment advice.
