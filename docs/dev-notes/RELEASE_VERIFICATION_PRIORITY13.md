# Release Verification — Priority 13

- Python compilation: passed for `app.py`, `core.py`, `evidence.py`, and `provenance.py`.
- JavaScript syntax: passed for the Digital Twin Lab inline script using Node.js syntax compilation.
- FastAPI route smoke tests: passed for `/`, `/health`, `/schema`, `/app/`, `/digital-twin`, `/digital-twin/`, `/explorer`, `/whatif`, `/evidence`, and `/validation`.
- Schema check: passed; shared `/schema` contains 24 fields and begins with the expected `age` identifier.
- Prediction regression: three POST `/predict` calls using the actual bundled model returned HTTP 200 and valid probabilities for CAD, LAD, LCX, and RCA.
- Integrity: final ZIP archive test and key legacy artifact hash comparisons recorded during packaging.
- Not performed: browser-driven end-to-end testing, visual QA across browsers, or clinical validation.

## Important limits
The page uses the existing 3D dashboard in an iframe. The 3D model is not generated from a patient scan and does not change with scenario outputs. The feature compares model estimates from the actual API; it does not estimate causal effects or treatment response.
