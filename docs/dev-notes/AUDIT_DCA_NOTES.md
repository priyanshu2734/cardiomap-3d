# Subgroup performance audit + Decision-curve analysis

Both views come from `audit.json`, produced by `python build_audit.py [data.xlsx] [--B 1000] [--seed 7]` (about 20 s) and served by `GET /audit`. They appear on **/trust-center** below the ROC chart and follow the selected target (CAD / LAD / LCX / RCA).

## Method
- Clones the already-selected pipeline per target from `model.joblib`; deployed models, `train.py` and `/predict` are untouched.
- Each record's probability is the mean of its **out-of-fold** predictions over 3 repeats of stratified 5-fold CV (imputation and scaling fitted inside folds), so no record is scored by a model that saw it.
- **Subgroups:** sex (127 female / 176 male) and age bands <50, 50-59, 60-69, 70+. Reported: n, positives, AUC with bootstrap 95% CI, recall and specificity (threshold 0.5) with Wilson 95% CIs, plus a bootstrap CI for the male-minus-female AUC difference. A group is flagged **small sample** when n<30 or either class has <10 records.
- **Decision curve:** net benefit = TP/n - FP/n x pt/(1-pt), against treat-all (prevalence - (1-prevalence) x pt/(1-pt)) and treat-none (0), for thresholds 5-95% (chart shows to 80%). `useful_ranges` lists thresholds where the model beats both. `band` holds a bootstrap percentile 95% interval of the model's net benefit at each threshold (resampling records, out-of-fold probabilities held fixed, separate random stream so no other number changes).

## What it shows (current artifacts, B=1000)
No target has a sex gap whose 95% CI excludes zero. Age bands are where performance varies: e.g. CAD AUC 0.72 (CI 0.54-0.87) at 70+, flagged small sample, and LAD AUC 0.74 at 60-69 versus 0.89 at 50-59. Model beats treat-all and treat-none from about 10% (CAD, LAD) or 12% (LCX, RCA) upward; treat-all is strong at low thresholds because the dataset is a high-prevalence referral cohort.

## How to read the decision curve
1. **Threshold** = the estimated risk at which someone would act (e.g. refer for more testing). Low thresholds mean a missed case is judged far worse than a false alarm.
2. **Net benefit** = true positives minus false positives weighted by pt/(1-pt); higher is better. **Treat all** (dashed) acts on everyone; **treat none** is 0. The model is useful only where its line is above both.
3. **Shaded band** = 95% bootstrap interval. If it reaches treat-all (or 0), the advantage is not established; the readout says so.
4. **Slider / click / arrow keys** on the Trust Center chart read exact values at one threshold: net benefit x 100 = net true positives per 100 patients; (model - treat-all) / (pt/(1-pt)) x 100 = unnecessary interventions avoided per 100 patients versus treating everyone, with no true positive missed.
5. Worked example (CAD, 20%): model 0.660 vs treat-all 0.641, about 66 net true positives per 100 and roughly 7.6 fewer unnecessary interventions per 100 versus treating everyone, but the band (0.596 to 0.722) reaches treat-all, so the edge over treating everyone is uncertain. Where treat-all is strong (high-prevalence cohort) that is expected.

## Dashboard
The main dashboard shows a one-line summary under the explainability section ("model beats both at X-Y%") for the selected vessel with a link to the chart. It reads `GET /audit` and stays hidden if the API or file is missing; it never shows a number that is not in `audit.json`.

## Limits
303 records, one dataset, intervals are wide, and subgroup analysis is descriptive (no multiplicity correction). Out-of-fold is not external validation, and decision curves need a clinical judgement of the false-positive/true-positive trade-off. Not a diagnosis or a recommendation to treat.

## Files
`build_audit.py`, `audit.json`, `app.py` (`GET /audit`), `trust_center.html` (two panels), `tests/test_audit.py` (data consistency), `tests/test_dca_ui.py` (browser test: band, slider, readout vs `audit.json`, keyboard, dashboard strip, offline state), `tests/mock_server.py` (`/audit` route).
