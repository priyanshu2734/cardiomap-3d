"""Cardiac Research Lab backend ("Pre-angiography triage").  Endpoints live under /api/research-lab/.

Question: using only non-invasive data (demographics, history, vitals, labs, ECG, echo), how well can we rank patients by
likelihood of significant CAD (>=50% stenosis) and by vessel (LAD / LCX / RCA) BEFORE an invasive angiogram?
Cath, LAD, LCX and RCA are never inputs (same leakage rule as core.py, asserted on every run).

Experiments
  ablation  cumulative feature groups: demographics & history -> + labs -> + ECG -> + echo, for CAD/LAD/LCX/RCA
  models    logistic regression vs random forest vs gradient boosting on the full non-invasive set
  weakvessel  why LCX / RCA are harder than LAD: class balance, per-fold variance, learning curve, plain-language reasons
  subgroups   descriptive check by sex and age band (sample sizes, small-group warnings; no tests between groups)
  calibration reliability curve, Brier score, calibration slope and a triage view (observed CAD share per probability band)

Protocol (both): stratified nested CV. Outer = repeated stratified 5-fold (seeded; the SAME splits for every group/model so
differences are paired). Inner = stratified 3-fold ROC-AUC selection on the outer-training part only (ablation: picks among
logreg/rf/gb as in train.py; models: picks hyperparameters inside each family). Out-of-fold probabilities are averaged over
repeats per patient; metrics use threshold 0.5. 95% CIs are percentile bootstraps over patients (shared resamples, so
differences between groups/models are paired). A difference is "within noise" when its paired 95% CI for delta-AUC contains 0.

Results are cached on disk (experiment + params + seed + data hash + code hash), run in a background thread and polled via a
status endpoint. Pure functions here need no FastAPI (tests import them); make_router() builds the router lazily.
Educational decision support only; not a substitute for formal diagnostic imaging.
"""
# NOTE: do NOT add `from __future__ import annotations`: make_router() builds its request model locally.
import datetime, hashlib, json, os, platform, sys, threading, time
from pathlib import Path
import numpy as np
from scipy.stats import rankdata
from joblib import Parallel, delayed
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_val_score
from sklearn.metrics import roc_auc_score
import core, train

H = Path(__file__).resolve().parent
CACHE_DIR = Path(os.getenv("CARDIOMAP_RL_CACHE", H / ".research_lab_cache"))
CODE_FILES = ["research_lab.py", "core.py", "train.py"]
PROTOCOL_VERSION = 1
OUTER_SPLITS, INNER_SPLITS, THRESHOLD = 5, 3, 0.5
DISCLAIMER = "Educational decision support, not a substitute for formal diagnostic imaging."
METRICS = ["accuracy", "precision", "recall", "f1", "roc_auc"]
VESSELS = ["LAD", "LCX", "RCA"]

# Feature groups use dataset column names (as returned by core.load). Together they partition every model input.
GROUPS = [
    ("base", "Demographics & history", ["Age", "Sex", "BMI", "DM", "HTN", "Current Smoker", "EX-Smoker", "FH", "Obesity", "CRF", "CVA",
        "Airway disease", "Thyroid Disease", "CHF", "DLP", "BP", "PR", "Edema", "Weak Peripheral Pulse", "Lung rales", "Systolic Murmur",
        "Diastolic Murmur", "Typical Chest Pain", "Dyspnea", "Function Class", "Atypical", "Nonanginal", "LowTH Ang"]),
    ("labs", "Laboratory", ["FBS", "CR", "TG", "LDL", "HDL", "BUN", "ESR", "HB", "K", "Na", "WBC", "Lymph", "Neut", "PLT"]),
    ("ecg", "ECG", ["Q Wave", "St Elevation", "St Depression", "Tinversion", "LVH", "Poor R Progression", "LBBB", "RBBB"]),
    ("echo", "Echocardiography", ["EF-TTE", "Region RWMA", "VHD"]),
]
STEP_LABEL = {"base": "Demographics & history", "labs": "+ Labs", "ecg": "+ ECG", "echo": "+ Echo"}
FAMILY_LABEL = {"logreg": "Logistic regression", "rf": "Random forest", "gb": "Gradient boosting"}
_P = train.P   # imputation + scaling inside every fold (same pipeline as train.py)
FAMILIES = {   # family -> {config name: factory}; the inner CV picks the config
    "logreg": {f"C={c}": (lambda c=c: _P(LogisticRegression(C=c, max_iter=3000, class_weight="balanced"))) for c in (0.05, 0.3, 1.0)},
    "rf": {f"min_leaf={l}": (lambda l=l: _P(RandomForestClassifier(200, min_samples_leaf=l, class_weight="balanced", random_state=0))) for l in (3, 8)},
    "gb": {"depth=2,n=150": lambda: _P(GradientBoostingClassifier(n_estimators=150, max_depth=2, learning_rate=.05, random_state=0)),
           "depth=3,n=100": lambda: _P(GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=.05, random_state=0))},
}
NOTES = [
    "Cohort = patients already referred for coronary angiography (Z-Alizadeh Sani, n=303). That differs from an undifferentiated chest-pain clinic, so absolute performance may not transfer.",
    "Single cohort, no external validation. LCX and RCA labels are the least learnable (fewer positives).",
    "Confidence intervals are percentile bootstraps over patients on out-of-fold predictions: they capture test-sample variability, not retraining variability, and are not corrected for multiple comparisons.",
    "'Within noise' means the paired 95% CI for the AUC difference includes 0. That is absence of detectable difference, not proof of equivalence.",
    "The lab uses all 53 non-invasive dataset features, more than the 25 dashboard inputs, so numbers differ from the deployed dashboard model.",
    DISCLAIMER,
]


# ------------------------------------------------------------------ hashing / manifest
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
    return h.hexdigest()


def code_hashes():
    d = {n: sha256_file(H / n) for n in CODE_FILES if (H / n).is_file()}
    d["combined"] = hashlib.sha256("".join(f"{k}:{d[k]}" for k in sorted(d)).encode()).hexdigest()
    return d


def library_versions():
    out = {"python": platform.python_version()}
    for mod in ("numpy", "pandas", "scipy", "sklearn", "joblib", "openpyxl"):
        try: out["scikit-learn" if mod == "sklearn" else mod] = __import__(mod).__version__
        except Exception: out["scikit-learn" if mod == "sklearn" else mod] = "unavailable"
    return out


def _canon(o): return json.dumps(o, sort_keys=True, separators=(",", ":"))


def cache_key(experiment, params, data_sha, code_sha):
    return hashlib.sha256(_canon({"e": experiment, "p": params, "d": data_sha, "c": code_sha}).encode()).hexdigest()[:20]


# ------------------------------------------------------------------ groups / leakage
def check_groups(columns):
    """The groups must partition the model inputs exactly, and no leakage column may appear anywhere."""
    feats = [f for _, _, fs in GROUPS for f in fs]
    assert not set(core.LEAK) & set(feats), "leakage column in a feature group"
    assert not set(core.LEAK) & set(columns), "leakage column in data inputs"
    assert len(feats) == len(set(feats)), "feature listed in two groups"
    assert set(feats) == set(columns), f"groups do not match data columns: {sorted(set(feats) ^ set(columns))}"


# ------------------------------------------------------------------ metrics (vectorised so bootstraps are cheap)
def batch_metrics(yb, pb):
    """yb, pb: (B, n) arrays of labels / probabilities. Returns dict metric -> (B,) array (NaN where a resample has one class)."""
    yb, pb = np.atleast_2d(yb), np.atleast_2d(pb)
    n = yb.shape[1]; pos = yb == 1; pred = pb > THRESHOLD
    tp = (pred & pos).sum(1).astype(float); fp = (pred & ~pos).sum(1).astype(float); fn = (~pred & pos).sum(1).astype(float)
    npos = pos.sum(1).astype(float); nneg = n - npos
    ok = (npos > 0) & (nneg > 0)
    div = lambda a, b: np.divide(a, b, out=np.zeros_like(a, dtype=float), where=b > 0)
    ranks = rankdata(pb, axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        auc = (np.where(pos, ranks, 0).sum(1) - npos * (npos + 1) / 2) / (npos * nneg)
    out = {"accuracy": (n - fp - fn) / n, "precision": div(tp, tp + fp), "recall": div(tp, npos), "f1": div(2 * tp, 2 * tp + fp + fn), "roc_auc": auc}
    return {k: np.where(ok, v, np.nan) for k, v in out.items()}


def _r(x, d=4): return round(float(x), d)


def summarise(y, oof, idx):
    """Point estimate on all patients + percentile bootstrap 95% CI per metric. Also returns raw arrays for paired deltas."""
    pt, bt = batch_metrics(y, oof), batch_metrics(y[idx], oof[idx])
    summ = {}
    for m in METRICS:
        lo, hi = np.nanpercentile(bt[m], [2.5, 97.5])
        summ[m] = {"value": _r(pt[m][0]), "ci95": [_r(lo), _r(hi)]}
    return summ, float(pt["roc_auc"][0]), bt["roc_auc"]


def paired_delta(pa, ba, pb, bb):
    """AUC(a) - AUC(b) with a paired bootstrap CI (same resampled patients)."""
    d = ba - bb; lo, hi = np.nanpercentile(d, [2.5, 97.5])
    return {"value": _r(pa - pb), "ci95": [_r(lo), _r(hi)], "within_noise": bool(lo <= 0 <= hi)}


# ------------------------------------------------------------------ nested CV engine
def _seeded(model, seed):
    name, est = model.steps[-1]
    if "random_state" in est.get_params(): model.set_params(**{f"{name}__random_state": seed})
    return model


def _outer_task(i, tr, te, X, y, cands, seed):
    Xtr, ytr = X.iloc[tr], y[tr]
    if len(cands) > 1:
        inner = StratifiedKFold(INNER_SPLITS, shuffle=True, random_state=seed + i)
        sc = {n: float(cross_val_score(_seeded(mk(), seed), Xtr, ytr, cv=inner, scoring="roc_auc").mean()) for n, mk in cands.items()}
        pick = max(sc, key=sc.get)
    else: pick = next(iter(cands))
    p = _seeded(cands[pick](), seed).fit(Xtr, ytr).predict_proba(X.iloc[te])[:, 1]
    return i, te, pick, p


def nested_oof(X, y, cands, seed, repeats, jobs=1, tick=None):
    """Nested CV. Returns mean-over-repeats out-of-fold probability per patient, selection counts and per-outer-fold AUCs."""
    assert not set(core.LEAK) & set(X.columns), "leakage column in model inputs"
    splits = list(RepeatedStratifiedKFold(n_splits=OUTER_SPLITS, n_repeats=repeats, random_state=seed).split(X, y))
    gen = Parallel(n_jobs=jobs, return_as="generator")(delayed(_outer_task)(i, tr, te, X, y, cands, seed) for i, (tr, te) in enumerate(splits))
    oof, picks, fold_auc = np.zeros((repeats, len(y))), {}, []
    for i, te, pick, p in gen:
        oof[i // OUTER_SPLITS, te] = p; picks[pick] = picks.get(pick, 0) + 1
        fold_auc.append(roc_auc_score(y[te], p))
        if tick: tick()
    return {"oof": oof.mean(0), "picks": picks, "fold_aucs": [float(a) for a in fold_auc],
            "fold_auc": {"mean": _r(np.mean(fold_auc)), "sd": _r(np.std(fold_auc, ddof=1)) if len(fold_auc) > 1 else None}}


# ------------------------------------------------------------------ plain-language takeaways
def _sg(v): v = round(float(v), 2) + 0.0; return f"{v:+.2f}"      # +0.0 turns -0.0 into 0.0
def _ci(c): return f"{_sg(c[0])} to {_sg(c[1])}"
def _auc_txt(m): return f"{m['value']:.2f} ({m['ci95'][0]:.2f}-{m['ci95'][1]:.2f})"


def _tier(lo):
    if lo >= .80: return "strong", "it separates higher- from lower-likelihood patients well in this cohort, but it does not replace imaging"
    if lo >= .70: return "moderate", "it gives a useful but imperfect ordering, so borderline estimates should not drive decisions"
    if lo > .50: return "weak", "ordering is only modestly better than chance with wide uncertainty, so it is not reliable enough to guide vessel-specific decisions"
    return "not distinguishable from chance", "it should not be used to prioritise patients"


def ablation_takeaway(t, steps, full_vs_base):
    ds = [s["delta_auc_vs_prev"] for s in steps[1:]]
    j = max(range(len(ds)), key=lambda k: ds[k]["value"]); d = ds[j]; name = GROUPS[j + 1][1]
    if d["value"] <= 0: s1 = f"For {t}, no added data group improved ROC-AUC."
    elif d["within_noise"]: s1 = f"For {t}, {name} is the largest step (AUC {_sg(d['value'])}, 95% CI {_ci(d['ci95'])}) but it is within noise: this cohort cannot show it improves ranking."
    else: s1 = f"For {t}, {name} adds the most (AUC {_sg(d['value'])}, 95% CI {_ci(d['ci95'])}), a gain larger than sampling noise."
    f = full_vs_base
    s2 = (f"All non-invasive data together reach AUC {_auc_txt(steps[-1]['metrics']['roc_auc'])} versus {_auc_txt(steps[0]['metrics']['roc_auc'])} for demographics & history alone "
          f"(difference {_sg(f['value'])}, 95% CI {_ci(f['ci95'])}, {'within noise' if f['within_noise'] else 'beyond noise'}).")
    tier, txt = _tier(steps[-1]["metrics"]["roc_auc"]["ci95"][0])
    return f"{s1} {s2} What this means for triage: ranking for {t} is {tier} here; {txt}."


def models_takeaway(t, rows):
    rows = sorted(rows, key=lambda r: r["metrics"]["roc_auc"]["value"], reverse=True); b = rows[0]
    others = [r for r in rows[1:]]
    beyond = [r for r in others if not r["delta_auc_vs_best"]["within_noise"]]
    head = f"For {t}, {b['label']} has the highest AUC ({_auc_txt(b['metrics']['roc_auc'])})"
    if not beyond: s = f"{head}, but every difference to the other models is within noise, so no model is clearly better; choose on transparency and simplicity rather than AUC."
    else:
        names = " and ".join(r["label"] for r in beyond)
        s = f"{head}; its lead over {names} is larger than sampling noise" + ("." if len(beyond) == len(others) else ", while the remaining difference is within noise.")
    tier, txt = _tier(b["metrics"]["roc_auc"]["ci95"][0])
    return f"{s} What this means for triage: ranking for {t} is {tier} even with the best model; {txt}."


# ------------------------------------------------------------------ experiments
def outer_folds(repeats): return OUTER_SPLITS * repeats
def total_units(experiment, repeats):
    f = outer_folds(repeats)
    return {"ablation": len(core.TARGETS) * len(GROUPS) * f, "weakvessel": len(WEAK_TARGETS) * 2 * f,
            "subgroups": len(core.TARGETS) * f, "calibration": len(core.TARGETS) * f}.get(experiment, len(core.TARGETS) * len(FAMILIES) * f)


def run_ablation(X, Y, p, jobs, tick):
    n, targets = len(X), {}
    for ti, t in enumerate(core.TARGETS):
        y = Y[t].to_numpy(int); idx = np.random.default_rng([p["seed"], ti]).integers(0, n, (p["boot"], n))
        cols, steps, prev, first = [], [], None, None
        for gid, label, feats in GROUPS:
            cols = cols + feats
            r = nested_oof(X[cols], y, train.MODELS, p["seed"], p["repeats"], jobs, tick)
            summ, pt, bt = summarise(y, r["oof"], idx)
            step = {"group": gid, "label": STEP_LABEL[gid], "added": feats, "n_features": len(cols), "metrics": summ,
                    "outer_fold_auc": r["fold_auc"], "selected_model_counts": r["picks"],
                    "delta_auc_vs_prev": paired_delta(pt, bt, *prev) if prev else None}
            steps.append(step); prev = (pt, bt); first = first or (pt, bt)
        full = paired_delta(prev[0], prev[1], *first)
        targets[t] = {"positives": int(y.sum()), "n": n, "prevalence": _r(y.mean(), 3), "steps": steps, "delta_auc_full_vs_base": full,
                      "triage_takeaway": ablation_takeaway(t, steps, full)}
    gains = []
    for t in core.TARGETS:
        ds = [s["delta_auc_vs_prev"] for s in targets[t]["steps"][1:]]; j = max(range(len(ds)), key=lambda k: ds[k]["value"])
        if ds[j]["value"] > 0 and not ds[j]["within_noise"]: gains.append(f"{GROUPS[j + 1][1]} for {t} ({_sg(ds[j]['value'])} AUC)")
    overall = ("Gains larger than sampling noise: " + "; ".join(gains) + ". Every other step is within noise.") if gains else \
        "No single added data group improved ranking beyond sampling noise for any target; differences between tiers are not distinguishable from chance variation."
    return {"targets": targets, "overall_takeaway": overall + " Triage framing: these are ranking estimates in a referred cohort, not diagnoses.",
            "groups": [{"id": g, "label": l, "n_features": len(f), "features": f} for g, l, f in GROUPS]}


def run_models(X, Y, p, jobs, tick):
    n, targets = len(X), {}
    check_groups(X.columns)
    for ti, t in enumerate(core.TARGETS):
        y = Y[t].to_numpy(int); idx = np.random.default_rng([p["seed"], ti]).integers(0, n, (p["boot"], n)); rows = []
        for fam, cands in FAMILIES.items():
            r = nested_oof(X, y, cands, p["seed"], p["repeats"], jobs, tick)
            summ, pt, bt = summarise(y, r["oof"], idx)
            rows.append({"model": fam, "label": FAMILY_LABEL[fam], "metrics": summ, "outer_fold_auc": r["fold_auc"], "selected_config_counts": r["picks"], "_pt": pt, "_bt": bt})
        best = max(rows, key=lambda r: r["_pt"])
        for r in rows:
            r["delta_auc_vs_best"] = None if r is best else paired_delta(r["_pt"], r["_bt"], best["_pt"], best["_bt"])
        for r in rows: r["is_best"] = r is best
        for r in rows: del r["_pt"], r["_bt"]
        for r in rows:
            if r["delta_auc_vs_best"] is None: r["delta_auc_vs_best"] = {"value": 0.0, "ci95": [0.0, 0.0], "within_noise": True}
        targets[t] = {"positives": int(y.sum()), "n": n, "prevalence": _r(y.mean(), 3), "models": rows, "best_model": best["model"],
                      "triage_takeaway": models_takeaway(t, rows)}
    clear = [t for t in core.TARGETS if any(not r["delta_auc_vs_best"]["within_noise"] for r in targets[t]["models"] if not r["is_best"])]
    overall = (f"Model choice mattered beyond noise for: {', '.join(clear)}; elsewhere differences are within noise." if clear else
               "No model is clearly better for any target; differences in AUC are within sampling noise.")
    return {"targets": targets, "overall_takeaway": overall + " Triage framing: these are ranking estimates in a referred cohort, not diagnoses."}


# ------------------------------------------------------------------ experiments 3-5: shared helpers
FRACTIONS = (0.25, 0.5, 0.75, 1.0)                      # learning-curve fractions of each outer-training part
WEAK_TARGETS = ["LAD", "LCX", "RCA"]                      # LAD is the well-ranked reference; LCX / RCA are the vessels of interest
SMALL_N, SMALL_CLASS, MIN_CLASS = 50, 20, 10            # subgroup warnings: small if n<50 or rarer class<20; AUC withheld if rarer class<10
AGE_BANDS = [("Under 50", 0, 49), ("50-59", 50, 59), ("60-69", 60, 69), ("70 and over", 70, 200)]
SEX_GROUPS = [("Female", 0), ("Male", 1)]
BAND_EDGES = [0.2, 0.4, 0.6, 0.8]                       # triage probability bands
BAND_LABELS = ["Below 20%", "20-39%", "40-59%", "60-79%", "80% or higher"]
CAL_BINS, SMALL_BIN = 10, 10                            # reliability curve: 10 equal-width bins; hollow marker if a bin holds <10 patients
EXTRA_NOTES = {
    "weakvessel": ["The learning curve refits one fixed model family (the one the inner CV chose most often) on 25/50/75/100% of each training part; the largest size is about 80% of 303 patients, so it cannot show what happens beyond that.",
                  "Fold-to-fold spread is descriptive: outer training sets overlap, so it understates the true retraining variability.",
                  "The reasons given for why LCX and RCA are harder are partly measured here and partly general clinical reasoning that this dataset did not test; each is labelled."],
    "subgroups": [f"Descriptive only. No test between groups is run and none of these numbers establishes that the tool works equally well, or worse, for any group. Warning thresholds: group n < {SMALL_N} or rarer class < {SMALL_CLASS}; AUC is withheld when the rarer class has fewer than {MIN_CLASS} patients.",
                 "Age and sex are themselves model inputs, and the Z-Alizadeh Sani cohort is a single referral population, so subgroup results may not transfer."],
    "calibration": ["The logistic and random-forest models use balanced class weights, which shifts raw probabilities toward the rarer class. Outputs are therefore better read as risk scores than as literal probabilities unless this check shows otherwise.",
                    "Each patient's probability is the average of out-of-fold predictions over the CV repeats; every prediction comes from models that never saw that patient, but averaging smooths extremes slightly.",
                    "Observed shares per band describe this referral cohort (71% have CAD); they are not positive predictive values for an undifferentiated chest-pain clinic. Bands with fewer than 10 patients are marked as unreliable."],
}
EXTRA_PROTOCOL = {
    "weakvessel": "Same nested CV as the model comparison on all non-invasive features (inner 3-fold picks among logreg/rf/gb). Learning curve: the most often selected family, with fixed hyperparameters, is refit on nested class-stratified subsets (25/50/75/100%) of each outer-training part and scored on the same held-out folds; bootstrap resamples are shared so differences are paired.",
    "subgroups": "Out-of-fold probabilities from the nested CV on all non-invasive features are split by sex and age band afterwards. Descriptive only: Wilson 95% CIs for proportions, within-group percentile bootstrap for AUC, threshold 0.5, no tests between groups.",
    "calibration": "Out-of-fold probabilities from the nested CV on all non-invasive features (averaged over repeats). Brier score and calibration slope with percentile bootstrap 95% CIs; reliability bins and triage bands use Wilson 95% CIs.",
}


def wilson(k, n, z=1.96):
    """Wilson score 95% interval for a proportion k/n (None when n == 0)."""
    if n <= 0: return None
    ph = k / n; d = 1 + z * z / n; c = ph + z * z / (2 * n); h = z * np.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n))
    return [_r(max(0.0, (c - h) / d)), _r(min(1.0, (c + h) / d))]


def _pc(x): return f"{100 * float(x):.0f}%"
def _est(k, n): return {"value": _r(k / n), "ci95": wilson(k, n)} if n > 0 else None


def batch_brier(yb, pb): return ((np.atleast_2d(pb) - np.atleast_2d(yb)) ** 2).mean(1)


def batch_cal_slope(yb, pb, iters=30):
    """Calibration slope per resample: slope b of the logistic recalibration y ~ a + b*logit(p), by vectorised Newton steps (NaN if one class)."""
    yb = np.atleast_2d(yb).astype(float); lb = np.log(np.clip(np.atleast_2d(pb), 1e-3, 1 - 1e-3) / (1 - np.clip(np.atleast_2d(pb), 1e-3, 1 - 1e-3)))
    a, b = np.zeros(len(yb)), np.ones(len(yb))
    for _ in range(iters):
        p = 1 / (1 + np.exp(-(a[:, None] + b[:, None] * lb))); w = p * (1 - p)
        g0, g1 = (yb - p).sum(1), ((yb - p) * lb).sum(1)
        h00, h01, h11 = w.sum(1) + 1e-6, (w * lb).sum(1), (w * lb * lb).sum(1) + 1e-6
        det = h00 * h11 - h01 ** 2
        a = a + np.clip((h11 * g0 - h01 * g1) / det, -5, 5); b = b + np.clip((h00 * g1 - h01 * g0) / det, -5, 5)
    ok = (yb.sum(1) > 0) & (yb.sum(1) < yb.shape[1])
    return np.where(ok, b, np.nan)


_FULL = {}


def full_oof(X, y, target, seed, repeats, jobs=1, tick=None):
    """Nested-CV out-of-fold probabilities for one target on ALL non-invasive features (train.MODELS, inner 3-fold selection).
    Experiments 3-5 share this, so it is computed once per (data, target, seed, repeats) per process; a repeat call only advances progress."""
    key = (target, int(seed), int(repeats), hashlib.sha1(np.ascontiguousarray(X.to_numpy(float)).tobytes() + y.tobytes()).hexdigest(), tuple(X.columns))
    if key in _FULL:
        for _ in range(outer_folds(repeats)):
            if tick: tick()
        return _FULL[key]
    r = nested_oof(X, y, train.MODELS, seed, repeats, jobs, tick)
    if len(_FULL) > 24: _FULL.clear()
    _FULL[key] = r; return r


def _lc_task(i, tr, te, X, y, name, seed):
    rng = np.random.default_rng([seed, i, 11])
    order = [rng.permutation(tr[y[tr] == c]) for c in (0, 1)]       # one shuffle per class => the 50% subset sits inside the 75% subset
    out = {}
    for f in FRACTIONS:
        sub = np.sort(np.concatenate([o[:max(2, int(np.ceil(f * len(o))))] for o in order]))
        out[f] = (len(sub), _seeded(train.MODELS[name](), seed).fit(X.iloc[sub], y[sub]).predict_proba(X.iloc[te])[:, 1])
    return i, te, out


def learning_curve_oof(X, y, name, seed, repeats, jobs=1, tick=None):
    """Out-of-fold probabilities for a fixed model family trained on growing fractions of each outer-training part (same outer splits as nested_oof)."""
    assert not set(core.LEAK) & set(X.columns), "leakage column in model inputs"
    splits = list(RepeatedStratifiedKFold(n_splits=OUTER_SPLITS, n_repeats=repeats, random_state=seed).split(X, y))
    gen = Parallel(n_jobs=jobs, return_as="generator")(delayed(_lc_task)(i, tr, te, X, y, name, seed) for i, (tr, te) in enumerate(splits))
    oof, ntr = {f: np.zeros((repeats, len(y))) for f in FRACTIONS}, {f: [] for f in FRACTIONS}
    for i, te, out in gen:
        for f, (k, p) in out.items(): oof[f][i // OUTER_SPLITS, te] = p; ntr[f].append(k)
        if tick: tick()
    return {f: {"oof": oof[f].mean(0), "n_train": float(np.mean(ntr[f]))} for f in FRACTIONS}


# ---- experiment 3: weak-vessel analysis
def lc_verdict(t, pts, d_half, d_3q):
    a, b = pts[0], pts[-1]
    rise = f"AUC for {t} went from {_auc_txt(a['roc_auc'])} with about {a['n_train']:.0f} training patients to {_auc_txt(b['roc_auc'])} with about {b['n_train']:.0f}"
    if d_half["value"] > 0 and not d_half["within_noise"]:
        tail = ("the last step (75% to 100% of the data) is within noise, so the curve may be flattening" if d_3q["within_noise"] else
                "it was still rising at the largest size, so a bigger cohort would plausibly help further")
        return f"{rise}. Going from 50% to 100% of the data added {_sg(d_half['value'])} AUC (95% CI {_ci(d_half['ci95'])}), beyond noise: more data helped here; {tail}."
    if d_half["value"] > 0:
        return (f"{rise}. The gain from 50% to 100% of the data ({_sg(d_half['value'])}, 95% CI {_ci(d_half['ci95'])}) is within noise: this cohort cannot show that more data helps, "
                "and cannot show that it does not.")
    return f"{rise}. Going from 50% to 100% of the data changed AUC by {_sg(d_half['value'])} (95% CI {_ci(d_half['ci95'])}): no sign that more patients alone would fix this with the current inputs."


def weak_takeaway(t, T, ref):
    m = T["metrics"]["roc_auc"]; d = T["delta_auc_vs_LAD"]; f = T["fold_auc"]
    s1 = f"{t} reaches AUC {_auc_txt(m)}; against LAD ({_auc_txt(ref['metrics']['roc_auc'])}) the difference is {_sg(d['value'])} (95% CI {_ci(d['ci95'])}), {'within noise' if d['within_noise'] else 'beyond noise: genuinely harder to rank in this cohort'}."
    s2 = f"AUC across the {len(f['values'])} outer folds ranges {f['min']:.2f} to {f['max']:.2f} (SD {f['sd']:.2f}; LAD SD {ref['fold_auc']['sd']:.2f})."
    tier, txt = _tier(m["ci95"][0])
    return f"{s1} {s2} {T['learning_curve']['verdict']} What this means for triage: vessel-specific ranking for {t} is {tier} here; {txt}."


def run_weak(X, Y, p, jobs, tick):
    n, nf, seed = len(X), X.shape[1], p["seed"]
    idx = np.random.default_rng([seed, 3]).integers(0, n, (p["boot"], n))        # shared resamples: paired differences between vessels
    targets, ref, reg = {}, None, {}
    for t in WEAK_TARGETS:
        y = Y[t].to_numpy(int); pos = int(y.sum()); neg = n - pos
        r = full_oof(X, y, t, seed, p["repeats"], jobs, tick)
        summ, pt, bt = summarise(y, r["oof"], idx)
        pick = max(r["picks"], key=r["picks"].get)
        lc = learning_curve_oof(X, y, pick, seed, p["repeats"], jobs, tick); pts, lcv = [], {}
        for fr in FRACTIONS:
            s, a, b = summarise(y, lc[fr]["oof"], idx); lcv[fr] = (a, b)
            pts.append({"fraction": fr, "n_train": round(lc[fr]["n_train"], 1), "roc_auc": s["roc_auc"]})
        d_half, d_3q = paired_delta(*lcv[1.0], *lcv[0.5]), paired_delta(*lcv[1.0], *lcv[0.75])
        fa = np.array(r["fold_aucs"]); others = [v for v in VESSELS if v != t]
        T = {"role": "reference" if t == "LAD" else "weak", "n": n, "positives": pos, "negatives": neg, "prevalence": _r(pos / n, 3), "prevalence_ci95": wilson(pos, n),
             "minority_class_n": min(pos, neg), "minority_per_feature": _r(min(pos, neg) / nf, 2),
             "co_occurrence": {v: {"n": int(((y == 1) & (Y[v].to_numpy(int) == 1)).sum()), "share_of_positives": _r(((y == 1) & (Y[v].to_numpy(int) == 1)).sum() / pos, 3)} for v in others},
             "metrics": summ, "selected_model_counts": r["picks"], "delta_auc_vs_LAD": None if ref is None else paired_delta(pt, bt, *ref["_pb"]),
             "fold_auc": {"values": [_r(v) for v in fa], "mean": _r(fa.mean()), "sd": _r(fa.std(ddof=1)), "min": _r(fa.min()), "max": _r(fa.max())},
             "learning_curve": {"model": pick, "model_label": FAMILY_LABEL[pick], "points": pts, "delta_full_vs_half": d_half, "delta_full_vs_three_quarter": d_3q, "verdict": lc_verdict(t, pts, d_half, d_3q)}}
        if ref is None: ref = {"_pb": (pt, bt), **T}
        else: T["triage_takeaway"] = weak_takeaway(t, T, ref)
        targets[t] = T
    targets["LAD"]["triage_takeaway"] = (f"LAD is the reference: AUC {_auc_txt(targets['LAD']['metrics']['roc_auc'])}. It is shown so the weaker vessels can be judged against the best-ranked artery. "
                                          "What this means for triage: use it as the yardstick, not as a vessel to act on.")
    weak = [t for t in ("LCX", "RCA")]
    lcx, rca, lad = targets["LCX"], targets["RCA"], targets["LAD"]
    why = [{"kind": "measured", "title": "Fewer positive examples",
            "text": (f"{lcx['positives']} of {n} patients have LCX stenosis ({_pc(lcx['prevalence'])}) and {rca['positives']} have RCA stenosis ({_pc(rca['prevalence'])}), against {lad['positives']} ({_pc(lad['prevalence'])}) for LAD. "
                      f"The rarer class that limits what a model can learn is similar for all three (LCX {lcx['minority_class_n']}, RCA {rca['minority_class_n']}, LAD {lad['minority_class_n']} patients; about {lcx['minority_per_feature']:.1f} per input feature), so class balance alone is a partial explanation at best.")},
           {"kind": "measured", "title": "Arteries are diseased together",
            "text": (f"{_pc(lcx['co_occurrence']['LAD']['share_of_positives'])} of LCX-positive and {_pc(rca['co_occurrence']['LAD']['share_of_positives'])} of RCA-positive patients also have LAD stenosis. "
                      "A plausible reading, not tested here: most inputs (age, diabetes, lipids, ejection fraction) signal how much disease a patient has overall rather than which artery carries it, so they may say little about LCX or RCA specifically.")},
           {"kind": "not_tested", "title": "The inputs see the heart coarsely",
            "text": "The ECG and echo inputs here record whether something is abnormal and how many wall regions move poorly, not which wall. The lateral and posterior wall (LCX) and inferior wall (RCA) typically leave a fainter standard-ECG signature than the anterior wall (LAD). This is general clinical reasoning; the dataset cannot test it."},
           {"kind": "not_tested", "title": "A yes/no label at 50% is noisy",
            "text": "A vessel counts as stenotic at 50% narrowing, a cut-off that is read by eye on the angiogram. Borderline vessels can flip labels, and that blurs a small cohort most for the vessels with the weakest signal. Not measurable here."}]
    gap = [t for t in weak if not targets[t]["delta_auc_vs_LAD"]["within_noise"] and targets[t]["delta_auc_vs_LAD"]["value"] < 0]
    helped = [t for t in weak if targets[t]["learning_curve"]["delta_full_vs_half"]["value"] > 0 and not targets[t]["learning_curve"]["delta_full_vs_half"]["within_noise"]]
    s1 = (f"{' and '.join(gap)} rank{'s' if len(gap) == 1 else ''} worse than LAD by more than sampling noise." if gap else "Neither LCX nor RCA is clearly worse than LAD beyond sampling noise in this run.")
    s2 = (f"More training data helped beyond noise for {' and '.join(helped)}." if helped else "For neither vessel did more training data help beyond noise, so the limit looks more like the information in the inputs than the cohort size, though a 303-patient cohort cannot rule out small gains.")
    return {"targets": targets, "why": why, "overall_takeaway": f"{s1} {s2} Triage framing: treat LCX and RCA estimates as weak hints for prioritisation, never as vessel diagnoses.",
            "protocol": EXTRA_PROTOCOL["weakvessel"]}


# ---- experiment 4: subgroup check by sex and age band
def _subgroups(X):
    age, sex = X["Age"].to_numpy(float), X["Sex"].to_numpy(float)
    return ([("All patients", "All", np.ones(len(X), bool))] + [(l, "Sex", sex == v) for l, v in SEX_GROUPS] + [(l, "Age band", (age >= lo) & (age <= hi)) for l, lo, hi in AGE_BANDS])


def group_stats(y, oof, mask, boot, rng_seed):
    yy, pp = y[mask], oof[mask]; n = len(yy); pos = int(yy.sum()); neg = n - pos; minc = min(pos, neg); pred = pp > THRESHOLD
    tp, tn = int((pred & (yy == 1)).sum()), int((~pred & (yy == 0)).sum())
    auc = None
    if minc >= MIN_CLASS:
        s, _, _ = summarise(yy, pp, np.random.default_rng(rng_seed).integers(0, n, (boot, n))); auc = s["roc_auc"]
    small = n < SMALL_N or minc < SMALL_CLASS
    warns = ([f"Too few patients in one class (rarer class n={minc}, minimum {MIN_CLASS}): AUC not estimated."] if minc < MIN_CLASS else []) + \
            ([f"Small group (n={n}, rarer class n={minc}): treat as anecdotal; intervals are wide."] if small and minc >= MIN_CLASS else [])
    return {"n": n, "positives": pos, "negatives": neg, "small": bool(small), "auc_estimated": auc is not None, "warnings": warns,
            "metrics": {"prevalence": _est(pos, n), "roc_auc": auc, "sensitivity": _est(tp, pos), "specificity": _est(tn, neg)}}


def _overlap(ivals): return all(a[0] <= b[1] and b[0] <= a[1] for i, a in enumerate(ivals) for b in ivals[i + 1:])


def subgroup_takeaway(t, groups):
    g = [x for x in groups if x["dimension"] != "All"]
    s1 = f"For {t}: " + "; ".join(f"{x['label']} n={x['n']} ({x['positives']} positive, {_pc(x['metrics']['prevalence']['value'])})" for x in g) + "."
    sm = [x["label"] for x in g if x["small"]]
    s2 = (f"Flagged as small: {', '.join(sm)}; estimates there are anecdotal." if sm else "No group is flagged as small, but the intervals still show how uncertain each estimate is.")
    parts = []
    for dim in ("Sex", "Age band"):
        iv = [x["metrics"]["roc_auc"]["ci95"] for x in g if x["dimension"] == dim and x["metrics"]["roc_auc"]]
        if len(iv) >= 2: parts.append(f"AUC intervals by {dim.lower()} " + ("all overlap, so this cohort cannot show a difference in ranking between them." if _overlap(iv) else "do not all overlap; this was not tested, was not corrected for several comparisons, and may be chance."))
    return f"{s1} {s2} {' '.join(parts)} What this means for triage: this is a descriptive check, not evidence that the estimates work equally well for any group; confirm in a larger, external cohort before relying on them for a specific group."


def run_subgroups(X, Y, p, jobs, tick):
    n, seed, targets = len(X), p["seed"], {}
    defs = _subgroups(X)
    for ti, t in enumerate(core.TARGETS):
        y = Y[t].to_numpy(int); r = full_oof(X, y, t, seed, p["repeats"], jobs, tick); groups = []
        for gi, (label, dim, mask) in enumerate(defs):
            groups.append({"label": label, "dimension": dim, **group_stats(y, r["oof"], mask, p["boot"], [seed, ti, gi, 4])})
        targets[t] = {"n": n, "positives": int(y.sum()), "prevalence": _r(y.mean(), 3), "groups": groups, "triage_takeaway": subgroup_takeaway(t, groups)}
    small = [l for l, d, _ in defs if d != "All" and any(x["small"] for t in targets.values() for x in t["groups"] if x["label"] == l)]
    return {"targets": targets, "thresholds": {"small_n": SMALL_N, "small_class": SMALL_CLASS, "min_class": MIN_CLASS},
            "overall_takeaway": (f"Descriptive only. Groups flagged as small for at least one target: {', '.join(small)}. " if small else "Descriptive only. ") +
                                "Differences between subgroups are not tested and should be read as hypotheses at most. Triage framing: no subgroup result here should change how a patient is prioritised.",
            "protocol": EXTRA_PROTOCOL["subgroups"]}


# ---- experiment 5: calibration
def _band_rows(y, pr, ids, labels, edges):
    n, rows = len(y), []
    for b, lab in enumerate(labels):
        m = ids == b; k = int(m.sum()); pos = int(y[m].sum())
        rows.append({"band": lab, "lo": edges[b], "hi": edges[b + 1], "n": k, "share_of_cohort": _r(k / n, 3), "positives": pos,
                     "observed": _r(pos / k, 3) if k else None, "observed_ci95": wilson(pos, k), "mean_predicted": _r(pr[m].mean(), 3) if k else None, "small": k < SMALL_BIN})
    return rows


def cal_takeaway(t, T):
    c, s, b = T["citl"], T["slope"], T["brier_skill"]; mp, ob = T["mean_predicted"], T["prevalence"]
    if c["differs_from_0"]: s1 = f"For {t}, the average predicted risk is {_pc(mp)} against {_pc(ob)} observed: a clear {'over' if c['value'] > 0 else 'under'}estimate on average (difference {_sg(c['value'])}, 95% CI {_ci(c['ci95'])})."
    else: s1 = f"For {t}, the average predicted risk ({_pc(mp)}) is close to the observed rate ({_pc(ob)}); the gap is within noise."
    sl = f"slope {s['value']:.2f}, 95% CI {s['ci95'][0]:.2f} to {s['ci95'][1]:.2f}"
    if s["ci95"][1] < 1: s2 = f"Estimates are too extreme ({sl}): high scores are less certain and low scores less reassuring than they look."
    elif s["ci95"][0] > 1: s2 = f"Estimates are too cautious ({sl}): the real separation between low and high scores is larger than the scores suggest."
    else: s2 = f"No clear over- or under-confidence ({sl}, interval includes 1), though this sample cannot rule out moderate miscalibration."
    s3 = f"Brier score {T['brier']['value']:.3f} versus {T['brier_reference']:.3f} for giving every patient the cohort average; skill {_sg(b['value'])} (95% CI {_ci(b['ci95'])}), {'within noise: not clearly better than the average' if b['within_noise'] else 'beyond noise'}."
    used = [r for r in T["triage_bands"] if r["n"]]; hi, lo = used[-1], used[0]
    s4 = (f"In the highest populated band ({hi['band']}), {hi['positives']} of {hi['n']} patients ({_pc(hi['observed'])}) truly had {t}; in the lowest ({lo['band']}), {lo['positives']} of {lo['n']} ({_pc(lo['observed'])}) did"
          + (", so a low score does not rule disease out." if lo["positives"] else "."))
    return f"{s1} {s2} {s3} {s4} What this means for triage: use bands as a coarse ordering and check the counts and intervals in each band before reading them as probabilities."


def run_calibration(X, Y, p, jobs, tick):
    n, seed, targets = len(X), p["seed"], {}
    for ti, t in enumerate(core.TARGETS):
        y = Y[t].to_numpy(int); r = full_oof(X, y, t, seed, p["repeats"], jobs, tick); pr = np.clip(r["oof"], 0.0, 1.0)
        idx = np.random.default_rng([seed, 5, ti]).integers(0, n, (p["boot"], n)); yb, pb = y[idx], pr[idx]
        base = float(y.mean()); ref_b = ((base - yb) ** 2).mean(1); br_b = batch_brier(yb, pb); br = float(batch_brier(y, pr)[0]); ref = float(((base - y) ** 2).mean())
        sk = 1 - br / ref; sk_b = 1 - br_b / ref_b; sl = float(batch_cal_slope(y, pr)[0]); sl_b = batch_cal_slope(yb, pb); citl = float(pr.mean() - base); citl_b = pb.mean(1) - yb.mean(1)
        rng = lambda a, q=(2.5, 97.5): [_r(v) for v in np.nanpercentile(a, q)]
        summ, _, _ = summarise(y, pr, idx)
        edges = [round(v, 2) for v in np.linspace(0, 1, CAL_BINS + 1)]
        rel = _band_rows(y, pr, np.minimum((pr * CAL_BINS).astype(int), CAL_BINS - 1), [f"{edges[i]:.1f}-{edges[i + 1]:.1f}" for i in range(CAL_BINS)], edges)
        tri = _band_rows(y, pr, np.digitize(pr, BAND_EDGES), BAND_LABELS, [0.0] + BAND_EDGES + [1.0])
        for row in tri: row["sentence"] = (f"Of {row['n']} patients in the {row['band']} band, {row['positives']} ({_pc(row['observed'])}) truly had {t}." if row["n"] else f"No patients in the {row['band']} band.")
        c = {"n": n, "positives": int(y.sum()), "prevalence": _r(base, 3), "mean_predicted": _r(pr.mean(), 3), "roc_auc": summ["roc_auc"],
             "brier": {"value": _r(br), "ci95": rng(br_b)}, "brier_reference": _r(ref), "brier_skill": {"value": _r(sk), "ci95": rng(sk_b), "within_noise": bool(rng(sk_b)[0] <= 0 <= rng(sk_b)[1])},
             "slope": {"value": _r(sl), "ci95": rng(sl_b), "differs_from_1": bool(not rng(sl_b)[0] <= 1 <= rng(sl_b)[1])},
             "citl": {"value": _r(citl), "ci95": rng(citl_b), "differs_from_0": bool(not rng(citl_b)[0] <= 0 <= rng(citl_b)[1])},
             "reliability": rel, "triage_bands": tri, "selected_model_counts": r["picks"]}
        c["triage_takeaway"] = cal_takeaway(t, c); targets[t] = c
    bad = [t for t in core.TARGETS if targets[t]["slope"]["differs_from_1"] or targets[t]["citl"]["differs_from_0"]]
    return {"targets": targets, "overall_takeaway": (f"Calibration is off beyond noise for {', '.join(bad)} (average level or slope); " if bad else "No target shows calibration off beyond noise; ") +
            "read the model outputs as risk scores, and use the per-band counts below rather than the raw percentage. Triage framing: bands support ordering patients, not quoting a probability of disease.",
            "protocol": EXTRA_PROTOCOL["calibration"]}


EXPERIMENTS = {
    "ablation": {"title": "Feature-group ablation", "run": run_ablation,
                 "description": "Cumulative non-invasive data: demographics & history, then + labs, + ECG, + echo, for CAD, LAD, LCX and RCA."},
    "models": {"title": "Model comparison", "run": run_models,
               "description": "Logistic regression vs random forest vs gradient boosting on the full non-invasive feature set."},
    "weakvessel": {"title": "Weak-vessel analysis (LCX / RCA)", "run": run_weak,
                   "description": "Why LCX and RCA rank worse than LAD: class balance, fold-to-fold variance, a learning curve (does more data help?) and plain-language reasons."},
    "subgroups": {"title": "Subgroup check (sex and age band)", "run": run_subgroups,
                  "description": "Descriptive only: prevalence and out-of-fold performance by sex and age band, with sample sizes and small-group warnings."},
    "calibration": {"title": "Calibration and triage bands", "run": run_calibration,
                    "description": "Reliability curve, Brier score and calibration slope, plus how many patients in each probability band truly had CAD."},
}
DEFAULTS = {"seed": 0, "repeats": 2, "boot": 1000}


# ------------------------------------------------------------------ data, params, manifest
_DATA = {}


def _data_path(): return H / "data.xlsx"


def load_data():
    """(X, Y, sha256). Parsed once per data hash."""
    path = _data_path()
    if not path.is_file(): raise FileNotFoundError("data.xlsx not found")
    sha = sha256_file(path)
    if sha not in _DATA:
        _DATA.clear(); X, Y = core.load(path); check_groups(X.columns); _DATA[sha] = (X, Y)
    return _DATA[sha][0], _DATA[sha][1], sha


def clean_params(experiment, seed=None, repeats=None, boot=None):
    if experiment not in EXPERIMENTS: raise ValueError(f"unknown experiment '{experiment}'")
    seed = DEFAULTS["seed"] if seed is None else int(seed)
    repeats = DEFAULTS["repeats"] if repeats is None else int(repeats)
    boot = DEFAULTS["boot"] if boot is None else int(boot)
    if not 0 <= seed <= 2 ** 31 - 1000: raise ValueError("seed out of range")
    if not 1 <= repeats <= 5: raise ValueError("repeats must be 1-5")
    if not 200 <= boot <= 2000: raise ValueError("boot must be 200-2000")
    return {"seed": seed, "repeats": repeats, "boot": boot, "outer_splits": OUTER_SPLITS, "inner_splits": INNER_SPLITS,
            "threshold": THRESHOLD, "protocol_version": PROTOCOL_VERSION}


def compute(experiment, params, jobs=1, tick=None):
    """Run one experiment now (blocking) and return the result with its manifest."""
    X, Y, data_sha = load_data(); code = code_hashes(); t0 = time.time()
    key = cache_key(experiment, params, data_sha, code["combined"])
    body = EXPERIMENTS[experiment]["run"](X, Y, params, jobs, tick)
    manifest = {"experiment_id": f"{experiment}-s{params['seed']}-{key[:8]}", "experiment": experiment, "cache_key": key, "params": params,
                "seed": params["seed"], "created_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                "runtime_seconds": round(time.time() - t0, 1), "data_file": "data.xlsx", "data_sha256": data_sha, "code_sha256": code,
                "libraries": library_versions(), "n_rows": int(len(X)), "n_features": int(X.shape[1]),
                "inputs_exclude": core.LEAK, "outputs": core.TARGETS}
    return {"experiment": experiment, "title": EXPERIMENTS[experiment]["title"], "disclaimer": DISCLAIMER, "notes": NOTES[:-1] + EXTRA_NOTES.get(experiment, []) + NOTES[-1:],
            "protocol": ("Stratified nested CV: outer repeated 5-fold (shared splits, fixed seed); inner 3-fold ROC-AUC selection on training parts only; "
                         "out-of-fold probabilities averaged over repeats, threshold 0.5; percentile bootstrap 95% CIs over patients with paired resamples."),
            **body, "manifest": manifest}


# ------------------------------------------------------------------ disk cache
def _cache_path(key): return CACHE_DIR / f"{key}.json"


def cache_get(key):
    try:
        r = json.loads(_cache_path(key).read_text(encoding="utf-8"))
        return r if r.get("manifest", {}).get("cache_key") == key else None
    except (OSError, ValueError): return None


def cache_put(key, result):
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = _cache_path(key).with_suffix(".json.tmp"); tmp.write_text(json.dumps(result), encoding="utf-8"); os.replace(tmp, _cache_path(key))
        return True
    except OSError: return False        # read-only deploy: the in-memory job still serves the result


def _key_for(experiment, params):
    _, _, data_sha = load_data(); return cache_key(experiment, params, data_sha, code_hashes()["combined"])


def cached_result(experiment, seed=None, repeats=None, boot=None):
    return cache_get(_key_for(experiment, clean_params(experiment, seed, repeats, boot)))


# ------------------------------------------------------------------ background jobs (one at a time; same request = same job)
_JOBS, _JOBS_LOCK, _RUN_LOCK = {}, threading.Lock(), threading.Lock()


def _public(job, with_result=False):
    d = job["done"]; t = job["total"]
    out = {"job_id": job["id"], "experiment": job["experiment"], "status": job["status"], "cached": job["cached"], "params": job["params"],
           "progress": {"done": d, "total": t, "fraction": round(min(1.0, d / t), 3) if t else 0.0}, "error": job["error"],
           "elapsed_seconds": round((job["ended"] or time.time()) - job["started"], 1)}
    if with_result and job["status"] == "done": out["result"] = job["result"]
    return out


def _worker(job):
    def tick():
        job["done"] = min(job["total"], job["done"] + 1)
    with _RUN_LOCK:
        job["status"], job["started"] = "running", time.time()
        try:
            res = compute(job["experiment"], job["params"], jobs=max(1, min(4, os.cpu_count() or 1)), tick=tick)
            cache_put(job["id"], res); job["result"], job["done"], job["status"] = res, job["total"], "done"
        except Exception as exc:                    # surfaced to the UI; never include paths or stack traces
            job["status"], job["error"] = "failed", f"{type(exc).__name__}: {str(exc)[:200]}"
        job["ended"] = time.time()


def start_job(experiment, seed=None, repeats=None, boot=None, force=False, background=True):
    """Return a job status dict. Identical in-flight request -> same job. Cache hit -> status 'done' immediately."""
    params = clean_params(experiment, seed, repeats, boot); key = _key_for(experiment, params)
    with _JOBS_LOCK:
        job = _JOBS.get(key)
        if job and job["status"] in ("queued", "running"): return _public(job)
        if not force and (hit := cache_get(key)) is not None:
            job = {"id": key, "experiment": experiment, "params": params, "status": "done", "cached": True, "done": 1, "total": 1, "error": None,
                   "started": time.time(), "ended": time.time(), "result": hit}
            _JOBS[key] = job; return _public(job)
        job = {"id": key, "experiment": experiment, "params": params, "status": "queued", "cached": False, "done": 0,
               "total": total_units(experiment, params["repeats"]), "error": None, "started": time.time(), "ended": None, "result": None}
        _JOBS[key] = job
        for k in [k for k, j in _JOBS.items() if j["status"] in ("done", "failed") and k != key][:-9]: _JOBS.pop(k, None)   # keep ~10 finished jobs
    if background: threading.Thread(target=_worker, args=(job,), daemon=True, name="cm-research-lab").start()
    else: _worker(job)
    return _public(job)


def job_status(job_id, with_result=True):
    job = _JOBS.get(job_id)
    return _public(job, with_result) if job else None


def meta():
    X, _, data_sha = load_data()
    return {"title": "Cardiac Research Lab", "use_case": "Pre-angiography triage", "disclaimer": DISCLAIMER, "notes": NOTES,
            "question": "Using only non-invasive data, who likely has significant CAD (>=50% stenosis), and in which vessel, before an invasive angiogram?",
            "targets": core.TARGETS, "inputs_exclude": core.LEAK, "data_sha256": data_sha, "n_rows": int(len(X)), "n_features": int(X.shape[1]),
            "groups": [{"id": g, "label": l, "step_label": STEP_LABEL[g], "n_features": len(f), "features": f} for g, l, f in GROUPS],
            "models": [{"id": k, "label": v} for k, v in FAMILY_LABEL.items()], "metrics": METRICS, "defaults": DEFAULTS,
            "limits": {"seed": [0, 2 ** 31 - 1000], "repeats": [1, 5], "boot": [200, 2000]},
            "subgroup_thresholds": {"small_n": SMALL_N, "small_class": SMALL_CLASS, "min_class": MIN_CLASS}, "age_bands": [b[0] for b in AGE_BANDS],
            "triage_bands": BAND_LABELS, "learning_fractions": list(FRACTIONS),
            "experiments": [{"id": k, "title": v["title"], "description": v["description"], "total_units": total_units(k, DEFAULTS["repeats"])} for k, v in EXPERIMENTS.items()]}


# ------------------------------------------------------------------ HTTP layer (FastAPI imported lazily, like nexttest.make_router)
def make_router():
    from typing import Optional
    from fastapi import APIRouter, HTTPException
    from pydantic import ConfigDict, Field, create_model
    router = APIRouter(prefix="/api/research-lab", tags=["research-lab"])
    Run = create_model("ResearchLabRun", __config__=ConfigDict(extra="forbid"), experiment=(str, ...), seed=(Optional[int], Field(None, ge=0, le=2 ** 31 - 1000)),
                       repeats=(Optional[int], Field(None, ge=1, le=5)), boot=(Optional[int], Field(None, ge=200, le=2000)), force=(bool, False))

    def guard(fn, *a, **k):
        try: return fn(*a, **k)
        except FileNotFoundError as exc: raise HTTPException(503, str(exc))
        except ValueError as exc: raise HTTPException(422, str(exc))

    @router.get("/meta")
    def meta_endpoint(): return guard(meta)

    @router.post("/run")
    def run_endpoint(body: Run): return guard(start_job, body.experiment, body.seed, body.repeats, body.boot, body.force)

    @router.get("/status/{job_id}")
    def status_endpoint(job_id: str, result: bool = True):
        s = job_status(job_id, result)
        if s is None: raise HTTPException(404, "Unknown job. POST /api/research-lab/run first.")
        return s

    @router.get("/result")
    def result_endpoint(experiment: str, seed: Optional[int] = None, repeats: Optional[int] = None, boot: Optional[int] = None):
        r = guard(cached_result, experiment, seed, repeats, boot)
        if r is None: raise HTTPException(404, "No cached result for these parameters. POST /api/research-lab/run to compute it.")
        return r

    return router
