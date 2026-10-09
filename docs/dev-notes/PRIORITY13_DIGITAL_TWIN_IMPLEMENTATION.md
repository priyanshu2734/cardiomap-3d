# Priority 13 — Coronary Digital Twin Lab

## What was added
- `/digital-twin` and `/digital-twin/` routes serving `digital_twin.html`.
- New primary-dashboard navigation link to the Digital Twin Lab.
- Reuses the existing 3D dashboard in an embedded frame; no replacement anatomy renderer or synthetic anatomical lesion data was introduced.
- Loads the authoritative `/schema` input definitions and uses `/predict` for baseline, Scenario A, and Scenario B.
- Optional baseline values and editable per-scenario overrides; field ranges and binary controls are driven by the shared schema.
- Shows CAD, LAD, LCX, and RCA model probabilities, scenario differences in percentage points, estimator metadata when returned, and the exact input/output JSON run record.
- JSON export of run timestamp, request profiles, API responses, and source route.
- Guardrails make clear that this is a model scenario explorer, not a physiological digital twin, causal estimator, treatment-effect model, or clinical tool.

## Data integrity
- No hardcoded prediction outputs, estimated risk deltas, fabricated curve values, or external clinical claims.
- The included example profile is an illustrative, editable set of input values only. It is not a real patient and no predictions are shown until the actual API is called.
- All three prediction requests must succeed before comparison results are rendered; partial responses are not shown as a complete comparison.

## Known limitations
- Existing 3D anatomy is embedded from the current dashboard; it is not dynamically reconstructed from the model output and does not represent patient-specific imaging.
- Scenario differences are descriptive changes in model estimates and cannot be interpreted as causal effects.
- This page does not add authentication, persistent patient records, cloud sync, or clinical validation.
