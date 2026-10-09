"""Next-Best-Test: which missing input would most change or sharpen the model's estimate?

POST /nexttest/rank  (profile with any subset of the UI inputs)

Method (model-based, descriptive; not a clinical test recommendation):
  1. Find the K_NB most similar dataset records (Gower distance on supplied inputs only).
  2. Their observed values of a MISSING input form an empirical conditional distribution.
  3. For each missing input, re-score the profile with each plausible value (one batched call
     per model) and measure: expected absolute probability shift, chance the estimate crosses
     50%, and expected change in the 80% bootstrap range width.
The primary model, training and /predict response are untouched. Pure logic has no FastAPI import
(so tests and the stdlib mock server can use it); make_router() builds the FastAPI router lazily.
"""
# NOTE: do NOT add `from __future__ import annotations` here: make_router() builds its request
# model locally and FastAPI cannot resolve a string annotation to a local name (every call -> 422).
from functools import lru_cache
from pathlib import Path
import numpy as np
import core

H = Path(__file__).parent
K_NB = 40          # neighbours that define the conditional distribution of a missing input
MIN_INPUTS = 6     # fewer inputs give meaningless neighbours
MAX_VALUES = 6     # numeric inputs are summarised by at most this many quantile values
VESSELS = ["LAD", "LCX", "RCA"]
NOTE = ("Model-based what-if on a 303-record dataset: it shows which unknown input the model is most "
        "sensitive to, using values seen in similar records. It is not advice to order any test, not a "
        "diagnosis, and not independent validation (the model was fitted on these same records).")


@lru_cache(maxsize=1)
def load_data():
    d, _ = core.load(str(H / "data.xlsx"))
    cols = [u[1] for u in core.UI]
    mat = np.column_stack([d[c].to_numpy(dtype=float) for c in cols])
    kinds = [u[4] for u in core.UI]
    rng = np.array([float(u[6]) - float(u[5]) for u in core.UI], dtype=float)
    return mat, kinds, np.where(rng == 0, 1.0, rng)


def _gower(mat, prof, mask, kinds, rng):
    sub = np.abs(mat[:, mask] - prof[mask])
    for j, k in enumerate([k for k, m in zip(kinds, mask) if m]):
        sub[:, j] = sub[:, j] / rng[mask][j] if k == "num" else (sub[:, j] != 0)
    return sub.mean(axis=1)


def _values(vals, kind):
    """Equal-weight representative values of a neighbour column -> (values, weights)."""
    if kind == "bin" or len(np.unique(vals)) <= MAX_VALUES:
        u, c = np.unique(vals, return_counts=True)
        return u.astype(float), c / c.sum()
    q = np.quantile(vals, (np.arange(MAX_VALUES) + 0.5) / MAX_VALUES)   # quantile mid-points
    return q.astype(float), np.full(MAX_VALUES, 1.0 / MAX_VALUES)


def _wq(x, w, q):
    o = np.argsort(x)
    cw = np.cumsum(w[o])
    return float(x[o][min(int(np.searchsorted(cw, q)), len(x) - 1)])


def _width(p, reps):
    """Same definition as core.interval: 10th-90th percentile of refits, always containing p."""
    q10, q90 = np.percentile(reps, [10, 90], axis=0)
    lo, hi = np.clip(np.minimum(p, q10), 0, 1), np.clip(np.maximum(p, q90), 0, 1)
    return lo, hi, hi - lo


def rank(art, profile, data=None):
    mat, kinds, rng = data or load_data()
    ids = [u[0] for u in core.UI]
    profile = {k: float(v) for k, v in profile.items() if k in ids and v is not None}
    mask = np.array([i in profile for i in ids])
    out = {"inputs_used": [i for i in ids if i in profile], "n_total": int(mat.shape[0]), "k": K_NB, "note": NOTE}
    missing = [i for i in ids if i not in profile]
    out["inputs_missing"] = missing
    if int(mask.sum()) < MIN_INPUTS:
        return {**out, "status": "insufficient_inputs", "min_inputs": MIN_INPUTS}
    if not missing:
        return {**out, "status": "complete"}

    prof = np.array([profile.get(i, 0.0) for i in ids], dtype=float)
    nb = np.argsort(_gower(mat, prof, mask, kinds, rng), kind="stable")[:K_NB]
    X = core.row(art, profile)
    col = {u[0]: u[1] for u in core.UI}
    label = {u[0]: u[2] for u in core.UI}
    group = {u[0]: u[3] for u in core.UI}
    unit = {u[0]: u[8] for u in core.UI}

    rows, spans, info = [], {}, {}
    for f in missing:
        j = ids.index(f)
        vals, w = _values(mat[nb, j], kinds[j])
        spans[f] = (len(rows), len(rows) + len(vals), w, vals)
        info[f] = float(mat[nb, j].mean())
        for v in vals:
            r = X.copy()
            r[col[f]] = v
            rows.append(r)
    import pandas as pd
    C = pd.concat(rows, ignore_index=True)

    targets = {}
    XC = pd.concat([X, C], ignore_index=True)      # row 0 = current profile, rest = candidates: one call per model
    for t in core.TARGETS:
        m = art["models"][t]
        allp = m.predict_proba(XC)[:, 1].astype(float)
        p0, pc = float(allp[0]), allp[1:]
        reps = art.get("bootstrap", {}).get(t) or []
        if reps:
            RA = np.vstack([r.predict_proba(XC)[:, 1] for r in reps])
            lo0, hi0, w0 = _width(p0, RA[:, :1])
            _, _, wc = _width(pc, RA[:, 1:])
            iv = {"lo": float(lo0[0]), "hi": float(hi0[0]), "width": float(w0[0])}
        else:
            wc, iv = None, None
        items = []
        for f, (a, b, w, vals) in spans.items():
            p = pc[a:b]
            it = {"id": f, "label": label[f], "group": group[f], "unit": unit[f], "kind": kinds[ids.index(f)],
                  "neighbour_mean": info[f],
                  "exp_shift": float((w * np.abs(p - p0)).sum()),
                  "flip_prob": float(w[(p >= .5) != (p0 >= .5)].sum()),
                  "p_low": _wq(p, w, .1), "p_high": _wq(p, w, .9)}
            it["width_change"] = float((w * wc[a:b]).sum() - iv["width"]) if iv else None
            items.append(it)
        items.sort(key=lambda d: (-d["exp_shift"], -d["flip_prob"], d["id"]))
        for n, it in enumerate(items, 1):
            it["rank"] = n
        targets[t] = {"p": p0, "interval": iv, "ranking": items}

    vw = {t: targets[t]["interval"]["width"] for t in VESSELS if targets[t]["interval"]}
    return {**out, "status": "ok", "targets": targets,
            "most_uncertain_vessel": max(vw, key=vw.get) if vw else None,
            "method": f"{K_NB} nearest records (Gower, supplied inputs only) give plausible values for each "
                      "missing input; one batched re-score per model. Shift is measured against the current "
                      "estimate, which fills missing inputs with training medians."}


def make_router():
    from typing import Optional
    from fastapi import APIRouter, HTTPException
    from pydantic import ConfigDict, Field, create_model
    import model_cache
    router = APIRouter(prefix="/nexttest", tags=["next-best-test"])
    Profile = create_model("NextTestProfile", __config__=ConfigDict(extra="forbid"),
                           **{u[0]: (Optional[float], Field(None, ge=u[5], le=u[6])) for u in core.UI})
    Req = create_model("NextTestRequest", __config__=ConfigDict(extra="forbid"), profile=(Profile, ...))
    cache = {}

    @router.post("/rank")
    def rank_endpoint(body: Req):
        try:
            prof = body.profile.model_dump(exclude_none=True)
            key = tuple(sorted(prof.items()))
            if key in cache:
                return cache[key]
            res = rank(model_cache.load_artifact(), prof)
            if len(cache) > 64:
                cache.clear()
            cache[key] = res
            return res
        except FileNotFoundError:
            raise HTTPException(503, "Model or data.xlsx missing. Run: python train.py data.xlsx")
    return router