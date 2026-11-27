#!/usr/bin/env python3
"""Character model sheet, rendered FROM THE PRODUCTION RIGS (src/characters, src/sets/emus.tsx).

1. writes src/shots/character-sheet.json (one 1 s "shot" per panel, studio set, no audio use)
2. renders one still per panel with Remotion (half scale)
3. composes public/characters/sheet.png: per character the turnaround (front, 3/4, side), hands
   (open, pointing, gripping), prop poses (small box, binoculars, handing over), 6 expressions and
   the palette read from the code; a height chart; the emu (guest) views + palette.

usage: python3 scripts/character_sheet.py [--skip-render]
"""
import json, math, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
T15 = math.tan(math.radians(15))
CAST = {"nik": {"h": 1.42, "head": 0.78 + 0.3, "R": 0.36}, "vik": {"h": 2.2, "head": 1.68 + 0.25, "R": 0.27}, "gus": {"h": 1.62, "head": 1.02 + 0.27, "R": 0.3}}
NAMES = {"nik": "NIK  (curious kid, asks the question)", "vik": "VIK  (bets and loses)", "gus": "GUS  (shows the answer)"}

# ---------------- 1. panels ----------------
shots, labels = [], {}
def cam(x, y, d):
    return {"type": "dolly", "from": [x, y, d], "to": [x, y, d], "look": [x, y, 0], "fov": 30}
def add(sid, cast, camera, label, fx=None):
    s = {"id": sid, "set": "studio", "duration": 1.0, "camera": camera, "cast": cast, "layout": "manual"}
    if fx: s["fx"] = fx
    shots.append(s); labels[sid] = label
for who, c in CAST.items():
    h = c["h"]
    for v, lab in [("front", "Front"), ("threeq", "3/4"), ("side", "Side")]:
        add(f"{who}-view-{v}", [{"who": who, "pos": [0, 0], "facing": 1, "pose": "idle", "view": v}], cam(0, h / 2, h * 1.3 / (2 * T15)), "Turnaround: " + lab)
    for pose, lab in [("idle", "Neutral"), ("curious", "Curious"), ("lean", "Smug"), ("shock", "Shocked"), ("nervous", "Worried / sweating"), ("laugh", "Laughing")]:
        add(f"{who}-exp-{pose}", [{"who": who, "pos": [0, 0], "facing": 1, "pose": pose}], cam(0, c["head"], c["R"] * 4.2 / (2 * T15)), lab)
    wide = cam(0.22, h / 2, h * 1.45 / (2 * T15))
    for sid, extra, lab in [("open", {"pose": "present"}, "Hands: open"), ("point", {"pose": "point"}, "Hands: pointing"), ("grip", {"pose": "idle", "holding": "tin-hand"}, "Hands: gripping")]:
        add(f"{who}-hand-{sid}", [dict({"who": who, "pos": [0, 0], "facing": 1}, **extra)], wide, lab)
    for sid, extra, lab in [("box", {"pose": "idle", "holding": "box"}, "Holding a small box"), ("binoculars", {"pose": "idle", "holding": "binoculars"}, "Holding binoculars"), ("handover", {"pose": "hold-out", "holding": "box-hand"}, "Handing over")]:
        add(f"{who}-prop-{sid}", [dict({"who": who, "pos": [0, 0], "facing": 1}, **extra)], wide, lab)
HC = {"cx": 0.15, "d": 5.0 / (2 * T15 * 1080 / 1920)}
add("height-chart", [{"who": "gus", "pos": [-1.6, 0], "facing": 1, "pose": "idle"}, {"who": "nik", "pos": [-0.45, 0], "facing": 1, "pose": "idle"}, {"who": "vik", "pos": [0.6, 0], "facing": -1, "pose": "idle"}],
    cam(HC["cx"], 1.1, HC["d"]), "Height chart", fx={"emus": [{"pos": [1.85, 0], "facing": -1, "gait": "stand", "seed": 5, "view": "side"}]})
for v, lab, g in [("front", "Front", "stand"), ("threeq", "3/4", "stand"), ("side", "Side", "stand"), ("side", "Running", "run")]:
    add(f"emu-{lab.lower().replace('/', '')}", [], cam(0, 0.875, 1.75 * 1.3 / (2 * T15)), lab, fx={"emus": [{"pos": [0, 0], "facing": 1, "gait": g, "seed": 5, "view": v}]})
L = {"slug": "character-sheet", "title": "Character sheet", "audio": "vo/04-emu-war.mp3", "music": False, "sfx": False, "payoffHold": 0, "shots": shots}
(ROOT / "src/shots/character-sheet.json").write_text(json.dumps(L, indent=1))
ids = [s["id"] for s in shots]

# ---------------- 2. render ----------------
pan = ROOT / "out/characters/panels"
pan.mkdir(parents=True, exist_ok=True)
if "--skip-render" not in sys.argv:
    with tempfile.TemporaryDirectory() as td:
        b = Path(td) / "bundle"
        subprocess.run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", str(b)], cwd=ROOT, check=True, capture_output=True)
        for i in range(len(shots)):
            subprocess.run(["npx", "remotion", "still", str(b), "character-sheet", str(pan / f"p{i:02d}.png"), f"--frame={i * 30 + 12}", "--scale=0.5"], cwd=ROOT, check=True, capture_output=True)

# ---------------- 3. compose ----------------
def font(n, bold=True):
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf", n)
F1, F2, F3, F4 = font(54), font(30), font(22), font(19, False)
cast_src = (ROOT / "src/characters/cast.ts").read_text()
def palette(name):
    i = cast_src.index(f"  {name}: {{\n    name: '{name}'"); b = cast_src[i:cast_src.index("\n  },", i)]
    o = dict(re.findall(r"(body|sleeve|legs|trim|shoes): '(#[0-9A-Fa-f]{6})'", b.split("outfit:")[1]))
    return [("skin", re.search(r"skin: '(#\w{6})'", b).group(1)), ("hair", re.search(r"hair: '(#\w{6})'", b).group(1))] + [(k, o[k]) for k in ["body", "sleeve", "legs", "trim", "shoes"]]
emu_src = (ROOT / "src/sets/emus.tsx").read_text()
emu_pal = [(k.lower(), v) for k, v in re.findall(r"^const (BODY|BODY_DK|BODY_LT|HEAD|SKIN|SKIN_LT|LEG|LEG_DK|BILL|IRIS) = '(#[0-9A-Fa-f]{6})';", emu_src, re.M)]
ink = re.search(r"ink: '(#[0-9A-Fa-f]{6})'", (ROOT / "src/theme.ts").read_text()).group(1)

W, BG, ACC, WH = 2160, (32, 30, 48), (242, 163, 58), (245, 245, 245)
def panel(sid, w, h, head=False):
    im = Image.open(pan / f"p{ids.index(sid):02d}.png").convert("RGB")
    if head:
        side = int(im.width * 0.92); x0 = (im.width - side) // 2; y0 = int(im.height * 0.5 - side * 0.6)
        im = im.crop((x0, y0, x0 + side, y0 + side))
    else:
        im = im.crop((0, int(im.height * 0.06), im.width, int(im.height * 0.97)))
    return im.resize((w, h))
def swatches(d, x, y, pal, cols, dx, dy):
    for k, (nm, hx) in enumerate(pal):
        cx, cy = x + (k % cols) * dx, y + (k // cols) * dy
        d.rectangle((cx, cy, cx + 58, cy + 58), fill=hx, outline=(0, 0, 0), width=2)
        d.text((cx + 64, cy + 4), nm, font=F4, fill=WH); d.text((cx + 64, cy + 28), hx.upper(), font=F4, fill=WH)
sheet = Image.new("RGB", (W, 5400), BG); d = ImageDraw.Draw(sheet)
d.text((30, 24), "Hidden Why: character model sheet", font=F1, fill=ACC)
d.text((30, 92), "Rendered from the production rigs (src/characters, src/sets/emus.tsx) by scripts/character_sheet.py. Flat 2D parts, 4 px ink outline, palette as in code. Rules: CHARACTERS.md", font=F4, fill=WH)
y, pw, ph, eh = 140, 240, 400, 230
for n in CAST:
    d.rectangle((0, y, W, y + 52), fill=(48, 44, 72)); d.text((24, y + 10), NAMES[n], font=F2, fill=ACC); y += 60
    row = [f"{n}-view-{v}" for v in ["front", "threeq", "side"]] + [f"{n}-hand-{h}" for h in ["open", "point", "grip"]] + [f"{n}-prop-{p}" for p in ["box", "binoculars", "handover"]]
    for k, sid in enumerate(row):
        sheet.paste(panel(sid, pw - 8, ph - 38), (k * pw + 4, y)); d.text((k * pw + 10, y + ph - 34), labels[sid], font=F3 if len(labels[sid]) < 19 else F4, fill=WH)
    y += ph + 6
    for k, p in enumerate(["idle", "curious", "lean", "shock", "nervous", "laugh"]):
        sid = f"{n}-exp-{p}"
        sheet.paste(panel(sid, eh, eh, head=True), (k * (eh + 8) + 4, y)); d.text((k * (eh + 8) + 10, y + eh + 4), labels[sid], font=F3, fill=WH)
    sx = 6 * (eh + 8) + 20
    d.text((sx, y), "Palette (src/characters/cast.ts)", font=F3, fill=ACC)
    swatches(d, sx, y + 36, palette(n), 4, 172, 96)
    y += eh + 40
# height chart with metre lines
d.rectangle((0, y, W, y + 52), fill=(48, 44, 72)); d.text((24, y + 10), "HEIGHT CHART  (same camera, same distance)", font=F2, fill=ACC); y += 60
hc = Image.open(pan / f"p{ids.index('height-chart'):02d}.png").convert("RGB")
def proj(wx, wy):
    return (0.5 + (wx - HC["cx"]) / (2 * HC["d"] * T15 * 1080 / 1920)) * hc.width, (0.5 - (wy - 1.1) / (2 * HC["d"] * T15)) * hc.height
y0, y1 = int(proj(0, 2.55)[1]), int(proj(0, -0.05)[1])
hh = 900; strip = hc.crop((0, y0, hc.width, y1)); sc = hh / strip.height; strip = strip.resize((int(strip.width * sc), hh))
ox = (W - strip.width) // 2; sheet.paste(strip, (ox, y))
for m in [0.5, 1.0, 1.5, 2.0]:
    py = (proj(0, m)[1] - y0) * sc + y
    d.line((ox, py, ox + strip.width, py), fill=(120, 120, 140), width=2); d.text((ox + 6, py - 24), f"{m:.1f} m", font=F4, fill=(60, 60, 80))
for name, wx, top in [("Gus 1.62 m", -1.6, 1.85), ("Nik 1.42 m", -0.45, 1.75), ("Vik 2.20 m", 0.6, 2.42), ("Emu ~1.75 m", 1.85, 1.95)]:
    px, py = proj(wx, top); d.text((px * sc + ox - 72, (py - y0) * sc + y - 12), name, font=F3, fill=(30, 30, 50))
y += hh + 16
d.rectangle((0, y, W, y + 52), fill=(48, 44, 72)); d.text((24, y + 10), "EMU  (guest, Short #4): src/sets/emus.tsx", font=F2, fill=ACC); y += 60
for k, sid in enumerate([s for s in ids if s.startswith("emu-")]):
    sheet.paste(panel(sid, pw + 40, ph), (k * (pw + 48) + 4, y)); d.text((k * (pw + 48) + 10, y + ph - 34), labels[sid], font=F3, fill=WH)
sx = 4 * (pw + 48) + 20
d.text((sx, y), "Palette (src/sets/emus.tsx; fedora: Character.tsx; ink: theme.ts)", font=F3, fill=ACC)
swatches(d, sx, y + 36, emu_pal + [("fedora felt", "#4A3022"), ("fedora band", "#F2A33A"), ("ink outline", ink)], 3, 180, 80)
y += ph + 20
(ROOT / "public/characters").mkdir(parents=True, exist_ok=True)
sheet.crop((0, 0, W, y)).save(ROOT / "public/characters/sheet.png")
print("public/characters/sheet.png", W, y)
