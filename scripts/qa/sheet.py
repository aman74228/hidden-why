#!/usr/bin/env python3
"""Whole-video QA: render the Short at 2 fps (half scale, one bundle), then
flag (1) mostly dark/empty frames, (2) any stretch over 3 s without visible
movement, (3) captions over faces (scripts/qa/faces.ts), (4) half faces/bodies
on the frame edge (scripts/qa/crops.ts; a shot may opt out with "allowCrop"), (5) frames where
more than 40% of the picture is low-detail (haze, empty sky, bare ground: no edge within ~30 px),
(6) things named in the captions that are not on screen while spoken (scripts/qa/nouns.ts; a shot
may declare deliberate absences with "nounsOk"), (7) with --fixed id1,id2,...: frames of shots
listed in a fix round that came out (near-)identical to the last delivered QA frames, i.e. the fix
was never re-rendered (mean abs diff < 0.004 and SSIM > 0.995 vs out/qa/<slug>/prev_frames).
Writes a labelled
contact sheet (flagged frames outlined) and a JSON report.

usage: python3 scripts/qa/sheet.py <slug> [--skip-render] [--fixed shot-id,shot-id,...]
out:   out/qa/<slug>/frames/*.png, out/qa/<slug>/contact-sheet.jpg, out/qa/<slug>/report.json
"""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
slug = sys.argv[1]
skip = "--skip-render" in sys.argv
fixed = next((a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith("--fixed")), "")
fixed = [x for x in fixed.split(",") if x]
FPS, STEP = 30, 15
out = ROOT / "out/qa" / slug
frames_dir = out / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)
L = json.loads((ROOT / f"src/shots/{slug}.json").read_text())
lens = [max(1, int(s["duration"] * FPS + 0.5)) for s in L["shots"]]
starts = [sum(lens[:i]) for i in range(len(lens))]
total = sum(lens) + int(L.get("payoffHold", 0.5) * FPS + 0.5)
picks = list(range(0, total, STEP))

prev_dir = out / "prev_frames"
if not skip:
    # keep the last delivered frames to compare the fix round against
    import shutil
    if any(frames_dir.glob("f*.png")):
        shutil.rmtree(prev_dir, ignore_errors=True)
        shutil.copytree(frames_dir, prev_dir)
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

def low_detail(path, e_thr=0.04, rad=2, B=15):
    """share of 15 px blocks (at 270x480) with no edge anywhere within `rad` blocks:
    flat character fills sit next to their outlines and count as detail; haze, empty sky
    and bare ground do not"""
    from PIL import ImageFilter
    a = np.asarray(Image.open(path).convert("L").resize((270, 480)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    g = np.zeros_like(a)
    g[:-1, :-1] = np.abs(np.diff(a, axis=1))[:-1, :] + np.abs(np.diff(a, axis=0))[:, :-1]
    h, w = a.shape[0] // B, a.shape[1] // B
    edge = g[:h * B, :w * B].reshape(h, B, w, B).max(axis=(1, 3)) > e_thr
    near = edge.copy()
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            near |= np.roll(np.roll(edge, dy, 0), dx, 1)
    return float((~near).mean())

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
    ld = low_detail(frames_dir / f"f{f:04d}.png")
    if ld > 0.40:
        flags.setdefault(f, []).append(f"low-detail {ld:.0%} (haze/sky/flat ground)")

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
def ssim(a, b):
    """global SSIM of two grey images (0..1 floats)"""
    c1, c2 = 0.01 ** 2, 0.03 ** 2
    ma, mb = a.mean(), b.mean()
    va, vb = a.var(), b.var()
    cov = ((a - ma) * (b - mb)).mean()
    return float(((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2)))

fix_report = {}
for sid in fixed:
    i = next((k for k, s0 in enumerate(L["shots"]) if s0["id"] == sid), None)
    if i is None:
        flags.setdefault(0, []).append(f"--fixed: no shot '{sid}'")
        continue
    same = []
    for f in [p for p in picks if starts[i] <= p < starts[i] + lens[i]]:
        pf = prev_dir / f"f{f:04d}.png"
        if not pf.exists():
            continue
        a = np.asarray(Image.open(frames_dir / f"f{f:04d}.png").convert("L").resize((270, 480)), np.float32) / 255
        b = np.asarray(Image.open(pf).convert("L").resize((270, 480)), np.float32) / 255
        mad, ss = float(np.abs(a - b).mean()), ssim(a, b)
        fix_report.setdefault(sid, []).append({"frame": f, "mad": round(mad, 4), "ssim": round(ss, 4)})
        if mad < 0.004 and ss > 0.995:
            flags.setdefault(f, []).append(f"fix round: '{sid}' unchanged vs last delivery (SSIM {ss:.3f})")

nouns = json.loads(subprocess.run(["npx", "-y", "tsx", "scripts/qa/nouns.ts", slug], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1])
for c in nouns:  # a thing named in the caption is not on screen while spoken
    f = min(picks, key=lambda p: abs(p - c["t"] * FPS))
    flags.setdefault(f, []).append(f"'{c['word']}' spoken but {c['thing']} {c['reason']}")
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
report = {"frames": len(picks), "fixed_shots": fix_report, "flagged": {f"{f / FPS:.1f}s ({L['shots'][shot_of(f)]['id']})": v for f, v in sorted(flags.items())}}
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
