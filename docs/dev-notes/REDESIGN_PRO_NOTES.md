# Pro redesign layer
New: static/cardiomap-pro.css, static/pro.js, insights.html (route /insights).
Changed: index.html (header rail, 3 hub tiles, old Validation/Data boxes hidden but kept so JS still works), app.py (serves /insights and the 2 new static files), static/shell.js (Insights menu entry, auto-loads pro CSS on lab pages).
Theme: follows the system light/dark until the user taps the toggle; then the choice is saved.
Not tested: live API, 3D heart (needs internet for three.js), phones.

## Update 2: dark-mode cleanup + animated background
- Cause of grey panels: light-mode rules (white 60%) had no dark override. Fixed in static/cardiomap-pro.css (dark section at the end).
- static/bg.js: canvas background with 3 drifting 3D atoms and a travelling heartbeat line; atoms move with scroll, follow light/dark theme, stop under reduced-motion. Loaded from shell.js, index.html and insights.html.
- Old floating bubbles and old ECG line are hidden (not deleted).
