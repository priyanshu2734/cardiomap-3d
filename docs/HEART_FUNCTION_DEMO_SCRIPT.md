# Demo video: Heart Function Lab segment (2:00)

About 250 spoken words at a calm 125 wpm. **Before recording:** run one prediction on the dashboard first (so "your estimate" shows), then open `/heart-function` in dark theme. Keep the captions "Reference anatomy, not your heart" and "Simplified physics model, not patient-specific or clinical" in frame.

| Time | On screen | Narration |
|---|---|---|
| 0:00-0:15 | Dashboard result, then click Research > Heart Function Lab. | "Our model gives probabilities for the LAD, LCX and RCA. But what does a narrowing actually do to the heart? This page is for understanding that." |
| 0:15-0:35 | Beating heart; point at the caption and the mesh credit. | "This is reference anatomy from the Human Reference Atlas, not your heart. The dataset has no imaging, so we never claim to find a blockage. This is a teaching model." |
| 0:35-0:55 | Flow particles in the three arteries; toggle Rest and Exercise. | "Blood flows through the three coronary arteries and pulses with the beat, strongest between beats. Rest asks for a little flow; exercise asks for three and a half times more." |
| 0:55-1:20 | Select LAD, drag the narrowing to 70%. Flow card turns to Flow limiting; wall darkens; ECG ST segment drops. | "Add a 70% narrowing. Particles speed up in the throat and thin out beyond it. At rest the small vessels can compensate. In exercise they run out of room. The wall this artery typically feeds darkens and squeezes less, and the illustrative ECG shows ST depression." |
| 1:20-1:40 | Your estimate card; press "Use as starting point". | "Your estimate from the dashboard preselects the likeliest vessel and suggests a starting size. It is a starting point from the model, not a measured blockage, and it never changes the physics." |
| 1:40-1:50 | Open "How this works". | "Every equation and constant is on the page, so you can check the model." |
| 1:50-2:00 | History tab row; light theme; disclaimer banner. | "Each run is saved in History. Educational decision support, not a substitute for formal diagnostic imaging." |

**Likely questions, short answers**
- *Is this my heart?* No. Reference anatomy, simplified physics.
- *Does the model find the blockage?* No. The dataset has no images. You choose the position and size.
- *Why does exercise show an effect first?* Demand is higher while the small vessels have a fixed room to widen.
- *Why are LCX and RCA estimates less certain?* Weaker cross-validated AUC (0.73 and 0.71) than LAD (0.85), small sample.


## ~60-second phase-5 beat: patient inputs → bullseye → RWMA cross-check

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:10 | Dashboard: enter a patient pulse rate, EF and an RWMA count; run the existing prediction. Open Heart Function Lab. | “The lab now reads the dashboard snapshot. Here the heart rate and ejection fraction come from the values we entered, when they are usable. The page keeps the reference values available as a comparison.” |
| 0:10–0:20 | Show the physiology card and toggle Your values / Reference values. | “The pulse changes the beat timing and the illustrative diastolic pulse shape, while the flow model's mean flow stays the same. Ejection fraction changes the visible rigid-part motion. Stroke volume and cardiac output are illustrative and assume a fixed teaching end-diastolic volume.” |
| 0:20–0:32 | Show the 17-segment bullseye; select LAD, then focus a segment and show the matching 3D wall highlight. | “This is the same 17-segment territory table used elsewhere in CardioMap. Colour and symbols show the model estimate for the vessel that usually supplies each segment. This is typical territory, not a measurement of the segment.” |
| 0:32–0:45 | Mark two or three segments; show the hatch pattern and reduced local motion. | “Now I am marking reduced-motion regions myself. The dataset only records how many regions had RWMA, not which ones, so these marks are explicitly a teaching input. They stay in this page and do not feed the model.” |
| 0:45–0:55 | Show the RWMA cross-check, including model probabilities and 80% ranges if available. | “The cross-check compares my marked typical territories with the model's highest-ranked vessel. A match is described as consistent with the model ranking; a mismatch is described as different. Neither result establishes or excludes disease.” |
| 0:55–1:00 | Point to the caption/disclaimer. | “The key limit is simple: this dataset has no imaging and no segment-level RWMA locations. This is educational decision support, not a patient-specific map or a substitute for formal diagnostic imaging.” |

**Safety wording to keep visible:** “Reference anatomy, not your heart”; “Simplified physics model, not patient-specific or clinical”; and “Colour shows the model's estimate for the vessel that usually supplies each segment. It is not a measurement of that segment.”


## ~60-second phase-6 beat: predict → uncertainty → compare → traces

Use these exact dashboard inputs for a deterministic demo: **pulse 104 bpm, EF 35%, systolic BP 150 mmHg**. Keep the dashboard's `pr`, `ef` and `bp` inputs measured; then run the existing prediction before opening `/heart-function`.

| Time | On screen | Expected result | Line to say aloud |
|---|---|---|---|
| 0:00–0:08 | Dashboard with PR 104, EF 35, BP 150; run prediction | Heart Function later reads **104 bpm**, **35% EF**, and **150 mmHg systolic** from the id-keyed snapshot | “The lab reads the dashboard snapshot by field id, so these are the inputs driving the teaching animation.” |
| 0:08–0:18 | Open Heart Function Lab; select the predicted artery | Physiology card shows the input values, with illustrative **stroke volume about 42 mL** and **cardiac output about 4.37 L/min** from the fixed 120 mL EDV assumption | “Rate changes beat timing and pulse shape, while EF changes the visible motion. The output numbers are illustrative and assume a fixed teaching end-diastolic volume.” |
| 0:18–0:28 | Open **uncertainty sweep** and toggle Rest/Exercise | Three columns: Low end, Model estimate, High end; example narrowing is 0, 50 or 70% according to the existing teaching rule; states update with Rest/Exercise | “This is the model's own 80% range translated into example teaching states. It is not an anatomy range.” |
| 0:28–0:40 | Capture A; choose **Rest vs Exercise (same narrowings)** | A is Rest and B is Exercise; table shows flow, reserve, state and ST-depression deltas; selected-artery curve shows A/B markers | “Compare mode changes the configuration, not the patient data. The differences are outputs of the same simplified teaching model.” |
| 0:40–0:54 | Show **Cardiac cycle traces** | Four stacked traces: aortic/LV pressure, LV volume, ECG, selected-artery inflow; cursor follows the 104 bpm beat; Show values lists systolic/diastolic durations and EDV/ESV/SV | “These are synchronized illustrative traces built from the same rate, EF and blood-pressure inputs. The coronary trace responds to the teaching flow model; pressure and volume stay on their separate teaching equations.” |
| 0:54–1:00 | Point to captions and disclaimer | Visible captions include “Simplified physics model, not patient-specific or clinical” and the educational-use disclaimer | “This is educational decision support, not a patient-specific measurement or a substitute for formal diagnostic imaging.” |

**Expected numeric anchor for the sample:** with EF 35%, fixed EDV 120 mL gives SV ≈ **42 mL**; with HR 104 bpm, illustrative CO ≈ **4.37 L/min**. BP uses the entered 150 mmHg systolic value and the fixed 80 mmHg diastolic teaching assumption.

## ~45-second roadmap-items-6-and-5 beat: sequential narrowing → anatomy options

Use these exact dashboard inputs: **pulse 104 bpm, EF 35%, systolic BP 150 mmHg**. Run the dashboard prediction, then open `/heart-function`.

| Time | On screen | Expected result | Line to say aloud |
|---|---|---|---|
| 0:00–0:08 | Physiology card | About **42 mL SV** and **4.37 L/min CO** from the fixed 120 mL EDV teaching assumption | “The dashboard values drive the teaching beat, but the output numbers still use a fixed illustrative end-diastolic volume.” |
| 0:08–0:17 | LAD controls: set **50%**, then **Second narrowing = 60%** | In Exercise, the combined example is about **69.71% of demand**, with state **Flow limiting** and total pressure drop about **33.34 mmHg**; the distal example lesion contributes about **24.68 mmHg** | “Two example narrowings in series add resistance in this simplified model. They are assumed far enough apart not to interact.” |
| 0:17–0:27 | Switch to **Exercise** and point at the combined flow/chart marker | The existing single-lesion curve remains the reference curve; the live marker/card uses the combined effective result | “The reference curve stays single-lesion, while the live setting uses the two-lesion result.” |
| 0:27–0:36 | Flip to **Left-dominant** | Territory text and LCX/RCA teaching split change; LCX/RCA resting demand becomes about **82.73 / 47.27 mL/min**; PDA parent changes to **LCX** | “Dominance is a teaching option I choose here. It is not read from the patient's data.” |
| 0:36–0:43 | Raise **Collateral flow to 20%** | The same LAD example rises from about **69.71%** to **89.71% of demand** by adding about **63 mL/min**, without exceeding demand | “Collateral flow only fills the shortfall in this teaching model; it is not inferred and the lab does not model coronary steal.” |
| 0:43–0:45 | Point at the visible captions/disclaimer | Safety captions remain visible | “These are illustrative teaching controls, not patient-specific anatomy or clinical measurements.” |

**On-screen safety text to keep visible:** “Reference anatomy, not your heart”; “Simplified physics model, not patient-specific or clinical”; and the existing educational decision-support disclaimer.

