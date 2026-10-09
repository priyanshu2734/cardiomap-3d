"""Train + validate CAD / LAD / LCX / RCA classifiers.

    python train.py data.xlsx                 # train, cross-validate, NESTED-validate (writes model.joblib, metrics.json, export.json)
    python train.py data.xlsx --quick         # skip the nested loop (fast; same as the original behaviour)
    python train.py data.xlsx --rebuild-extras  # then also run build_uncertainty.py, build_audit.py and build_global_shap.py

Two validation views are stored per target in metrics.json:
  "cv"      5-fold x3 repeated stratified CV for all three candidate models. The best model is PICKED on these
            numbers, so the picked model's row is slightly optimistic (selection bias). Kept as-is for the UI.
  "nested"  Honest estimate of the whole procedure "choose a model, then fit it". Every outer training set runs
            its own inner 5-fold CV to choose among logreg / rf / gb by ROC-AUC; the chosen model is then scored on
            the untouched outer test fold. Same outer splits as "cv". Adds a bootstrap 95% CI for the AUC.
Imputation + scaling live inside the pipeline, so they are fitted on training folds only. Cath/LAD/LCX/RCA are never inputs.
"""
import argparse, json, os, subprocess, sys
from pathlib import Path
import numpy as np, joblib
from joblib import Parallel, delayed
from sklearn.base import clone
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_validate, cross_val_predict, cross_val_score
from sklearn.metrics import (confusion_matrix, brier_score_loss, accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score)
import core

H = Path(__file__).resolve().parent
P = lambda m: make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), m)   # fitted inside every CV fold
MODELS = {"logreg": lambda: P(LogisticRegression(C=.3, max_iter=3000, class_weight="balanced")),
          "rf": lambda: P(RandomForestClassifier(300, min_samples_leaf=3, class_weight="balanced", random_state=0)),
          "gb": lambda: P(GradientBoostingClassifier(n_estimators=150, max_depth=2, learning_rate=.05, random_state=0))}
SC = ["accuracy", "precision", "recall", "f1", "roc_auc"]
N_SPLITS, N_REPEATS, INNER_SPLITS, BOOT = 5, 3, 5, 1000


def _fold_scores(y_true, p):
    pred = (p > .5).astype(int)
    return {"accuracy": accuracy_score(y_true, pred), "precision": precision_score(y_true, pred, zero_division=0),
            "recall": recall_score(y_true, pred), "f1": f1_score(y_true, pred), "roc_auc": roc_auc_score(y_true, p)}


def _outer_fold(i, tr, te, X, yt):
    """One outer fold: choose a model on the training part only (inner CV), then score it on the held-out part."""
    Xtr, ytr = X.iloc[tr], yt.iloc[tr]
    inner = StratifiedKFold(INNER_SPLITS, shuffle=True, random_state=i)
    inner_auc = {n: float(cross_val_score(mk(), Xtr, ytr, cv=inner, scoring="roc_auc").mean()) for n, mk in MODELS.items()}
    pick = max(inner_auc, key=inner_auc.get)
    p = MODELS[pick]().fit(Xtr, ytr).predict_proba(X.iloc[te])[:, 1]
    return i, te, pick, p, _fold_scores(yt.iloc[te], p)


def nested_validation(X, yt, jobs):
    outer = list(RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=0).split(X, yt))   # same splits as "cv"
    out = Parallel(n_jobs=jobs)(delayed(_outer_fold)(i, tr, te, X, yt) for i, (tr, te) in enumerate(outer))
    folds = [o[4] for o in out]
    picks = {n: sum(o[2] == n for o in out) for n in MODELS}
    # each sample is scored once per repeat by a model that never saw it; average over repeats -> one honest probability per patient
    oof = np.zeros((N_REPEATS, len(X)))
    for i, te, _, p, _ in out: oof[i // N_SPLITS, te] = p
    mean_p = oof.mean(axis=0)
    rng, yv, aucs = np.random.default_rng(0), yt.to_numpy(), []
    while len(aucs) < BOOT:
        ix = rng.integers(0, len(yv), len(yv))
        if 0 < yv[ix].sum() < len(ix): aucs.append(roc_auc_score(yv[ix], mean_p[ix]))
    return {"protocol": f"outer {N_SPLITS}-fold x{N_REPEATS} repeats (same splits as cv); inner {INNER_SPLITS}-fold ROC-AUC picks logreg/rf/gb on the outer training set only",
            "metrics": {s: [round(float(np.mean([f[s] for f in folds])), 3), round(float(np.std([f[s] for f in folds], ddof=1)), 3)] for s in SC},
            "selected_counts": picks, "pooled_auc": round(float(roc_auc_score(yv, mean_p)), 3),
            "pooled_auc_ci95": [round(float(np.percentile(aucs, 2.5)), 3), round(float(np.percentile(aucs, 97.5)), 3)],
            "confusion_nested": confusion_matrix(yv, mean_p > .5).tolist(), "brier_nested": round(float(brier_score_loss(yv, mean_p)), 3)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("data", nargs="?", default="data.xlsx")
    ap.add_argument("--quick", action="store_true", help="skip nested validation")
    ap.add_argument("--jobs", type=int, default=min(8, os.cpu_count() or 1))
    ap.add_argument("--rebuild-extras", action="store_true", help="afterwards run build_uncertainty.py, build_audit.py and build_global_shap.py")
    a = ap.parse_args()
    X, y = core.load(a.data)
    cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=0)
    metrics, models, lr = {}, {}, {}
    for t in core.TARGETS:
        res = {}
        for n, mk in MODELS.items():
            r = cross_validate(mk(), X, y[t], cv=cv, scoring=SC, n_jobs=a.jobs)
            res[n] = {s: [round(float(r["test_" + s].mean()), 3), round(float(r["test_" + s].std()), 3)] for s in SC}
        best = max(res, key=lambda n: res[n]["roc_auc"][0])
        oof = cross_val_predict(MODELS[best](), X, y[t], cv=StratifiedKFold(5, shuffle=True, random_state=0), method="predict_proba")[:, 1]
        metrics[t] = {"n": len(X), "positives": int(y[t].sum()), "prevalence": round(float(y[t].mean()), 3), "cv": res, "selected": best,
                      "confusion_oof": confusion_matrix(y[t], oof > .5).tolist(), "brier_oof": round(float(brier_score_loss(y[t], oof)), 3)}
        if not a.quick:
            nv = nested_validation(X, y[t], a.jobs)
            nv["auc_optimism"] = round(res[best]["roc_auc"][0] - nv["metrics"]["roc_auc"][0], 3)   # selection bias in the cv row
            metrics[t]["nested"] = nv
        models[t] = MODELS[best]().fit(X, y[t]); lr[t] = MODELS["logreg"]().fit(X, y[t])
        msg = f"{t:3s} picked {best:6s} cv AUC {res[best]['roc_auc'][0]:.3f} F1 {res[best]['f1'][0]:.3f}"
        if not a.quick:
            m = metrics[t]["nested"]
            msg += f" | nested AUC {m['metrics']['roc_auc'][0]:.3f} F1 {m['metrics']['f1'][0]:.3f} (optimism {m['auc_optimism']:+.3f}) picks {m['selected_counts']}"
        print(msg, flush=True)
    assert not set(core.LEAK) & set(X.columns)
    # Compact, reproducible SHAP background from the training data (reference distribution for local explanations only).
    shap_bg = X.sample(min(100, len(X)), random_state=0).astype(float)
    art = {"models": models, "features": list(X.columns), "median": X.median().to_dict(), "shap_background": shap_bg.to_dict(orient="records")}
    joblib.dump(art, H / "model.joblib")
    imp, sc = lr["CAD"][0], lr["CAD"][1]
    exp = {"features": list(X.columns), "median": dict(zip(X.columns, map(float, imp.statistics_))), "mean": dict(zip(X.columns, map(float, sc.mean_))), "scale": dict(zip(X.columns, map(float, sc.scale_))),
           "coef": {t: [float(c) for c in lr[t][2].coef_[0]] for t in core.TARGETS}, "b": {t: float(lr[t][2].intercept_[0]) for t in core.TARGETS}}
    meta = {"validation": "5-fold stratified CV x3 repeats; imputation+scaling fitted inside folds; class-weighted; mean and SD across 15 folds",
            "label_source": "CAD = Cath=='CAD'; vessels = 'Stenotic'. Cath/LAD/LCX/RCA excluded from inputs.", "n_features": len(X.columns),
            "explainability": "Real SHAP: LinearExplainer for LogisticRegression; TreeExplainer for tree ensembles. SHAP is predictive, not causal."}
    if not a.quick:
        meta["nested_validation"] = ("Nested CV: outer 5-fold x3 repeats; model choice (logreg/rf/gb by ROC-AUC) made by an inner 5-fold CV on each outer training set only; "
                                     "reported on untouched outer test folds. Unbiased by model selection; still one 303-record cohort, not external validation.")
    (H / "export.json").write_text(json.dumps({"metrics": metrics, "exp": exp, "meta": meta}))
    (H / "metrics.json").write_text(json.dumps(metrics, indent=1))
    print("wrote model.joblib, metrics.json, export.json")
    if a.rebuild_extras:
        for s in ("build_uncertainty.py", "build_audit.py", "build_global_shap.py"):
            subprocess.run([sys.executable, str(H / s), a.data], check=True, cwd=H)
    else:
        print("NOTE: this overwrote model.joblib/metrics.json, which drops the bootstrap ranges and calibration/ROC data. "
              "Re-run with --rebuild-extras, or run: python build_uncertainty.py data.xlsx && python build_audit.py data.xlsx")


if __name__ == "__main__":
    main()
