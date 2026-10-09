# Priority 17 — Reproducible AI Case Replay

## Added
- `case_replay.py`: strict input validation and model-backed run manifest API.
- `replay.html`: responsive case creation, explicit browser-local save, JSON export, replay and comparison UI.
- `GET /api/case-replay/schema`: shared model input schema and declared traceability limitations.
- `POST /api/case-replay/run`: runs the existing `core.predict` pipeline and returns a manifest with exact supplied input snapshot, CAD/LAD/LCX/RCA probabilities and estimator names, UTC timestamp, SHA-256 hashes, schema fingerprint, and environment versions.
- `GET /case-replay` and `/case-replay/`: serve the new workspace.
- Dashboard and research-page navigation links.

## Replay semantics
A saved case is replayed by submitting its saved input snapshot to the same API against the currently installed artifacts. The browser compares the tracked artifact fingerprints, environment versions, and four output probabilities (absolute tolerance 1e-9). It reports file changes, environment changes, and output changes separately; it does not make a universal pass/fail claim about clinical reliability.

## Privacy and safety
- API does not persist inputs or cases.
- A user must explicitly save a manifest in browser-local storage or export JSON.
- Saved browser data is not synced and is not a secure medical-record system.
- Labels should not contain personal identifiers.
- Missing input fields are preserved as omitted fields; the existing model pipeline's missing-value behavior remains in effect.
- No predictions are fabricated; errors return an API error.
- Hash equality is technical provenance, not proof of model correctness or clinical validity.

## Known limitations
- The current artifact fingerprint list covers `model.joblib`, `data.xlsx`, `app.py`, `core.py`, `case_replay.py`, `replay.html`, `train.py`, `metrics.json`, `export.json`, and `requirements.txt`; OS/hardware, every transitive dependency, BLAS implementation, and all runtime state are not fully captured.
- Reproducibility is assessed from current local artifacts. This does not archive the environment or guarantee bitwise equality across all machines.
- Browser storage may be unavailable or cleared by the user; export is the portable fallback.
- Browser-based end-to-end visual testing must be performed separately in a normal browser.
