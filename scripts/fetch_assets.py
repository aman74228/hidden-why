#!/usr/bin/env python3
"""Download the studio's CC0 texture + HDRI library from Poly Haven (1k jpg
diffuse + GL normal, 1k .hdr) into public/tex/ and public/hdri/, and log
every file in public/tex/credits.json. Re-running skips files already there.
usage: python3 scripts/fetch_assets.py"""
import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
TEX = {  # studio name -> Poly Haven id (all CC0)
    "sandstone-wall": "red_sandstone_wall",
    "sandstone-paving": "red_sandstone_pavement",
    "sandstone-blocks": "sandstone_blocks_08",
    "cobbles": "cobblestone_floor_04",
    "plaster": "clay_plaster",
    "rust": "rusty_metal_02",
    "rust-coarse": "rust_coarse_01",
    "steel": "metal_plate",
    "planks": "brown_planks_05",
    "brick-floor": "brick_floor",
}
HDRI = {"sunset": "belfast_sunset_puresky", "overcast": "kloofendal_overcast_puresky", "dusk": "qwantani_dusk_2_puresky"}

def get(url, dst):
    if dst.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-sSfL", "-m", "180", "-o", str(dst), url], check=True)
    print("  ", dst.relative_to(ROOT), dst.stat().st_size // 1024, "KB")

def files(pid):
    # curl, not urllib: Poly Haven's API refuses Python's default client
    return json.loads(subprocess.run(["curl", "-sSf", "-m", "60", f"https://api.polyhaven.com/files/{pid}"],
                                     check=True, capture_output=True, text=True).stdout)

credits = []
for name, pid in TEX.items():
    f = files(pid)
    get(f["Diffuse"]["1k"]["jpg"]["url"], ROOT / f"public/tex/{name}/diff.jpg")
    get(f["nor_gl"]["1k"]["jpg"]["url"], ROOT / f"public/tex/{name}/nor.jpg")
    credits.append({"name": name, "kind": "texture", "source": "Poly Haven", "id": pid,
                    "url": f"https://polyhaven.com/a/{pid}", "license": "CC0"})
for name, pid in HDRI.items():
    f = files(pid)
    get(f["hdri"]["1k"]["hdr"]["url"], ROOT / f"public/hdri/{name}.hdr")
    credits.append({"name": name, "kind": "hdri", "source": "Poly Haven", "id": pid,
                    "url": f"https://polyhaven.com/a/{pid}", "license": "CC0"})
(ROOT / "public/tex/credits.json").write_text(json.dumps(credits, indent=1))
print(len(credits), "assets logged in public/tex/credits.json")
