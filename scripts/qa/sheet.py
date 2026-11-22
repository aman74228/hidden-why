#!/usr/bin/env python3
"""Whole-video QA: render the Short at 2 fps (half scale, one bundle), then
flag (1) mostly dark/empty frames, (2) any stretch over 3 s without visible
movement, (3) captions over faces (scripts/qa/faces.ts), (4) half faces/bodies
on the frame edge (scripts/qa/crops.ts; a shot may opt out with "allowCrop"). Writes a labelled
contact sheet (flagged frames outlined) and a JSON report.

usage: python3 scripts/qa/sheet.py <slug> [--skip-render]
out:   out/qa/<slug>/frames/*.png, out/qa/<slug>/contact-sheet.jpg, out/qa/<slug>/report.json
"""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
slug = sys.argv[1]
skip = "--skip-render" in sys.argv
FPS, STEP = 30, 15
out = ROOT / "out/qa" / slug
frames_dir = out / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)
L = json.loads((ROOT / f"src/shots/{slug}.json").read_text())
lens = [max(1, int(s["duration"] * FPS + 0.5)) for s in L["shots"]]
starts = [sum(lens[:i]) for i in range(len(lens))]
total = sum(lens) + int(L.get("payoffHold", 0.5) * FPS + 0.5)
picks = list(range(0, total, STEP))

if not skip:
    subprocess.run(["node", "scripts/prep.mjs", slug], cwd=ROOT, check=True, capture_output=True)
    with tempfile.TemporaryDirectory() as td:
        b = Path(td) / "bundle"
        subprocess.run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", str(b)], cwd=ROOT, check=True, capture_output=True)
        for f in picks:
            subprocess.run(["npx", "remotion", "still", str(b), slug, str(frames_dir / f"f{f:04d}.png"), f"--frame={f}", "--scale=0.5"],
                           cwd=ROOT, check=True, capture_output=True)

def shot_of(f):
    for i, s0 in enumerate(starts):
        if s0 <= f < s0 + lens[i]:
            return i
    return len(lens) - 1

imgs, flags = {}, {}
for f in picks:
    im = np.asarray(Image.open(frames_dir / f"f{f:04d}.png").convert("RGB").resize((270, 480)), np.float32) / 255
    imgs[f] = im
    luma = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dark = float((luma < 0.08).mean())
    if luma.mean() < 0.12 or dark > 0.6:
        flags.setdefault(f, []).append(f"dark (mean {luma.mean():.2f}, {dark:.0%} near-black)")
    if luma.std() < 0.045:
        flags.setdefault(f, []).append(f"empty/flat (std {luma.std():.3f})")

# no movement: consecutive 0.5 s samples nearly identical for > 3 s (payoff hold excluded)
still_run = []
for a, b in zip(picks, picks[1:]):
    if b >= sum(lens):
        break
    diff = float(np.abs(imgs[a] - imgs[b]).mean())
    if diff < 0.006:
        still_run.append(a)
        if len(still_run) * STEP / FPS > 3.0:
            for g in still_run:
                flags.setdefault(g, []).append("no movement > 3 s")
    else:
        still_run = []

faces = json.loads(subprocess.run(["npx", "-y", "tsx", "scripts/qa/faces.ts", slug], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1])
for c in faces:
    f = min(picks, key=lambda p: abs(p - c["t"] * FPS))
    flags.setdefault(f, []).append(f"caption over {c['who']}'s face ('{c['caption']}')")
crops = json.loads(subprocess.run(["npx", "-y", "tsx", "scripts/qa/crops.ts", slug], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1])
for c in crops:  # half a face/body on the left, right or top edge (shots with "allowCrop" are skipped)
    f = min(picks, key=lambda p: abs(p - c["t"] * FPS))
    flags.setdefault(f, []).append(f"{c['who']}'s {c['part']} cut by the frame edge ({c['visible']:.0%} visible)")

# contact sheet: 10 columns, timestamp + shot id, red outline on flagged frames
W, H, C = 216, 384, 10
rows = (len(picks) + C - 1) // C
sheet = Image.new("RGB", (W * C, (H + 28) * rows), (20, 18, 40))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
except OSError:
    font = ImageFont.load_default()
for k, f in enumerate(picks):
    x, y = (k % C) * W, (k // C) * (H + 28)
    sheet.paste(Image.open(frames_dir / f"f{f:04d}.png").convert("RGB").resize((W, H)), (x, y + 28))
    d.text((x + 6, y + 6), f"{f / FPS:5.1f}s  {L['shots'][shot_of(f)]['id'][:16]}", fill=(255, 255, 255), font=font)
    if f in flags:
        d.rectangle([x + 2, y + 30, x + W - 3, y + H + 25], outline=(255, 60, 60), width=5)
sheet.save(out / "contact-sheet.jpg", quality=85)
report = {"frames": len(picks), "flagged": {f"{f / FPS:.1f}s ({L['shots'][shot_of(f)]['id']})": v for f, v in sorted(flags.items())}}
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
