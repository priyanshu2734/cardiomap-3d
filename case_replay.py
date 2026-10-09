"""Priority 17: reproducible, model-backed case replay for CardioMap 3D.

The API does not persist submitted cases. It returns a portable run manifest that
can be saved explicitly by the browser, replayed, and compared against a prior run.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import importlib.metadata
import json
import math
import platform
import uuid
from pathlib import Path
from typing import Any

import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
import core

H = Path(__file__).parent
router = APIRouter(prefix="/api/case-replay", tags=["reproducible case replay"])
SCHEMA = {u[0]: u for u in core.UI}
FINGERPRINT_FILES = ("model.joblib", "data.xlsx", "app.py", "core.py", "case_replay.py", "replay.html", "train.py", "metrics.json", "export.json", "requirements.txt")

class ReplayRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    inputs: dict[str, float] = Field(min_length=1, max_length=len(core.UI))
    label: str | None = Field(default=None, max_length=80)


def _sha256(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _fingerprints() -> dict[str, str | None]:
    return {name: _sha256(H / name) for name in FINGERPRINT_FILES}


def _versions() -> dict[str, str | None]:
    result: dict[str, str | None] = {"python": platform.python_version(), "operating_system": platform.system(), "machine_architecture": platform.machine()}
    for package in ("scikit-learn", "numpy", "pandas", "joblib", "pydantic", "fastapi"):
        try:
            result[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            result[package] = None
    return result


def _validate_inputs(inputs: dict[str, float]) -> dict[str, float]:
    clean: dict[str, float] = {}
    for key, raw in inputs.items():
        if key not in SCHEMA:
            raise HTTPException(422, f"Unsupported input field: {key}")
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise HTTPException(422, f"Input {key} must be numeric.")
        if not math.isfinite(value):
            raise HTTPException(422, f"Input {key} must be finite.")
        item = SCHEMA[key]
        if value < item[5] or value > item[6]:
            raise HTTPException(422, f"Input {key} must be within {item[5]}–{item[6]}.")
        if item[4] == "bin" and value not in (0.0, 1.0):
            raise HTTPException(422, f"Binary input {key} must be 0 or 1.")
        clean[key] = value
    return clean


def _load_model():
    try:
        import model_cache; return model_cache.load_artifact()
    except FileNotFoundError:
        raise HTTPException(503, "Model artifact unavailable. Follow the project setup instructions first.")
    except Exception:
        raise HTTPException(503, "Model artifact could not be loaded; replay was not run.")


def _outputs(artifact: Any, inputs: dict[str, float]) -> dict[str, Any]:
    try:
        prediction = core.predict(artifact, inputs)
        values = {}
        for target in core.TARGETS:
            p = prediction[target].get("p")
            if p is None or not math.isfinite(float(p)):
                raise ValueError("missing or non-finite target probability")
            values[target] = {"probability": float(p), "estimator": type(artifact["models"][target][-1]).__name__}
        return values
    except Exception as exc:
        raise HTTPException(422, f"The existing model could not score this case ({type(exc).__name__}); no replay manifest was created.")


@router.get("/schema")
def replay_schema():
    return {
        "features": [
            {"id": u[0], "column": u[1], "label": u[2], "group": u[3], "kind": u[4], "min": u[5], "max": u[6], "step": u[7], "unit": u[8]}
            for u in core.UI
        ],
        "targets": list(core.TARGETS),
        "fingerprint_files": list(FINGERPRINT_FILES),
        "storage": "The API does not store case inputs. Save/export manifests explicitly in your browser if desired.",
        "limitations": [
            "Replay means re-running the saved inputs against the current local artifacts; identical hashes indicate matching tracked files, not proof of clinical validity.",
            "Exact numeric output matching may depend on runtime, dependency versions, hardware and estimator behavior.",
            "Only supplied input fields are captured; omitted fields retain the model pipeline's existing missing-value behavior."
        ]
    }


@router.post("/run")
def run_replay(body: ReplayRequest):
    inputs = _validate_inputs(body.inputs)
    artifact = _load_model()
    outputs = _outputs(artifact, inputs)
    fingerprints = _fingerprints()
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    bootstrap_meta = artifact.get("bootstrap_meta") if isinstance(artifact, dict) else None
    # The manifest deliberately contains no filesystem paths, secrets, or server-side storage references.
    return {
        "manifest_version": "1.0",
        "run_id": str(uuid.uuid4()),
        "label": (body.label or "").strip() or None,
        "created_at_utc": now,
        "application": {"name": "CardioMap 3D", "version": "2.4"},
        "method": "Existing core.predict pipeline with the current model.joblib artifact",
        "input_snapshot": inputs,
        "outputs": outputs,
        "reproducibility": {
            "artifact_sha256": fingerprints,
            "environment_versions": _versions(),
            "schema_sha256": hashlib.sha256(json.dumps([(u[0], u[1], u[4], u[5], u[6], u[7]) for u in core.UI], separators=(",", ":")).encode()).hexdigest(),
            "target_order": list(core.TARGETS),
            "tracked_artifacts_complete": all(fingerprints.get(n) is not None for n in FINGERPRINT_FILES),
            "bootstrap_meta": bootstrap_meta
        },
        "privacy": {"server_side_case_storage": False, "input_snapshot_in_response": True},
        "limitations": [
            "Educational research output only; not a diagnosis or treatment recommendation.",
            "Replay reproduces model computation only to the extent the tracked artifacts and runtime environment match.",
            "Adding bootstrap replicas changes the model.joblib hash and therefore the replay fingerprint; the primary fitted models and headline probabilities are unchanged.",
            "A matching artifact hash does not establish clinical validity, calibration for an individual, or causal meaning."
        ]
    }
