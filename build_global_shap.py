"""Pre-compute global SHAP importance (mean |SHAP| per feature, per target) into global_shap.json.

    python build_global_shap.py            # uses model.joblib + data.xlsx next to this file
The API also does this lazily on the first GET /shap/global and re-does it automatically after retraining,
so running this is optional (it just moves the few seconds of work out of the first request).
"""
import json
from pathlib import Path
import core

H = Path(__file__).resolve().parent

if __name__ == "__main__":
    out = core.global_shap_cached(H, force=True)
    print(f"wrote global_shap.json from {out['n_rows']} rows ({out['source']})")
    for t, d in out["targets"].items():
        print(t, d["model"], ", ".join(f"{r['label']} {r['share_pct']}%" for r in d["records"][:5]))
