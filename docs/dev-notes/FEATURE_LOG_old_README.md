# CardioMap 3D
Setup: `pip install -r requirements.txt`, `python train.py data.xlsx --rebuild-extras` (repeated CV + nested CV; writes model.joblib, metrics.json, export.json, then bootstrap ranges and audit; see NESTED_VALIDATION_NOTES.md; `--quick` skips nested), `uvicorn app:app --port 8000`, open http://localhost:8000/app/ (or index.html with `?api=http://localhost:8000`).

Global importance: the dashboard card "What drives the model overall" reads `GET /shap/global` (mean |SHAP| per target, cached in global_shap.json); see GLOBAL_SHAP_NOTES.md.
API: GET / /health /schema /metrics /docs, POST /predict. Set CARDIOMAP_ORIGINS to restrict CORS.
Labels: CAD = Cath=="CAD"; vessels = "Stenotic". Cath/LAD/LCX/RCA are never inputs (asserted in core.py/train.py).
Anatomy: download BodyParts3D OBJ files (https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), load them with "Load anatomy". Credit: "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution 4.0 International" (older releases: CC BY-SA 2.1 Japan).
Not clinically validated. Educational decision support only.

AI assistant: copy .env.example to .env, add GROQ_API_KEY and/or NVIDIA_API_KEY, restart uvicorn, open /app and click Connect. API: GET /chat/providers, POST /chat (streamed). UI served at /app (index.html only).

Assistant page: /assistant (assistant.html) with saved chats, per-chat links (#c=ID), recall of earlier chats and typed questions. AI report: POST /report returns a PDF (needs reportlab and a provider key). Open the app from http://localhost:8000/app so the pages share data.

## Model Trust & Reliability Center
The `/app` interface includes a Model Trust Center with target-specific repeated cross-validation summaries, stored out-of-fold confusion matrices, specificity derived from those matrices, Brier scores, model comparisons, dataset prevalence, validation methodology, and limitations. It uses the existing `metrics.json` and recorded metadata in `export.json`; it does not invent a calibration curve. `GET /trust` returns those artifacts to the frontend when the API is connected. Metrics are research-evaluation summaries, not clinical validation or individual-prediction certainty.

## What-If Scenario Simulator
The dedicated `/whatif` page (`whatif.html`) includes a baseline profile editor and snapshot, two editable hypothetical scenarios, synthetic demo profiles, and side-by-side CAD/LAD/LCX/RCA comparisons. Comparisons use the backend `/predict` endpoint for all three profiles when served by FastAPI or when an API URL is configured. When opened as standalone local HTML without an API URL, all three profiles use the bundled exported Logistic Regression fallback. The simulator never mixes sources within a comparison and does not claim that input changes cause clinical outcomes. Scenario outputs are model estimates for research use only.


## Priority 3 — Interactive coronary exploration and dedicated What-If page
- Main dashboard: `http://localhost:8000/app/`
- What-If Simulator: `http://localhost:8000/whatif`
- The What-If page has its own navigation and a Back to Dashboard link. It retains the existing scenario comparison logic and profile editor.
- The dashboard includes a selectable schematic LAD/LCX/RCA overlay, vessel information panel, and reversible isolation control.
- Vessel paths are schematic, not patient-specific anatomy. Displayed estimates are model outputs and are not diagnostic findings.
- See `PRIORITY3_IMPLEMENTATION_NOTES.md` for implementation details and known limitations.

## Priority 4 — Context-aware AI assistant
- Open the assistant at `http://localhost:8000/assistant` after starting the FastAPI app.
- When Dashboard data is enabled, it can use the latest locally shared prediction snapshot, including actual outputs, available validation metrics, selected artery, and completed What-If snapshots when provided by the simulator.
- Configure `GROQ_API_KEY` and/or `NVIDIA_API_KEY` in a local `.env` for provider-backed answers. The assistant does not create authoritative predictions; predictions remain the responsibility of the existing model pipeline.
- Context is treated as untrusted input and size-limited. Avoid entering identifiable patient information.

## Priority 5 — Shareable research case report
- Use **Research case PDF** on the dashboard or the PDF action in the assistant to download a snapshot report from actual available analysis context.
- `POST /report` accepts a JSON body with `context` and optional `provider`. The PDF can still be generated if no AI provider is configured; in that case it uses a static, conservative explanatory fallback.
- Reports include a case reference, generation metadata, actual supplied model outputs, input profile, available evaluation metrics, scenario snapshots and comparable differences when present, interpretation notes, and research-use limitations.
- Reports are point-in-time snapshots, not validated clinical documents. A downloadable PDF is provided; public hosting or public share links are not created.

## Visual refresh
The dashboard, dedicated What-If Simulator, and assistant now share a more polished research-studio aesthetic: layered teal/blue lighting, glass-like panels, subtle scientific-grid texture, clearer focus states, refined buttons, and reduced-motion-aware transitions. Existing page routes and the trained model artifacts are preserved.

## Priority 6–7: Explainability Studio and Research Workspace

- Research Workspace: `http://127.0.0.1:8000/research` reviews the latest valid browser-shared context from `cm-ctx-v1`; it does not create server-side case storage.
- The prediction API keeps its original `model`, `explanation`, `CAD`, `LAD`, `LCX`, and `RCA` fields and adds `explainability.targets` with estimator identity and per-feature records where supported.
- Explanation values are one-feature changes in model log-odds relative to stored training-median reference values. They are **not SHAP**, not causal effects, and not an additive decomposition. A training median is not a healthy or recommended value.
- The Research Workspace validates the shape and size of browser context and displays missing/invalid data as unavailable. Scenario differences must be interpreted as model-output differences, not treatment effects or clinical outcomes.
- PDF reports include an optional sensitivity table only when structured explanation data is present. Reports continue to work without an AI provider.
- No model training, dataset replacement, or new runtime dependency is required. Use `pip install -r requirements.txt` then `uvicorn app:app --reload --port 8000`.
- Educational/research use only; outputs are not diagnoses or treatment recommendations.

## Priority 11–12 additions (Evidence & Provenance Lab)
- Open `/evidence` for an evidence-linked research assistant and source bundle built from the local `metrics.json`, `export.json`, README, and responsible-use constraints. It cites source IDs when an AI provider is configured and explicitly states that no external literature search is performed.
- The same page exposes a SHA-256 provenance manifest at `/provenance` for available model/data/code artifacts, with app/schema versions and clear limits on what hashes prove.
- A browser-local audit log records only page action names and timestamps (no questions, predictions, inputs, identifiers, or health data). It can be exported or cleared by the user and is not uploaded.
- Research PDFs now include report schema 1.1, a unique snapshot reference, and the model artifact SHA-256 when available. This is provenance metadata, not proof of full reproducibility or clinical validity.
- Educational/research prototype only; not a diagnostic device. AI answers must be reviewed and may be unavailable when no provider is configured.


## Priority 14 — AI Prediction Detective
- Open `http://localhost:8000/detective` for a schema-driven prediction explanation workspace.
- Input definitions and ranges come from `GET /schema`; predictions and structured explanation records come from the existing `POST /predict` endpoint.
- Displays target probabilities, estimator labels, returned one-feature log-odds sensitivity records, input coverage, and available dataset-level validation context.
- Exports the submitted inputs and actual API response as JSON. Example inputs are editable and no prediction runs until requested.
- Sensitivity is not SHAP, a causal effect, or an additive decomposition; the training median is not a healthy or recommended value. Missing explanation records are shown as unavailable.
- Educational/research prototype only; no diagnosis, treatment advice, or clinical certainty score.


## Priority 16 — AI Trust Stress Test
- Open `http://127.0.0.1:8000/stress-test` to probe sensitivity of the existing fitted model to bounded one-feature-at-a-time input perturbations.
- Input schema and target list are served from `/api/stress-test/schema`; the test runner is `POST /api/stress-test/run`.
- Numeric fields are perturbed lower/higher by the selected percentage of the schema range (clipped to allowed bounds); binary fields are flipped. Baseline and perturbed outputs come from `core.predict` and the current `model.joblib`.
- Results show observed probability changes in percentage points, model identity, tested field count, and exportable JSON. No arbitrary pass/fail threshold is applied.
- The endpoint does not persist submitted inputs. The tool measures model sensitivity only; it does not establish clinical reliability, causal effects, diagnosis, or treatment outcomes.
- This feature does not replace the existing Validation Lab, repeated cross-validation results, or external validation.


## Priority 17 — Reproducible AI Case Replay

Open `/case-replay` to create a model-backed run manifest, save it explicitly in browser-local storage or export it as JSON, and replay the same input snapshot against the current local model. The manifest records actual CAD/LAD/LCX/RCA outputs, SHA-256 fingerprints for the model and relevant code/configuration artifacts, a schema fingerprint, UTC timestamp, and Python/dependency versions. The replay comparison reports artifact hash changes, environment differences, and output changes separately.

API endpoints: `GET /api/case-replay/schema` and `POST /api/case-replay/run`. Submitted inputs are not persisted by the API; browser storage is local to that browser profile and is not a secure patient-record system. Use synthetic or de-identified research inputs and avoid personal identifiers in labels. Matching hashes and outputs are technical traceability signals, not clinical validation.



## Clinical Explanation Dashboard — Myocardial Territory Map (removed)
The Myocardial Territory Map card has been removed from the main dashboard (`index.html`). It is still available in the Digital Twin Lab (`digital_twin.html`); the historical notes in `TERRITORY_MAP_NOTES.md` describe its design.

## Confidence Heart + SHAP (added)
`/predict` returns `interval` (80% bootstrap range, B=30) and `shap` per target; `POST /explain` returns SHAP only. Dashboard: confidence halo toggle, range chips, Live preview, explainability section (SHAP | Sensitivity), Trust Center reliability + ROC. Requires `pip install -r requirements.txt` (adds `shap`). Checks: `python tests/regression_guard.py`, `python tests/test_uncertainty.py`, `python tests/test_shap_records.py`, and with the app running `python tests/live_check.py`. See MERGE_CHANGELOG.md.

## Next-Best-Test
Mark inputs as *Not measured* on the dashboard; the **Next-best-test** card ranks which missing input would most change or sharpen the estimate (`POST /nexttest/rank`). Model-sensitivity view only, not a test recommendation or diagnosis. See `NEXTTEST_NOTES.md`; check with `python tests/test_nexttest.py`.

## Subgroup audit + Decision curves
`python build_audit.py` writes `audit.json` (out-of-fold, descriptive); `GET /audit` serves it and `/trust-center` shows a sex/age subgroup table (AUC, recall, specificity with 95% CIs, small-sample flags) and a decision-curve chart. The decision curve has a 95% bootstrap band, an interactive threshold slider (also click/drag and arrow keys) with net true positives and interventions avoided per 100 patients, a "How to read this chart" section, and a dashboard one-liner. Check with `python tests/test_audit.py` and `python tests/test_dca_ui.py` (needs playwright + chromium). See `AUDIT_DCA_NOTES.md`.

## Cardiac Signal Trace
A dashboard card that follows the selected vessel from its top real-SHAP contributors to the existing probability/range and its typical myocardial territory. Front-end only; model-linked explanation, not lesion localization. See [CARDIAC_SIGNAL_TRACE_NOTES.md](CARDIAC_SIGNAL_TRACE_NOTES.md). QA: `python tests/visual_qa/signal_trace.py` (with `python tests/mock_server.py 8000` running).

## 3D cross-section slicing
Dashboard 3D heart has a slice panel (short-axis, two long-axis planes, position slider, flip side, off). See `SLICING_NOTES.md`. Tests: `python tests/test_slicing.py` (set `CM_THREE_JS` to a local three r128 `three.min.js` for browser checks).

## Architecture Map
Open `/architecture` (Explain menu) for an interactive map of pages, browser storage, the FastAPI server, model/data files, the offline build and external AI providers, with step-by-step walk-throughs. Static page with optional live status from `/health`, `/provenance` and `/trust`. See `ARCHITECTURE_MAP_NOTES.md`. Check with `python tests/test_architecture.py`.
