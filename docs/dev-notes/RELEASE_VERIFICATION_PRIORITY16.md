# Release verification — Priority 16 AI Trust Stress Test

## Automated checks executed
- `python -m py_compile app.py core.py trust_stress.py evidence.py provenance.py`: passed.
- FastAPI TestClient GET smoke tests for `/`, `/health`, `/schema`, `/metrics`, `/trust`, `/app/`, `/stress-test`, `/api/stress-test/schema`, and `/provenance`: 10/10 returned HTTP 200.
- Live `POST /api/stress-test/run` with `age`, `bmi`, and `sex` profile values and selected `age`/`sex`: HTTP 200; 2 fields and 3 probes returned actual CAD/LAD/LCX/RCA model probabilities and output deltas.
- Input validation: out-of-range age, unknown input key, and non-binary `sex=0.5` all returned HTTP 422.
- Regression `POST /predict` using valid schema IDs: HTTP 200; existing `model`, `explanation`, `explainability`, `CAD`, `LAD`, `LCX`, and `RCA` fields remained present. A deliberately incorrect request using column labels returned HTTP 422 as expected.
- Node `--check` for all non-empty inline scripts across HTML files: passed.
- Static duplicate HTML ID scan across 8 pages receiving navigation changes or newly added: passed. An existing repeated template ID pattern in `digital_twin.html` was not part of this new-page static scan.
- Exact SHA-256 preservation check for `model.joblib`, `data.xlsx`, `metrics.json`, `export.json`, `train.py`, `core.py`, `chat.py`, `report.py`, and `requirements.txt`: all 9 match the Priority 15 release.
- ZIP archive integrity: checked after packaging.

## Not performed
- Browser-based visual or interaction test was not run in this pass. Automated API and JavaScript syntax checks do not prove the rendered page works in every browser.
- No clinical validation, external validation, or reliability threshold was inferred.

## Interpretation limits
Stress-test output deltas are model sensitivity observations under one-feature-at-a-time perturbations, not pass/fail judgments, causal effects, treatment effects, or clinical reliability claims. Submitted inputs are not persisted by this feature.
