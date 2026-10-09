"""Build additive bootstrap uncertainty artifacts without changing the primary models.

Usage:
    python build_uncertainty.py data.xlsx [--B 60] [--seed 42]

The script:
- loads data through core.load()
- clones the already-selected target pipelines from model.joblib
- refits bootstrap replicas only (primary fitted pipelines are never refit)
- stores bootstrap metadata, uncertainty-width cutoffs, and honest OOF calibration/ROC diagnostics
- atomically replaces model.joblib with the enriched artifact
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import platform
import tempfile
from pathlib import Path

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.metrics import brier_score_loss, roc_auc_score, roc_curve
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from joblib import Parallel, delayed

import core

H = Path(__file__).resolve().parent


def _set_seed_if_supported(pipeline, seed: int):
    est = pipeline[-1]
    params = est.get_params(deep=False)
    if "random_state" in params:
        est.set_params(random_state=int(seed))
    return pipeline


def _stratified_bootstrap_indices(y: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    y = np.asarray(y).astype(int)
    parts = []
    for cls in (0, 1):
        idx = np.flatnonzero(y == cls)
        if idx.size == 0:
            continue
        parts.append(rng.choice(idx, size=idx.size, replace=True))
    if not parts:
        raise ValueError("Target has no bootstrap-able classes.")
    sample = np.concatenate(parts)
    rng.shuffle(sample)
    return sample


def _fit_bootstrap_one(fitted, X, y_target, idx, seed_value):
    pipe = clone(fitted)
    if isinstance(pipe[-1], RandomForestClassifier):
        current = int(pipe[-1].get_params().get("n_estimators", 100))
        ntrees = max(50, min(current, 50))
        pipe[-1].set_params(n_estimators=ntrees)
    _set_seed_if_supported(pipe, seed_value)
    pipe.fit(X.iloc[idx], y_target.iloc[idx])
    return pipe


def _bootstrap_models(art, X, y, B: int, seed: int):
    rng = np.random.default_rng(seed)
    replicas = {}
    rf_tree_counts = {}
    workers = max(1, min(4, (os.cpu_count() or 2)))
    for t_idx, target in enumerate(core.TARGETS):
        fitted = art["models"][target]
        est_name = type(fitted[-1]).__name__
        samples = [_stratified_bootstrap_indices(y[target].to_numpy(), rng) for _ in range(B)]
        seeds = [seed + t_idx * 100_000 + b for b in range(B)]
        target_models = Parallel(n_jobs=workers, prefer="threads")(
            delayed(_fit_bootstrap_one)(fitted, X, y[target], idx, sv)
            for idx, sv in zip(samples, seeds)
        )
        rf_tree_counts[target] = 50 if isinstance(fitted[-1], RandomForestClassifier) else None
        replicas[target] = target_models
        print(f"{target}: {B} bootstrap models ({est_name}{', RF trees='+str(rf_tree_counts[target]) if rf_tree_counts[target] else ''}, workers={workers})")
    return replicas, rf_tree_counts


def _predict_bootstrap_matrix(models, X):
    preds = []
    for model in models:
        preds.append(model.predict_proba(X)[:, 1])
    return np.vstack(preds)


def _quantile_bins(y, p, n_bins=5):
    order = np.argsort(p, kind="mergesort")
    bins = []
    for positions in np.array_split(order, n_bins):
        if len(positions) == 0:
            continue
        pp = p[positions]
        yy = y[positions]
        bins.append({
            "mean_pred": round(float(np.mean(pp)), 6),
            "frac_pos": round(float(np.mean(yy)), 6),
            "n": int(len(positions)),
        })
    ece = sum((b["n"] / len(y)) * abs(b["frac_pos"] - b["mean_pred"]) for b in bins) if len(y) else float("nan")
    return bins, float(ece)


def _downsample_xy(fpr, tpr, max_points=50):
    if len(fpr) <= max_points:
        return fpr.astype(float).tolist(), tpr.astype(float).tolist()
    idx = np.linspace(0, len(fpr) - 1, max_points, dtype=int)
    # De-duplicate in the unlikely event that integer rounding repeats an index.
    idx = np.unique(idx)
    return fpr[idx].astype(float).tolist(), tpr[idx].astype(float).tolist()


def _repeated_oof(X, y, pipeline_template, target_idx: int, repeats=3, folds=5, seed=42):
    n = len(X)
    sums = np.zeros(n, dtype=float)
    counts = np.zeros(n, dtype=int)
    for repeat in range(repeats):
        cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed + target_idx * 1000 + repeat)
        for fold, (train_idx, test_idx) in enumerate(cv.split(X, y)):
            pipe = clone(pipeline_template)
            _set_seed_if_supported(pipe, seed + target_idx * 100_000 + repeat * 100 + fold)
            pipe.fit(X.iloc[train_idx], y.iloc[train_idx])
            sums[test_idx] += pipe.predict_proba(X.iloc[test_idx])[:, 1]
            counts[test_idx] += 1
    if not np.all(counts == repeats):
        raise AssertionError("Repeated OOF prediction counts are incomplete.")
    return sums / counts


def _calibration_and_roc(X, y, pipeline_template, target_idx: int, seed=42):
    p = np.clip(_repeated_oof(X, y, pipeline_template, target_idx, repeats=3, folds=5, seed=seed), 0, 1)
    bins, ece = _quantile_bins(y.to_numpy().astype(int), p, n_bins=5)
    brier = float(brier_score_loss(y, p))
    fpr, tpr, _ = roc_curve(y, p)
    auc = float(roc_auc_score(y, p))
    fpr_ds, tpr_ds = _downsample_xy(fpr, tpr, max_points=50)
    return {
        "calibration": {
            "bins": bins,
            "ece": round(ece, 6),
            "brier": round(brier, 6),
        },
        "roc": {
            "fpr": [round(x, 6) for x in fpr_ds],
            "tpr": [round(x, 6) for x in tpr_ds],
            "auc": round(auc, 6),
        },
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="?", default="data.xlsx")
    ap.add_argument("--B", type=int, default=60)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if args.B < 30:
        raise SystemExit("--B must be at least 30 to meet the required uncertainty minimum.")

    data_path = Path(args.data)
    if not data_path.is_absolute():
        data_path = H / data_path
    X, y = core.load(data_path)
    art = joblib.load(H / "model.joblib")
    assert not set(core.LEAK) & set(X.columns)
    assert list(X.columns) == list(art["features"]), "Artifact features do not match core.load() features."

    before_primary_hash = {t: joblib.hash(art["models"][t]) for t in core.TARGETS}
    bootstrap, rf_tree_counts = _bootstrap_models(art, X, y, args.B, args.seed)

    width_cutoffs = {}
    for t in core.TARGETS:
        primary_p = np.clip(art["models"][t].predict_proba(X)[:, 1], 0, 1)
        mat = _predict_bootstrap_matrix(bootstrap[t], X)
        q10 = np.percentile(mat, 10, axis=0)
        q90 = np.percentile(mat, 90, axis=0)
        lo = np.minimum(primary_p, q10)
        hi = np.maximum(primary_p, q90)
        widths = np.clip(hi, 0, 1) - np.clip(lo, 0, 1)
        width_cutoffs[t] = [float(np.quantile(widths, 0.33)), float(np.quantile(widths, 0.67))]

    calibration_roc = {}
    for t_idx, target in enumerate(core.TARGETS):
        print(f"OOF diagnostics: {target}")
        calibration_roc[target] = _calibration_and_roc(X, y[target], art["models"][target], t_idx, args.seed)

    after_primary_hash = {t: joblib.hash(art["models"][t]) for t in core.TARGETS}
    if before_primary_hash != after_primary_hash:
        raise AssertionError("Primary fitted models changed while building uncertainty replicas.")

    meta = {
        "B": int(args.B),
        "seed": int(args.seed),
        "level": 0.8,
        "percentiles": [10, 90],
        "created_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sklearn_version": __import__("sklearn").__version__,
        "bootstrap_estimator_policy": "Same fitted pipeline family/hyperparameters as primary models; RandomForest bootstrap replicas use 50 trees (minimum allowed) to bound artifact size and prediction latency.",
        "rf_member_trees": rf_tree_counts,
        "primary_models_unchanged": True,
        "notes": "Ranges represent model variability from stratified bootstrap refits; they are not clinical confidence intervals or calibrated certainty.",
    }

    art["bootstrap"] = bootstrap
    art["bootstrap_meta"] = meta
    art["width_cutoffs"] = width_cutoffs

    metrics_path = H / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    for target in core.TARGETS:
        metrics[target]["calibration"] = calibration_roc[target]["calibration"]
        metrics[target]["roc"] = calibration_roc[target]["roc"]
    tmp_metric = metrics_path.with_suffix(".json.tmp")
    tmp_metric.write_text(json.dumps(metrics, indent=1), encoding="utf-8")
    os.replace(tmp_metric, metrics_path)

    export_path = H / "export.json"
    export = json.loads(export_path.read_text(encoding="utf-8")) if export_path.exists() else {}
    export.setdefault("meta", {})
    export["meta"]["uncertainty"] = "Bootstrap percentile model range: 10th–90th percentile at an 80% interval level; model variability only, not a clinical confidence interval."
    export["meta"]["uncertainty_B"] = int(args.B)
    export["meta"]["uncertainty_seed"] = int(args.seed)
    export["meta"]["calibration"] = "Repeated stratified 5-fold OOF (3 repeats); 5 rank/quantile bins; diagnostics only; headline probabilities unchanged."
    tmp_export = export_path.with_suffix(".json.tmp")
    tmp_export.write_text(json.dumps(export, indent=1), encoding="utf-8")
    os.replace(tmp_export, export_path)

    model_path = H / "model.joblib"
    fd, tmp_name = tempfile.mkstemp(prefix="model.joblib.", suffix=".tmp", dir=str(H))
    os.close(fd)
    tmp_model = Path(tmp_name)
    try:
        joblib.dump(art, tmp_model)
        os.replace(tmp_model, model_path)
    finally:
        if tmp_model.exists():
            tmp_model.unlink(missing_ok=True)

    print(json.dumps({
        "model_joblib_bytes": model_path.stat().st_size,
        "B": args.B,
        "seed": args.seed,
        "width_cutoffs": width_cutoffs,
        "primary_models_unchanged": True,
    }, indent=2))


if __name__ == "__main__":
    main()
