# Cardiac Research Lab: methods and findings

**Question.** Using only non-invasive data, how well can we rank which chest-pain patients likely have significant CAD (at least 50% stenosis) and in which vessel (LAD, LCX, RCA) before an invasive angiogram? Results are framed as triage support, not diagnosis; educational decision support, not a substitute for formal diagnostic imaging.

**Data.** Z-Alizadeh Sani coronary artery disease dataset (UCI), 303 patients already referred for angiography: CAD 216 (71%), LAD 177, LCX 119, RCA 114 positive. 53 non-invasive inputs: demographics and history, vitals, labs, ECG, echo.

**Leakage control.** Cath, LAD, LCX and RCA are never inputs. This is asserted in `core.py`, asserted again on every run before any model is fitted, and the four feature groups must partition the input columns exactly. Imputation and scaling are fitted inside training folds.

**Validation.** Stratified nested CV: outer repeated 5-fold (2 repeats, seed 0, identical splits for every comparison); inner stratified 3-fold ROC-AUC selection on the training part only; out-of-fold probabilities averaged over repeats; threshold 0.5. 95% CIs are percentile bootstraps over patients (1000 resamples, shared across options, so differences are paired). A difference is "within noise" when its paired CI includes 0. Every result carries a manifest (experiment id, parameters, seed, UTC time, SHA-256 of data and code, library versions).

**Experiments and key results** (ROC-AUC, 95% CI)

| Experiment | Finding |
|---|---|
| 1. Feature-group ablation | CAD: demographics and history alone 0.90 (0.86-0.94), all data 0.91 (0.87-0.94), within noise. LAD 0.78 (0.72-0.83) to 0.85 (0.80-0.89); the echo step (+0.05) is the only gain beyond noise. LCX 0.71 to 0.75 and RCA 0.71 to 0.71 are within noise. |
| 2. Model comparison | CAD: logistic regression 0.93 (0.90-0.96), forest and boosting 0.92, no clear winner. LCX: random forest 0.74 (0.69-0.79) beats logistic regression 0.68 (0.62-0.74). RCA: logistic regression 0.74 (0.69-0.80) beats boosting 0.69 (0.62-0.75). Both beyond noise. |
| 3. Weak vessels | LCX 0.75 (0.69-0.80) and RCA 0.71 (0.65-0.77) sit below LAD 0.85 (0.80-0.89): differences -0.10 (-0.16 to -0.03) and -0.13 (-0.20 to -0.07), beyond noise. The rarer class is similar for all three (114-126 patients), so class balance alone does not explain the gap; 76-81% of LCX/RCA-positive patients also have LAD stenosis. Fold AUC SD: LCX 0.06, RCA 0.04, LAD 0.03. Doubling training data (50% to 100%) added +0.03 for LCX (+0.01 to +0.06; last step within noise) and +0.02 for RCA (-0.01 to +0.04, within noise). |
| 4. Subgroups (descriptive) | CAD AUC: female 0.95 (0.91-0.98), male 0.88 (0.82-0.93); age bands 0.85 (60-69) to 0.93 (50-59); the 70+ band has 4 negatives, so its AUC is withheld. LCX AUC ranges from 0.80 (50-59) to 0.48 (0.31-0.62) at 70+. Under-50 LCX/RCA groups (11-12 positives) are flagged small. No tests between groups. |
| 5. Calibration | CAD Brier 0.11 (0.10-0.13) against 0.20 for giving everyone the cohort average. Scores are under-confident (slope 1.71, 1.36-2.24; average predicted 66% vs 71% observed). Of 128 patients scored 80%+, 126 (98%) had CAD; of 15 scored below 20%, 3 (20%) did, so a low score does not rule CAD out. LCX/RCA Brier skill is small (0.15, 0.12). |

**For triage.** Non-invasive data rank overall CAD well, LAD moderately, LCX and RCA weakly; treat LCX/RCA output as weak hints. Read scores as risk orderings and use observed counts per band, not the raw percentage. The angiogram decides.

**Limitations.** Single referred cohort (71% CAD), no external validation, so results will not transfer to an unselected chest-pain population. n = 303 gives wide intervals (about +/-0.06 for LCX/RCA, wider in subgroups). CIs resample out-of-fold predictions, omit retraining variability and are not multiplicity-corrected. The lab uses 53 inputs, not the dashboard's 25, so numbers differ from the deployed model. Balanced class weights distort raw probabilities; no recalibration applied. The learning curve stops at about 80% of the cohort. Some reasons given for weak LCX/RCA ranking are clinical reasoning this data cannot test (labelled as such on the page).

**Ethics and safety.** Public de-identified data; saved runs and History stay in the browser. The disclaimer is visible on the page. Subgroup output is descriptive, not evidence of equal performance. Uncertainty is shown for every number. Use is limited to education and research; clinical use would need prospective external validation and clinician oversight.
