# Myocardial Territory Map

## What it is

CardioMap's **Myocardial Territory Map** is a front-end-only 17-segment polar (bullseye) map placed directly below the interactive coronary explorer in the main dashboard. It colours each segment with the exact `res[target].p` for the artery's **typical** territory and keeps the map selection synchronized with the existing LAD/LCX/RCA selection path.

This is a schematic population-typical perfusion map. The dataset contains vessel-level labels (`LAD`, `LCX`, `RCA`, `Cath`) and no segment-level lesion locations, so the map **does not locate lesions, infarct size, or myocardium-at-risk** and does not average or sum probabilities.

## Segment model

The implementation stores the complete mapping in one auditable constant, `CM_SEGMENTS`, in `index.html`:

| # | Segment | Ring | Typical vessel | Variable vessel |
|---:|---|---|---|---|
| 1 | Basal anterior | basal | LAD | — |
| 2 | Basal anteroseptal | basal | LAD | — |
| 3 | Basal inferoseptal | basal | RCA | — |
| 4 | Basal inferior | basal | RCA | — |
| 5 | Basal inferolateral | basal | LCX | RCA |
| 6 | Basal anterolateral | basal | LCX | — |
| 7 | Mid anterior | mid | LAD | — |
| 8 | Mid anteroseptal | mid | LAD | — |
| 9 | Mid inferoseptal | mid | RCA | — |
| 10 | Mid inferior | mid | RCA | — |
| 11 | Mid inferolateral | mid | LCX | RCA |
| 12 | Mid anterolateral | mid | LCX | — |
| 13 | Apical anterior | apical | LAD | — |
| 14 | Apical septal | apical | LAD | — |
| 15 | Apical inferior | apical | RCA | LAD |
| 16 | Apical lateral | apical | LCX | LAD |
| 17 | Apex | apex | LAD | RCA or LCX |

Counts are LAD = 7 segments (1, 2, 7, 8, 13, 14, 17), RCA = 5 (3, 4, 9, 10, 15), LCX = 5 (5, 6, 11, 12, 16).

The project prompt's mapping was checked against the 2002 AHA/Cerqueira 17-segment nomenclature and later summaries. The equal-count 7/5/5 typical assignment is consistent with published descriptions of the AHA benchmark assignment, while the literature also emphasizes substantial anatomic variability in actual coronary supply. The implementation therefore marks the prompt's variable segments explicitly instead of presenting the typical assignment as patient-specific anatomy. [Cerqueira et al., Circulation 2002;105:539–542.]

Reference: **Cerqueira et al., “Standardized Myocardial Segmentation and Nomenclature for Tomographic Imaging of the Heart,” Circulation, 2002.**

Orientation follows the standard bullseye convention requested for this feature: **Anterior top, Inferior bottom, Septal left, Lateral right.**

## Geometry

SVG geometry is generated in JavaScript rather than hand-drawn paths. The viewBox is `0 0 320 320`, centre `(160,160)`, with basal radii 140→100, mid 100→62, apical 62→26, and the apex as a central `r=26` circle. Six 60° sectors are used for basal and mid rings, four 90° sectors for the apical ring, and a visual gap is inset between neighbouring segments.

## Colour and uncertainty

Segment fill is always computed from the existing `lvl(res[vessel].p)` helper, so the territory map uses the same Low / Moderate / High thresholds and colours already used by the heart and chips. No vessel probabilities are blended or averaged.

When the API returns a bootstrap interval, the map adds:

- solid fill = `narrow range`
- light diagonal hatch = `moderate range`
- denser diagonal hatch = `wide range`

When `interval` is unavailable, the map removes hatch overlays and displays **“Uncertainty ranges need the API.”**

Variable territories use a dashed outline and a `~` marker with explicit alternative-supply wording in tooltips and `aria-label`s.

## Selection sync

The map exposes a single `window.cmTerritoryPaint` function. The existing `paint()` function has exactly one additive hook at its end:

```js
if(window.cmTerritoryPaint)cmTerritoryPaint();
```

Selecting a map segment runs the existing selection path:

```text
segment click/Enter/Space
  → sel = typical vessel
  → paint()
  → syncSelectedVesselToParent()
```

The existing coronary chips, tabs, 3D raycaster selection and parent-frame message listener therefore remain the source of truth. A vessel selected elsewhere repaints the map and dims non-matching territory segments.

## RWMA honesty rule

The existing `v.rwma` value is read through the same form state used by the dashboard. The card shows the **count only** as `RWMA regions: N`. It explicitly says: “The dataset records how many regions, not which ones, so this is not placed on the map.”

## Required limits / wording

The card contains these exact visible statements:

> Schematic, population-typical perfusion territories (AHA 17-segment model). Not a lesion location, not infarct size, and not a diagnosis. Territories vary with coronary dominance.

> Decision support and educational use only; not a substitute for formal diagnostic imaging.

> Segment model: Cerqueira et al., Circulation 2002.

## Testing

The main visual test is `tests/visual_qa/territory.py`. It uses the existing Playwright harness and Three.js stub, injects deterministic `/predict` payloads, checks all 17 segments, 7/5/5 vessel counts, centroid hit testing, threshold colours, bidirectional selection, keyboard operation, uncertainty hatching, variable-supply labeling, neutral pre-prediction state, required text, and horizontal overflow across 1360, 1024, 768 and 390 px in light and dark themes.

Run with the project's mock server on port 8000:

```bash
python tests/mock_server.py 8000
python tests/visual_qa/territory.py
```

The existing regression suite should still be run as well:

```bash
python tests/visual_qa/qa2.py territory_regression
```

## Zero-new-network-request rule

The feature uses only inline SVG, CSS and vanilla JavaScript. It adds no external scripts, fonts, images, CDNs, API endpoints, or network requests. It consumes the existing `/predict` payload already used by the dashboard.
