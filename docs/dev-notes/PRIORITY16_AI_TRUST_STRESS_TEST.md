# Priority 16 — AI Trust Stress Test

## Implementation
- Added `trust_stress.py`, exposing `GET /api/stress-test/schema` and `POST /api/stress-test/run`.
- Added `trust_stress.html`, a responsive stress-test workspace.
- Integrated router and page route into `app.py`; added navigation from the dashboard and related research pages.
- Documented the feature in `README.md`.

## Method
The endpoint loads the existing `model.joblib`, calculates baseline predictions using `core.predict`, then perturbs one supplied feature at a time. Numeric inputs are shifted in lower/higher directions by a user-selected percentage of their declared schema range, bounded to schema min/max. Binary fields are flipped between 0 and 1. Changes are reported per target as probability deltas and percentage-point deltas.

## Guardrails
- Uses only supplied, schema-valid inputs and the existing model pipeline.
- Does not retrain or modify the model.
- Does not assign a pass/fail grade or claim clinical reliability.
- Does not store submitted inputs.
- Reports unavailable or invalid model execution as an error, not as a fabricated result.
- Sensitivity is not causality, diagnosis, treatment effect, or clinical validation.

## Testing
Syntax, API schema, request validation, live model-backed baseline/perturbation results, regression endpoints, and ZIP integrity are checked in the release verification note. Browser visual testing is reported separately and is not claimed unless actually performed.
