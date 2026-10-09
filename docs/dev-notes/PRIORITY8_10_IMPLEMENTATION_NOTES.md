# Priority 8–10 Implementation Notes

## Priority 8 — Interactive 3D Coronary Explorer
- Added `/explorer` as a focused entry point that embeds the existing dashboard at `#stage`, reusing the existing Three.js canvas, vessel selection, rotate/zoom, isolation, and local anatomy loading controls.
- This reuses the current anatomical rendering rather than creating a second divergent renderer or modifying model artifacts.
- The heart and coronary paths are schematic. Custom OBJ/GLB/GLTF files are read locally by the browser; overlay registration is manual, not automatic or patient-specific.

## Priority 9 — Model Validation & Reliability Lab
- Added `/validation`, a dedicated target-level evaluation page populated from `GET /trust` and the bundled `metrics.json` fallback through the backend.
- Displays sample size, positive count/prevalence, selected model, repeated-CV mean ± SD for ROC-AUC/F1/recall/precision/accuracy, model comparisons, stored out-of-fold confusion matrices, derived sensitivity/specificity, Brier score and validation provenance.
- Did not create ROC curve plots or calibration curves: the supplied artifacts do not contain ROC threshold coordinates or calibration-bin data. The Brier score alone is explicitly not presented as proof of calibration.
- No model retraining or new Python dependency was introduced.

## Priority 10 — Patient Case Timeline & Comparison
- Added a browser-local case library to `/research`, using `cm-case-library-v1`, with case labels, timestamps, snapshot copies, select-two comparison and deletion.
- The current shared snapshot is saved only when the user presses the save action. Maximum library size is 40 cases; storage errors are surfaced to the user.
- Saved records contain the research context available at save time. Data remain in the current browser localStorage and are not sent to the server by the library feature. No identity fields are requested by the new UI.
- Comparison displays only available recorded CAD/LAD/LCX/RCA estimates and explicitly describes differences as model output, not patient progression or causal/treatment effect.

## Preserved and known limits
- Existing prediction pipeline, `/predict`, `/trust`, `/report`, `/chat`, `/app`, `/whatif`, `/assistant`, `/research`, model.joblib, data.xlsx, metrics.json and export.json are retained.
- The Explorer route embeds the existing 3D dashboard view, so it depends on the same dashboard libraries and current browser WebGL support. The iframe route has not been manually tested in a full browser session.
- Local case storage is browser-specific and can be removed by clearing site storage. It is not a secure clinical record system or cross-device backup.
- Educational/research prototype only; not clinically validated and not a diagnostic device.

## Verification
- Python syntax compilation: `app.py`, `core.py`, `chat.py`, `report.py`, `train.py`.
- Inline JavaScript syntax: dashboard, What-If, assistant, Research Workspace, Validation Lab.
- HTML duplicate-ID scan: no static duplicate IDs in the new pages; template IDs in existing dynamic forms are expected repeated patterns.
- API smoke tests and `/predict` regression check are recorded in the release verification summary supplied with this ZIP. Full browser-driven E2E tests were not run.

See `RELEASE_VERIFICATION_PRIORITY8_10.md` for the exact automated checks, passed route list, PDF smoke result, and explicit browser-test limitations.
