# Task 3 + 4: chip cards and halo legibility

## Chips (#chips, index.html)
- Each `.chip` is now a two-row card. Row 1: `.chip-name` (LAD) + `<b>` probability. Row 2 (`.chip-bot`): `.range-readout` ("range 27-45%"), `.range-label` (range_label), `.mini-range` bar.
- The risk-level words ("High risk") moved into a visually hidden `.chip-sr` span so screen readers still get them.
- Kept: `.chip`, `data-t`, `aria-pressed`, `.range-readout`, `.mini-range`, `.range-segment`, `.range-tick`, click handler.
- No ellipsis/overflow on these texts: `white-space:nowrap; overflow:visible`, the bar takes the leftover space (min 28px).
- Offline fallback ("Uncertainty ranges need the API") wraps instead of truncating.
- Measured with real model output: no clipped element and no page scroll at 1360, 768 and 390 px.

## Halo (index.html `buildHalo`, `haloScale`)
- Extra radius = 0.014 (narrowest) .. 0.15 (widest), piecewise-linear through the model's width_cutoffs
  (narrow label <= 30% of the scale, moderate <= 60%, wide above; top of the scale = max(0.6, c2+0.1)).
  Falls back to linear width/0.6 when cutoffs are absent.
- Observed widths in this model (dataset rows): LAD .094-.581, LCX .118-.605, RCA .011-.867.
  Root-radius ratio widest/narrowest: LAD 2.2x, LCX 2.2x, RCA 2.6x; distal 2.9x-3.8x.
- Opacity unchanged (.25). Max halo root radius .216 (was .286).
- Depth: depthTest true, depthWrite false, polygonOffset (-2,-2), renderOrder 3 (after the heart and vessels).
- API (additive): `interval.width_cutoffs = [c1, c2]` in core.interval(); no other API change.

## Not verified here
The three.js CDN is unreachable in the sandbox, so the WebGL scene could not be rendered. Front/side/back halo
checks must be done in a normal browser.

# Task 5 + 6: model label and light-theme toolbar

## #modelName (index.html `cmModelLabel()`)
- Reads `res.model.CAD` (the API returns `{target: ClassName}`), not the undefined `res.CAD.model`.
- GradientBoostingClassifier -> "Gradient boosting", RandomForestClassifier -> "Random forest", LogisticRegression -> "Logistic regression"; unknown class names are de-camel-cased.
- Offline (`src==="export"` or no result) -> "Offline logistic export"; API result without `model` -> "Model unavailable".
- Verified against the mock server: online "Gradient boosting", offline "Offline logistic export".

## Light-theme toolbar
- `#loadReference` in light: text #064a58 on a teal tint (was #dffcf9, contrast 1.07:1, now 8.45:1), border #0a8aa0 (3.5:1). Dark theme unchanged.
- All toolbar buttons get a stronger light-theme border (rgba(6,90,110,.5), about 2.3:1); Confidence halo uses #b9741a (3.2:1).
- Measured text contrast (sampled behind translucent buttons, no 3D canvas): light 8.5-14.4:1, dark 12.8-14.4:1 for all five buttons. Disabled Confidence halo: 3.0:1 light / 4.5:1 dark (disabled controls are exempt).
- Dark-theme borders are faint (1.4-1.9:1); left as is, the labels carry the contrast.
