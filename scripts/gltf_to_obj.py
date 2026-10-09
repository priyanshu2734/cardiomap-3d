"""Convert a self-contained .gltf (embedded base64 buffer) to Wavefront .obj + .mtl.
Usage: python scripts/gltf_to_obj.py in.gltf out.obj [prefix]   (dependency: numpy)
Keeps one `o` object per glTF mesh node (names preserved) so the app can still
identify structures by name. No node transforms exist in the HRA heart files."""
import base64, json, sys, numpy as np
CT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

def load(path):
    j = json.load(open(path))
    b = j["buffers"][0]["uri"]
    if b.startswith("data:"): raw = base64.b64decode(b.split(",", 1)[1])
    else: raw = open(path.rsplit("/", 1)[0] + "/" + b, "rb").read()
    return j, raw

def acc(j, raw, i):
    a = j["accessors"][i]; bv = j["bufferViews"][a["bufferView"]]
    dt, n = CT[a["componentType"]], NC[a["type"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return np.frombuffer(raw, dt, a["count"] * n, off).reshape(a["count"], n if n > 1 else 1)

def walk(j, i, out):
    n = j["nodes"][i]
    if "mesh" in n: out.append(n)
    for c in n.get("children", []): walk(j, c, out)

def convert(src, dst, mtl_name):
    j, raw = load(src); nodes = []
    for r in j["scenes"][0]["nodes"]: walk(j, r, nodes)
    base = dst.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    L = [f"# Heart reference model converted from {src.rsplit('/',1)[-1]}",
         "# Source: HuBMAP Consortium / Human Reference Atlas 3D Reference Object Library (CC BY 4.0)",
         "# https://github.com/hubmapconsortium/ccf-releases/tree/main/v1.2/models",
         "# Generic reference anatomy - not patient-specific, not for diagnosis",
         f"mtllib {mtl_name}"]
    vo = 1; nv = nf = 0
    for n in nodes:
        for p in j["meshes"][n["mesh"]]["primitives"]:
            P = acc(j, raw, p["attributes"]["POSITION"]).astype(np.float64)
            N = acc(j, raw, p["attributes"]["NORMAL"]).astype(np.float64)
            I = acc(j, raw, p["indices"]).reshape(-1, 3).astype(np.int64) + vo
            L += [f"o {n['name']}", f"usemtl {n['name']}"]
            L += [f"v {x:.6f} {y:.6f} {z:.6f}" for x, y, z in P]
            L += [f"vn {x:.5f} {y:.5f} {z:.5f}" for x, y, z in N]
            L += [f"f {a}//{a} {b}//{b} {c}//{c}" for a, b, c in I]
            vo += len(P); nv += len(P); nf += len(I)
    open(dst, "w").write("\n".join(L) + "\n")
    m = j["materials"][0]["pbrMetallicRoughness"]["baseColorFactor"]
    M = []
    for n in nodes:
        M += [f"newmtl {n['name']}", f"Kd {m[0]:.4f} {m[1]:.4f} {m[2]:.4f}", "Ka 0.1 0.1 0.1", "Ks 0.2 0.2 0.2", "Ns 40", "d 1.0", ""]
    open(dst.rsplit("/", 1)[0] + "/" + mtl_name if "/" in dst else mtl_name, "w").write("\n".join(M))
    return len(nodes), nv, nf

if __name__ == "__main__":
    print(convert(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "heart.mtl"))
