# Open anatomy assets

CardioMap uses the HuBMAP / Human Reference Atlas (HRA) 3D Reference Object Library as the bundled-reference anatomy source.

Bundled local assets (male + female, three formats each):
- `VH_M_Heart.glb/.gltf/.obj` and `VH_F_Heart.glb/.gltf/.obj` (+ `.mtl` for the OBJ files)
- The app tries `.glb` first, then `.gltf`, then `.obj`. Female is picked automatically when Sex = Female.
- Regenerate OBJ from glTF: `python scripts/gltf_to_obj.py static/models/VH_F_Heart.gltf static/models/VH_F_Heart.obj VH_F_Heart.mtl`

Optional extra assets:
- `VH_M_Heart.glb` — male heart reference organ
- `VH_F_Heart.glb` — female heart reference organ (loaded automatically when Sex = Female)
- `VH_M_Skin.glb` — male body/skin reference mesh (optional torso context)

Source:
https://github.com/hubmapconsortium/ccf-releases/tree/main/v1.2/models

License: Creative Commons Attribution 4.0 International (CC BY 4.0).
Attribution: HuBMAP Consortium / Human Reference Atlas 3D Reference Object Library.
The HRA reference-organ page describes the heart as a research reference resource and identifies the CC BY 4.0 license.

This repository does not claim that the reference mesh is patient-specific anatomy. It is a generic research/reference model.

To fetch the binary assets into this folder:
    python scripts/download_anatomy_assets.py

The Dashboard and Digital Twin Lab pick the male or female heart from the Sex input automatically.
The application first looks for these local files. If they are not present, the manual "Load anatomy" control remains available.
