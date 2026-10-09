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
