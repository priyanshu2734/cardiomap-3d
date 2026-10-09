# Multi-vessel territory overlay ("Show all coronary territories")

Where: `index.html` only (territory map IIFE, CSS next to `.terr-*`, checkbox `#terrAll` in the Territory card). No new libraries; backend/API/model untouched.

Behaviour
- Off by default; map unchanged when off. When on, fills show the artery that *typically supplies* each segment (LAD/LCX/RCA colours = the 3D vessel colours), not risk. The range-hatch overlay is hidden in this mode.
- Segments with `alt` supply in `CM_SEGMENTS` (5, 11, 15, 16 and apex 17) get diagonal stripe patterns built from that data: typical artery + alternate(s). Apex = three bands. Segment 14 is LAD-only in this data (AHA standard), so it is solid, not striped.
- Non-colour cue: each segment shows its vessel code. Dashed outline still means supply varies.
- Selecting a vessel highlights every segment it typically or alternatively supplies; others dim.
- Legend swaps to a supply legend (solid, striped, three-stripe, dashed) with a "not risk" note.
- A11y: checkbox has label + help text; map description starts "Multi-vessel myocardial territory map - hover or focus on each region to see supplying arteries." and lists segments per artery; segment aria-label/tooltip read "Typical supply ... not a risk estimate"; announcement via existing `#terrLive`.

Verification (stub THREE, no 3D needed): `python tests/visual_qa/territory_all.py` - 1360/768/390 px x light/dark, all pass; screenshots `tests/verification_previews/territory_all_*.png`.
Not verified: stripe colour-contrast ratios were not measured numerically (app's existing vessel colours plus the vessel code as a second cue). Legacy `tests/visual_qa/territory.py` times out on a click both before and after this change in this sandbox, so it was not a usable baseline.

## Contrast check (measured, WCAG 2.x formula)
- Raw adjacent stripe colours were only 1.2-1.5:1 apart (LAD/LCX 1.49, LAD/RCA 1.21, LCX/RCA 1.24), too low to rely on colour alone. Fix: 1.1px dark (#0b2a3a) separators between stripe bands (pattern + legend swatches), segment outlines use `--muted` in this mode, and each segment keeps its vessel code as a text cue.
- Segment fill vs light panel is 1.7-2.5:1 for the raw vessel colours, which is why the outline is added (muted vs light panel 5.3:1). Dark theme fills are 6.4-9.5:1.
