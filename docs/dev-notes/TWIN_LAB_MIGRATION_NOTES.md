# Digital Twin Lab parity update

- Dashboard (`index.html`): Myocardial territory map card removed. `window.CM_SEGMENTS` kept (Cardiac Signal Trace); `cmTerritoryPaint` is a no-op. All other heart controls unchanged.
- Digital Twin Lab (`digital_twin.html`): added vessel picker, cross-section slicing, Confidence halo, Why-Beams and the Myocardial territory map (section 03; results is now 04). Reset camera, Load anatomy, Use HRA heart already existed.
- Halo, Why-Beams, picker estimates and territory colours read the baseline /predict response (shap + interval). They stay disabled/neutral until "Run baseline + variants" succeeds.
- Verification: node --check on both inline scripts; headless-browser runs at 1360/390 px, light/dark, no page errors on /digital-twin. WebGL output (clipping, halo tubes, beam endpoints) was NOT visually verified because three.js was stubbed offline.
