"""Download the open HRA reference anatomy assets used by CardioMap.

Run from the project root:
    python scripts/download_anatomy_assets.py

The source models are from the HuBMAP / Human Reference Atlas CCF release.
License: CC BY 4.0. Keep the attribution file with redistributed assets.
"""
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "static" / "models"
OUT.mkdir(parents=True, exist_ok=True)

ASSETS = {
    "VH_M_Heart.glb": "https://github.com/hubmapconsortium/ccf-releases/raw/main/v1.2/models/VH_M_Heart.glb",
    "VH_F_Heart.glb": "https://github.com/hubmapconsortium/ccf-releases/raw/main/v1.2/models/VH_F_Heart.glb",
    "VH_M_Skin.glb": "https://github.com/hubmapconsortium/ccf-releases/raw/main/v1.2/models/VH_M_Skin.glb",
}

def download(name, url):
    dest = OUT / name
    print(f"Downloading {name}...")
    req = Request(url, headers={"User-Agent": "CardioMap/1.0"})
    with urlopen(req, timeout=60) as src, dest.open("wb") as dst:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            dst.write(chunk)
    print(f"Saved {dest} ({dest.stat().st_size:,} bytes)")

if __name__ == "__main__":
    for name, url in ASSETS.items():
        try:
            download(name, url)
        except Exception as exc:
            print(f"Could not download {name}: {exc}")
    print("Done. Refresh /app or /digital-twin after the files are present.")
