# CardioMap 3D — Priority 8–10 Release Verification

Date: 2026-10-01

## Automated checks run
- Python `py_compile`: passed for `app.py`, `core.py`, `chat.py`, `report.py`, `train.py`.
- Node.js `--check`: passed for extracted inline scripts in `index.html`, `whatif.html`, `assistant.html`, `research.html`, and `validation.html`.
- FastAPI TestClient GET smoke checks: 12/12 passed for `/`, `/health`, `/schema`, `/metrics`, `/trust`, `/app/`, `/whatif`, `/assistant`, `/research`, `/validation`, `/explorer`, and `/chat/providers`.
- Prediction regression smoke test: passed. `POST /predict` returned the legacy `model`, `explanation`, CAD/LAD/LCX/RCA fields and the additive structured explainability payload for all four targets.
- Report smoke test: passed. `POST /report` returned `application/pdf` and a valid `%PDF` header without requiring a configured AI provider.
- ZIP integrity and preservation checks: performed before delivery; see final release result.

## Not tested
- No browser-driven end-to-end test was run. The interactive case-library actions, mobile layout, iframe anchor behavior and WebGL rendering were syntax/API checked but not exercised in a real browser in this environment.
- No calibration curve or ROC curve is displayed because source artifacts do not contain calibration-bin or ROC-threshold data.
- No model was retrained; this release is a UI/research workflow extension over the existing artifact.

## Interpretation and privacy notes
- Metrics describe the supplied dataset and cross-validation setup; they are not independent external clinical validation.
- Coronary anatomy remains schematic unless users load and correctly align an external local model. No automatic patient-specific registration is performed.
- Saved research cases live in browser localStorage on the current browser/device. This is not a secure clinical record system, backup, or synchronization mechanism.

## Additional verification — Priorities 11–12
- `python -m py_compile` passed for `app.py`, `core.py`, `chat.py`, `report.py`, `train.py`, `evidence.py`, and `provenance.py`.
- FastAPI TestClient GET smoke checks passed for `/`, `/health`, `/evidence`, `/evidence/sources`, `/provenance`, `/validation`, and `/explorer`.
- `/evidence/answer` passed the offline-safe fallback path without requiring a provider key.
- `/report` generated a valid PDF beginning with `%PDF`; report metadata now includes schema 1.1 and a model artifact SHA-256 when available.
- Node syntax checks passed for inline scripts in `evidence.html`, `index.html`, `research.html`, `validation.html`, `whatif.html`, and `assistant.html`.
- These are automated syntax and API smoke checks, not browser-driven end-to-end, accessibility, security penetration, or clinical validation tests.
