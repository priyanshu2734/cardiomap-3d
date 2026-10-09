# Release Verification — Priority 17

## Automated checks executed
- Python compilation: `app.py`, `core.py`, `chat.py`, `report.py`, `evidence.py`, `provenance.py`, `trust_stress.py`, `case_replay.py` — passed.
- JavaScript syntax: inline scripts extracted from `replay.html` and checked with Node.js `--check` — passed.
- FastAPI route/page smoke checks: `/`, `/health`, `/app/`, `/stress-test`, `/case-replay`, `/api/case-replay/schema`, `/provenance`, `/trust`, `/metrics` — passed.
- Live `/api/case-replay/run` with an in-range synthetic midpoint profile — passed; actual model outputs returned for CAD, LAD, LCX and RCA.
- Same-runtime replay of identical input snapshot — tracked SHA-256 fingerprints matched and all four output probabilities matched within 1e-9.
- Invalid input field and out-of-range value — both rejected with HTTP 422.
- Existing `/predict` regression — passed.
- Existing `/api/stress-test/run` regression — passed.
- Duplicate literal HTML ID scan for the new replay page and modified dashboard — passed. (Existing unrelated pages contain dynamic/template IDs and were not rewritten.)
- ZIP integrity and required-file check — passed.
- Model, dataset, metrics, export, core prediction code, training code, chat/report modules, and existing stress-test artifacts compared against Priority 1–16 archive — unchanged.

## Not performed
- Full visual or interactive browser end-to-end test. The earlier environment blocked local browser navigation; this release does not claim browser-based testing.
- Cross-machine or cross-version bitwise reproducibility.
- Clinical validation. This is an educational/hackathon prototype.

## Limits
- API does not persist cases. User-selected browser-local storage is not encrypted or synchronized; exported JSON is portable but can contain the submitted input snapshot.
- Fingerprints cover the listed core artifacts, not every OS library, transitive dependency, hardware detail, or external service.
- A matching run confirms technical consistency under recorded conditions, not medical accuracy or clinical validity.
