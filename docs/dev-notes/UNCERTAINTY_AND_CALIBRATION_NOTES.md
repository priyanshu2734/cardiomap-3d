# Confidence Heart — Uncertainty & Calibration Notes

## What was added

The Confidence Heart adds a bootstrap model-variability range to every CAD/LAD/LCX/RCA prediction. The primary fitted models and headline probabilities are preserved; the bootstrap replicas are an additive uncertainty layer.

The dashboard uses the range in two ways:

- vessel colour continues to use the existing `lvl()` probability palette;
- a translucent halo grows with the returned bootstrap width and can be toggled with **Confidence halo**.

A numeric `lo–hi%` range is always shown next to vessel probabilities so meaning does not depend on colour.

## Bootstrap method

`build_uncertainty.py` accepts:

```text
python build_uncertainty.py data.xlsx [--B 60] [--seed 42]
```

For the released artifact in this package, the measured budget-safe settings are:

- `B = 30` bootstrap replicas per target (the minimum allowed by the prompt after testing the larger setting);
- stratified bootstrap sampling with replacement, preserving the observed class counts;
- each replica is a clone of the selected fitted scikit-learn pipeline and is refit on its bootstrap sample;
- RandomForest replicas use **50 trees** to bound artifact size and prediction latency; the primary RandomForest models remain at their original settings;
- interval level = `0.8`, implemented as the 10th–90th percentile range;
- the returned range is expanded with the primary probability so that `lo <= p <= hi`, then clamped to `[0, 1]`;
- range labels are derived from per-target 33rd/67th percentile width cutoffs and are exactly `narrow range`, `moderate range`, or `wide range`.

The enriched `model.joblib` is written atomically through a temporary file and rename.

## Interpretation limits

These bootstrap ranges show **model variability** across refit replicas. They are **not calibrated clinical confidence intervals**, do not establish individual certainty, and are not guarantees of calibration.

The dataset contains binary vessel labels only. A vessel halo therefore describes uncertainty around the model output for that vessel label; it is **not a lesion location** and does not identify a measured blockage on the heart surface.

The project keeps the existing educational/research disclaimers: outputs are model estimates, not diagnoses, and not a substitute for diagnostic imaging or clinical judgment.

## Calibration and ROC evidence

`build_uncertainty.py` also computes diagnostic evaluation artifacts from repeated stratified 5-fold out-of-fold predictions (3 repeats):

- five rank/quantile calibration bins with `mean_pred`, `frac_pos`, and `n`;
- expected calibration error (ECE);
- Brier score;
- ROC curve points downsampled to at most 50 points and ROC-AUC.

These values are stored **inside each target object** in `metrics.json`. No new top-level metrics keys were introduced, and the headline probabilities are not recalibrated or replaced.

The released measured diagnostics are:

| Target | ECE | Brier | ROC-AUC |
|---|---:|---:|---:|
| CAD | 0.035584 | 0.097745 | 0.924702 |
| LAD | 0.112036 | 0.162112 | 0.857098 |
| LCX | 0.077344 | 0.205768 | 0.737395 |
| RCA | 0.123912 | 0.226988 | 0.708531 |

With only 303 records, five calibration bins contain about 60 observations each, so these diagnostics are noisy and should be interpreted at the dataset level rather than as individual certainty.

## Measured artifact and latency budget

Baseline `model.joblib` size before the Confidence Heart build: **4,069,302 bytes**.

Released artifact size after adding uncertainty replicas: **25,030,792 bytes**.

Growth: **20,961,490 bytes (~20.0 MiB)**, below the 40 MB budget.

The final artifact uses `B=30` and 50 trees for RandomForest replicas because the requested `B=60` build exceeded the available execution budget in this environment. With the final artifact, an HTTP `/predict` request through `tests/mock_server.py` was measured over 12 warm requests at approximately **p50 471.6 ms / p95 523.9 ms** on the execution CPU used for verification (the equivalent `core.predict()` measurements were p50 458.6 ms / p95 489.6 ms). This is above the requested 400 ms p95 target, but B and RandomForest member size are already at the prompt's minimum budget-safe settings (`B=30`, 50 trees). The limitation is reported rather than hidden.

## Rebuild

From the project root:

```text
python build_uncertainty.py data.xlsx --B 30 --seed 42
```

The prompt-specified default remains available as:

```text
python build_uncertainty.py data.xlsx
```

For a deterministic uncertainty artifact, keep the same input snapshot, Python/scikit-learn environment, `--B`, and `--seed`. The `created_utc` metadata is informational and changes on rebuild.
