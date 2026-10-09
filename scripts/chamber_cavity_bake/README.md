# Chamber cavity bake (offline, not used by the app at run time)
Recomputes the enclosed-cavity waypoints baked into `static/heart-chambers.js` (`CAVITY`) from `static/models/VH_M_Heart.glb`.
Needs numpy and scipy (not in requirements.txt; dev only). Order: `python3 vox.py` (1 mm voxel wall solids, writes solids.npz), `python3 bake.py` (cavity = outside all wall solids, enclosed by >= 85% of 14 rays, clearance >= 4 mm; routes; writes defs.json), `python3 emit.py` (writes baked.js to paste between the BAKED markers).
Note: the 1 mm voxel solids come out about 1 mm fat (e.g. LV 138 mL vs 121.6 mL from the mesh), so clearances here are slightly conservative. The node containment test uses the exact mesh instead.
