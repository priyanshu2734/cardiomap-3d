# Demo video: Cardiac Research Lab segment (3:00)

Narration is about 400 words at a calm 135-140 wpm. Numbers are from the shipped defaults (seed 0, 2 repeats, 1000 bootstraps) and match the methods note.

**Before recording:** start the app, open `/research-lab`, and run (or just press Run on) all five cards once. This zip ships the cache for default settings, so each card loads in under a second and says "Loaded the saved server result". Use 1360 px wide, dark theme; do one quick cut to light theme in the closing shot. Do not change the seed or the repeats on camera.

| Time | On screen | Narration |
|---|---|---|
| 0:00-0:20 | Page header and the four-step triage strip; disclaimer banner in view. | "A chest-pain patient arrives. Before anyone threads a catheter, can the data we already have tell us who is likely to have significant coronary disease, and in which artery? That is the Research Lab. It uses only non-invasive data. The angiogram result and the three vessel labels are never inputs, and the code checks that on every run. This is educational decision support, not a substitute for imaging." |
| 0:20-0:40 | Facts chips (303 patients, 53 features). Scroll the manifest on an open result (experiment id, seed, hashes). | "Every result is reproducible. Fixed seeds, nested cross-validation, bootstrap intervals on every number, and a manifest with the seed, time, library versions and a SHA-256 of the data and the code." |
| 0:40-1:10 | Card 1, target CAD then LAD; point at the whiskers and the "Within noise" pills. | "First question: which data actually helps? For overall CAD, demographics and history already reach an AUC of 0.90. Adding labs, ECG and echo moves it to 0.91, which is within noise. For LAD, echo adds about 0.05, the one gain here larger than chance. We say 'within noise' out loud: it means we cannot show a difference, not that none exists." |
| 1:10-2:00 | Card 3, target LCX. Learning curve, then class balance, then the reasons list with its two kinds of pills. | "Now the honest part. LCX and RCA are weaker: AUC 0.75 and 0.71, against 0.85 for LAD. LCX sits 0.10 below LAD and RCA 0.13 below, both beyond noise. Is it a small-sample problem? Class balance says only partly: the rarer class is about the same size for all three vessels. Would more patients help? For LCX, doubling the training data adds about 0.03; for RCA we cannot tell. Most LCX and RCA patients also have LAD disease, so general risk factors say little about which artery. Some of our explanations are measured here, and some are clinical reasoning we could not test. The page labels which is which." |
| 2:00-2:25 | Card 4; show the amber small-group warning, then the table. | "Do results hold by sex and age? This check is descriptive only. We show sample sizes, and the page warns when a group is small. In the seventy-plus group, CAD has only four negatives, so we refuse to compute an AUC. We run no tests, and we do not claim fairness." |
| 2:25-2:50 | Card 5; reliability curve, then the triage band bars. | "Can the scores be read as probabilities? Not literally. Of 128 patients scored eighty percent or higher, 126 had CAD. But of 15 scored below twenty percent, 3 still did. So the lab shows what actually happened in each band, and a low score does not rule disease out." |
| 2:50-3:00 | Flash to light theme, disclaimer banner, then the Architecture Map node for the lab. | "Five experiments, one rule: show the uncertainty, and say what it means for triage. The angiogram decides." |

**Likely questions, short answers**
- *Why is LCX/RCA performance lower?* Measured here: not mainly class balance; strong overlap with LAD disease. Not tested here: ECG/echo coarseness and label noise at the 50% cut-off.
- *Is this ready for clinical use?* No. Single referred cohort of 303, no external validation.
- *Why do some AUCs differ from the README table?* The lab uses all 53 non-invasive inputs and a different selection protocol; the dashboard uses 25 inputs.

**Do not say:** "accurate", "diagnoses", "detects", "proves", or any claim about subgroup fairness or about real-world accuracy.
