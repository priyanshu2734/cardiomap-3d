"""One-command launcher:  python run_demo.py [--port 8000] [--no-retrain]

1. checks that the required packages import,
2. checks model.joblib / metrics.json / export.json exist and load with THIS scikit-learn (a pickle made by another
   version can fail or misbehave); if not, retrains with the bundled data.xlsx (`train.py --rebuild-extras`),
3. starts the API + pages with uvicorn.
"""
import argparse, importlib, subprocess, sys, warnings
from pathlib import Path

H = Path(__file__).resolve().parent
REQUIRED = {"numpy": "numpy", "pandas": "pandas", "sklearn": "scikit-learn", "joblib": "joblib", "openpyxl": "openpyxl",
            "shap": "shap", "fastapi": "fastapi", "uvicorn": "uvicorn", "pydantic": "pydantic"}


def missing_packages():
    out = []
    for mod, pip_name in REQUIRED.items():
        try: importlib.import_module(mod)
        except Exception: out.append(pip_name)
    return out


def artifacts_ok():
    """True if the three derived files exist and the model unpickles without a scikit-learn version warning."""
    need = ["model.joblib", "metrics.json", "export.json"]
    gone = [f for f in need if not (H / f).exists()]
    if gone: return False, "missing " + ", ".join(gone)
    import joblib
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error")                       # InconsistentVersionWarning -> exception
            joblib.load(H / "model.joblib")
    except Exception as exc:
        return False, f"model.joblib does not load cleanly here ({type(exc).__name__}: {str(exc)[:120]})"
    return True, ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-retrain", action="store_true", help="never retrain; just report problems")
    a = ap.parse_args()
    miss = missing_packages()
    if miss:
        print("Missing packages: " + ", ".join(miss) + "\nInstall them with:  pip install -r requirements.txt")
        return 1
    ok, why = artifacts_ok()
    if not ok:
        print(f"Model files need rebuilding: {why}.")
        if a.no_retrain: return 1
        print("Retraining on data.xlsx (a few minutes; nested validation + uncertainty ranges + audit + global SHAP)...", flush=True)
        r = subprocess.run([sys.executable, str(H / "train.py"), str(H / "data.xlsx"), "--rebuild-extras"], cwd=H)
        if r.returncode: print("Retraining failed; see the messages above."); return r.returncode
    print(f"\nCardioMap 3D is starting.\n  Dashboard: http://localhost:{a.port}/app\n  API docs : http://localhost:{a.port}/docs\n"
          "Research and education only; not a diagnostic device.\nPress Ctrl+C to stop.\n", flush=True)
    import uvicorn
    sys.path.insert(0, str(H))
    uvicorn.run("app:app", host="127.0.0.1", port=a.port, app_dir=str(H))
    return 0


if __name__ == "__main__":
    sys.exit(main())
