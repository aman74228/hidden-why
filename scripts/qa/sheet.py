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
(8) CHARACTERS.md rules 1/4/6: a second render pass (--props qaHands) draws every character's
own arms and hands in its ID colour on black; per frame each character must show at most 2 hands,
each hand touching its own arm (no floating or extra limbs), no hand/arm pixels over the eye band
of a face (unless binoculars / "allowFace"), and no shot may draw hand sprites that are not a
character's own (scripts/qa/hands.ts). Writes a labelled
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
hands_dir = out / "hands"
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
        hands_dir.mkdir(parents=True, exist_ok=True)
        for f in picks:  # hand-count pass: cast only, own arms/hands in ID colours
            subprocess.run(["npx", "remotion", "still", str(b), slug, str(hands_dir / f"f{f:04d}.png"), f"--frame={f}", "--scale=0.5",
                            '--props={"qaHands":true}'], cwd=ROOT, check=True, capture_output=True)

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

# ---- CHARACTERS.md rules 1 / 4 / 6: hands ----
QA_COLOURS = [((255, 0, 0), (127, 0, 0)), ((0, 255, 0), (0, 127, 0)), ((0, 0, 255), (0, 0, 127)), ((255, 255, 0), (127, 127, 0)), ((255, 0, 255), (127, 0, 127)), ((0, 255, 255), (0, 127, 127))]
def components(mask, min_px=6):
    """4-connected blobs of a boolean mask -> list of (ys, xs) arrays (pure numpy/python, small masks)"""
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack, py, px = [(y0, x0)], [], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop(); py.append(y); px.append(x)
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; stack.append((yy, xx))
        if len(py) >= min_px:
            out.append((np.array(py), np.array(px)))
    return out
hands_info = json.loads(subprocess.run(["npx", "-y", "tsx", "scripts/qa/hands.ts", slug], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1])
for sp in hands_info["sprites"]:
    i = next(k for k, s0 in enumerate(L["shots"]) if s0["id"] == sp["shot"])
    flags.setdefault(starts[i], []).append(f"extra hand sprite: {sp['what']} (CHARACTERS.md rule 1)")
hand_counts = {}
for fr in hands_info["frames"]:
    f = fr["frame"]
    hp = hands_dir / f"f{f:04d}.png"
    if not hp.exists():
        continue
    img = np.asarray(Image.open(hp).convert("RGB").resize((270, 480), Image.NEAREST), np.int16)
    H_, W_ = img.shape[:2]
    for c in fr["cast"]:
        hc, ac = QA_COLOURS[c["i"] % len(QA_COLOURS)]
        hand = (np.abs(img - np.array(hc)).sum(axis=2) < 40)
        arm = (np.abs(img - np.array(ac)).sum(axis=2) < 40)
        blobs = components(hand)
        hand_counts.setdefault(fr["shot"], []).append(len(blobs))
        who = c["who"]
        if len(blobs) > 2:
            flags.setdefault(f, []).append(f"{who}: {len(blobs)} hands (expect 2; rule 6)")
        if len(components(arm, 10)) > 2:
            flags.setdefault(f, []).append(f"{who}: more than 2 arms visible (rule 1)")
        # every hand must touch its own arm (no floating hands)
        armd = arm.copy()
        for dy in (-2, -1, 1, 2):
            armd |= np.roll(arm, dy, 0)
        for dx in (-2, -1, 1, 2):
            armd |= np.roll(armd, dx, 1)
        for ys, xs in blobs:
            if arm.any() and not armd[ys, xs].any():
                flags.setdefault(f, []).append(f"{who}: floating hand (not attached to an arm; rule 1)")
                break
        # nothing over the eye band of the face (rule 4)
        fb = c.get("face")
        if fb and not c["allowFace"]:
            x0, x1 = int(max(0, fb["x0"]) * W_), int(min(1, fb["x1"]) * W_)
            yh = fb["y1"] - fb["y0"]
            y0, y1 = int(max(0, fb["y0"] + yh * 0.3) * H_), int(min(1, fb["y0"] + yh * 0.6) * H_)
            if x1 > x0 and y1 > y0:
                cover = (hand | arm)[y0:y1, x0:x1].mean()
                if cover > 0.04:
                    flags.setdefault(f, []).append(f"{who}: arm/hand over the eyes ({cover:.0%}; rule 4)")

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
report = {"frames": len(picks), "fixed_shots": fix_report, "hands_per_shot": {k: max(v) for k, v in hand_counts.items()}, "flagged": {f"{f / FPS:.1f}s ({L['shots'][shot_of(f)]['id']})": v for f, v in sorted(flags.items())}}
(out / "report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report, indent=1))
