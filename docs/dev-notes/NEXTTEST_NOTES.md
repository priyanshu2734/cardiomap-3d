# Next-Best-Test (new feature)

**What it answers:** for a partly filled profile, which *unmeasured* input would most change or sharpen the model's estimate for the selected target (CAD / LAD / LCX / RCA).

## How it works
1. `POST /nexttest/rank` takes `{"profile": {...any subset of /schema ids...}}` (needs at least 6 supplied inputs).
2. The 40 most similar records (Gower distance on supplied inputs only, same idea as `/peers/similar`) give plausible values for each missing input (binary: observed values; numeric: 6 quantile mid-points).
3. Each missing input is re-scored with those values in **one batched call per model** (primary model and the 30 bootstrap refits), about 1.5 s per request.
4. Per target, each missing input gets: expected absolute probability shift (ranking key), chance the estimate crosses 50%, 10th-90th percentile of resulting estimates, and expected change in the 80% bootstrap range width (same definition as `core.interval`). `most_uncertain_vessel` is the LAD/LCX/RCA with the widest current range.

## UI
- Form: new **Not measured (n)** disclosure under the inputs. Ticked inputs are removed from the `/predict` payload (and from the offline fallback and Similar-records matching). Press *Run prediction* or use Live preview to apply. *Reset* clears it.
- Card **Next-best-test: what is still unknown?** (after Similar records) follows the selected target, lists the top 5, and has a button that selects the widest-range vessel.

## Honest limits
Shifts are measured against the current estimate, which fills missing inputs with training medians. Values come from 40 records of a 303-record dataset the model was also fitted on, so this is a model-sensitivity view, not validation, not advice to order a test, and not a diagnosis. Response shape of `/predict` is unchanged; no training or model change.

## Files
`nexttest.py` (logic + lazy router), `app.py` (router include), `index.html` (card, CSS, JS, Not-measured control, payload helper), `tests/test_nexttest.py`, `tests/mock_server.py` (route added).
Run: `python tests/test_nexttest.py`.

## UI redesign (what_next.html, embedded in the dashboard and Digital Twin)
Only `what_next.html` changed; `/nexttest/rank`, its response shape and `cmNextTestSnapshot()` are untouched.
- Summary row: current estimate with Low/Moderate/High pill and a 0-100% range gauge (80% refit band, estimate tick, 50% line); "Not entered" card (n of total inputs) with the widest-range vessel and its switch button.
- Plain-language "Reading" box: names the most influential unknown input, its typical shift in points, where the estimate would land, and how often it crosses 50%. If the top shift is under 1 pt it says the estimate is stable against what is unknown.
- Each ranked card: effect size (typical shift in pts + label), impact bar, "now vs if known" mini gauge, and three facts in words (Crosses 50%, Certainty narrower/wider, Similar records).
- Effect labels (minimal <1 pt, small 1-3, moderate 3-6, large 6+) are descriptive groupings for scanning, not clinical thresholds; a "How to read these numbers" disclosure defines every figure.
- Removed ~220 lines of unused Signal Trace CSS from this page. Light/dark, reduced motion, 390 px (no horizontal overflow) checked.
