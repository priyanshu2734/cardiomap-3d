"""Shared, thread-safe loader for model.joblib.

The artifact used to be unpickled from disk on every request by several routes (predict, case replay, stress test,
provenance). Load it once and reload only if the file changes (retrain). Callers must treat the result as read-only."""
import threading
from pathlib import Path
import joblib

_MP = Path(__file__).resolve().parent / "model.joblib"
_lock = threading.Lock()
_state = {"stamp": None, "obj": None}


def stamp():
    st = _MP.stat()                       # FileNotFoundError propagates so callers keep their own 503 handling
    return (st.st_mtime_ns, st.st_size)


def load_artifact():
    s = stamp()
    if _state["stamp"] != s:
        with _lock:
            if _state["stamp"] != s:
                _state["obj"] = joblib.load(_MP); _state["stamp"] = s
    return _state["obj"]
