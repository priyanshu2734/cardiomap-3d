# Heart Function Lab: methods and limits

*One page for the 6-page hackathon document. Page: `/heart-function` (Research menu). Captions on the page: "Reference anatomy, not your heart" and "Simplified physics model, not patient-specific or clinical".*

**What it is.** A teaching page. A reference 3D heart beats, blood particles move through the LAD, LCX and RCA, and the user adds a narrowing to one artery to see what happens to flow and to the wall that artery typically feeds. The dataset (Z-Alizadeh Sani, 303 rows) is tabular only, so the page never detects or locates a lesion on the user's own heart and has no scan upload.

**What is real.**
- *Anatomy:* the HuBMAP Human Reference Atlas male heart mesh, used as published apart from centring, scaling, hiding internal valves and papillary muscles, and moving the chambers as rigid parts. 127,178 of 164,119 triangles are drawn (budget 150,000).
- *Cardiac timing:* 72 bpm, a beat of 0.833 s, systole in the first 35% and diastole after, which are typical textbook fractions (not measured).
- *Flow-resistance relationships:* Poiseuille friction (resistance proportional to length / radius^4), a viscous plus turbulent pressure drop across a narrowing (dP = Rv Q + Rt Q^2), continuity (speed = flow / lumen area), and small vessels that widen to hold flow until their reserve is used up. The shapes of these relationships are standard physics; the numbers in them are not measurements.

**What is simplified or illustrative.**
- All radii, lengths, pressures and resting flows are round teaching values. One or two example narrowings per artery can be shown; the second-lesion extension is a series-resistance teaching model. Named branches, dominance and collateral flow are optional teaching controls, not measured anatomy. The same driving pressure is used at rest and exercise in the base coronary model.
- The coronary tubes are schematic paths placed by hand along the heart's surface grooves, because the mesh has no labelled coronaries. They are not patient anatomy.
- The chambers move as rigid parts and the squeeze is exaggerated.
- The wall effect uses the typical territory pattern (LAD anterior and towards the apex, LCX lateral, RCA inferior and right ventricle). Dominance can now switch between one tested right- and left-dominant teaching row; the rows are labels and share weights, not population estimates. Darkening of up to 55% and a squeeze weakened by up to 30% are teaching amounts.
- The ECG is one invented lead; ST depression of up to 0.30 mV scales with severity and is illustrative.
- The colour bands (green below 50%, amber 50 to 69%, red from 70%) follow this dataset's 50% rule for calling a vessel narrowed. They are not a clinical grading.

**What the model contributes.** Only the user's estimate from the dashboard (LAD, LCX and RCA probabilities, the 80% range when present, and the top SHAP drivers for the selected artery), read from the browser's saved case and never sent anywhere. It preselects the artery with the highest probability and offers a suggested starting narrowing (probability 0.65 or more: 70%; 0.40 to 0.65: 50%; lower: none). The suggestion applies only when the user presses "Use as starting point", and the page says "A starting point from the model, not a measured blockage". The estimate never changes the physics. For context, the model's cross-validated ROC-AUC is 0.85 for LAD but only 0.73 for LCX and 0.71 for RCA, so the weaker vessels deserve extra caution.

**Mesh attribution.** HuBMAP Consortium / Human Reference Atlas, 3D Reference Object Library, release CCF/HRA v1.2, male heart (VH_M_Heart), licensed CC BY 4.0. Source: https://github.com/hubmapconsortium/ccf-releases/tree/main/v1.2/models. Author, source URL, licence and file checksum are recorded in `static/models/heart_function_mesh.json` and shown on the page. The mesh route serves only the file named in that manifest, only as .glb or .gltf, and refuses any other name or path.

**Limitations.**
1. Not patient-specific and not clinical: nothing here measures or predicts a real person's flow or wall motion.
2. No imaging in the data, so a blockage position and size are always chosen by the user, never found by the model.
3. LCX and RCA estimates are weak (small sample, single referred cohort, no external validation).
4. The 3D wall shading needs Three.js r128 from a CDN; it was not rendered in the build sandbox and should be checked once in a real browser.
5. Browser layout/contrast checks are intended for Chromium at 1360, 768 and 390 px in both themes; in this sandbox Chromium was unavailable, so those checks were not claimed as passed. Firefox, Safari and screen readers were not tested.

*Educational decision support, not a substitute for formal diagnostic imaging.*

## Physics versus data: what the two panels answer

The **flow curve** is a simplified, live teaching model. For each selected artery it reuses `CoronaryFlow.solve()` to draw capacity, delivered flow at Rest, and delivered flow at Exercise as narrowing goes from 0% to 99%. The displayed rest/exercise thresholds come from the module's `toleratedNarrowing()` calculation; they are **model outputs, not clinical cut-offs**. The curve is captioned: “Simplified physics model, not patient-specific or clinical”.

The **cohort check** is a separate descriptive calculation over the 303 referred patients in `data.xlsx`. It splits patients only by whether the selected vessel is recorded as narrowed at **at least 50%** in the angiography-derived target and reports counts, rates and Wilson 95% intervals for the fixed finding whitelist that is present in the leakage-free input frame. The current whitelist is ST depression, Q wave, T inversion, poor R progression, regional wall-motion abnormality, and reduced ejection fraction (EF-TTE below the fixed 50% descriptive cut-off). The API returns aggregates only; patient-level rows never leave the server. The panel is captioned: “Descriptive rates in 303 referred patients; not a validation of the physics model and not a prediction for your heart”.

These panels answer different questions: **physics shows what narrowing does in theory; data shows what was recorded in this cohort.** The cohort check never changes the narrowing controls, never calls the simulation update path, never feeds a model, and is not presented as proof that the physics is right.

## What the cohort data can and cannot show

**It can show:** how common a recorded finding was in the narrowed versus not-narrowed groups of this single referred cohort, with the group size, observed count, rate and Wilson 95% interval. A sparse-finding flag is shown when fewer than 5 patients in a group have the finding. An amber small-group warning is shown for groups with fewer than 20 patients (this warning is exercised by synthetic test frames; the actual 303-row cohort groups are not below 20).

**It cannot show:** causation, validation of the physics model, lesion location or morphology on a user's heart, benefit of treatment, performance in the general population, or externally validated clinical risk. It does not provide p-values as evidence of validation. The dataset is one referred population, so the observed rates should not be read as prevalence in the community. LCX and RCA groups are smaller than LAD and are explicitly treated as weak estimates with wider uncertainty.

The vessel label used for the cohort split is angiography-derived. Findings are taken only from columns available in the leakage-free input frame; angiography-derived/leakage columns excluded by the project's existing leakage rule are never used as findings. This keeps the cohort check descriptive rather than turning the target itself into an input feature.

## Limits to keep visible in a demo

The heart mesh is reference anatomy, not a patient's anatomy. The tubes are schematic, the physiological values are round teaching values, and the wall/ECG responses are illustrative. “Your estimate” can only preselect a vessel and suggest a starting narrowing from the browser's existing prediction snapshot; it cannot detect or locate a lesion. No scan is uploaded or interpreted. The entire page remains **educational decision support, not a substitute for formal diagnostic imaging**.



## Phase 5: patient-driven physiology, 17-segment companion, and RWMA teaching overlay

### What is real

- The dashboard snapshot is the user's existing browser-side `cm-case-v1` case. The Heart Function Lab reads it only; it does not write a new case or make a server request for these features.
- The lab uses `PR` only when it is present, finite, between 40 and 130 bpm, and not in the snapshot's not-measured set. Otherwise it uses the reference 72 bpm.
- It uses `EF-TTE` only when it is present, between 15% and 65%, and not marked not-measured. Otherwise it uses reference EF 60%.
- The 17-segment table is the existing `CM_SEGMENTS` table used elsewhere in CardioMap. The Heart Function Lab reuses it rather than creating a second territory table.
- The 3D segment assignment is calculated per LV/septum vertex when the wall meshes are built. It is not recalculated on every animation frame.

### Teaching-only physiology

`static/heart-physio.js` deliberately keeps the flow equations in `static/coronary-flow.js` unchanged.

- Reference motion corresponds to EF 60%; the displayed contraction factor is `clamp(EF,15,65) / 60`.
- Stroke volume is `120 mL × EF / 100`. The 120 mL end-diastolic volume is a fixed illustrative constant, not a measurement from the dashboard.
- Cardiac output is stroke volume × heart rate and is shown in L/min.
- Higher heart rate shortens the diastolic fraction through a simple monotonic timing rule. The coronary pulse is renormalized to a beat mean of exactly 1, so changing heart rate changes timing/shape but not the underlying mean coronary flow.
- The existing local wall weakening from the narrowing model remains multiplicative with the EF-driven rigid-part amplitude. The maximum local weakening from the existing wall model remains 30%.

These are teaching relationships. They are not a patient-specific cardiac-output calculation or a clinical assessment.

### 17-segment display

The bullseye is a 2D companion to the 3D reference heart.

- Segment colour represents the model estimate for the vessel that **usually** supplies that segment.
- The dashboard's existing bands are reused: Low `<0.40`, Moderate `0.40–<0.65`, High `≥0.65`, with symbols `●`, `◆`, and `▲` so colour is not the only cue.
- Segments with alternate supply show a visible `V` / "supply varies" cue.
- A focus or hover on a segment highlights the corresponding 3D wall region. This is a teaching visualization of the typical territory, not a measurement of the myocardium.
- The 3D vertex map leaves the right ventricle and atria unaffected by user RWMA marks.

### User-marked RWMA overlay

The Z-Alizadeh Sani dataset records a **count** for `Region RWMA`; it does not identify which of the 17 segments had reduced motion. Therefore:

1. The dashboard count is displayed as reported, when available.
2. The user explicitly marks one or more bullseye segments as a teaching input.
3. A marked segment receives at most a 50% reduction in its local rigid-part wall motion.
4. Marks exist only in page memory. They are not written to `cm-case-v1`, are not sent to the server, and are not model inputs.
5. "Consistent with the model's highest-ranked vessel" means only that at least one marked segment's usual vessel is the model's highest-ranked vessel. "Marked territory differs from the model's ranking" means the reverse. Neither statement establishes or excludes disease.

If the dashboard has no usable prediction or no marked segments, the cross-check reports **"Not enough information"**. If the number of marked segments differs from the dashboard RWMA count, the page shows a neutral information note. The count mismatch does not imply an error because the dataset never records segment identities.

### What the data cannot show

The 303-row tabular dataset has no imaging and no segment-level RWMA location. It cannot:

- locate, measure, or characterize a lesion on a user's heart;
- identify which myocardial segment had RWMA;
- establish that a marked territory was caused by a vessel narrowing;
- validate the teaching physics model;
- turn a typical territory into patient-specific anatomy;
- establish causation from the descriptive associations.

The 17-segment overlay, user marks, model probabilities, flow curve and physiology readout therefore answer different educational questions. None is a substitute for formal diagnostic imaging or clinical assessment.

**Phase 5 audit fixes (found by testing against a dashboard-shaped snapshot):**
- The dashboard stores `vals` and `nm` by field **id** (`pr`, `ef`, `rwma`); the lab looked them up by dataset **column** (`PR`, `EF-TTE`, `Region RWMA`), so with a real snapshot the heart rate, EF and RWMA count silently fell back to reference values. `HeartPhysio.normaliseCase()` now maps ids to columns through the snapshot's own `ui` table (column keys still pass through).
- The RWMA cross-check was passed the whole estimate object instead of the probabilities, so it always compared against LAD. `HeartSegments.concordance()` now accepts the `parseCase()` shape or a flat map, and refuses to guess from non-numeric values.
- The ECG now scrolls with the active beat length (it was fixed at 72 bpm), and the beat phase is kept when the rate changes.
- Marked segments keep their risk-band colour under a hatch overlay (before, the hatch replaced the fill); the bullseye `<svg>` is `role="group"` (an `img` role hides its focusable segments from assistive technology); one low-contrast label was darkened.
- History no longer drops a second Heart Function run whose marked segments differ but whose counts and estimate match.
- Tests now use a realistic snapshot (ids, `ui` table) so these cannot regress; the browser QA measures every text node instead of the container colour. Not run here: the 3D wall shader (Three.js r128 is loaded from a CDN, unreachable offline), and the FastAPI HTTP routes.


## Phase 6: uncertainty sweep, synchronized traces, and Compare

### Uncertainty sweep

`static/heart-uncertainty.js` consumes the parsed estimate shape from `HeartEffects.parseCase()`. When an 80% interval is present it clamps the low/middle/high probabilities into order, applies the existing `HeartEffects.suggest()` rule, and runs the existing `CoronaryFlow.solve()` function at the current Rest/Exercise mode. The result is three example states, not three anatomical measurements. The card is read-only and never writes `NARROW` or calls `flowUpdate()`.

The three example probabilities are therefore a teaching range around the model output. A missing interval produces only the middle example. A non-numeric estimate produces the existing empty-state wording.

### Wiggers-style traces

`static/heart-wiggers.js` reuses `HeartPhysio.timing()`, `HeartPhysio.squeeze()`, `HeartPhysio.pulseFactor()`, `HeartEffects.ecg()` and the current `CoronaryFlow.solve()` result. The traces are drawn from the active dashboard-shaped snapshot: PR is read from id `pr`, EF from id `ef`, and systolic BP from id `bp`, all through `HeartPhysio.normaliseCase()`. BP is accepted only when it is finite, 80–200 mmHg and not marked not-measured; otherwise the card uses a 120 mmHg reference systolic value. Diastolic pressure is a fixed 80 mmHg teaching assumption, capped at systolic minus 25 mmHg.

LV volume uses the same fixed teaching EDV of 120 mL and the same EF and squeeze function used by the physiology card, so the trace cannot silently invent a second stroke-volume calculation. The pressure functions are analytic teaching curves with explicit systolic/diastolic boundaries. Pressure shape: LV pressure rises from a small diastolic teaching value to the aortic diastolic value during a short isovolumic phase (0 to 18% of systole), equals aortic pressure during ejection (18% to 85% of systole), then falls back to the small diastolic value by the end of relaxation. Aortic pressure stays at its diastolic value until ejection starts, peaks at the systolic input at 58% of systole, eases to a small notch level (8% of pulse pressure) and decays to diastolic by phase 0.88. Both curves are continuous and periodic; the tests sample them at 40, 72, 104 and 130 bpm to check this. The coronary-inflow trace multiplies the selected artery's current flow share by the mean-1 beat pulse factor, so the heart-rate change affects timing and pulse shape without changing the underlying mean flow.

The canvas uses a cached static bitmap. It is rebuilt only when the active inputs, theme or size change; animation moves only the shared beat cursor. The cursor uses `ACTIVE_PHYS.timing.beatSec`, not a fixed 72 bpm period.

### Compare Mode

`static/heart-compare.js` compares two configurations of the same teaching model. Each configuration contains the three narrowings and Rest/Exercise mode. For every artery it reports the existing `CoronaryFlow.solve()` flow and reserve values, `HeartEffects.severity()`, and the existing ST-depression calculation. Deltas are explicitly computed as **B minus A**, so reversing the comparison reverses every delta.

Capture A is page memory only. The two presets are `Rest vs Exercise (same narrowings)` and `No narrowing vs current`. The selected-artery SVG overlay reuses the existing `CoronaryFlow.curve()` points and adds A/B markers. Compare actions are deliberately not logged to the existing `heartfn` History kind; settled Heart Function configurations keep their existing History behavior.

### Phase 6 limits

These three additions remain teaching views over the existing model. The uncertainty range is not a measured blockage range; the Wiggers card is not a haemodynamic monitor; the comparison is not a clinical A/B test. The dataset remains tabular only and contains no imaging, so none of these views establishes lesion anatomy or segment-specific patient anatomy.

## Roadmap items 6 and 5: sequential narrowing and anatomy options

### Sequential two-lesion model

`static/coronary-flow2.js` is an additive pure solver. Lesion 1 uses the existing vessel `at` position; lesion 2 uses `min(0.86, at + 0.30)`. The fixed separation is a teaching choice intended to leave at least a simple length gap between the example lesions. The two lesions are assumed far enough apart that there is **no pressure-recovery or shared-jet interaction** between them.

For two active example narrowings, the series resistance is represented as:

`Rp = 8 μ (L − 2Ls) / (π r0^4)`

`dP = (Rv1 + Rv2) Q + (Rt1 + Rt2) Q² + (Rp + rmin) Q`

where each lesion uses its own narrowed area `As` against the healthy area `A0`, and `rmin` is still derived from the healthy artery. The capacity calculation is the positive root of the resulting quadratic. With lesion 2 at 0%, the implementation delegates to the original single-lesion solver, which is why the default result stays numerically unchanged.

### Dominance and named branches

`static/heart-anatomy.js` contains one tested **typical textbook teaching pattern** table:

| Teaching pattern | LAD share | LCX share | RCA share |
|---|---:|---:|---:|
| Right-dominant (current default) | 0.45 | 0.29 | 0.26 |
| Left-dominant | 0.45 | 0.35 | 0.20 |

Both rows sum to 1.0. The right-dominant row is the current default and is not presented as a population percentage. The left-dominant row only reweights the teaching demand split and shifts the usual territory text for the inferior/inferolateral teaching segments; it is not inferred from the dashboard because the dataset has no dominance field.

The named side branches are schematic: diagonal (LAD, origin 0.48, parent-demand share 0.20), obtuse marginal (LCX, origin 0.55, share 0.25), and PDA (origin 0.78, share 0.35). PDA is assigned to RCA in the right-dominant teaching pattern and to LCX in the left-dominant teaching pattern. The tested left-dominant segment overrides are segments 4, 10 and 15 to LCX, layered on the existing `CM_SEGMENTS` table rather than replacing it. The UI uses a keyboard-accessible list and a 2D schematic. Branch size, origin and share are not measurements, and no branch-specific narrowing is inferred from the dashboard.

### Collateral flow

The collateral control is a teaching parameter `c` from 0 to **0.35**. Effective flow is:

`effective flow = antegrade flow + min(c × demand, demand − antegrade flow)`

with the shortfall floored at zero. Therefore collateral flow can only fill a gap and can never raise delivered flow above 100% of demand. Collateral is not read from the dashboard and is not inferred from the dataset. The lab does not model coronary steal.

### Shared-flow consistency

The effective result from `heart-anatomy.js` is the source used by the flow card, particles, chart marker, wall/ECG severity path, Compare Mode and the Wiggers coronary-inflow trace. The uncertainty sweep keeps its probability-to-narrowing rule unchanged and, on the PRIMARY gate path, evaluates the resulting example narrowing through the same effective-flow function while holding second narrowing, dominance and collateral fixed.

### Decision gates

**Gate S — PRIMARY.** S1 passed: default sweep values stay equal to the earlier sweep. S2 passed across a grid of arteries, Rest/Exercise, second narrowings, dominance and collateral: the sweep middle point matches the effective flow result. S3 passed: `HE.suggest()` keeps its existing parsed-estimate call shape. S4 passed: the added context line contains no banned diagnostic wording.

**Gate H — ELSE.** H1, H2 and H4 passed: existing `heartfn` recorder/dedupe behavior and default input shape remain unchanged, and no new History kind or localStorage key exists. H3 was **NOT RUN** because the browser History rendering check was unavailable in this sandbox. Per the gate rule, the new anatomy/second-lesion/collateral settings are therefore not logged. Settled Heart Function logging remains the existing `heartfn` behavior, and Compare actions remain unlogged.

### What is not modelled by these options

The series-lesion model does not represent interacting jets, pressure recovery, plaque geometry or lesion-to-lesion coupling. The dominance table is not a patient-specific anatomical classification. Branches are schematic side paths, not labelled vessels from the mesh, and their shares are teaching constants rather than measured perfusion fractions. Collateral flow does not model donor-artery steal, recruitment dynamics or collateral anatomy. None of these controls can establish the anatomy of a person's heart from this tabular dataset.

