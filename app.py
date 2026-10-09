"""CardioMap 3D API.  pip install -r requirements.txt ; python train.py data.xlsx ; uvicorn app:app --port 8000"""
import os, json, joblib, threading
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import create_model, Field, ConfigDict
import core, model_cache, chat, report, evidence, provenance, trust_stress, case_replay, whatif_search, nexttest, research_lab, heart_function, heart_cohort
H = Path(__file__).parent
app = FastAPI(title="CardioMap 3D", version="2.4")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CARDIOMAP_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(","),
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"], expose_headers=["X-Provider"])
Patient = create_model("Patient", __config__=ConfigDict(extra="forbid"),
    **{u[0]: (Optional[float], Field(None, ge=u[5], le=u[6], description=f"{u[2]} {u[8]}".strip())) for u in core.UI})
_PRED_CACHE = {}          # (model stamp, payload json) -> response; predictions are deterministic for a given model file
_WARM = {"state": "pending"}


def art():
    """Model artifact, loaded once and shared (see model_cache.py). Re-read only when model.joblib changes."""
    try: a = model_cache.load_artifact()
    except FileNotFoundError: raise HTTPException(503, "Model not trained. Run: python train.py data.xlsx")
    return a


def _warm_up():
    """Load the model, import SHAP and build every explainer once at startup so the first dashboard request is fast."""
    try:
        a = art(); payload = {}
        core.explain_shap(a, payload); core.predict(a, payload)
        try: nexttest.load_data()
        except Exception: pass
        _WARM["state"] = "ready"
    except Exception as exc:
        _WARM["state"] = "failed: " + str(exc)[:120]


@app.on_event("startup")
def _start_warm_up(): threading.Thread(target=_warm_up, daemon=True, name="cm-warmup").start()
@app.get("/")
def root(): return {"service": "CardioMap 3D", "version": app.version, "ready": (H / "model.joblib").exists(), "docs": "/docs",
                    "notice": "Educational decision support only; not a diagnosis or substitute for imaging."}
@app.get("/health")
def health(): return {"ok": True, "model_loaded": (H / "model.joblib").exists(), "metrics_loaded": (H / "metrics.json").exists(), "warm": _WARM["state"]}
@app.get("/schema")
def schema(): return [dict(zip(["id", "column", "label", "group", "kind", "min", "max", "step", "unit"], u)) for u in core.UI]
@app.get("/metrics")
def metrics():
    try: return json.loads((H / "metrics.json").read_text())
    except FileNotFoundError: raise HTTPException(503, "metrics.json missing. Run train.py")
@app.get("/trust")
def trust():
    """Expose bundled evaluation metrics and recorded methodology for the Trust Center."""
    try:
        metrics = json.loads((H / "metrics.json").read_text())
    except FileNotFoundError:
        raise HTTPException(503, "metrics.json missing. Run train.py")
    meta = {}
    try:
        exported = json.loads((H / "export.json").read_text())
        meta = exported.get("meta", {})
    except (FileNotFoundError, json.JSONDecodeError):
        # Methodology is not guessed if the training export is unavailable.
        meta = {}
    return {"metrics": metrics, "meta": meta}

@app.get("/audit")
def audit():
    """Subgroup performance + decision-curve data produced by build_audit.py (out-of-fold, descriptive)."""
    try: return json.loads((H / "audit.json").read_text())
    except FileNotFoundError: raise HTTPException(503, "audit.json missing. Run: python build_audit.py")

@app.post("/predict")
def predict(p: Patient):
    a = art()
    payload = p.model_dump(exclude_none=True)
    ck = (model_cache.stamp(), json.dumps(payload, sort_keys=True))
    hit = _PRED_CACHE.get(ck)
    if hit is not None: return hit
    r = core.predict(a, payload)
    # Sensitivity remains available for continuity with the existing UI.
    sensitivity = core.explain(a, payload, r)
    # SHAP is computed from the actual fitted estimator for each target.
    shap_result = core.explain_shap(a, payload)
    out = {
        "model": {t: type(a["models"][t][-1]).__name__ for t in core.TARGETS},
        "explanation": "Real SHAP is provided alongside the existing one-feature sensitivity view; SHAP is model explanation, not causation.",
        "explainability": sensitivity,
        "shap": shap_result,
        "CAD": r["CAD"], "LAD": r["LAD"], "LCX": r["LCX"], "RCA": r["RCA"]
    }
    if len(_PRED_CACHE) > 128: _PRED_CACHE.clear()
    _PRED_CACHE[ck] = out
    return out

_gs_lock = threading.Lock()

@app.get("/shap/global")
def shap_global(refresh: bool = False):
    """Global feature importance (mean |SHAP| per target). Computed once, cached in global_shap.json."""
    try:
        with _gs_lock:
            return core.global_shap_cached(H, force=refresh)
    except FileNotFoundError:
        raise HTTPException(503, "model.joblib missing. Run train.py")
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

@app.post("/explain")
def explain_endpoint(p: Patient):
    """Return real SHAP explanations without requiring a new prediction endpoint."""
    a = art()
    return core.explain_shap(a, p.model_dump(exclude_none=True))
@app.middleware("http")
async def _no_cache_html(request, call_next):
    resp = await call_next(request)
    if resp.headers.get("content-type", "").startswith(("text/html", "text/css", "application/javascript")):
        resp.headers["Cache-Control"] = "no-cache"
    return resp
app.include_router(chat.router)
app.include_router(report.router)
app.include_router(evidence.router)
app.include_router(provenance.router)
app.include_router(trust_stress.router)
app.include_router(case_replay.router)
app.include_router(whatif_search.router)
app.include_router(nexttest.make_router())
app.include_router(research_lab.make_router())
app.include_router(heart_function.make_router())
app.include_router(heart_cohort.make_router())
# Serve only index.html (never the whole folder: it holds .env, data and the model).
@app.get("/app", include_in_schema=False)
@app.get("/app/", include_in_schema=False)
def ui(): return FileResponse(H / "index.html")
@app.get("/whatif", include_in_schema=False)
@app.get("/whatif/", include_in_schema=False)
def whatif(): return FileResponse(H / "whatif.html")
@app.get("/assistant", include_in_schema=False)
def assistant(): return FileResponse(H / "assistant.html")
@app.get("/history", include_in_schema=False)
@app.get("/history/", include_in_schema=False)
def history_page(): return FileResponse(H / "history.html")

@app.get("/research-lab", include_in_schema=False)
@app.get("/research-lab/", include_in_schema=False)
def research_lab_page(): return FileResponse(H / "research_lab.html")

@app.get("/heart-function", include_in_schema=False)
@app.get("/heart-function/", include_in_schema=False)
def heart_function_page(): return FileResponse(H / "heart_function.html")

@app.get("/validation", include_in_schema=False)
def validation_lab(): return FileResponse(H / "validation.html")

@app.get("/trust-center", include_in_schema=False)
@app.get("/trust-center/", include_in_schema=False)
def trust_center_page(): return FileResponse(H / "trust_center.html")
@app.get("/app/digital_twin", include_in_schema=False)
@app.get("/app/digital_twin/", include_in_schema=False)
def digital_twin_legacy():return FileResponse(H / "digital_twin.html")
@app.get("/explorer", include_in_schema=False)
def explorer(): return FileResponse(H / "explorer.html")

@app.get("/evidence", include_in_schema=False)
def evidence_lab(): return FileResponse(H / "evidence.html")

@app.get("/digital-twin", include_in_schema=False)
@app.get("/digital-twin/", include_in_schema=False)
def digital_twin(): return FileResponse(H / "digital_twin.html")

@app.get("/detective", include_in_schema=False)
@app.get("/detective/", include_in_schema=False)
def prediction_detective(): return FileResponse(H / "detective.html")

@app.get("/stress-test", include_in_schema=False)
@app.get("/stress-test/", include_in_schema=False)
def stress_test_page(): return FileResponse(H / "trust_stress.html")

@app.get("/case-replay", include_in_schema=False)
@app.get("/case-replay/", include_in_schema=False)
def case_replay_page(): return FileResponse(H / "replay.html")

@app.get("/signal-trace", include_in_schema=False)
@app.get("/signal-trace/", include_in_schema=False)
def signal_trace_page(): return FileResponse(H / "signal_trace.html")

@app.get("/architecture", include_in_schema=False)
@app.get("/architecture/", include_in_schema=False)
def architecture_page(): return FileResponse(H / "architecture.html")

@app.get("/what-next", include_in_schema=False)
@app.get("/what-next/", include_in_schema=False)
def what_next_page(): return FileResponse(H / "what_next.html")

@app.get("/static/{name}", include_in_schema=False)
def static_asset(name: str):
    """Shared design system files only (an allow-list: never the whole folder)."""
    if name not in {"cardiomap.css", "cardiomap-app.css", "cardiomap-pro.css", "shell.js", "pro.js", "bg.js", "heart-dashboard.css", "heart-dashboard.js", "yesno.css", "yesno.js", "case-handoff.js", "embed-host.js", "global-drivers.css", "global-drivers.js", "history.js", "coronary-flow.js", "heart-flowfx.js", "heart-realism.js", "heart-effects.js", "heart-physio.js", "heart-segments.js", "heart-uncertainty.js", "heart-wiggers.js", "heart-compare.js", "coronary-flow2.js", "heart-anatomy.js", "heart-conditions.js", "heart-chambers.js"}: raise HTTPException(404, "Not found")
    return FileResponse(H / "static" / name, media_type="text/css" if name.endswith(".css") else "application/javascript")

@app.get("/static/models/{name}", include_in_schema=False)
def anatomy_asset(name: str):
    """Serve only explicitly supported local anatomy reference assets (male + female, .glb/.gltf/.obj)."""
    types = {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".obj": "text/plain; charset=utf-8", ".mtl": "text/plain; charset=utf-8"}
    stems = {"VH_M_Heart", "VH_F_Heart", "VH_M_Skin"}
    stem, dot, ext = name.rpartition(".")
    ext = dot + ext.lower()
    if stem not in stems or ext not in types:
        raise HTTPException(404, "Not found")
    path = H / "static" / "models" / name
    if not path.is_file():
        raise HTTPException(404, "Anatomy asset not installed. Run scripts/download_anatomy_assets.py")
    return FileResponse(path, media_type=types[ext], headers={"Access-Control-Allow-Origin": "*"})
