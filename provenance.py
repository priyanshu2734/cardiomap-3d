"""Minimal artifact provenance metadata; never returns user inputs or filesystem paths."""
import hashlib, json, datetime
from pathlib import Path
from fastapi import APIRouter
H = Path(__file__).parent
router = APIRouter(prefix="/provenance", tags=["provenance"])
ARTIFACTS = ["model.joblib", "data.xlsx", "metrics.json", "export.json", "train.py", "core.py", "chat.py", "report.py"]

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

@router.get("")
def provenance():
    items=[]
    for name in ARTIFACTS:
        p=H/name
        if p.is_file():
            items.append({"artifact":name,"sha256":digest(p),"bytes":p.stat().st_size})
        else:
            items.append({"artifact":name,"available":False})
    try:
        metrics=json.loads((H/"metrics.json").read_text(encoding="utf-8"))
        metric_status="available" if isinstance(metrics,dict) else "invalid format"
    except (OSError,ValueError): metric_status="unavailable or invalid"
    bootstrap_meta=None
    try:
        import joblib
        import model_cache; a=model_cache.load_artifact()
        if isinstance(a,dict) and isinstance(a.get("bootstrap_meta"),dict):
            bootstrap_meta={k:a["bootstrap_meta"].get(k) for k in ("B","seed","level","percentiles","created_utc","sklearn_version","rf_member_trees","primary_models_unchanged") if k in a["bootstrap_meta"]}
    except Exception:
        bootstrap_meta=None
    return {"application":"CardioMap 3D","app_version":"2.4","schema_version":"1.0","generated_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"evaluation_metrics_status":metric_status,"bootstrap_meta":bootstrap_meta,"artifacts":items,"limitations":["Hashes identify the files inspected at this request; they do not prove the analysis is clinically valid.","No patient inputs, API keys, private paths, or conversation content are included.","Adding bootstrap replicas changes the model.joblib hash without changing the primary fitted target models or their headline probabilities.","A reproducible run also requires the matching environment, dependencies, configuration, and exact input snapshot."]}
