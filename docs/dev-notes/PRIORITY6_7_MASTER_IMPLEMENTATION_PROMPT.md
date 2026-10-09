# CARDIOMAP 3D — PRIORITY 6 + PRIORITY 7
## MASTER IMPLEMENTATION PROMPT — EXPLAINABLE AI, RESEARCH WORKSPACE, CASE COMPARISON & PREMIUM UI

You are working on an existing project called **CardioMap 3D**, an educational cardiovascular research and machine-learning visualization application.

Your task is to implement **Priority 6 and Priority 7 together in one coordinated development pass** on top of the supplied Priority 1–5 project ZIP.

This is an existing application, NOT a new project. You must first inspect the complete codebase, understand its architecture, identify its existing behavior, and then implement the requested additions with minimal, carefully controlled changes.

Do not generate a replacement project, rebuild the application from scratch, or blindly overwrite existing files.

The final result must be a working, visually polished, technically consistent extension of the existing project.

---

# PART 1 — MANDATORY PROJECT STRUCTURE

The supplied ZIP currently contains these files at its root:

- `app.py`
- `core.py`
- `train.py`
- `chat.py`
- `report.py`
- `index.html`
- `whatif.html`
- `assistant.html`
- `model.joblib`
- `metrics.json`
- `export.json`
- `data.xlsx`
- `requirements.txt`
- `README.md`
- `FRONTEND_UPGRADE_NOTES.md`
- `PRIORITY3_IMPLEMENTATION_NOTES.md`
- `PRIORITY4_5_IMPLEMENTATION_NOTES.md`
- `TRUST_CENTER_NOTES.md`
- `WHAT_IF_SIMULATOR_NOTES.md`

The ZIP has a flat root structure. Do not assume that the project is inside a nested application folder.

The main application is served by FastAPI:

- Dashboard: `/app/` → `index.html`
- What-If Simulator: `/whatif` and `/whatif/` → `whatif.html`
- AI Assistant: `/assistant` → `assistant.html`
- API documentation: `/docs`
- Prediction endpoint: `POST /predict`
- Schema endpoint: `GET /schema`
- Evaluation metrics: `GET /metrics`
- Model Trust Center data: `GET /trust`
- Health check: `GET /health`
- AI provider status: `GET /chat/providers`
- AI chat: existing `POST /chat`
- Research PDF generation: existing `POST /report`

The application imports `core`, `chat`, and `report` from `app.py`.

Before changing anything, inspect the complete versions of all relevant files, particularly `app.py`, `core.py`, `train.py`, `index.html`, `whatif.html`, `assistant.html`, `chat.py`, `report.py`, `metrics.json`, and `export.json`.

Use the actual code, data structures, HTML IDs, JavaScript functions, routes, and response schemas you find. Do not assume a function or endpoint exists until you verify it.

---

# PART 2 — EXISTING FUNCTIONALITY THAT MUST BE PRESERVED

The current project already includes the following capabilities.

## A. Existing machine-learning pipeline

`core.py` defines the shared feature schema, model inputs, target labels, input encoding, predictions, and a sensitivity-style explanation.

The four prediction targets are:

- CAD
- LAD
- LCX
- RCA

The backend returns a prediction object containing the target-specific results and selected model information.

The model artifacts are:

- `model.joblib`
- `metrics.json`
- `export.json`

`train.py` performs model evaluation and training. It selects a model separately for each target using the existing evaluation process.

The application has existing model outputs and feature metadata. Reuse them where appropriate.

**Do not retrain the model merely to implement Priority 6 or Priority 7.**

Do not modify the trained model, its selected estimators, the dataset, or the existing model-selection methodology unless a genuine technical necessity is discovered and explicitly documented.

## B. Existing leakage protections

`core.py` defines protected target/leakage columns, including:

- `Cath`
- `LAD`
- `LCX`
- `RCA`

These columns must not become model inputs.

Preserve the existing leakage assertions and feature-validation behavior.

Never introduce a feature explanation, stored research case, comparison workflow, or visualization that accidentally uses a target label as an input feature.

## C. Existing Trust Center

The dashboard already includes a Model Trust and Reliability Center.

It uses `metrics.json`, `export.json`, and `GET /trust` to display available evaluation metrics and methodological information.

Existing content includes repeated cross-validation results, model comparisons, stored out-of-fold confusion matrices, specificity, Brier scores, dataset prevalence, and methodological limitations.

Do not invent new evaluation results.

Do not label the model clinically validated.

Do not claim that Brier scores establish calibrated individual probabilities.

Do not fabricate a calibration curve or a validation statistic that is not present in the artifacts.

## D. Existing coronary visualization

The dashboard contains a Three.js-based schematic coronary exploration experience, including LAD, LCX, and RCA selection, a vessel information panel, and reversible vessel isolation.

Preserve its existing controls and behavior.

The coronary paths are schematic overlays, not patient-specific anatomical reconstructions.

Do not represent the schematic vessels as a clinically precise image of an individual patient's coronary arteries.

## E. Existing What-If Simulator

`whatif.html` already provides:

- A baseline profile editor.
- A baseline snapshot.
- Scenario A and Scenario B.
- Schema-driven input controls.
- Synthetic demonstration profiles.
- Baseline-versus-scenario comparisons.
- CAD, LAD, LCX, and RCA estimates.
- Changed-input comparisons.
- Scenario-minus-baseline differences.
- Source-consistent predictions.
- Reset and clear functionality.
- Shared analysis context for the assistant and reports.

Preserve these capabilities.

Do not build another independent What-If simulator.

## F. Existing AI Assistant

`assistant.html` and `chat.py` provide the context-aware assistant.

The assistant can use available prediction outputs, selected-vessel information, evaluation metrics, and completed What-If snapshots.

The project supports optional Groq and NVIDIA provider configuration through environment variables.

Preserve the existing provider handling, context-size protections, conversation features, and safe interpretation of untrusted context.

The AI must not invent predictions, fabricate metrics, or present itself as a medical professional.

## G. Existing research PDF reports

`report.py` generates a downloadable research case PDF using supplied analysis context.

The report includes a case reference, metadata, available model outputs, profile information, metrics, scenarios, interpretation notes, and limitations.

Preserve its existing generation behavior, fallback narrative, numerical validation, and research-use disclaimer.

Do not require an AI API key merely to generate a PDF.

Do not create public sharing links or add a database simply to implement this prompt.

## H. Existing visual identity

The dashboard, What-If Simulator, and AI Assistant already use a refined visual system featuring teal/blue lighting, layered gradients, translucent panels, scientific grid textures, refined controls, hover/focus treatments, and reduced-motion support.

Continue this visual language.

The new experience must feel like a premium scientific research studio, not a generic admin dashboard or a collection of unrelated cards.

---

# PART 3 — PRIORITY 6: EXPLAINABLE AI AND PREDICTION TRANSPARENCY

## Objective

Make the existing model outputs easier to inspect and understand by providing an explicit, honest explanation of how the supplied input profile relates to the existing model's output.

The purpose is transparency and education, not clinical interpretation.

Create an integrated **Explainability Studio** using the current model artifacts and prediction pipeline.

Do not replace the model with an LLM. Do not let an LLM generate numerical explanations independently of the actual model results.

## 6.1 Inspect and formalize the existing explanation

Inspect `core.py`, particularly the existing `predict()` function and its sensitivity-style calculations.

The current explanation compares model log-odds at the submitted profile against log-odds after replacing an individual feature with a stored training-median reference value.

This is a model sensitivity calculation, not a causal effect and not automatically a faithful additive decomposition of the complete prediction.

Preserve that distinction throughout the interface.

Audit the existing implementation for edge cases, including:

- Missing inputs.
- Imputed values.
- Probabilities near zero or one.
- Numeric and binary features.
- Different selected estimator types for CAD, LAD, LCX, and RCA.
- Feature names that differ from the UI's short IDs.
- Features available to the model but not directly editable through the current UI schema.

Do not silently claim that the current calculation is SHAP, LIME, causal inference, or a clinically validated explanation.

If the current method has limitations, explain them accurately rather than hiding them.

## 6.2 Add a reliable explanation data structure

Prefer a small, reusable backend explanation function in `core.py` or a clearly separated helper module if the existing architecture makes that safer.

Do not scatter explanation calculations across several frontend scripts.

The explanation should be derived from the actual fitted model, the actual supplied profile, the stored reference values, and the existing prediction output.

Each explanation record should contain, where available:

- Target name.
- Model name.
- Feature name.
- Human-readable feature label.
- Submitted value.
- Reference value.
- Unit, when available.
- Explanation method.
- Numerical explanation value.
- Explanation direction, when mathematically valid.
- Explanation limitations.

Use the existing schema from `core.UI` for labels, units, and supported ranges wherever applicable.

For features that are not directly represented in the UI schema, use their actual feature names and available metadata. Do not invent units or human-readable medical interpretations.

Do not fabricate an explanation when the required information is missing.

## 6.3 Handle different estimator types correctly

The project can select different model families for different targets.

Do not assume that every target uses Logistic Regression.

Do not apply Logistic Regression coefficients to a Random Forest or Gradient Boosting model.

For the existing sensitivity-style method, make the computation numerically robust for probabilities near zero and one.

If a calculation cannot be supported reliably for a particular model or input, return an explicit unavailable status and a short reason rather than manufacturing a value.

Do not make a claim of additivity unless the method mathematically supports it.

If you add an optional alternative explanation method, it must be compatible with the fitted estimator, computationally reasonable for this dataset, reproducible, and clearly labeled.

Do not add a heavyweight explainability dependency unless it provides material value and can be installed reliably through the existing environment.

## 6.4 Expose explanations through a backward-compatible API

Prefer adding an optional explanation object to the existing `POST /predict` response if this can be done without breaking existing clients.

Alternatively, introduce a dedicated endpoint only if it produces a cleaner, safer implementation.

Any added API behavior must preserve the existing response fields:

- `model`
- `explanation`
- `CAD`
- `LAD`
- `LCX`
- `RCA`

Do not rename or remove existing keys.

Do not change the meaning or numerical format of the existing probability fields.

Validate requests using the existing Pydantic schema and the input ranges derived from `core.UI`.

Missing optional inputs must continue to behave consistently with the current prediction pipeline.

Keep the API deterministic for identical model artifacts and identical inputs, subject to the estimator's existing behavior.

## 6.5 Build an Explainability Studio in the dashboard

Integrate a new section into `index.html`, using the existing dashboard navigation and design system.

The section should display explanations for the latest successful prediction.

Include:

1. A target selector for CAD, LAD, LCX, and RCA.
2. The target's actual prediction output.
3. A ranked list of available feature sensitivity results.
4. Positive and negative signed explanation values where the underlying method supports them.
5. A visual representation of the magnitude and direction of those values.
6. Submitted versus reference values.
7. Units and human-readable feature labels when supported.
8. A clear explanation of the selected calculation method.
9. A visible limitations note.
10. A loading, empty, and error state.

Use accessible horizontal contribution bars or a similarly readable visualization.

Scale bars consistently within the displayed explanation set.

If values are signed, make the sign and zero reference visually unambiguous. Do not use color alone to communicate direction.

Use clear labels, such as “Model sensitivity relative to reference,” rather than “cause,” “risk factor responsible,” or “reason for disease.”

Do not create a chart that implies the listed contributions add up to the full probability.

When explanation values are unavailable, show the reason and continue displaying the valid prediction.

Do not invent fallback explanation values.

## 6.6 Add profile completeness and input provenance

Where useful, show which profile fields were provided, which were omitted, and which values were imputed by the existing pipeline.

Distinguish clearly between:

- User-supplied values.
- Reference values.
- Imputed values.
- Unavailable values.

Do not expose private training records or individual dataset rows.

Do not present the training median as a healthy, normal, recommended, or ideal patient value.

Do not recommend that users change medical measurements to manipulate the model's output.

## 6.7 Integrate explainability into What-If comparisons

Extend `whatif.html` so that, after a successful baseline/Scenario A/Scenario B comparison, users can inspect the available explanation data for the currently selected target.

Reuse the existing baseline and scenario data structures and prediction source.

Do not create a separate, inconsistent prediction path for explanations.

Where valid explanation data is available for multiple profiles, allow the user to compare their feature sensitivity values side by side.

Clearly state that differences between model explanations do not establish that changing an input will cause a clinical outcome.

Do not claim that a scenario represents treatment, prognosis, or an intervention effect.

Preserve the current source-consistency rule: do not mix backend predictions with the bundled standalone fallback within one comparison.

If explanations are not available in standalone mode, display a clear and graceful message rather than silently switching methods.

## 6.8 Integrate explainability into the assistant

Extend `chat.py` and `assistant.html` only where necessary to make the assistant aware of the actual explanation data.

The assistant may explain:

- What a displayed model output means.
- How the current sensitivity calculation works.
- Which features have available signed sensitivity values.
- Why a sensitivity calculation is not a causal explanation.
- Why model estimates are not diagnostic findings.
- How to interpret limitations and missing values.

The assistant must only describe values actually supplied by the backend or shared analysis context.

It must not invent numerical contributions, claim that a feature caused CAD or stenosis, recommend medication, recommend a procedure, or provide personalized treatment decisions.

Keep context size limits and existing untrusted-context protections.

Do not send additional sensitive data to an AI provider unnecessarily.

## 6.9 Integrate explainability into PDF reports

Extend `report.py` to include an optional explainability section when valid explanation data is present.

The report should include:

- The explanation method.
- The selected target.
- The model name.
- A concise table of available feature sensitivity values.
- Reference and submitted values when available.
- A short methodological interpretation.
- Explicit limitations.

If no explanation data is available, omit the section or state that it was unavailable.

Do not fabricate a substitute.

Do not imply that the explanation identifies causal medical risk factors.

Preserve PDF generation without an AI provider.

## 6.10 Priority 6 acceptance criteria

Priority 6 is complete only when:

- Existing prediction behavior remains functional.
- The explanation method is explicitly documented.
- Different estimator families are handled without incorrect coefficient assumptions.
- The dashboard can display the latest available explanation.
- The What-If Simulator can display available explanations for completed scenarios.
- The assistant receives only genuine explanation data.
- PDF reports include explanations only when supported.
- Missing data produces graceful, honest states.
- No new clinical claims are introduced.
- All existing API fields and current pages continue to work.

---

# PART 4 — PRIORITY 7: UNIFIED RESEARCH WORKSPACE AND CASE COMPARISON

## Objective

Create a coherent research workflow that allows a user to review a current analysis, inspect explanations, compare completed hypothetical scenarios, consult the AI Assistant, and produce a consistent research case PDF.

This must build on the existing shared browser analysis context and report generator.

Do not create a second prediction engine, a duplicate simulator, a new account system, or an unnecessary database.

Priority 7 should make the application feel like one connected research product.

## 7.1 Establish a single analysis-context contract

Inspect the existing browser-shared context used by `index.html`, `whatif.html`, and `assistant.html`.

Inspect the existing context snapshot conventions and the completed What-If snapshot function, including `window.cardioMapScenarioSnapshot()` if it remains present in the supplied files.

Build on the current implementation rather than creating a conflicting context format.

If the current context structure needs extension, introduce a versioned, backward-compatible structure.

The shared context should support the following optional information:

- Context version.
- Snapshot timestamp.
- Model identity.
- Prediction source.
- Current input profile.
- Available target outputs.
- Selected artery or target.
- Available evaluation metrics.
- Available explanation data.
- Completed baseline/Scenario A/Scenario B comparisons.
- Scenario input profiles.
- Scenario output estimates.
- Scenario explanation data, when available.
- Provenance and limitations.

Every field must be optional unless the existing application guarantees its presence.

Do not claim that a snapshot is current when its timestamp or source indicates otherwise.

Do not combine values from different model sources into one comparison.

Do not use stale context as if it were the most recent prediction.

If an existing browser storage mechanism is used, validate data before rendering it.

Handle malformed, missing, outdated, or oversized context safely.

Never execute stored strings as code or HTML.

Do not store identifiable patient information in persistent browser storage by default.

Prefer non-identifying research snapshots and make persistence behavior clear to the user.

## 7.2 Add a unified Research Workspace

Add a dedicated page only if necessary. If a new page is justified, create a root-level `research.html` file and serve it explicitly from `app.py`.

Do not create a React/Vite application or introduce a frontend build system.

The existing application uses standalone HTML, CSS, and JavaScript served by FastAPI. Continue with that architecture.

The new Research Workspace should have a refined layout with these sections:

### A. Current Analysis

Show the latest valid analysis snapshot.

Display:

- Snapshot timestamp, if available.
- Model identity.
- Prediction source.
- Available CAD/LAD/LCX/RCA outputs.
- Selected target or artery.
- Input profile completeness.
- Relevant warnings.

Do not display invented default estimates.

If no prediction exists, show an empty state with a clear link back to the dashboard.

### B. Explanation Summary

Display the selected target's supported explanation data.

Reuse Priority 6's explanation structure.

Do not calculate an alternative explanation independently in the Research Workspace.

Provide a link back to the dashboard's Explainability Studio.

### C. Scenario Comparison

Display the most recently completed baseline/Scenario A/Scenario B comparison, when available.

Include:

- Each profile's actual supplied inputs.
- CAD, LAD, LCX, and RCA estimates.
- Scenario-minus-baseline percentage-point differences when valid.
- Changed-input summary.
- Model identity and source consistency.
- Explanation comparisons when supported.
- A clear warning that scenario differences are not causal effects.

Only calculate a numerical difference when the baseline and comparison outputs refer to the same target, the same probability scale, and compatible model sources.

Do not compare incompatible models or prediction methods without clearly separating them.

If a comparison cannot be validated, show “Comparison unavailable” with the reason.

### D. Research Case Actions

Provide controls to:

- Refresh the current snapshot.
- Return to the dashboard.
- Open the What-If Simulator.
- Open the AI Assistant.
- Generate a Research Case PDF.
- Clear the current browser-shared research context after confirmation.

Every button must perform its stated action.

Show clear success, failure, loading, and empty states.

Do not display a success message before an action has actually succeeded.

### E. Research Summary

Provide a concise, structured overview containing only facts present in the snapshot.

It may include:

- What model outputs are available.
- Which scenario comparisons are complete.
- Which explanation fields are available.
- Which information is missing.
- Which limitations apply.

Do not add clinical recommendations, diagnosis, treatment guidance, or AI-generated certainty claims.

## 7.3 Make the workflow consistent across all pages

Update navigation links in `index.html`, `whatif.html`, and `assistant.html` so the new Research Workspace is discoverable.

If a new page is created, add the explicit route in `app.py`, following the existing pattern used for `/app/`, `/whatif`, and `/assistant`.

Do not serve the entire project directory.

Continue to serve only explicitly authorized application files.

Ensure the following workflow works coherently:

1. The user enters a profile in the dashboard.
2. The user obtains a real model prediction.
3. Available explanation data is attached to the correct prediction snapshot.
4. The user opens the What-If Simulator.
5. The user completes a valid baseline/Scenario A/Scenario B comparison.
6. The completed comparison is published to the shared analysis context.
7. The user opens the Research Workspace.
8. The workspace displays the actual current analysis and available scenario comparison.
9. The user opens the AI Assistant and asks a context-aware question.
10. The user generates a research PDF from the same relevant snapshot.

This sequence must not require the user to manually copy numerical values between pages.

If some information is not available because the user skipped a step, show a helpful empty state instead of fabricating data.

## 7.4 Improve PDF consistency

Extend `report.py` only as needed to accept the validated research context.

The report must be consistent with the snapshot shown in the Research Workspace.

Include, where available:

- Case reference.
- Generation timestamp.
- Model and prediction source.
- Input profile.
- CAD/LAD/LCX/RCA outputs.
- Available explanation data.
- Completed scenario comparison.
- Valid numerical differences.
- Available evaluation context.
- Provenance.
- Limitations and educational-use disclaimer.

The PDF must distinguish actual model outputs from explanatory narrative.

Never infer missing scenario results from the baseline.

Never compute differences across mismatched models, targets, units, or probability scales.

Do not include a fabricated patient name, patient identifier, or clinical history.

Keep the existing conservative fallback behavior when AI providers are missing or fail.

Do not add public report URLs, cloud storage, a database, or automatic external uploads.

## 7.5 Add an optional local research-case library only if safely achievable

If the existing architecture supports a genuinely small, local-only implementation without introducing a database or server-side patient-data storage, you may add a simple in-browser list of non-identifying research snapshots.

This feature is optional and secondary to the unified workflow.

If implemented:

- Store only explicitly saved, non-identifying research snapshots.
- Make it clear that data is stored in the current browser.
- Allow the user to delete saved snapshots.
- Validate data when loading it.
- Handle malformed or outdated saved records.
- Avoid storing API keys, conversation secrets, or identifiable patient information.
- Do not transmit saved cases automatically.
- Do not describe browser-local storage as a secure medical-record system.
- Do not confuse a saved snapshot with a live model result.
- Provide an obvious way to clear local research snapshots.

If the feature would require disproportionate architectural changes or create unnecessary privacy risks, omit it and document the decision.

Do not introduce SQLite, a server database, authentication, cloud synchronization, or public sharing as part of this implementation.

## 7.6 Add professional research-workflow visuals

The Research Workspace should use the same artistic visual identity as the current dashboard, What-If Simulator, and assistant.

Use:

- Layered teal and blue illumination.
- Restrained gradients.
- Subtle scientific-grid textures.
- Carefully spaced translucent panels.
- Clear typography hierarchy.
- Well-organized data tables.
- Accessible charts.
- Responsive layouts.
- Thoughtful empty states.
- Clear loading and error states.
- Visible focus indicators.
- Keyboard-accessible controls.
- Reduced-motion support.

Avoid excessive glow, excessive animation, crowded panels, unnecessary decoration, and oversized gradients that reduce readability.

Prioritize scientific clarity over decorative effects.

Maintain good contrast and readable text at normal browser zoom.

Do not rely on color alone to distinguish values or states.

Keep the pages usable on desktop and tablet, with graceful mobile behavior.

## 7.7 Protect user context and application security

Treat all browser-shared snapshots as untrusted input.

Validate types, sizes, numeric values, target names, timestamps, model identifiers, and nested objects.

Escape or safely render all user-controlled text.

Do not use `innerHTML` with untrusted profile fields, chat content, report context, or stored snapshots.

Do not introduce arbitrary file serving or unsafe dynamic imports.

Do not expose `.env`, `data.xlsx`, `model.joblib`, or other project files through a new static-file route.

Preserve the existing `CARDIOMAP_ORIGINS` CORS configuration.

Keep API validation consistent with the current schema.

Avoid logging sensitive input profiles.

Do not send information to an external AI provider unless the existing assistant workflow requires it and the user has configured that provider.

---

# PART 5 — SHARED TECHNICAL REQUIREMENTS

## 5.1 Minimize dependencies

Inspect `requirements.txt` before adding any dependency.

Current dependencies include FastAPI, Uvicorn, Pydantic, pandas, openpyxl, scikit-learn, joblib, and reportlab.

Prefer existing libraries and browser-native JavaScript/CSS.

If a new dependency is truly necessary, explain why, add it explicitly to `requirements.txt`, and verify installation compatibility.

Do not introduce a large framework solely to implement a new page.

## 5.2 Maintain backward compatibility

Preserve:

- Existing endpoint names.
- Existing API response fields.
- Existing UI routes.
- Existing prediction semantics.
- Existing target names.
- Existing Trust Center content and methodology.
- Existing What-If behavior.
- Existing assistant conversation behavior.
- Existing PDF generation fallback.
- Existing model and training artifacts.

If an API extension is necessary, make it additive.

Do not rename existing routes or change the meanings of existing fields.

## 5.3 Handle errors deliberately

Every new feature must handle:

- No current prediction.
- Missing explanation data.
- Missing optional inputs.
- Malformed shared context.
- Unsupported explanation methods.
- Failed API requests.
- Missing AI provider configuration.
- PDF-generation errors.
- Incomplete scenario comparisons.
- Mismatched model sources.
- Browser storage errors.
- Narrow viewport layouts.

Errors should be understandable to the user without exposing secrets or raw internal stack traces.

A missing optional feature must not break the entire application.

## 5.4 Keep the model's role separate from the LLM's role

The existing machine-learning pipeline remains the source of numerical predictions.

The LLM may explain supplied values in plain language, but it must not manufacture predictions, metrics, feature contributions, or scenario results.

The Research Workspace must not call the LLM simply to render a numeric table.

All model outputs must come from the actual existing prediction pipeline or clearly identified existing artifacts.

---

# PART 6 — TESTING AND VERIFICATION

Do not finish after writing code. Test the implementation.

## 6.1 Python checks

Run Python syntax compilation for:

- `app.py`
- `core.py`
- `chat.py`
- `report.py`
- `train.py`

Also compile any new Python modules.

## 6.2 JavaScript checks

Extract and syntax-check inline JavaScript from:

- `index.html`
- `whatif.html`
- `assistant.html`
- The new Research Workspace page, if created.

Check for:

- Undefined functions.
- Duplicate IDs.
- Invalid selectors.
- Incorrect event listeners.
- Incorrectly assumed response shapes.
- Unsafe rendering of untrusted content.
- Unhandled rejected promises.
- Navigation links to nonexistent routes.

## 6.3 API regression checks

Use FastAPI TestClient or an equivalent local test approach to verify:

- `GET /`
- `GET /health`
- `GET /schema`
- `GET /metrics`
- `GET /trust`
- `GET /app/`
- `GET /whatif`
- `GET /whatif/`
- `GET /assistant`
- `GET /chat/providers`
- `POST /predict`
- `POST /report`
- Any new endpoint you add.

If Priority 7 introduces `/research`, verify that route too.

Confirm that the existing prediction response still contains the expected CAD, LAD, LCX, and RCA outputs.

Verify that the explanation extension does not remove or rename any existing response keys.

## 6.4 Explainability tests

Test at least:

1. A complete valid profile.
2. A profile with omitted optional values.
3. A prediction for each of the four targets.
4. The actual selected estimator types.
5. Probabilities near the numerical boundaries, using safe test fixtures where practical.
6. Missing explanation metadata.
7. An unsupported explanation calculation.
8. Consistency between the displayed explanation and the backend response.

Verify that the interface does not label sensitivity values as causal effects or as a guaranteed additive decomposition.

## 6.5 Context and scenario tests

Test:

1. No shared context.
2. A valid current prediction.
3. A completed baseline/Scenario A/Scenario B comparison.
4. A context snapshot missing optional explanation fields.
5. A malformed snapshot.
6. An oversized snapshot.
7. Incompatible model sources.
8. A failed prediction request.
9. A missing scenario output.
10. A valid same-source scenario comparison.

Ensure that unavailable comparisons do not produce invented numerical differences.

## 6.6 PDF tests

Generate a PDF without an AI provider.

Verify:

- The response has the correct PDF content type.
- The returned bytes begin with a valid PDF signature.
- The PDF can be parsed.
- The case reference and timestamp are present.
- Existing output sections still work.
- Explanation content appears only when valid data is supplied.
- Scenario differences are calculated only when the inputs are compatible.
- The limitations section remains present.
- Missing optional context does not break report generation.

## 6.7 Frontend smoke tests

Where the environment permits, start the FastAPI application and use a browser to test the main workflow.

Check navigation between the dashboard, What-If Simulator, assistant, and Research Workspace.

Check keyboard navigation, visible focus, responsive behavior, and the new explanation controls.

If automated browser access is unavailable, say so explicitly. Do not claim that browser tests passed when only static syntax checks were completed.

---

# PART 7 — FILE-CHANGE STRATEGY

Work with the current root-level structure.

Expected files to inspect and potentially modify:

- `core.py` — reusable explanation calculations.
- `app.py` — additive API behavior and an optional explicit Research Workspace route.
- `index.html` — Explainability Studio and navigation.
- `whatif.html` — scenario explanation integration and research workflow links.
- `assistant.html` — context display and navigation.
- `chat.py` — explanation-aware assistant context, if required.
- `report.py` — optional explanation and research-workspace sections.
- `README.md` — setup, routes, explanation methodology, limitations.
- `PRIORITY4_5_IMPLEMENTATION_NOTES.md` — preserve as historical implementation documentation; do not overwrite it with unrelated notes.

If appropriate, create:

- `research.html` — the dedicated Research Workspace.
- `PRIORITY6_7_IMPLEMENTATION_NOTES.md` — implementation details, decisions, limitations, and verification results.

Do not create unnecessary directories.

Do not duplicate large blocks of prediction logic across HTML files.

Do not replace complete HTML pages just to add a section. Preserve existing IDs, controls, event handlers, and application behavior.

Before editing any file, understand how its existing code is structured.

---

# PART 8 — ARTIFACT PRESERVATION

Unless a specific modification is proven necessary and documented, preserve the existing artifacts byte-for-byte:

- `model.joblib`
- `metrics.json`
- `export.json`
- `data.xlsx`
- `train.py`
- `requirements.txt`

Do not run training as part of the implementation by default.

Do not alter existing evaluation results to make the interface look better.

Do not replace the dataset with synthetic data.

Do not fabricate validation performance.

Do not remove existing implementation notes.

If `requirements.txt` must change because a necessary dependency is introduced, document that exact change.

---

# PART 9 — DEFINITION OF DONE

The implementation is complete only when all the following are true:

### Priority 6

- A user can inspect supported explanations for a successful prediction.
- Explanations correctly reflect the method and selected estimator.
- Missing or unsupported explanation data is handled honestly.
- The What-If Simulator can display compatible explanation information when available.
- The assistant can explain supplied model results without inventing numbers.
- The PDF can include validated explanation data.
- No new clinical or causal claims have been introduced.

### Priority 7

- A unified Research Workspace connects the existing application workflows.
- It uses the actual shared analysis context and prediction artifacts.
- It displays available outputs and scenarios without fabricating missing data.
- It validates model/source compatibility before computing differences.
- Navigation between all relevant pages works.
- PDF reports remain consistent with the selected research snapshot.
- Any optional local snapshot storage is non-identifying, validated, and deletable.
- The existing artistic design language is preserved.

### Entire application

- The original dashboard still works.
- The original What-If Simulator still works.
- The original assistant still works.
- The original Trust Center still works.
- The existing prediction pipeline remains intact.
- The report still generates without an AI provider.
- No secrets or project files are exposed by new routes.
- Python and JavaScript checks pass.
- API regression tests pass.
- Browser testing is performed where possible and accurately reported.
- The final ZIP is valid and contains the complete project.

---

# PART 10 — FINAL DELIVERABLE

After implementing and testing the changes:

1. Package the complete project into a single ZIP.
2. Keep the ZIP's existing flat root structure.
3. Include all original required files and the new implementation files.
4. Exclude `.env`, API keys, credentials, caches, temporary files, and test artifacts that are not needed to run the application.
5. Verify ZIP integrity.
6. Confirm that all required model artifacts are present.
7. Provide a concise implementation summary.
8. List every changed and added file.
9. Report tests that passed and tests that were not run.
10. Explain how to install and launch the application.
11. Document the explanation method and its limitations.
12. Document any incomplete functionality honestly.

The expected launch commands should remain compatible with the current project:

`pip install -r requirements.txt`

`uvicorn app:app --reload --port 8000`

If the existing project requires its documented model-training step because an artifact is missing, explain that separately instead of silently retraining.

The main application should remain accessible at:

`http://127.0.0.1:8000/app/`

The What-If Simulator should remain accessible at:

`http://127.0.0.1:8000/whatif`

The AI Assistant should remain accessible at:

`http://127.0.0.1:8000/assistant`

If the new Research Workspace is implemented, provide its exact local route.

## FINAL INSTRUCTION

Implement Priority 6 and Priority 7 as a carefully integrated extension of the actual supplied CardioMap 3D Priority 1–5 ZIP.

Inspect first. Plan the changes. Implement incrementally. Test thoroughly. Preserve working functionality. Package the complete result.

**Accuracy, backward compatibility, honest scientific interpretation