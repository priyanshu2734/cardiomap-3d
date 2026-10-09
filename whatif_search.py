"""What-Would-Change search endpoint.

POST /whatif/search   — find the smallest modifiable-input change that lowers
                        a target's primary-model probability, and compare
                        against the baseline bootstrap range.

Mirrors the case_replay.py router pattern. Does NOT call core.predict per
candidate; it calls art["models"][target].predict_proba once on a vectorised
DataFrame of all candidates (max 5 000 rows). core.predict is called only
twice: once for the baseline and once for the winning candidate.
"""
from __future__ import annotations

import math
from itertools import combinations
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

import core

H = Path(__file__).parent
router = APIRouter(prefix="/whatif", tags=["what-if search"])

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
SCHEMA = {u[0]: u for u in core.UI}

# Modifiable inputs and their "healthier direction"
# direction: -1 = lower is healthier, +1 = higher is healthier
MODIFIABLE: dict[str, int] = {
    "ldl": -1,
    "hdl": +1,
    "tg": -1,
    "fbs": -1,
    "bp": -1,
    "bmi": -1,
    "smoker": -1,  # binary: 1→0 only
}

K = 12           # grid steps per numeric input
MAX_ROWS = 5_000  # candidate cap

# ---------------------------------------------------------------------------
# Artifact loader
# ---------------------------------------------------------------------------
_art_cache: dict = {}
# Cached: {column_name -> std_dev} extracted once from the CAD pipeline's StandardScaler
_sd_cache: dict[str, float] = {}


def _load_art():
    if "a" not in _art_cache:
        try:
            _art_cache["a"] = joblib.load(H / "model.joblib")
        except FileNotFoundError:
            raise HTTPException(503, "Model artifact unavailable. Run: python train.py data.xlsx")
        except Exception as exc:
            raise HTTPException(503, f"Model artifact could not be loaded: {exc}")
    return _art_cache["a"]


def _get_sd(art, col: str) -> float:
    """Return training-data standard deviation for a feature column.

    Reads from the CAD pipeline's StandardScaler (which trains on all 53 features).
    Falls back to 5 % of the schema range if unavailable.
    """
    if not _sd_cache:
        try:
            pipeline = art["models"]["CAD"]
            scaler = pipeline.named_steps.get("standardscaler")
            features = art["features"]
            if scaler is not None and hasattr(scaler, "scale_") and len(scaler.scale_) == len(features):
                for i, f in enumerate(features):
                    _sd_cache[f] = float(scaler.scale_[i])
        except Exception:
            pass
    if col in _sd_cache:
        return max(1e-6, _sd_cache[col])
    # Fallback: 5 % of range
    uid_match = [u for u in core.UI if u[1] == col]
    if uid_match:
        u = uid_match[0]
        return max(1.0, (u[6] - u[5]) * 0.05)
    return 1.0


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------
class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: dict[str, Optional[float]] = Field(
        description="Keyed by UI field id; null = not supplied (backend imputes training median)"
    )
    target: str = Field(description="One of CAD, LAD, LCX, RCA")


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def _validate_profile(profile: dict) -> dict[str, Optional[float]]:
    clean: dict[str, Optional[float]] = {}
    for key, raw in profile.items():
        if key not in SCHEMA:
            raise HTTPException(422, f"Unknown input field: {key!r}")
        if raw is None:
            clean[key] = None
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise HTTPException(422, f"Input {key!r} must be numeric or null.")
        if not math.isfinite(value):
            raise HTTPException(422, f"Input {key!r} must be finite.")
        item = SCHEMA[key]
        if value < item[5] or value > item[6]:
            raise HTTPException(422, f"Input {key!r} must be within {item[5]}–{item[6]}.")
        if item[4] == "bin" and value not in (0.0, 1.0):
            raise HTTPException(422, f"Binary input {key!r} must be 0 or 1.")
        clean[key] = value
    return clean


# ---------------------------------------------------------------------------
# Grid construction
# ---------------------------------------------------------------------------
def _num_grid(u_id: str, baseline_val: float, direction: int, art) -> list[float]:
    """Return a list of candidate values for a numeric input (up to K steps)."""
    item = SCHEMA[u_id]
    col = item[1]           # dataset column name
    step_schema = item[7]   # schema step
    sd = _get_sd(art, col)
    step_u = max(step_schema, sd / K)
    cap = sd                # 1 SD cap
    vals = []
    for k in range(1, K + 1):
        delta = direction * step_u * k
        if abs(delta) > cap + 1e-9:
            break
        new_val = baseline_val + delta
        new_val = max(item[5], min(item[6], new_val))
        # Round to schema step precision
        precision = max(0, -math.floor(math.log10(step_schema + 1e-12)))
        new_val = round(new_val, precision)
        # Re-enforce the SD cap after rounding (rounding may push slightly over)
        if abs(new_val - baseline_val) > cap + 1e-9:
            new_val = baseline_val + direction * min(abs(new_val - baseline_val), cap)
            new_val = max(item[5], min(item[6], round(new_val, precision)))
        if new_val == baseline_val:
            continue
        # Enforce healthier direction strictly
        if direction < 0 and new_val >= baseline_val:
            continue
        if direction > 0 and new_val <= baseline_val:
            continue
        vals.append(new_val)
    return vals


# ---------------------------------------------------------------------------
# Candidate builder
# ---------------------------------------------------------------------------
def _build_candidates(profile: dict, art) -> tuple[list[dict], list[dict], list[str]]:
    """
    Returns (candidates_list, not_searched_list, searched_ids).

    Each candidate dict: {"profile": {...}, "changes": [{id, from, to}], "size_sd": float}
    """
    candidates: list[dict] = []
    not_searched: list[dict] = []
    searched_ids: list[str] = []

    # Build per-input grids
    grids: dict[str, list[float]] = {}
    for uid, direction in MODIFIABLE.items():
        item = SCHEMA[uid]
        baseline_val = profile.get(uid)

        if baseline_val is None:
            not_searched.append({"id": uid, "reason": "not supplied"})
            continue

        baseline_val = float(baseline_val)

        if item[4] == "bin":
            # smoker: only 1→0
            if direction < 0 and baseline_val == 1.0:
                grids[uid] = [0.0]
                searched_ids.append(uid)
            else:
                not_searched.append({"id": uid, "reason": "already at healthier bound"})
            continue

        grid = _num_grid(uid, baseline_val, direction, art)
        if not grid:
            not_searched.append({"id": uid, "reason": "already at healthier bound"})
            continue
        grids[uid] = grid
        searched_ids.append(uid)

    # ---- size_sd helper ----
    def _size(changes: list[dict]) -> float:
        total = 0.0
        for ch in changes:
            uid = ch["id"]
            col = SCHEMA[uid][1]
            sd = _get_sd(art, col)
            total += abs(ch["to"] - ch["from"]) / sd
        return round(total, 4)

    # ---- single-input candidates ----
    for uid, grid in grids.items():
        for new_val in grid:
            cand_profile = {k: v for k, v in profile.items()}
            cand_profile[uid] = new_val
            changes = [{"id": uid, "from": profile[uid], "to": new_val}]
            candidates.append({"profile": cand_profile, "changes": changes, "size_sd": _size(changes)})

    # ---- pair candidates ----
    search_truncated = False
    pair_ids = list(grids.keys())
    pair_candidates: list[dict] = []
    for id1, id2 in combinations(pair_ids, 2):
        for v1 in grids[id1]:
            for v2 in grids[id2]:
                cand_profile = {k: v for k, v in profile.items()}
                cand_profile[id1] = v1
                cand_profile[id2] = v2
                changes = [{"id": id1, "from": profile[id1], "to": v1},
                           {"id": id2, "from": profile[id2], "to": v2}]
                pair_candidates.append({"profile": cand_profile, "changes": changes, "size_sd": _size(changes)})

    # Apply cap: if total would exceed MAX_ROWS, drop pairs from lowest-impact inputs
    total = len(candidates) + len(pair_candidates)
    if total > MAX_ROWS:
        search_truncated = True
        pair_candidates = pair_candidates[:max(0, MAX_ROWS - len(candidates))]

    candidates.extend(pair_candidates)
    return candidates, not_searched, searched_ids, search_truncated


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------
@router.post("/search")
def whatif_search(body: SearchRequest):
    if body.target not in core.TARGETS:
        raise HTTPException(422, f"target must be one of {core.TARGETS}.")

    art = _load_art()
    profile = _validate_profile(body.profile)
    target = body.target

    # ---- baseline prediction ----
    base_payload = {k: v for k, v in profile.items() if v is not None}
    base_result = core.predict(art, base_payload)
    p0 = float(base_result[target]["p"])
    interval0 = base_result[target].get("interval")

    if interval0 is None:
        # No bootstrap available
        return {
            "target": target,
            "baseline": {"p": round(p0, 6), "interval": None},
            "searched_inputs": [],
            "not_searched": [],
            "n_candidates": 0,
            "search_limit": "1 SD of training data per input, schema bounds",
            "search_truncated": False,
            "result": None,
            "best_any": None,
            "method": "Search requires bootstrap interval; none available in this artifact.",
            "uncertainty_note": core.UNCERTAINTY_NOTE,
        }

    lo0 = float(interval0["lo"])
    hi0 = float(interval0["hi"])
    range_label0 = interval0.get("range_label", "")
    n_models = int(interval0.get("n_models", 0))

    # ---- build candidates ----
    candidates, not_searched, searched_ids, search_truncated = _build_candidates(profile, art)

    if not candidates:
        return {
            "target": target,
            "baseline": {"p": round(p0, 6), "interval": interval0},
            "searched_inputs": searched_ids,
            "not_searched": not_searched,
            "n_candidates": 0,
            "search_limit": "1 SD of training data per input, schema bounds",
            "search_truncated": search_truncated,
            "result": None,
            "best_any": None,
            "method": "No modifiable inputs were supplied or any were already at their healthier bound.",
            "uncertainty_note": core.UNCERTAINTY_NOTE,
        }

    # ---- vectorised scoring ----
    col_map = {u[0]: u[1] for u in core.UI}
    rows = []
    for cand in candidates:
        payload = {k: v for k, v in cand["profile"].items() if v is not None}
        raw_row = {col_map[k]: v for k, v in payload.items() if k in col_map}
        rows.append({f: raw_row.get(f, np.nan) for f in art["features"]})

    X_all = pd.DataFrame(rows)
    probs = art["models"][target].predict_proba(X_all)[:, 1].astype(float)

    for i, cand in enumerate(candidates):
        cand["p1"] = float(probs[i])

    # ---- best-any (lowest p1 regardless of size) ----
    best_any_cand = min(candidates, key=lambda c: c["p1"])

    # ---- winner: lowest size_sd among those with p1 < p0; tie → larger drop ----
    better = [c for c in candidates if c["p1"] < p0]

    if not better:
        verdict = "no_change_found"
        winner = None
    else:
        winner = min(better, key=lambda c: (c["size_sd"], c["p1"]))
        p1 = winner["p1"]
        if p1 < lo0:
            verdict = "beyond_model_range"
        else:
            verdict = "within_model_noise"

    # ---- full core.predict on winner to get interval1 ----
    result_block = None
    if winner is not None:
        win_payload = {k: v for k, v in winner["profile"].items() if v is not None}
        win_result = core.predict(art, win_payload)
        p1_full = float(win_result[target]["p"])
        interval1 = win_result[target].get("interval")

        # replica_agreement: how many of the 30 replicas give lower p for candidate vs baseline
        replica_agreement = None
        bootstrap = art.get("bootstrap", {})
        replicas = bootstrap.get(target, [])
        if replicas:
            X_base = core.row(art, base_payload)
            X_win = core.row(art, win_payload)
            k_lower = 0
            for replica in replicas:
                p_base_rep = float(replica.predict_proba(X_base)[0, 1])
                p_win_rep = float(replica.predict_proba(X_win)[0, 1])
                if p_win_rep < p_base_rep:
                    k_lower += 1
            replica_agreement = {"k": k_lower, "n": len(replicas)}

        # Build changes list with label/unit
        changes_out = []
        for ch in winner["changes"]:
            uid = ch["id"]
            item = SCHEMA[uid]
            changes_out.append({
                "id": uid,
                "label": item[2],
                "unit": item[8],
                "from": ch["from"],
                "to": ch["to"],
            })

        result_block = {
            "changes": changes_out,
            "size_sd": winner["size_sd"],
            "p1": round(p1_full, 6),
            "delta_pp": round((p1_full - p0) * 100, 3),
            "interval1": interval1,
            "verdict": verdict,
            "replica_agreement": replica_agreement,
        }

    # ---- best_any block ----
    best_any_block = None
    if best_any_cand is not None and (winner is None or best_any_cand is not winner):
        ba_changes = []
        for ch in best_any_cand["changes"]:
            uid = ch["id"]
            item = SCHEMA[uid]
            ba_changes.append({"id": uid, "label": item[2], "unit": item[8],
                                "from": ch["from"], "to": ch["to"]})
        best_any_block = {
            "changes": ba_changes,
            "size_sd": best_any_cand["size_sd"],
            "p1": round(float(best_any_cand["p1"]), 6),
            "delta_pp": round((float(best_any_cand["p1"]) - p0) * 100, 3),
        }

    return {
        "target": target,
        "baseline": {
            "p": round(p0, 6),
            "interval": interval0,
        },
        "searched_inputs": searched_ids,
        "not_searched": not_searched,
        "n_candidates": len(candidates),
        "search_limit": "1 SD of training data per input, schema bounds",
        "search_truncated": search_truncated,
        "result": result_block,
        "best_any": best_any_block,
        "method": (
            "Vectorised grid search over single and pair moves of modifiable inputs "
            "(ldl, hdl, tg, fbs, bp, bmi, smoker) in the healthier direction, "
            f"up to 1 SD of training data, {K} steps per numeric input. "
            "Scoring uses the primary fitted model only. "
            "Bootstrap interval is from core.predict on the winning profile only."
        ),
        "uncertainty_note": core.UNCERTAINTY_NOTE,
    }
