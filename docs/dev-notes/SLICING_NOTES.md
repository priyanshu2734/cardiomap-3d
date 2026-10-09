> **Note:** the 3D cross-section slicing described below was removed from the main dashboard (index.html). It remains in the Digital Twin Lab (digital_twin.html).

# 3D Cross-Section Slicing (CardioMap 3D)

All code lives in `index.html` inside `/* ===== 3D cross-section slicing ===== */` (JS), `#cm-slice-css` (CSS) and `#slicePanel` (markup). Remove those three blocks plus the loop hook `cmSliceFrame` and the two `cmSliceFilter` wrappers to uninstall.

## Axis convention (heart / `G`-local space)
+x = viewer's right (patient left), +y = superior (base), -y = apex, +z = anterior, -z = posterior.
- Short-axis: normal = y, 0% apex -> 100% base.
- Long-axis (S-I): contains the S-I axis, normal = z, 0% anterior -> 100% posterior.
- Long-axis (A-P): contains the S-I axis, normal = x, 0% patient right -> 100% patient left.
The plane sweeps from the 0% end and the side it has passed is cut away; "Flip side" keeps the other side. Extents come from the bounding box of the active anatomy (HRA GLB / OBJ / fallback heart) measured in `G`-local space, recomputed when the anatomy, its rotation or scale changes.

## How clipping works
One **global** renderer clipping plane (`R.clippingPlanes=[wp]`, plus `localClippingEnabled`) is used instead of per-material planes, so the heart, coronary vessels, halo, Why-Beams meshes, labels and any material created later (e.g. `scheduleHaloRebuild`) are clipped without extra hooks. Each frame `cmSliceFrame` re-derives the world plane from the local plane and `G.matrix` (no allocation). Slice off sets `R.clippingPlanes=[]`, hides the indicator and caps.
Cut surface: **tinted back-face approach** (no stencil capping). Each heart mesh gets a child mesh with a flat `BackSide` material that is visible only while slicing. Double-sided meshes (e.g. the OBJ path) skip this and show their own interior.
Indicator: translucent `PlaneGeometry` + outline, child of `G`, nudged 4 mm-units to the kept side so it is not clipped by its own plane.
Raycasting: `cmSliceFilter` drops vessel hits on the clipped side (hover and click). Cap and indicator meshes have no-op `raycast`.
Announcements go through the slice's own `#sliceLive` status region (so `paint()` rewriting `#vesselLive` can no longer replace them). Nothing animates, so reduced motion is respected. State is not persisted (default: Slice off).

## Follow-up changes (not verified in 3D)
- Slice announcements moved to their own `#sliceLive` region.
- While slicing, a single-sided transparent heart (the fallback heart) is drawn opaque so the tinted back faces only appear through the cut, and its opacity is restored on Slice off. Isolate-vessel ghosting wins (caps hidden). Re-enforced each frame because `paint()` resets opacity.
- Choosing Short-axis (or flipping in short-axis) sets the vertical tilt to -/+0.45 rad so the cut face faces the camera. The tilt direction was derived from the axis convention, not seen on screen; if the cut face is edge-on or faces away, swap the sign in `faceCut()`. Slice off does not undo the tilt (use Reset view). Skipped during the guided tour.
- Dark theme: slider track background set to transparent.

## Known limits
- Territory/segment colours are **not** tinted on the cut face (skipped; no territory data is faked).
- Back-face caps are flat-shaded; no stencil cap, so internal structures of the mesh may show through as the model's own interior.
- Vertical camera tilt is clamped (+/-0.8 rad); short-axis now auto-tilts (see above) but the sign is unconfirmed in a real render.
- Custom ShaderMaterials (none found in index.html) would not be clipped.
- **Not verified (no Three.js offline)**: the actual 3D cut, z-fighting/flicker, "Slice off" restoring the 3D look, canvas-click selection with a slice active, and that halo / Why-Beams / territory render correctly while clipped. Math and behaviour were reviewed by reading only.

## Verification status
- `tests/test_slicing.py`: 15 static checks pass; 7 browser checks SKIP unless `CM_THREE_JS` points at a local three r128.
- `tests/visual_qa/slice_layout.py` (uses the layout-only THREE stub, no 3D): panel visible, no horizontal overflow, no overlap with `.tools`/`.hint`/`#anat`, 36px targets, keyboard (Enter/Space/arrow keys), aria-pressed, aria-valuetext, `#vesselLive` announcements, focus outline, reduced motion, no new page errors - at 1360/1024/768/390 px, light and dark. All pass. Screenshots: `tests/verification_previews/slice_ui_*.png` (these show the control panel only, not a 3D cut).
- Existing: `regression_guard.py` (only the known Trust Center failure), `test_why_beams.py`, `test_tour.py`, `test_tour_controller.js` pass.
