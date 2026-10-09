# Frontend redesign (design system + unified navigation)

- `static/cardiomap.css` + `static/shell.js`: one shared design system. Served by an allow-listed route `/static/{cardiomap.css|shell.js}` in `app.py` (no folder is exposed).
- Every page now has the same top bar: grouped menus (Simulate / Explain / Trust), AI Assistant button, light/dark toggle (shares the existing `cm-theme` key), scroll progress bar and a common footer disclaimer.
- The 9 lab pages keep their own layouts and logic; their inline dark-only styling is re-skinned to the same aqua-glass look in light and dark themes. Old per-page link rows (7-8 mismatched buttons, some inline-styled) were removed.
- `index.html`, `whatif.html`, `assistant.html`: the crowded header link rows are replaced by one **Explore** menu; their own polished styling is untouched.
- `explorer.html` is now a framed page instead of a full-bleed iframe.
- Not changed: backend logic, models, API contracts, page scripts.
- Limitation: colours generated inside page scripts as inline styles keep their original values.
