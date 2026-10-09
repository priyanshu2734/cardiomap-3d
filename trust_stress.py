"""Controlled, model-backed robustness probes for CardioMap 3D.

This endpoint reports observed probability changes under explicit, bounded input
perturbations. It does not label results as clinically safe/unsafe or define a
pass threshold. It never stores submitted inputs.
"""
import math
from pathlib import Path
from typing import Literal
import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
import core

H = Path(__file__).parent
router = APIRouter(prefix="/api/stress-test", tags=["AI trust stress test"])
SCHEMA = {u[0]: u for u in core.UI}

class StressRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    inputs: dict[str, float] = Field(min_length=1, max_length=len(core.UI))
    features: list[str] | None = Field(default=None, max_length=len(core.UI))
    perturbation_percent: float = Field(default=2.0, ge=0.5, le=10.0)


def _model():
    try:
        import model_cache; return model_cache.load_artifact()
    except FileNotFoundError:
        raise HTTPException(503, "Model artifact unavailable. Run the documented training setup first.")
    except Exception:
        raise HTTPException(503, "Model artifact could not be loaded; stress test was not run.")


def _predict(artifact, payload):
    try:
        result = core.predict(artifact, payload)
        out = {}
        for target in core.TARGETS:
            value = result[target].get("p")
            if value is None or not math.isfinite(float(value)):
                raise ValueError("non-finite probability")
            out[target] = float(value)
        return out
    except Exception as exc:
        raise HTTPException(422, f"Model could not score the supplied input profile: {type(exc).__name__}.")


@router.get("/schema")
def stress_schema():
    return {"features": [
        {"id": u[0], "column": u[1], "label": u[2], "group": u[3], "kind": u[4], "min": u[5], "max": u[6], "step": u[7], "unit": u[8]}
        for u in core.UI
    ], "targets": core.TARGETS, "method": "One-feature-at-a-time bounded perturbation; actual fitted estimator predictions.",
    "limitations": ["This is a software/model sensitivity probe, not clinical validation.", "Perturbation changes are not causal effects or treatment outcomes.", "No universal pass/fail threshold is applied.", "Results depend on supplied inputs, model artifact and missing-value handling."]}


@router.post("/run")
def run_stress_test(body: StressRequest):
    payload = dict(body.inputs)
    for key, value in payload.items():
        if key not in SCHEMA:
            raise HTTPException(422, f"Unsupported input field: {key}")
        if not math.isfinite(float(value)):
            raise HTTPException(422, f"Input {key} must be finite.")
        u = SCHEMA[key]
        if float(value) < u[5] or float(value) > u[6]:
            raise HTTPException(422, f"Input {key} must be within {u[5]}–{u[6]}.")
        if u[4] == "bin" and float(value) not in (0.0, 1.0):
            raise HTTPException(422, f"Binary input {key} must be 0 or 1.")
    selected = body.features if body.features is not None else list(payload.keys())
    if not selected:
        raise HTTPException(422, "Choose at least one supplied input to perturb.")
    unknown = [f for f in selected if f not in SCHEMA]
    if unknown:
        raise HTTPException(422, "Unsupported feature selection: " + ", ".join(unknown))
    missing = [f for f in selected if f not in payload]
    if missing:
        raise HTTPException(422, "Only supplied input fields can be tested: " + ", ".join(missing))

    artifact = _model()
    baseline = _predict(artifact, payload)
    results = []
    for key in selected:
        u = SCHEMA[key]
        original = float(payload[key])
        if u[4] == "bin":
            changes = [("flip", 1.0 - original)]
        else:
            lo, hi, step = float(u[5]), float(u[6]), float(u[7])
            delta = max(float(step), (hi - lo) * body.perturbation_percent / 100.0)
            changes = []
            lower, upper = max(lo, original - delta), min(hi, original + delta)
            if lower != original: changes.append(("lower", lower))
            if upper != original: changes.append(("higher", upper))
        probes = []
        for direction, changed in changes:
            variant = dict(payload); variant[key] = changed
            scored = _predict(artifact, variant)
            target_deltas = {t: scored[t] - baseline[t] for t in core.TARGETS}
            probes.append({"direction": direction, "value": changed, "predictions": scored,
                           "delta_probability": target_deltas,
                           "delta_percentage_points": {t: 100.0 * target_deltas[t] for t in core.TARGETS}})
        max_shift = max((abs(v) for p in probes for v in p["delta_percentage_points"].values()), default=0.0)
        results.append({"feature": key, "column": u[1], "label": u[2], "kind": u[4], "original_value": original,
                        "unit": u[8], "probes": probes, "max_absolute_shift_percentage_points": max_shift})
    shifts = [r["max_absolute_shift_percentage_points"] for r in results]
    return {"method": "One-feature-at-a-time bounded perturbation using the existing fitted model",
            "model": {t: type(artifact["models"][t][-1]).__name__ for t in core.TARGETS},
            "targets": core.TARGETS, "baseline_predictions": baseline, "input_fields_tested": len(results),
            "probe_count": sum(len(r["probes"]) for r in results), "largest_observed_shift_percentage_points": max(shifts, default=0.0),
            "results": results,
            "interpretation": "Observed model-output sensitivity only. This result does not establish clinical reliability, causation, safety, diagnosis, or treatment effect. No pass/fail threshold was applied.",
            "inputs_are_not_stored": True}
