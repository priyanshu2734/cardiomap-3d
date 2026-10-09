"""Heart Function Lab: mesh manifest + dedicated mesh route (additive; no change to core.py, model.joblib or existing API shapes).

Pure functions here need no FastAPI (tests import them); make_router() builds the router lazily, like nexttest.make_router.
The 3D heart is served ONLY through GET /heart-function/mesh/{name}: the name must equal the file recorded in the manifest, have an
allowed extension, contain no path parts, and resolve inside static/models. The manifest records title, author, source URL and licence,
and the licence must be CC0, CC-BY, CC-BY-SA or public domain (no NonCommercial / NoDerivatives)."""
import hashlib, json, re
from pathlib import Path

H = Path(__file__).parent
MODELS = H / "static" / "models"
MANIFEST = MODELS / "heart_function_mesh.json"
ALLOWED_EXT = {".glb": "model/gltf-binary", ".gltf": "model/gltf+json"}
REQUIRED = ("title", "author", "source_url", "licence", "licence_url", "file", "sha256")
_LIC = re.compile(r"^(cc0(-1\.0)?|cc-by(-sa)?(-[1-4]\.0)?|public-domain)$")


class MeshError(Exception):
    def __init__(self, status, msg): super().__init__(msg); self.status = status


def licence_ok(s):
    """True only for CC0, CC-BY, CC-BY-SA (any version) or public domain. NC / ND variants and anything unknown are refused."""
    k = re.sub(r"[\s_]+", "-", str(s or "").strip().lower())
    return bool(_LIC.match(k))


def load_manifest(path=MANIFEST):
    try: m = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError: raise MeshError(503, "Mesh manifest missing")
    except (OSError, ValueError): raise MeshError(503, "Mesh manifest unreadable")
    miss = [k for k in REQUIRED if not isinstance(m.get(k), str) or not m[k].strip()]
    if miss: raise MeshError(503, "Mesh manifest incomplete: " + ", ".join(miss))
    if not m["source_url"].startswith("https://"): raise MeshError(503, "Mesh manifest source_url must be https")
    if not licence_ok(m["licence"]): raise MeshError(503, "Mesh licence is not CC0, CC-BY, CC-BY-SA or public domain")
    return m


def resolve_mesh(name, manifest=None, models_dir=MODELS):
    """Return the Path for an allowed mesh file, or raise MeshError(404). Blocks traversal, separators, hidden files, unknown extensions
    and any file the manifest does not name."""
    m = manifest or load_manifest()
    if not isinstance(name, str) or not name or len(name) > 120 or "\x00" in name or "/" in name or "\\" in name or ".." in name or name.startswith("."):
        raise MeshError(404, "Not found")
    if Path(name).name != name or Path(name).suffix.lower() not in ALLOWED_EXT or name != m["file"]:
        raise MeshError(404, "Not found")
    base = Path(models_dir).resolve(); p = (base / name).resolve()
    if p.parent != base or not p.is_file(): raise MeshError(404, "Not found")
    return p


def public_manifest(m=None):
    """Manifest as served to the page (adds the mesh URL; omits nothing the page needs to show the credit and licence)."""
    m = dict(m or load_manifest()); m["mesh_url"] = "/heart-function/mesh/" + m["file"]; return m


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()


def make_router():
    from fastapi import APIRouter, HTTPException
    from fastapi.responses import FileResponse
    r = APIRouter()

    @r.get("/api/heart-function/manifest")
    def manifest():
        try: return public_manifest()
        except MeshError as e: raise HTTPException(e.status, str(e))

    @r.get("/heart-function/mesh/{name}", include_in_schema=False)
    def mesh(name: str):
        try: p = resolve_mesh(name)
        except MeshError as e: raise HTTPException(e.status, str(e))
        return FileResponse(p, media_type=ALLOWED_EXT[p.suffix.lower()], headers={"Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff"})
    return r
