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

## Renovation: moved to the Trust Center
- The card was removed from `index.html` (dashboard) and rebuilt as `<section id="provenance">` in `trust_center.html`, after "Interpretation & limitations".
- New layout: at-a-glance stats (303 records, 4 targets, 17 segments, 2 anatomy sources), six source cards (dataset + citation from README, model outputs, SHAP, Cerqueira segment map, HRA, BodyParts3D with CC BY 4.0 badges), and a build-manifest table with file role, size, short SHA-256, per-row "Copy full hash", and "Export manifest JSON".
- Manifest loads once from `GET /provenance` when the section nears the viewport; offline shows a message plus Retry. Rendered with textContent only. Backend unchanged.
- Still no DOI links (none verified). Checked in a browser at 1360/390 px, light/dark, API up/down. Real FastAPI was not run (not installable here); a stand-in server with the same hashing was used.

## Hover colour + primary buttons (static/cm-interaction.css)
- New last-loaded stylesheet linked on every page that loads cardiomap.css / cardiomap-app.css.
- One hover style for ordinary buttons, tabs, nav links, menu items, tiles: soft theme tint + readable ink (no bright teal->mint gradient with white text, no near-black slab). Global-driver tiles tint with their own colour.
- cursor:pointer on all clickable things; not-allowed when disabled.
- `#run` (Run prediction) and `#repBtn` (Research case PDF), plus any `.pri` button: ready = solid gradient + lit dot; hover = brighter + lift; pressed = inset; disabled/busy = flat muted with slow stripe sheen and dim dot (reads as "off"). Reduced-motion respected.
- Verified in headless Chromium (light/dark): computed hover colours, button states screenshots. Not verified against the live backend.
- Fix: `app.py` serves /static through an allow-list; `cm-interaction.css` was missing from it (404 in the real app). Added. Any new static file must be added there.
- Off state of `.pri` buttons now has a dashed border so it is distinct from the ready state even without colour.
- Busy/disabled primary buttons: stripes removed. Now a calm solid teal tint with a small spinner in place of the dot (static under reduced motion).
- Busy state: the circle/spinner is hidden; only the calm tinted button and its label remain.
