# Architecture Map

Page: `/architecture` (`architecture.html`). Nav: **Explain > Architecture Map**. The dashboard (`index.html`) is untouched.

## What changed
- `architecture.html` (new): self-contained lab page (`<body class="cm-lab" data-no-foot>`, inline CSS/JS, `shell.js` for nav/theme/footer). No new dependencies.
- `app.py`: added `/architecture` and `/architecture/` routes (same style as `/signal-trace`).
- `static/shell.js`: added the nav entry in the **Explain** group.
- `tests/test_architecture.py` (new): static checks, no server needed.

## What the page shows
Six layers: Pages, Browser storage, Server (FastAPI), Model and data files, Offline build, External AI providers.
- Select a box for purpose, file, endpoints, reads, outputs and links to connected boxes. Page boxes have an "Open" link.
- **Walk through** menu: Predict one case, Build the model files, Ask the assistant, Make a research PDF, Replay a saved case, What-If with or without the server. Back / Next / Play / Stop.
- **Show all connections** draws every link faintly. Layer chips dim other layers. Esc clears the selection or walk-through.
- Live strip: calls `GET /health`, `GET /provenance` and `GET /trust`. Shows model status, the first 12 characters of the `model.joblib` SHA-256 and the selected model per target. If the server is unreachable it shows "Static view" and everything else still works. No numbers are typed into the page.

## How to update it
All content is in two arrays at the top of the script in `architecture.html`:
- `N` (boxes): `id, l (layer), n (name), f (file), r (route), e (endpoints), rd (reads), out (produces), d (description)`.
- `E` (links): `[from, to, label]`.
- `TR` (walk-throughs): steps with `n` (boxes), `e` (link keys like `"dash>app"`) and `x` (caption).
Adding a page route to `app.py` without adding it to `N` makes `tests/test_architecture.py` fail on purpose.

## Checks
`python tests/test_architecture.py` (static), plus the existing `tests/regression_guard.py`, `tests/test_uncertainty.py`, `tests/test_shap_records.py`.

## Known limits
- The "all connections" view is dense by design; use selection or a walk-through for clarity.
- Under 960px wide the connector lines are hidden; boxes still highlight and the caption bar still explains each step.
- Descriptions summarise the code at v14. Re-check them if a router or page changes.
