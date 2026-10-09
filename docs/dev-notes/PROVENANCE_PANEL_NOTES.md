# Data Provenance & References card

Where: `index.html` only - `<section id="provenanceCard">` (collapsed `<details>`) placed on the main dashboard just before the "More views" hub, CSS in `#cm-prov-css`, JS in the `/* ===== Data provenance panel ===== */` block. Backend untouched.

Content (all taken from files already in the repo; nothing invented)
- Dataset line = existing "Data & anatomy" text (Z-Alizadeh Sani extension, 303 records, target fields excluded from inputs).
- Model outputs = `model.joblib` / `metrics.json` + link to the Validation view; bootstrap ranges are not clinical CIs.
- SHAP wording = "explanation, not causation".
- Segment map = Cerqueira et al., Circulation 2002;105:539-542 (confirmed by several sources). A DOI link was removed because I could not verify the Circulation DOI online (the same statement was co-published in J Nucl Cardiol and J Am Soc Echocardiogr under different DOIs). Add the DOI from the journal page if you want a link.
- Anatomy = HuBMAP/HRA CCF v1.2, CC BY 4.0 (static/models/ATTRIBUTION.txt) and BodyParts3D CC BY 4.0 (README).
- Build manifest: on first open, GET `/provenance` (provenance.py) and show app/schema version, bootstrap B/level and artifact name, first 16 hex of SHA-256, size. Rendered with textContent only. No user inputs are sent or shown. If no API / timeout: static references stay and a short message appears.

Not included: no DOI for the Z-Alizadeh Sani dataset or its source paper, because none is recorded in the repo. Add one to the "Dataset" item once verified.

A11y: native `<details>/<summary>` (keyboard operable), group labelled "References: ...", every link has a descriptive aria-label, external links use rel="noopener noreferrer", manifest table has a screen-reader caption and column scopes, reduced-motion respected.

Verification: `python tests/visual_qa/provenance_card.py` (stub THREE; 1360/768/390 x light/dark x API ok/down) passes; screenshots `tests/verification_previews/provenance_*.png`. Not verified: real FastAPI `/provenance` response (the test uses a mocked manifest shaped like provenance.py output); stripe/text contrast not measured numerically.

## Contrast check (measured)
Light theme: body text 5.3:1, headings 13.5:1, links raised from 3.5:1 to 5.6:1 (#066a80). Dark theme: text 8.6:1, links 11.6:1.
Real FastAPI `/provenance` was NOT run (fastapi is not installed in the build sandbox and there is no network). Test it with `uvicorn app:app` and open the card.
