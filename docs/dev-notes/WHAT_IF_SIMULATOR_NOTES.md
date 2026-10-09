# What-If Scenario Simulator — Implementation Notes

- The What-If Scenario Simulator is served on its own page at `/whatif` (`whatif.html`).
- The main dashboard (`/app/`) links to the dedicated page; the What-If page links back to the dashboard and to the Trust Center.
- The What-If page includes the baseline profile editor, read-only baseline snapshot, and Scenario A / Scenario B editors generated from the bundled `D.ui` schema, including supported ranges, units, and binary controls.
- The baseline can be refreshed from the profile editor above it. Scenario A and Scenario B can be copied from baseline, reset, or populated with synthetic demonstration inputs.
- Comparison evaluates baseline, A, and B in parallel and only renders results when all three predictions succeed.
- When served by FastAPI, the page uses the same `/predict` API source for all profiles. If opened as standalone HTML without a configured API URL, it uses the bundled exported Logistic Regression fallback for all profiles.
- Shows CAD, LAD, LCX, and RCA estimates and scenario-minus-baseline percentage-point changes; lists changed inputs.
- Does not retrain the model, change the API contract, or change Trust Center metrics.
- Medical disclaimer explains that scenario differences are not causal effects or treatment advice.
