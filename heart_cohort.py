"""Heart Function Lab cohort check: descriptive rates of six recorded findings among the 303 referred patients, split by whether the
selected vessel (LAD, LCX or RCA) is recorded as narrowed (>= 50%). Additive: no change to core.py, model.joblib or any API shape.

DESCRIPTIVE ONLY. It never feeds the model or the physics simulation, it is not a validation of the physics, and it is not a prediction.
Aggregates only: counts, rates and Wilson intervals. No patient-level row ever leaves this module.

Leakage rule (same as core.py / research_lab.py): the findings are read from the model-input frame X, which core.load builds with core.LEAK
(LAD, LCX, RCA, Cath) already removed, and every finding column is asserted not to be in core.LEAK. The vessel labels come from the
separate target frame Y and are used only to form the two groups, never shown as a finding.

Pure functions need no FastAPI; make_router() builds the router lazily like heart_function.make_router."""
import threading

VESSELS = ("LAD", "LCX", "RCA")
SMALL_GROUP = 20          # a group of fewer than 20 patients gets the amber small-group warning (Research Lab pattern)
MIN_EVENTS = 5            # fewer than 5 patients with the finding in a group: the rate is unstable (flagged, never hidden)
EF_CUT = 50               # "reduced EF" = EF-TTE below this percent (a fixed descriptive cut-off, not a diagnosis)
# fixed whitelist of findings: id, label, dataset column (in X), how a row counts as "has the finding"
FINDINGS = (
    {"id": "std", "label": "ST depression", "column": "St Depression", "rule": "recorded as present", "test": lambda s: s == 1},
    {"id": "qw", "label": "Q wave", "column": "Q Wave", "rule": "recorded as present", "test": lambda s: s == 1},
    {"id": "ti", "label": "T inversion", "column": "Tinversion", "rule": "recorded as present", "test": lambda s: s == 1},
    {"id": "prp", "label": "Poor R progression", "column": "Poor R Progression", "rule": "recorded as present", "test": lambda s: s == 1},
    {"id": "rwma", "label": "Regional wall-motion abnormality", "column": "Region RWMA", "rule": "at least one region recorded", "test": lambda s: s >= 1},
    {"id": "ef", "label": "Reduced ejection fraction", "column": "EF-TTE", "rule": "EF-TTE below %d%%" % EF_CUT, "test": lambda s: s < EF_CUT},
)
GROUPS = ("narrowed", "not_narrowed")
GROUP_LABEL = {"narrowed": "Narrowed (recorded 50% or more)", "not_narrowed": "Not narrowed (recorded below 50%)"}
CAVEATS = (
    "Descriptive rates in 303 referred patients; not a validation of the physics model and not a prediction for your heart.",
    "One cohort, one hospital population, no external validation. These patients were referred for angiography, so rates are not rates in the general population.",
    "Descriptive only: no causal reading, no test between groups, no p-values. A difference in rates does not show that one thing causes the other.",
    "\"Narrowed\" means the vessel is recorded as at least 50% stenotic on the angiogram, read by eye; borderline vessels can flip.",
)
WEAK_NOTE = ("The LCX and RCA narrowed groups are smaller than the LAD group, and the project's models are weaker for these two vessels "
             "(see the Trust Center), so treat their estimates as weak and their intervals as wide.")
_CACHE, _LOCK = {}, threading.Lock()


def _wilson(k, n):
    """The Research Lab's Wilson 95% interval (imported lazily: research_lab pulls in scikit-learn)."""
    from research_lab import wilson
    return wilson(k, n)


def check_vessel(v):
    """Exact whitelist: only the strings LAD, LCX, RCA. Anything else raises ValueError."""
    if not isinstance(v, str) or v not in VESSELS: raise ValueError("vessel must be one of " + ", ".join(VESSELS))
    return v


def available_findings(columns):
    """(usable, missing): the whitelisted findings whose column exists, never one that is a leakage column."""
    import core
    cols = set(columns); leak = set(core.LEAK)
    assert not leak & {f["column"] for f in FINDINGS}, "a finding is a leakage column"
    assert not leak & cols, "leakage column in the finding frame"
    return [f for f in FINDINGS if f["column"] in cols], [f["label"] for f in FINDINGS if f["column"] not in cols]


def _cell(k, n):
    ci = _wilson(k, n) if n > 0 else None
    return {"k": int(k), "n": int(n), "rate": round(k / n, 4) if n > 0 else None, "ci95": ci, "sparse": bool(0 < n and k < MIN_EVENTS)}


def cohort_from_frames(X, Y, vessel, sha=""):
    """Pure. X = leakage-free input frame, Y = target frame with a 0/1 column per vessel. Returns aggregates only."""
    check_vessel(vessel)
    use, missing = available_findings(X.columns)
    if vessel not in Y.columns or len(X) != len(Y): raise ValueError("data frames do not line up")
    narrowed = (Y[vessel] == 1).to_numpy(); masks = {"narrowed": narrowed, "not_narrowed": ~narrowed}
    sizes = {g: int(m.sum()) for g, m in masks.items()}
    groups = {g: {"label": GROUP_LABEL[g], "n": sizes[g], "small": sizes[g] < SMALL_GROUP,
                  "warning": ("Small group (n=%d, fewer than %d patients): treat as anecdotal; intervals are very wide." % (sizes[g], SMALL_GROUP)) if sizes[g] < SMALL_GROUP else None}
              for g in GROUPS}
    rows = []
    for f in use:
        has = f["test"](X[f["column"]]).to_numpy()
        rows.append({"id": f["id"], "label": f["label"], "rule": f["rule"], **{g: _cell(int((has & masks[g]).sum()), sizes[g]) for g in GROUPS}})
    warnings = [g_["warning"] for g_ in groups.values() if g_["warning"]]
    if vessel != "LAD": warnings.append(WEAK_NOTE)
    sparse = [r["label"] + " (" + ", ".join(GROUP_LABEL[g].split(" (")[0].lower() for g in GROUPS if r[g]["sparse"]) + ")" for r in rows if any(r[g]["sparse"] for g in GROUPS)]
    if sparse: warnings.append("Few patients with the finding (fewer than %d), so the rate is unstable: %s." % (MIN_EVENTS, "; ".join(sparse)))
    return {"vessel": vessel, "n_total": int(len(X)), "groups": groups, "findings": rows, "unavailable": missing, "warnings": warnings,
            "caveats": list(CAVEATS), "thresholds": {"small_group": SMALL_GROUP, "min_events": MIN_EVENTS, "ef_cut": EF_CUT, "interval": "Wilson 95%"},
            "data_sha": (sha or "")[:12]}


def cohort(vessel):
    """Cached by (vessel, data hash). Raises ValueError for a bad vessel, FileNotFoundError when data.xlsx is missing."""
    check_vessel(vessel)
    import research_lab
    X, Y, sha = research_lab.load_data()
    key = (vessel, sha)
    with _LOCK:
        if key not in _CACHE:
            _CACHE.clear() if len(_CACHE) > 8 else None
            _CACHE[key] = cohort_from_frames(X, Y, vessel, sha)
        return _CACHE[key]


def handle(vessel):
    """(status, body) for GET /api/heart-function/cohort; the router is a thin wrapper, so this is testable without FastAPI."""
    try: return 200, cohort(vessel)
    except ValueError as e: return 400, {"detail": str(e)}
    except FileNotFoundError: return 503, {"detail": "Dataset not available"}


def make_router():
    from fastapi import APIRouter
    from fastapi.responses import JSONResponse
    r = APIRouter()

    @r.get("/api/heart-function/cohort")
    def cohort_route(vessel: str = ""):
        status, body = handle(vessel)
        return JSONResponse(body, status_code=status, headers={"Cache-Control": "no-store"} if status != 200 else {"Cache-Control": "private, max-age=300"})
    return r
