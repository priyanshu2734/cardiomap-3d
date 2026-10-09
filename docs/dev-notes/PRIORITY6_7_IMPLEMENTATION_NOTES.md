# Priority 6–7 Implementation Notes

## Priority 6 — Explainability and transparency
- Hardened the existing one-feature log-odds sensitivity calculation by clipping probabilities before logit conversion, avoiding a fabricated zero contribution at exact probability boundaries.
- Added reusable `core.explain()` structured records per target, including fitted estimator name, feature label, submitted/reference values when available, unit, direction, method, status, and explicit limitations.
- `POST /predict` retains its existing response keys and adds the optional `explainability` object. The model artifact, training methodology, dataset, and training script are unchanged.
- Existing dashboard sensitivity visualization remains the main display. Its method note already states that it is not SHAP and does not show causation. Dashboard-shared context now includes structured explanation data when returned by the API.
- PDF generation adds an optional explanation table only for supplied structured records; no values are invented when explanation data is missing.

## Priority 7 — Unified Research Workspace
- Added explicit `/research` route and root-level `research.html` page.
- Workspace reads the existing `cm-ctx-v1` browser context, validates JSON shape and a 50 KB size cap, and safely renders values with DOM `textContent` rather than interpolating user values into HTML.
- Shows snapshot timestamp, source, selected vessel, input completeness, available target outputs, supported sensitivity summaries, available scenarios, provenance and empty/error states.
- Added discoverable Research Workspace links to dashboard, What-If and assistant pages. Existing pages/routes remain intact.
- Workspace actions: refresh context, generate PDF from the same context, and clear shared context after confirmation. No database, cloud sync, public sharing, or new persistent case library was added; optional local case library was omitted to minimize privacy risk and scope.

## Methodological limits
- Sensitivity is a one-feature perturbation relative to the stored training median. It is not SHAP, causal inference, a clinical explanation, or a mathematically guaranteed additive decomposition. The reference value is not a healthy/ideal value.
- Scenario comparisons are hypothetical model outputs, not interventions, treatment effects, or prognosis.
- The app is for educational/research use only and is not clinically validated by this implementation.

## Verification (packaged build)
- Python syntax compilation: passed for `app.py`, `core.py`, `chat.py`, `report.py`, and `train.py`.
- Inline JavaScript syntax checks: passed for dashboard, What-If, assistant, and Research Workspace.
- Duplicate static HTML ID scan: no duplicates detected (template IDs are excluded from duplicate warnings).
- FastAPI smoke checks: `/`, `/health`, `/schema`, `/metrics`, `/trust`, `/app/`, `/whatif`, `/whatif/`, `/assistant`, `/research`, and `/chat/providers` returned HTTP 200.
- `POST /predict` returned HTTP 200 with original `model`, `explanation`, CAD/LAD/LCX/RCA fields plus the additive `explainability` structure; all four targets returned available sensitivity records on a valid test profile.
- `POST /report` returned HTTP 200 with `application/pdf` and `%PDF-1.4` signature without requiring an AI provider.
- Browser-driven end-to-end tests were not run in this environment. Syntax and API smoke tests do not establish full interactive/browser compatibility.
