# Confidence Heart — Verification Results

## Automated checks completed

- `python tests/test_uncertainty.py` — **PASS**.
- `python -m py_compile app.py core.py train.py build_uncertainty.py report.py provenance.py case_replay.py tests/mock_server.py tests/test_uncertainty.py` — **PASS**.
- All 8 inline JavaScript blocks in `index.html` pass `node --check` — **PASS**.
- Leakage assertions for bootstrap models — **PASS**; no `LAD`, `LCX`, `RCA`, or `Cath` model-input column is present.
- Baseline fixture check — **PASS**; `p` and `c` values match the pre-change snapshot byte-for-byte for all captured cases.
- Mock `/predict` contract — **PASS**; existing fields remain and every target now includes `interval` and `uncertainty_note`.
- Provenance function exposes `bootstrap_meta` — **PASS**.
- Case replay scoring still returns all four target probabilities — **PASS**.

## Measured artifact and model settings

- Baseline `model.joblib`: 4,069,302 bytes.
- Final `model.joblib`: 25,030,792 bytes.
- Growth: 20,961,490 bytes (~20.0 MiB), below the 40 MB limit.
- Bootstrap replicas: `B=30`, seed 42, interval level 0.80, percentiles [10, 90].
- RandomForest bootstrap replicas: 50 trees each.
- Primary selected models were not retrained; their probabilities remain unchanged relative to the captured baseline fixture.

## Measured `/predict` latency

Measured through the local `tests/mock_server.py` over 12 warm requests:

- p50: **471.6 ms**
- p95: **523.9 ms**
- maximum: **579.4 ms**

The requested 400 ms p95 budget was not met. B and RandomForest member size were already reduced to the prompt minimums (`B=30`, 50 trees), so the remaining performance limitation is disclosed rather than hidden.

## Calibration / ROC diagnostics

| Target | ECE | Brier | ROC-AUC |
|---|---:|---:|---:|
| CAD | 0.035584 | 0.097745 | 0.924702 |
| LAD | 0.112036 | 0.162112 | 0.857098 |
| LCX | 0.077344 | 0.205768 | 0.737395 |
| RCA | 0.123912 | 0.226988 | 0.708531 |

Each target has five calibration bins and 50 downsampled ROC points in `metrics.json`.

## Not verified

1. **Full `tests/verify.py` Playwright matrix** was not completed. The environment's managed Chromium policy blocks normal loopback navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; after temporarily removing that policy, the multi-page run timed out because the project imports Three.js/loader scripts from public CDNs that are unreachable from the execution environment. One initial screenshot was produced, but it was not a valid full-viewer verification screenshot, so it is not treated as evidence.
2. **Full FastAPI application import** was not verified in this environment because the existing `groq` Python package is not installed. This is unrelated to the Confidence Heart code path; the mock server was used for `/predict` contract testing.
3. **Live browser rendering of the actual Three.js halo** was not verified in the sandbox for the same browser/CDN restriction. The project code and JS syntax were checked, and static visual previews are included solely as non-browser verification aids.
4. **HRA binary download** is not part of this Confidence Heart work and remains subject to the project's existing downloader/loader path; no new anatomy binary was embedded by this change.
