"""Build audit.json: subgroup performance + decision-curve analysis from OUT-OF-FOLD predictions.

Usage: python build_audit.py [data.xlsx] [--B 1000] [--seed 7]
Clones the already-selected pipelines from model.joblib (the deployed models are never refit or changed).
Each sample's probability is the mean of its out-of-fold predictions over 3 repeats of stratified 5-fold CV,
so no sample is ever scored by a model that saw it. Descriptive evaluation on 303 records; not clinical validation.
"""
import argparse, json, datetime as dt
from pathlib import Path
import numpy as np, joblib
from sklearn.base import clone
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
import core

H = Path(__file__).resolve().parent
AGE_BANDS = [("<50", 0, 50), ("50-59", 50, 60), ("60-69", 60, 70), ("70+", 70, 200)]
THR = np.round(np.arange(0.05, 0.951, 0.01), 2)
MIN_N, MIN_MINOR = 30, 10          # below these a subgroup is flagged "too small to interpret"

def wilson(k, n, z=1.96):
    if n == 0: return None
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d
    m = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(float(max(0, c - m)), 3), round(float(min(1, c + m)), 3)]

def auc(y, p):
    return float(roc_auc_score(y, p)) if 0 < y.sum() < len(y) else None

def boot_auc(y, p, rng, B):
    v = []
    for _ in range(B):
        i = rng.integers(0, len(y), len(y)); a = auc(y[i], p[i])
        if a is not None: v.append(a)
    return [round(float(np.percentile(v, 2.5)), 3), round(float(np.percentile(v, 97.5)), 3)] if len(v) > B * .8 else None

def group_stats(y, p, rng, B):
    n, pos = len(y), int(y.sum()); neg = n - pos
    pred = p >= .5; tp = int((pred & (y == 1)).sum()); tn = int((~pred & (y == 0)).sum())
    a = auc(y, p)
    return {"n": n, "positives": pos, "prevalence": round(pos / n, 3) if n else None,
            "auc": round(a, 3) if a is not None else None, "auc_ci": boot_auc(y, p, rng, B) if a is not None else None,
            "recall": round(tp / pos, 3) if pos else None, "recall_ci": wilson(tp, pos),
            "specificity": round(tn / neg, 3) if neg else None, "specificity_ci": wilson(tn, neg),
            "too_small": bool(n < MIN_N or min(pos, neg) < MIN_MINOR)}

def decision_curve(y, p):
    n, prev = len(y), float(y.mean()); out = []
    for t in THR:
        pred = p >= t; tp = (pred & (y == 1)).sum(); fp = (pred & (y == 0)).sum(); w = t / (1 - t)
        out.append([float(t), round(float(tp / n - fp / n * w), 4), round(float(prev - (1 - prev) * w), 4)])
    return out   # [threshold, net_benefit_model, net_benefit_treat_all]; treat-none is 0

def dca_band(y, p, rng, B):
    """Bootstrap percentile 95% band for the model's net benefit at each threshold (resamples records)."""
    n = len(y); I = rng.integers(0, n, (B, n)); yb, pb = y[I], p[I]; out = []
    for t in THR:
        pred = pb >= t; w = t / (1 - t)
        nb = ((pred & (yb == 1)).sum(1) - (pred & (yb == 0)).sum(1) * w) / n
        out.append([round(float(np.percentile(nb, 2.5)), 4), round(float(np.percentile(nb, 97.5)), 4)])
    return out   # aligned with decision_curve() points

def useful_ranges(dc):
    """Threshold ranges where the model's net benefit beats both treat-all and treat-none."""
    rs, cur = [], None
    for t, m, a in dc:
        ok = m > max(a, 0) + 1e-9
        if ok and cur is None: cur = [t, t]
        elif ok: cur[1] = t
        elif cur: rs.append(cur); cur = None
    if cur: rs.append(cur)
    return rs

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("data", nargs="?", default=str(H / "data.xlsx"))
    ap.add_argument("--B", type=int, default=1000); ap.add_argument("--seed", type=int, default=7); a = ap.parse_args()
    X, y = core.load(a.data); art = joblib.load(H / "model.joblib"); rng = np.random.default_rng(a.seed); rng_band = np.random.default_rng(a.seed + 1)   # separate stream: band never changes other numbers
    sex = X["Sex"].to_numpy(); age = X["Age"].to_numpy()
    groups = {"sex": [("Female", sex == 0), ("Male", sex == 1)],
              "age": [(n, (age >= lo) & (age < hi)) for n, lo, hi in AGE_BANDS]}
    out = {"meta": {"generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "n": int(len(X)),
        "method": "Out-of-fold probabilities: mean of 3 repeats of stratified 5-fold CV using the selected pipeline per target (imputation and scaling fitted inside folds). Threshold 0.5 for recall/specificity.",
        "ci": f"AUC: bootstrap percentile 95% CI ({a.B} resamples). Recall/specificity: Wilson 95% CI.",
        "small_group_rule": f"Flagged too small to interpret when n<{MIN_N} or fewer than {MIN_MINOR} records in either class.",
        "dca": "Net benefit = TP/n - FP/n * pt/(1-pt); treat-all = prevalence - (1-prevalence)*pt/(1-pt); treat-none = 0. Shaded band = bootstrap percentile 95% interval of the model's net benefit (resampling records; probabilities held fixed).",
        "limits": "303 records from one referral dataset with high disease prevalence (71% CAD); subgroup CIs are wide, treat-all is strong at low thresholds, and nothing here is clinical or external validation."},
        "targets": {}}
    for t in core.TARGETS:
        yt = y[t].to_numpy(); m = art["models"][t]
        p = np.mean([cross_val_predict(clone(m), X, yt, cv=StratifiedKFold(5, shuffle=True, random_state=r), method="predict_proba")[:, 1] for r in range(3)], axis=0)
        sub = {"overall": group_stats(yt, p, rng, a.B)}
        for kind, gl in groups.items():
            sub[kind] = [{"group": g, **group_stats(yt[mk], p[mk], rng, a.B)} for g, mk in gl]
        f, mm = groups["sex"][0][1], groups["sex"][1][1]; d = []
        for _ in range(a.B):
            i, j = rng.choice(np.where(f)[0], f.sum()), rng.choice(np.where(mm)[0], mm.sum())
            u, v = auc(yt[i], p[i]), auc(yt[j], p[j])
            if u is not None and v is not None: d.append(v - u)
        lo, hi = np.percentile(d, [2.5, 97.5]); fa, ma = sub["sex"][0]["auc"], sub["sex"][1]["auc"]
        sub["sex_gap"] = {"auc_male_minus_female": round(ma - fa, 3), "ci": [round(float(lo), 3), round(float(hi), 3)], "excludes_zero": bool(lo > 0 or hi < 0)}
        dc = decision_curve(yt, p)
        out["targets"][t] = {"selected": type(m[-1]).__name__, "subgroups": sub, "dca": {"points": dc, "band": dca_band(yt, p, rng_band, a.B), "useful_ranges": useful_ranges(dc), "prevalence": round(float(yt.mean()), 3)}}
        print(t, sub["overall"]["auc"], "sex gap", sub["sex_gap"], "useful", out["targets"][t]["dca"]["useful_ranges"])
    json.dump(out, open(H / "audit.json", "w"), separators=(",", ":"))
    print("wrote audit.json")
