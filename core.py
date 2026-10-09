"""Shared schema, encoding, prediction and explanation logic (used by train.py and app.py)."""
import numpy as np, pandas as pd
LEAK = ["LAD", "LCX", "RCA", "Cath"]          # never model inputs
TARGETS = ["CAD", "LAD", "LCX", "RCA"]
DROP = ["Weight", "Length", "Exertional CP"]   # Weight/Length covered by BMI; Exertional CP is constant
YN = ["Obesity", "CRF", "CVA", "Airway disease", "Thyroid Disease", "CHF", "DLP", "Weak Peripheral Pulse",
      "Lung rales", "Systolic Murmur", "Diastolic Murmur", "Dyspnea", "Atypical", "Nonanginal", "LowTH Ang",
      "LVH", "Poor R Progression"]
# (id, dataset column, label, group, kind, min, max, step, unit) -- the single schema shared by UI, API and model
UI = [("age","Age","Age","Demographics","num",30,90,1,"y"),("sex","Sex","Male sex","Demographics","bin",0,1,1,""),
("bmi","BMI","BMI","Demographics","num",15,45,.1,"kg/m²"),
("dm","DM","Diabetes","History","bin",0,1,1,""),("htn","HTN","Hypertension","History","bin",0,1,1,""),
("smoker","Current Smoker","Current smoker","History","bin",0,1,1,""),("fh","FH","Family history","History","bin",0,1,1,""),
("dlp","DLP","Dyslipidemia","History","bin",0,1,1,""),
("bp","BP","Systolic BP","Vital signs","num",80,200,1,"mmHg"),("pr","PR","Pulse rate","Vital signs","num",40,130,1,"bpm"),
("cp","Typical Chest Pain","Typical chest pain","Symptoms","bin",0,1,1,""),("dysp","Dyspnea","Dyspnea","Symptoms","bin",0,1,1,""),
("ste","St Elevation","ST elevation","ECG","bin",0,1,1,""),("std","St Depression","ST depression","ECG","bin",0,1,1,""),
("ti","Tinversion","T inversion","ECG","bin",0,1,1,""),("lvh","LVH","LVH","ECG","bin",0,1,1,""),("qw","Q Wave","Q wave","ECG","bin",0,1,1,""),
("fbs","FBS","Fasting glucose","Laboratory","num",60,400,1,"mg/dL"),("ldl","LDL","LDL","Laboratory","num",15,250,1,"mg/dL"),
("hdl","HDL","HDL","Laboratory","num",10,120,1,"mg/dL"),("tg","TG","Triglycerides","Laboratory","num",30,1100,1,"mg/dL"),
("cr","CR","Creatinine","Laboratory","num",.4,2.5,.1,"mg/dL"),
("ef","EF-TTE","Ejection fraction","Echocardiography","num",15,65,1,"%"),
("rwma","Region RWMA","RWMA regions (count 0–4)","Echocardiography","num",0,4,1,"")]

def load(path):
    raw = pd.read_excel(path) if str(path).endswith("xlsx") else pd.read_csv(path)
    raw.columns = [c.strip() for c in raw.columns]
    need = set(LEAK) | {"Sex", "BBB", "VHD"} | set(YN) | {c[1] for c in UI}
    if need - set(raw.columns): raise SystemExit(f"Missing columns: {sorted(need - set(raw.columns))}")
    bad = {"Cath": set(raw.Cath.unique()) - {"CAD", "Normal"}} | {t: set(raw[t].unique()) - {"Stenotic", "Normal"} for t in TARGETS[1:]}
    if any(bad.values()) or raw[LEAK].isna().any().any(): raise SystemExit(f"Unparseable target values: {bad}")
    y = pd.DataFrame({"CAD": (raw.Cath == "CAD").astype(int), **{t: (raw[t] == "Stenotic").astype(int) for t in TARGETS[1:]}})
    d = raw.drop(columns=LEAK + DROP)
    for c in YN: d[c] = d[c].map({"Y": 1, "N": 0})
    d["Sex"] = d.Sex.map({"Male": 1, "Fmale": 0, "Female": 0})
    d["VHD"] = d.VHD.map({"N": 0, "mild": 1, "Moderate": 2, "Severe": 3})
    d["LBBB"], d["RBBB"] = (d.BBB == "LBBB").astype(int), (d.BBB == "RBBB").astype(int)
    d = d.drop(columns="BBB")
    if d.isna().sum().sum() != raw.drop(columns=LEAK + DROP + ["BBB"]).isna().sum().sum(): raise SystemExit("Encoding produced NaNs")
    assert not set(LEAK) & set(d.columns)
    return d.astype(float), y

def row(art, payload):
    col = {u[0]: u[1] for u in UI}
    vals = {col[k]: v for k, v in payload.items() if k in col and v is not None}
    return pd.DataFrame([{f: vals.get(f, np.nan) for f in art["features"]}])

UNCERTAINTY_NOTE = (
    "Bootstrap range reflects model variability on a 303-record dataset. "
    "It is not a clinical confidence interval or a guarantee of calibration."
)

def interval(art, X, p_by_target):
    """Return bootstrap model-variability ranges for a single prediction row.

    The primary fitted model probability is never replaced. Bootstrap replicas are
    queried only for an uncertainty range. When the artifact has no bootstrap
    replicas, return None so callers can degrade gracefully.
    """
    bootstrap = art.get("bootstrap")
    if not bootstrap:
        return None
    cutoffs = art.get("width_cutoffs", {})
    out = {}
    for target in TARGETS:
        replicas = bootstrap.get(target) or []
        if not replicas:
            return None
        vals = np.asarray([float(m.predict_proba(X)[0, 1]) for m in replicas], dtype=float)
        q10, q90 = np.percentile(vals, [10, 90])
        p = float(p_by_target[target])
        lo = float(np.clip(min(p, q10), 0.0, 1.0))
        hi = float(np.clip(max(p, q90), 0.0, 1.0))
        width = max(0.0, hi - lo)
        c = cutoffs.get(target, [0.0, 1.0])
        c1, c2 = float(c[0]), float(c[1])
        if width <= c1:
            label = "narrow range"
        elif width <= c2:
            label = "moderate range"
        else:
            label = "wide range"
        out[target] = {
            "lo": lo,
            "hi": hi,
            "width": width,
            "level": 0.8,
            "n_models": len(replicas),
            "method": "bootstrap percentile (10th-90th) of refit models",
            "range_label": label,
            "width_cutoffs": [c1, c2],
        }
    return out

def predict(art, payload):
    X, out = row(art, payload), {}
    present_features = list(X.columns[X.iloc[0].notna()])
    # Batch the existing one-feature sensitivity evaluations so the API contract and
    # exact contribution values are preserved without paying for one predict_proba
    # call per feature.
    ref_rows = None
    if present_features:
        base = np.tile(X.iloc[0].to_numpy(dtype=float), (len(present_features), 1))
        ref_rows = pd.DataFrame(base, columns=X.columns)
        for i, feature in enumerate(present_features):
            ref_rows.iat[i, X.columns.get_loc(feature)] = art["median"][feature]
    for t in TARGETS:
        m = art["models"][t]; c = {}
        p = float(m.predict_proba(X)[0, 1])
        if present_features:
            # Keep the original scalar sensitivity arithmetic for LogisticRegression so
            # the existing contribution floats remain byte-for-byte stable. Tree
            # ensembles are safe to evaluate in a batch and gain most of the latency win.
            est_name = type(m[-1]).__name__
            if est_name == "LogisticRegression":
                pp = float(np.clip(p, 1e-6, 1 - 1e-6))
                logit_p = np.log(pp / (1 - pp))
                for f in present_features:
                    r = X.copy(); r[f] = art["median"][f]
                    q = float(np.clip(m.predict_proba(r)[0, 1], 1e-6, 1 - 1e-6))
                    c[f] = float(logit_p - np.log(q / (1 - q)))
            else:
                batch = pd.concat([X, ref_rows], ignore_index=True)
                probs = np.clip(m.predict_proba(batch)[:, 1].astype(float), 1e-6, 1 - 1e-6)
                pp = float(np.clip(p, 1e-6, 1 - 1e-6)); logit_p = np.log(pp / (1 - pp))
                for feature, q in zip(present_features, probs[1:]):
                    c[feature] = float(logit_p - np.log(q / (1 - q)))
        out[t] = {"p": p, "c": c}
    ranges = interval(art, X, {t: out[t]["p"] for t in TARGETS})
    for t in TARGETS:
        out[t]["interval"] = ranges[t] if ranges is not None else None
        out[t]["uncertainty_note"] = UNCERTAINTY_NOTE
    return out



_EXPLAINERS = {}   # (id(art), target) -> fitted SHAP explainer; building one per request was the main /predict cost
_EXPL_LOCK = __import__("threading").Lock()


def _cached_explainer(art, target, build):
    key = (id(art), target)
    ex = _EXPLAINERS.get(key)
    if ex is None:
        with _EXPL_LOCK:
            ex = _EXPLAINERS.get(key)
            if ex is None:
                if len(_EXPLAINERS) > 16: _EXPLAINERS.clear()   # artifact reloaded after retraining; drop stale entries
                ex = _EXPLAINERS[key] = build()
    return ex


def _shap_explain_target(art, target, Xrow, payload=None, background=None):
    """Compute real SHAP values for the fitted estimator inside its preprocessing pipeline.

    LogisticRegression uses SHAP's LinearExplainer (exact in the model's linear
    output/log-odds space). Tree ensembles use TreeExplainer. The UI reports the
    native model-output space rather than pretending the values are causal.
    """
    try:
        import shap
    except ImportError as exc:
        raise RuntimeError("SHAP is not installed. Run: pip install -r requirements.txt") from exc

    model = art["models"][target]
    prep = model[:-1]
    estimator = model[-1]
    Xt = prep.transform(Xrow)

    kind = type(estimator).__name__
    if kind == "LogisticRegression":
        if background is None or len(background) == 0:
            # A single stored training-median row is still a valid exact linear
            # SHAP reference, but the trained background is preferred.
            background = pd.DataFrame([{f: art["median"][f] for f in art["features"]}])
        explainer = _cached_explainer(art, target, lambda: shap.LinearExplainer(estimator, prep.transform(background)))
        explanation = explainer(Xt)
        values = np.asarray(explanation.values)[0]
        base = np.asarray(explanation.base_values).reshape(-1)[0]
        output_space = "log-odds"
        method = "SHAP LinearExplainer (exact linear-model decomposition)"
    else:
        # Tree SHAP gives exact tree-path decompositions for tree ensembles.
        explainer = _cached_explainer(art, target, lambda: shap.TreeExplainer(
            estimator,
            feature_perturbation="tree_path_dependent",
            model_output="raw",
        ))
        explanation = explainer(Xt)
        values = np.asarray(explanation.values)
        base_arr = np.asarray(explanation.base_values)
        # RandomForestClassifier exposes one SHAP vector per class; use class 1.
        if values.ndim == 3:
            values = values[0, :, 1]
            base = float(base_arr[0, 1] if base_arr.ndim >= 2 else base_arr.reshape(-1)[1])
        else:
            values = values[0]
            base = float(base_arr.reshape(-1)[0])
        output_space = "log-odds" if kind == "GradientBoostingClassifier" else "probability"
        method = "SHAP TreeExplainer (exact Tree SHAP decomposition)"

    records = _shap_records(art, values, payload)
    total = float(sum(r["value"] for r in records))
    base = float(base)
    in_logit = output_space == "log-odds"
    sig = lambda z: float(1.0 / (1.0 + np.exp(-z)))
    out_val = base + total
    try:
        model_p = float(model.predict_proba(Xrow)[0, 1])
    except Exception:
        model_p = None
    return {
        "target": target,
        "model": kind,
        "method": method,
        "output_space": output_space,
        "base_value": base,
        "output_value": out_val,                      # base + sum(SHAP) = model output for this case
        "sum_shap": total,
        "base_probability": sig(base) if in_logit else base,
        "output_probability": sig(out_val) if in_logit else out_val,
        "model_probability": model_p,
        "n_features": len(records),
        "records": records,                           # sorted by |SHAP|, rank starts at 1
        "limitations": [
            "SHAP explains the fitted predictive model; it is not a causal effect.",
            "Values describe model output relative to the SHAP reference/background.",
        ],
    }


def _fmt_input(meta, submitted, median):
    """Human-readable submitted value + unit; falls back to the training median when not entered."""
    if submitted is None:
        m = float(median)
        return (("Yes" if m >= .5 else "No") if (meta and meta[4] == "bin") else f"{m:g}") + " (median)", True
    if meta and meta[4] == "bin":
        if meta[0] == "sex":
            return ("Male" if submitted else "Female"), False
        return ("Yes" if submitted else "No"), False
    unit = f" {meta[8]}" if meta and meta[8] else ""
    return f"{float(submitted):g}{unit}", False


def _shap_records(art, values, payload=None):
    """One record per model feature: value, direction, share of total |SHAP|, shown input, rank."""
    recs, payload = [], payload or {}
    for feature, value in zip(art["features"], values):
        value = float(value)
        if not np.isfinite(value):
            continue
        meta = next((u for u in UI if u[1] == feature), None)
        submitted = payload.get(meta[0]) if meta else None
        shown, is_default = _fmt_input(meta, submitted, art["median"][feature])
        recs.append({
            "feature": feature,
            "label": meta[2] if meta else feature,
            "submitted_value": submitted,
            "display_value": shown,
            "unit": meta[8] if meta else "",
            "is_default": is_default,
            "value": value,
            "abs_value": abs(value),
            "direction": "up" if value > 0 else ("down" if value < 0 else "none"),
        })
    recs.sort(key=lambda r: r["abs_value"], reverse=True)
    tot = sum(r["abs_value"] for r in recs) or 1.0
    for i, r in enumerate(recs, 1):
        r["rank"], r["share_pct"] = i, round(100 * r["abs_value"] / tot, 1)
    return recs


def explain_shap(art, payload):
    """Return real SHAP explanations for all four fitted target models."""
    Xrow = row(art, payload)
    bg = None
    raw_bg = art.get("shap_background")
    if raw_bg:
        bg = pd.DataFrame(raw_bg, columns=art["features"])
    targets = {}
    errors = {}
    for target in TARGETS:
        try:
            targets[target] = _shap_explain_target(art, target, Xrow, payload, bg)
        except Exception as exc:
            errors[target] = str(exc)
            targets[target] = {
                "target": target,
                "model": type(art["models"][target][-1]).__name__,
                "method": "unavailable",
                "output_space": "unknown",
                "base_value": None,
                "records": [],
                "error": str(exc),
            }
    return {
        "method": "Real SHAP",
        "targets": targets,
        "status": "available" if not errors else "partial",
        "errors": errors,
    }


def global_shap(art, X):
    """Global importance = mean |SHAP| per feature over the rows of X, for every target.

    Uses the same explainers as the per-patient view (LinearExplainer for logistic regression, path-dependent
    TreeExplainer for tree ensembles), so global and local numbers are on the same scale. Output spaces differ by
    model (log-odds for logreg/GB, probability for RF), so each target also reports share_pct: that feature's
    percentage of the target's total mean |SHAP|, which is comparable across features within a target.
    SHAP describes the fitted model, not causation.
    """
    try:
        import shap
    except ImportError as exc:
        raise RuntimeError("SHAP is not installed. Run: pip install -r requirements.txt") from exc
    X = pd.DataFrame(X)[art["features"]].astype(float)
    raw_bg = art.get("shap_background")
    bg = pd.DataFrame(raw_bg, columns=art["features"]) if raw_bg else pd.DataFrame([{f: art["median"][f] for f in art["features"]}])
    targets = {}
    for target in TARGETS:
        model = art["models"][target]; prep, est = model[:-1], model[-1]; kind = type(est).__name__
        Xt = prep.transform(X)
        if kind == "LogisticRegression":
            vals = np.asarray(shap.LinearExplainer(est, prep.transform(bg))(Xt).values)
            space = "log-odds"
        else:
            vals = np.asarray(shap.TreeExplainer(est, feature_perturbation="tree_path_dependent", model_output="raw")(Xt).values)
            if vals.ndim == 3: vals = vals[:, :, 1]            # RandomForest: one vector per class, use class 1
            space = "log-odds" if kind == "GradientBoostingClassifier" else "probability"
        mean_abs = np.nan_to_num(np.abs(vals).mean(axis=0))
        tot = float(mean_abs.sum()) or 1.0
        rows = []
        for feature, m in zip(art["features"], mean_abs):
            meta = next((u for u in UI if u[1] == feature), None)
            rows.append({"feature": feature, "label": meta[2] if meta else feature, "group": meta[3] if meta else "Other findings",
                         "unit": meta[8] if meta else "", "mean_abs": round(float(m), 5), "share_pct": round(100 * float(m) / tot, 2)})
        rows.sort(key=lambda r: r["mean_abs"], reverse=True)
        for i, r in enumerate(rows, 1): r["rank"] = i
        targets[target] = {"target": target, "model": kind, "output_space": space, "records": rows}
    return {"method": "Mean |SHAP| over training records (global importance)", "n_rows": int(len(X)), "targets": targets,
            "limitations": ["SHAP explains the fitted predictive model; it is not a causal effect.",
                            "Importance is an average over the training records, not a statement about any one patient."]}


def global_shap_cached(root, force=False):
    """global_shap() for the deployed model + full training data, cached in global_shap.json next to the model.

    The cache is keyed on model.joblib's size and mtime, so retraining invalidates it automatically. Falls back to
    the 100-record SHAP background stored in the model when data.xlsx is not shipped."""
    import json, joblib, os
    from pathlib import Path
    root = Path(root); mp, dp, cp = root / "model.joblib", root / "data.xlsx", root / "global_shap.json"
    st = mp.stat(); sig = {"model_bytes": st.st_size, "model_mtime_ns": st.st_mtime_ns}
    if not force and cp.exists():
        try:
            c = json.loads(cp.read_text(encoding="utf-8"))
            if c.get("signature") == sig: return c
        except Exception: pass
    art = joblib.load(mp)
    if dp.exists(): X, source = load(dp)[0], "the training file (data.xlsx)"
    else: X, source = pd.DataFrame(art["shap_background"], columns=art["features"]), "the 100-record background sample stored in the model"
    out = global_shap(art, X); out["source"] = source; out["signature"] = sig
    try:
        tmp = cp.with_suffix(".json.tmp"); tmp.write_text(json.dumps(out), encoding="utf-8"); os.replace(tmp, cp)
    except OSError: pass                                         # read-only deploy: still return the result
    return out


def explain(art, payload, predictions=None):
    """Return transparent one-feature log-odds sensitivity records for supplied inputs.

    This is not SHAP, a causal effect, or an additive decomposition. Values are
    generated from the fitted estimator and stored training-median reference.
    """
    predictions = predictions or predict(art, payload)
    by_col = {u[1]: u for u in UI}
    records = {}
    for target in TARGETS:
        result = predictions.get(target, {}) if isinstance(predictions, dict) else {}
        contrib = result.get("c", {}) if isinstance(result, dict) else {}
        rows = []
        for feature, value in contrib.items():
            if feature not in art.get("features", []):
                continue
            meta = by_col.get(feature)
            if meta:
                key, column, label, group, kind, lo, hi, step, unit = meta
                submitted = payload.get(key)
            else:
                label, unit, submitted = feature, "", payload.get(feature)
            try:
                number = float(value)
                if not np.isfinite(number):
                    continue
            except (TypeError, ValueError):
                continue
            rows.append({"feature": feature, "label": label, "submitted_value": submitted,
                         "reference_value": float(art["median"].get(feature)) if feature in art.get("median", {}) else None,
                         "unit": unit, "method": "One-feature log-odds sensitivity vs stored training-median reference",
                         "value": number, "direction": "higher model log-odds vs reference" if number > 0 else ("lower model log-odds vs reference" if number < 0 else "no difference at displayed precision"),
                         "limitation": "Associational model sensitivity only; not causal and not additive."})
        rows.sort(key=lambda x: abs(x["value"]), reverse=True)
        records[target] = {"target": target, "model": type(art["models"][target][-1]).__name__,
                           "probability": result.get("p"), "method": "One-feature log-odds sensitivity vs stored training-median reference",
                           "status": "available" if rows else "unavailable",
                           "reason": None if rows else "No supported explanation values were available for supplied inputs.",
                           "records": rows, "limitations": ["Not SHAP or a causal effect.", "Values are not an additive decomposition of the full prediction.", "Training-median reference is not a healthy or recommended value."]}
    return {"method": "One-feature log-odds sensitivity vs stored training-median reference", "targets": records}
