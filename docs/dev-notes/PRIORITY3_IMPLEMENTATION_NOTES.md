# Priority 3 — Interactive Coronary Exploration and What-If Page Separation

## What-If Simulator page
- Added `whatif.html` and FastAPI routes `/whatif` and `/whatif/`.
- The main dashboard links to the dedicated What-If page; the new page links back to `/app/` and to the Trust Center.
- The What-If page retains the existing schema-driven profile form, baseline snapshot, Scenario A/B editors, source-consistent prediction comparison, changed-input table, synthetic demo, and reset/clear controls.
- The main dashboard no longer contains the What-If section in its visible or document content. Shared What-If JavaScript is guarded so it only initializes on pages containing the simulator.
- On the What-If page, the profile form remains available so the user can edit a baseline and refresh the snapshot before copying it into scenarios.

## Interactive coronary exploration
- Added an information panel and accessible LAD/LCX/RCA selector buttons.
- Existing schematic artery tubes remain selectable in the Three.js scene; hover feedback changes the cursor and click/tap selection updates the selected vessel panel.
- Vessel estimates display from the current existing prediction result, when available. No values are fabricated.
- Added reversible vessel isolation that fades the schematic heart and unrelated vessels; Restore Full View restores the full schematic display and resets the camera.
- Vessel colors distinguish the schematic paths, not disease severity.
- Added the educational anatomy and non-diagnostic disclaimer. The artery paths remain schematic overlays and are not patient-specific or clinically precise anatomy.

## Preservation
- No changes were made to `core.py`, `model.joblib`, `metrics.json`, or `export.json`.
- Existing API prediction and Trust Center behavior are retained.

## Validation performed in this build
- Python syntax compilation completed for `app.py`, `core.py`, `chat.py`, `report.py`, and `train.py`.
- JavaScript syntax checks completed for the inline scripts in both `index.html` and `whatif.html`.
- HTML ID audit found no duplicate IDs within either page.
- FastAPI TestClient checks returned HTTP 200 for `/health`, `/schema`, `/metrics`, `/trust`, `/app/`, `/whatif`, `/whatif/`, and `/assistant`.
- POST `/predict` returned HTTP 200 with the existing CAD, LAD, LCX, and RCA output keys.
- Original model, metrics, export, data, requirements, core prediction, chat, report, training, and assistant files were byte-for-byte preserved.
- ZIP integrity was checked after packaging.
- End-to-end visual browser interaction was not completed in this environment: Chromium navigation to the local test server was blocked by the environment. The selection/isolation UI therefore has syntax and code-path review, but should be manually checked in a normal local browser before a live demo.
