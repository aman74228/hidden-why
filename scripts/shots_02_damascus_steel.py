#!/usr/bin/env python3
"""Builds src/shots/02-damascus-steel.json: 33 shots cut every 1-3 s on the
voiceover word timings (src/captions/02-damascus-steel.json), Vik's lab /
museum case / ore hillside / forge, 8 object inserts, crossed title cards for
the three failed tries, and a last shot that lands on frame 1 (loop)."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PI = math.pi
SMITH = {"body": "#5A3E30", "trim": "#B88A5A", "legs": "#C9B48E", "shoes": "#3A2A22"}
DADA_SMITH = {"who": "dada", "outfit": SMITH, "props": ["apron", "headwrap"]}
VIK = {"who": "vik", "props": ["goggles"]}
VIK_APRON = {"who": "vik", "props": ["apron", "goggles"]}
CHOTU = {"who": "chotu"}
ANVIL = [0.72, 0, 0.12]


# ---- auto-framing: choose the camera distance so every listed point fits the
# portrait frame (x 7-93%, y 6-90%) at the END of the move; the move starts
# `push` further out and `swing` degrees around (always gliding).
H_ = {"chotu": 1.42, "vik": 2.2, "dada": 1.62}
W_ = {"chotu": 0.62, "vik": 0.6, "dada": 0.88}

def body(m, crop=0.0):
    """points of a cast member: head top, sides at chest, feet (or crop height)"""
    x, z = m["pos"]; h = H_[m["who"]]; w = W_[m["who"]] / 2
    lo = h * crop
    return [[x, h + 0.06, z], [x - w, h * 0.62, z], [x + w, h * 0.62, z], [x, lo, z]]

def _proj(pos, look, fov, pt):
    f = [l - p for l, p in zip(look, pos)]; n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    r = [-f[2], 0.0, f[0]]; rn = math.hypot(r[0], r[2]); r = [r[0] / rn, 0, r[2] / rn]
    u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    d = [a - b for a, b in zip(pt, pos)]; z = sum(a * b for a, b in zip(d, f))
    if z <= 0.05: return None
    t = math.tan(math.radians(fov / 2))
    return 0.5 + sum(a * b for a, b in zip(d, r)) / z / (t * 1080 / 1920) / 2, 0.5 - sum(a * b for a, b in zip(d, u)) / z / t / 2

def _fits(pos, look, fov, pts, box):
    for pt in pts:
        q = _proj(pos, look, fov, pt)
        if q is None or not (box[0] <= q[0] <= box[1] and box[2] <= q[1] <= box[3]): return False
    return True

def frame(pts, az=0, el=6, fov=44, push=0.15, swing=4, lookDY=0.0, box=(0.07, 0.93, 0.06, 0.9), drift=None):
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    look = [(a + b) / 2 for a, b in zip(lo, hi)]; look[1] += lookDY
    def at(d, a):
        a_, e_ = math.radians(a), math.radians(el)
        return [look[0] + d * math.sin(a_) * math.cos(e_), look[1] + d * math.sin(e_), look[2] + d * math.cos(a_) * math.cos(e_)]
    d = 0.25
    while d < 30 and not _fits(at(d, az), look, fov, pts, box): d *= 1.03
    to = at(d, az); fr = at(d * (1 + push), az - swing)
    r3 = lambda v: [round(x, 3) for x in v]
    return {"type": "dolly", "from": r3(fr), "to": r3(to), "look": r3(look), "fov": fov}

def c(base, **kw):
    d = dict(base); d.update(kw); return d

cuts = [0, 2.2, 3.35, 5.75, 7.5, 9.75, 11.95, 13.05, 14.6, 15.95, 17.4, 19.8, 22.75, 24.5, 26.3, 27.9, 29.5,
        30.95, 33.75, 35.95, 37.3, 39.7, 41.5, 42.15, 43.3, 46.2, 48.3, 51.45, 53.35, 55.0, 56.45, 57.6, 59.7, 61.75]

HOOK_CAM_A = [-0.25, 1.32, 2.75]   # shot 1 starts here; the last shot ends here (loop)
HOOK_CAM_B = [0.05, 1.36, 2.05]
HOOK_LOOK_A = [0.35, 1.32, 0.0]
HOOK_LOOK_B = [0.38, 1.38, 0.0]
VIK_HOOK = c(VIK, pose="lean", pos=[1.0, 0.35], facing=-1)

shots = [
  # 1 HOOK: laser sweeping the sabre on the scanner, Vik leaning in, fast push-in
  {"id": "hook-laser", "beat": 1, "stillAt": 0.0, "set": "lab",
   "fx": {"lab": {"laser": 1, "laserSweep": [-0.3, 0.35], "sabre": "scanner", "screens": "scan"}},
   "camera": {"type": "dolly", "from": HOOK_CAM_A, "to": HOOK_CAM_B, "look": HOOK_LOOK_A, "lookTo": HOOK_LOOK_B, "fov": 42},
   "cast": [VIK_HOOK], "layout": "manual", "roll": [2, 0.5],
   "sfx": [{"name": "laser-hum", "at": 0, "dur": 2.2}]},
  # 2 Supercomputers: monitor wall stuck at 0% / ERROR, Vik frowning in the screen light
  {"id": "monitors-error", "set": "lab", "fx": {"lab": {"screens": "error", "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [3.25, 1.75, -0.55], "to": [3.05, 1.8, -0.95], "look": [1.55, 1.7, -3.3], "lookTo": [1.65, 1.72, -3.3], "fov": 44},
   "cast": [c(VIK, pose="frown", pos=[2.95, -2.25], facing=-1)], "layout": "manual",
   "sfx": [{"name": "error-beep", "at": 0.25}]},
  # 3 Chotu lifts the sabre into the light; Vik behind; low angle, slow orbit
  {"id": "chotu-lifts", "set": "lab", "fx": {"lab": {"laser": 0, "sabre": "none", "screens": "scan"}},
   "camera": {"type": "orbit", "center": [0.15, 0, 0.9], "radius": 2.6, "height": 0.6, "fromDeg": -18, "toDeg": 12, "lookY": 1.35, "fov": 44},
   "cast": [c(CHOTU, pose="lift", pos=[0.1, 0.9], facing=1, holding="sabre"), c(VIK, pose="lean", pos=[1.35, -0.2], facing=-1)], "layout": "manual",
   "sfx": [{"name": "shimmer", "at": 0.7}]},
  # 4 museum case: the real thing, spotlit; title card
  {"id": "museum-case", "set": "museum",
   "camera": {"type": "dolly", "from": [1.0, 1.35, 3.1], "to": [0.55, 1.35, 2.25], "look": [0.0, 1.2, 0.0], "lookTo": [0.05, 1.2, 0.0], "fov": 42},
   "titleCard": {"label": "Damascus steel", "word": "1,000+ years", "at": 0.15, "duration": 1.6}},
  # 5 INSERT: macro slide along the watered pattern, a water drop rolls along it
  {"id": "macro-blade", "set": "museum", "fx": {"museumDrop": [0.18, 0.62]},
   "camera": {"type": "dolly", "from": [-0.2, 1.33, 0.42], "to": [0.28, 1.38, 0.36], "look": [-0.16, 1.17, -0.02], "lookTo": [0.3, 1.22, -0.06], "fov": 34},
   "dof": 1.2, "focusDist": 0.42, "roll": [-3, 1],
   "sfx": [{"name": "drip", "at": 0.45}]},
  # 6 Vik scoffs, slams his trophy on the workbench; push on the trophy
  {"id": "trophy-slam", "set": "lab", "fx": {"lab": {"trophy": "drop", "trophyDropAt": 0.35, "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [2.55, 1.45, 3.6], "to": [2.75, 1.3, 2.5], "look": [2.75, 1.3, 0.2], "lookTo": [2.85, 1.2, 0.2], "fov": 44},
   "cast": [c(VIK, pose="slam", pos=[3.55, 0.35], facing=-1), c(CHOTU, pose="idle", pos=[1.55, 0.7], facing=1, poses=[{"at": 0.4, "pose": "shock"}])], "layout": "manual",
   "sfx": [{"name": "metal-clang", "at": 0.35}]},
  # 7 INSERT: the engraving "VIK #1"
  {"id": "insert-engraving", "set": "lab", "fx": {"lab": {"trophy": "bench", "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [2.98, 1.12, 0.92], "to": [3.0, 1.09, 0.72], "look": [3.12, 1.04, 0.27], "fov": 34},
   "dof": 1.6, "focusDist": 0.48,
   "sfx": [{"name": "metal-ting", "at": 0.3}]},
  # 8 the bet: Vik proud, Chotu gasps; card
  {"id": "the-bet", "beat": 2, "stillAt": 0.9, "set": "lab", "fx": {"lab": {"trophy": "bench", "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [2.45, 1.3, 4.9], "to": [2.5, 1.3, 4.3], "look": [2.5, 1.25, 0.3], "fov": 44},
   "cast": [c(VIK, pose="proud", pos=[3.55, 0.35], facing=-1), c(CHOTU, pose="gasp", pos=[1.45, 0.75], facing=1)], "layout": "manual",
   "titleCard": {"label": "The bet", "word": "His trophy", "at": 0.1, "duration": 1.45}},
  # 9 Try 1: folding at the press (wide)
  {"id": "try1-press", "set": "lab", "fx": {"lab": {"pressBar": "hot-folded", "pressHits": [0.35, 1.05]}},
   "camera": {"type": "dolly", "from": [-1.15, 1.45, 3.7], "to": [-1.5, 1.4, 3.05], "look": [-2.3, 1.15, 0.9], "lookTo": [-2.4, 1.1, 0.9], "fov": 44},
   "cast": [c(VIK_APRON, pose="hammer", pos=[-1.85, 1.15], facing=-1, holding="hammer", delay=-0.55)], "layout": "manual",
   "titleCard": {"label": "Try 1", "word": "Folding", "at": 0.05, "duration": 2.6},
   "sfx": [{"name": "press-thump", "at": 0.35}, {"name": "press-thump", "at": 1.05}]},
  # 10 fold, hammer, fold: close on the glowing striped bar under the press
  {"id": "try1-fold", "set": "lab", "fx": {"lab": {"pressBar": "hot-folded", "pressHits": [0.2, 0.7, 1.2]}},
   "camera": {"type": "dolly", "from": [-2.25, 1.05, 1.95], "to": [-2.42, 0.98, 1.6], "look": [-2.7, 0.82, 0.9], "fov": 40},
   "roll": [3, -1], "titleCard": {"label": "Try 1", "word": "Folding", "at": 0, "duration": 1.45, "intro": False},
   "sfx": [{"name": "press-thump", "at": 0.2}, {"name": "anvil", "at": 0.7}, {"name": "press-thump", "at": 1.2}]},
  # 11 INSERT (overhead): straight stripes vs the flowing waves, side by side
  {"id": "insert-stripes", "beat": 3, "stillAt": 1.2, "set": "lab", "fx": {"lab": {"benchItems": ["folded-bar", "sabre"]}},
   "camera": {"type": "dolly", "from": [2.12, 1.95, 0.42], "to": [2.18, 1.82, 0.38], "look": [2.15, 0.95, 0.14], "lookTo": [2.18, 0.95, 0.12], "fov": 40},
   "roll": [92, 88],
   "titleCard": {"label": "Try 1", "word": "Folding", "at": 0, "duration": 2.4, "crossed": True, "crossAt": 1.9, "intro": False}},
  # 12 Try 2: Vik unboxes the purest iron like a prize
  {"id": "try2-unbox", "set": "lab", "fx": {"lab": {"benchItems": ["pure-box"], "boxOpenAt": 0.85}},
   "camera": {"type": "dolly", "from": [2.85, 1.55, 2.9], "to": [2.95, 1.5, 2.15], "look": [2.75, 1.35, 0.2], "lookTo": [2.8, 1.3, 0.2], "fov": 44},
   "cast": [c(VIK, pose="present", pos=[3.55, 0.35], facing=-1)], "layout": "manual",
   "titleCard": {"label": "Try 2", "word": "Pure iron", "at": 0.1, "duration": 2.8},
   "sfx": [{"name": "box-open", "at": 0.85}, {"name": "shimmer", "at": 1.25}]},
  # 13 INSERT then reaction: the finished blade is blank; Vik's smile drops
  {"id": "try2-blank", "set": "lab", "fx": {"lab": {"benchItems": ["blank-blade", "pure-bar"]}},
   "camera": {"type": "dolly", "from": [1.95, 1.3, 1.25], "to": [2.35, 1.6, 2.0], "look": [2.05, 0.97, 0.24], "lookTo": [3.1, 1.75, 0.3], "fov": 40},
   "cast": [c(VIK, pose="proud", pos=[3.55, 0.35], facing=-1, poses=[{"at": 0.85, "pose": "deadpan"}])], "layout": "manual",
   "titleCard": {"label": "Try 2", "word": "Pure iron", "at": 0, "duration": 1.75, "crossed": True, "crossAt": 0.6, "intro": False}},
  # 14 Try 3: the old recipe (Chotu holds the parchment), crucible by the furnace
  {"id": "try3-recipe", "set": "lab", "fx": {"lab": {"furnace": 0.8, "benchItems": ["crucible"], "dial": [0.5, 0.6]}},
   "camera": {"type": "dolly", "from": [0.75, 1.35, 2.6], "to": [0.4, 1.35, 2.05], "look": [-1.6, 1.15, -1.0], "lookTo": [-1.7, 1.1, -1.0], "fov": 44},
   "cast": [c(CHOTU, pose="present", pos=[-0.55, 0.45], facing=-1, holding="parchment"), c(VIK_APRON, pose="point", pos=[-2.05, -0.3], facing=1)], "layout": "manual",
   "titleCard": {"label": "Try 3", "word": "The recipe", "at": 0.05, "duration": 1.75}},
  # 15 INSERT: same heat (the furnace dial climbs)
  {"id": "try3-dial", "set": "lab", "fx": {"lab": {"furnace": 1, "dial": [0.25, 0.9]}},
   "camera": {"type": "dolly", "from": [-2.3, 1.22, -0.4], "to": [-2.42, 1.2, -0.62], "look": [-2.5, 1.12, -1.13], "fov": 36},
   "dof": 1.4, "focusDist": 0.6, "roll": [-2, 2],
   "titleCard": {"label": "Try 3", "word": "The recipe", "at": 0, "duration": 1.6, "intro": False}},
  # 16 INSERT: crack the crucible: a plain cake. Blank.
  {"id": "try3-crack", "set": "lab", "fx": {"lab": {"furnace": 0.6, "benchItems": ["cracked"], "crackAt": 0.98}},
   "camera": {"type": "dolly", "from": [-1.3, 1.3, -0.5], "to": [-1.4, 1.2, -0.7], "look": [-1.55, 0.98, -1.2], "fov": 36},
   "dof": 1.4, "focusDist": 0.6,
   "titleCard": {"label": "Try 3", "word": "The recipe", "at": 0, "duration": 1.6, "crossed": True, "crossAt": 1.0, "intro": False},
   "sfx": [{"name": "crucible-crack", "at": 0.98}]},
  # 17 the forge door creaks open: warm light floods the cold lab, Dada in the doorway
  {"id": "door-dada", "set": "lab", "fx": {"lab": {"door": [0, 1], "doorAt": 0.1, "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [-0.6, 1.3, 4.2], "to": [-0.75, 1.35, 3.2], "look": [-0.9, 1.25, -3.6], "fov": 46},
   "cast": [c(DADA_SMITH, pose="nod", pos=[-1.0, -3.35], facing=1, appearAt=0.45),
            c(CHOTU, pose="look-up", pos=[-2.35, -0.6], facing=1), c(VIK, pose="shock", pos=[0.85, -0.9], facing=-1)], "layout": "manual",
   "sfx": [{"name": "gate-creak", "at": 0.1}]},
  # 18 INSERT: Dada's palm opens: a pinch of dark, glittering dirt
  {"id": "insert-palm", "beat": 4, "stillAt": 2.0, "set": "lab", "fx": {"lab": {"door": [1, 1], "sabre": "scanner"},
   "hand": {"pos": [-0.9, 1.02, -2.55], "rot": [0.35, -PI / 2, 0], "s": 2.2, "open": [0, 1], "openAt": 0.2, "grit": True, "sleeve": "#D29A72"}},
   "camera": {"type": "dolly", "from": [-0.82, 1.5, -1.85], "to": [-0.86, 1.42, -2.02], "look": [-0.9, 1.04, -2.6], "fov": 38},
   "dof": 1.5, "focusDist": 0.62,
   "sfx": [{"name": "grit-trickle", "at": 0.6}]},
  # 19 the ore hills of India (wide pan)
  {"id": "hill-wide", "set": "hillside", "fx": {"hill": {"furnace": True}},
   "camera": {"type": "dolly", "from": [-2.4, 1.6, 6.6], "to": [1.1, 1.7, 6.2], "look": [-0.6, 1.4, -2.2], "lookTo": [0.7, 1.3, -2.2], "fov": 46},
   "titleCard": {"label": "Wootz steel", "word": "India", "at": 0.1, "duration": 2.0}},
  # 20 INSERT: a clay crucible glowing in the village furnace
  {"id": "insert-crucible", "set": "hillside", "fx": {"hill": {"furnace": True}},
   "camera": {"type": "dolly", "from": [1.8, 0.55, 2.35], "to": [1.6, 0.45, 2.0], "look": [1.4, 0.25, 1.26], "fov": 38},
   "dof": 1.4, "focusDist": 0.8,
   "sfx": [{"name": "sizzle", "at": 0.2}]},
  # 21 Dada shows the dark ore seams in the red rock
  {"id": "ore-seams", "set": "hillside", "fx": {"hill": {"furnace": True}},
   "camera": {"type": "dolly", "from": [0.7, 1.25, 2.5], "to": [0.35, 1.2, 1.8], "look": [-0.7, 1.15, -2.6], "lookTo": [-0.8, 1.1, -2.6], "fov": 44},
   "cast": [c(DADA_SMITH, pose="point", pos=[-1.7, -1.55], facing=1)], "layout": "manual"},
  # 22 INSERT: tiny violet-silver specks glint in the ore (vanadium)
  {"id": "insert-vanadium", "set": "hillside", "fx": {"hill": {"furnace": True}, "orePot": {"pos": [-0.4, 0.32, 1.0], "s": 1.4, "specks": 9, "glintAt": 0.35}},
   "props": [{"type": "block", "pos": [-0.4, 0, 1.0], "scale": 0.4, "color": "#C98F68"}],
   "camera": {"type": "dolly", "from": [-0.4, 0.86, 1.55], "to": [-0.4, 0.74, 1.36], "look": [-0.4, 0.48, 1.0], "fov": 36},
   "dof": 1.4, "focusDist": 0.45,
   "titleCard": {"label": "Vanadium", "word": "Tiny traces", "at": 0.3, "duration": 1.5},
   "sfx": [{"name": "shimmer", "at": 0.35}]},
  # 23 (silent) reaction: Vik's jaw drops, Chotu stares
  {"id": "reaction", "set": "lab", "fx": {"lab": {"door": [1, 1], "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [-0.1, 1.35, 3.0], "to": [-0.1, 1.33, 2.75], "look": [-0.1, 1.3, -0.8], "fov": 44},
   "cast": [c(CHOTU, pose="look-up", pos=[-0.75, -0.4], facing=1), c(VIK, pose="shock", pos=[0.6, -0.8], facing=-1)], "layout": "manual"},
  # 24 the smith hammers the glowing cake
  {"id": "forge-hammer", "set": "forge", "grade": "flashback", "fx": {"forgeLumps": False, "cake": {"strikes": [0.9]}},
   "camera": {"type": "fit", "angleDeg": 24, "orbitDeg": 14, "push": 0.2},
   "cast": [c(DADA_SMITH, pose="hammer", pos=[0, 0], facing=1, holding="hammer")],
   "sfx": [{"name": "anvil", "at": 0.9}]},
  # 25 INSERT: bands appear in the hot steel with each strike
  {"id": "insert-bands", "beat": 5, "stillAt": 2.6, "set": "forge", "grade": "flashback",
   "fx": {"forgeLumps": False, "forgeClose": True, "cake": {"strikes": [0.45, 1.35, 2.25]}, "hammerHead": {"strikes": [0.45, 1.35, 2.25]},
          "sparks": {"pos": [0.72, 0.6, 0.12], "times": [0.45, 1.35, 2.25], "color": "#FFD76A"}},
   "camera": {"type": "dolly", "from": [1.02, 0.95, 0.78], "to": [0.94, 0.88, 0.62], "look": [0.72, 0.57, 0.12], "lookTo": [0.72, 0.57, 0.12], "fov": 38},
   "roll": [-2, 1], "dof": 1.8, "focusDist": 0.62,
   "sfx": [{"name": "anvil", "at": 0.45}, {"name": "anvil", "at": 1.35}, {"name": "anvil", "at": 2.25}, {"name": "sizzle", "at": 0.5}]},
  # 26 INSERT (overhead): no traces, no swirls: blank vs swirled, Dada's finger
  {"id": "insert-compare", "set": "forge", "grade": "flashback",
   "fx": {"forgeLumps": False, "noSparks": True, "anvilBlades": True,
          "hand": {"pos": [0.98, 0.66, 0.52], "rot": [0, 0.2, PI], "s": 1.3, "point": True, "sleeve": "#D29A72"}},
   "camera": {"type": "dolly", "from": [0.8, 1.62, 0.62], "to": [0.78, 1.5, 0.55], "look": [0.8, 0.57, 0.14], "fov": 40},
   "roll": [91, 88]},
  # 27 around 1750 the mines ran dry: the last basket scrapes bare rock
  {"id": "mines-dry", "set": "hillside", "fx": {"hill": {"empty": True, "scrape": [-1.6, 0.6], "dust": True}},
   "camera": {"type": "dolly", "from": [0.1, 0.95, 1.4], "to": [0.4, 1.7, 5.4], "look": [-0.3, 0.6, -2.4], "lookTo": [0.0, 1.2, -2.4], "fov": 44},
   "titleCard": {"label": "Mines ran dry", "word": "~1750", "at": 0.2, "duration": 2.6},
   "sfx": [{"name": "coin-scrape", "at": 0.4}, {"name": "coin-scrape", "at": 1.5}]},
  # 28 the recipe died: the forge goes dark, the last ember fades
  {"id": "forge-dark", "set": "forge", "light": "forge", "lightTo": "forge-dark", "mixAt": [0.2, 1.7], "grade": "flashback",
   "fx": {"forgeLumps": False, "noSparks": True, "forgeGlow": [1, 0.2], "cake": {"strikes": [], "glow": [0.9, 0.12]}},
   "camera": {"type": "dolly", "from": [1.9, 1.15, 2.6], "to": [1.6, 1.05, 2.0], "look": [0.6, 0.8, 0.1], "fov": 44},
   "cast": [c(DADA_SMITH, pose="idle", pos=[-0.05, 0.1], facing=1)], "layout": "manual",
   "sfx": [{"name": "sizzle", "at": 0.2}]},
  # 29 the bet collected: Vik's trophy melts, Vik peeks through his fingers
  {"id": "trophy-melts", "set": "lab", "fx": {"lab": {"trophy": "melt", "melt": [0.05, 0.9], "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [0.55, 1.4, 2.3], "to": [1.05, 1.6, 2.9], "look": [0.5, 1.0, 0.9], "lookTo": [1.1, 1.45, 0.7], "fov": 44},
   "cast": [c(VIK, pose="peek", pos=[1.55, 0.55], facing=-1), c(CHOTU, pose="gasp", pos=[-0.45, 1.25], facing=1)], "layout": "manual",
   "sfx": [{"name": "molten-pour", "at": 0.1}]},
  # 30 INSERT: the trophy ingot: shiny, plain, no swirl (next to the real thing)
  {"id": "insert-ingot", "beat": 6, "stillAt": 1.0, "set": "lab", "fx": {"lab": {"benchItems": ["ingot", "sabre"]}},
   "camera": {"type": "dolly", "from": [3.0, 1.32, 1.0], "to": [2.88, 1.2, 0.8], "look": [2.62, 0.98, 0.3], "fov": 38},
   "dof": 1.4, "focusDist": 0.6},
  # 31 Vik, deadpan. Ding.
  {"id": "vik-deadpan", "payoff": True, "payoffAt": 0.43, "set": "lab", "fx": {"lab": {"benchItems": ["ingot", "sabre"]}},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.42, "band": [0.12, 0.88], "angleDeg": -8, "orbitDeg": 3, "push": 0.06},
   "cast": [c(VIK, pose="deadpan", pos=[3.55, 0.35], facing=-1)]},
  # 32 back in the lab: Chotu brings the sabre to the scanner
  {"id": "chotu-places", "set": "lab", "fx": {"lab": {"laser": 0, "sabre": "none", "screens": "scan"}},
   "camera": {"type": "dolly", "from": [0.9, 1.3, 3.6], "to": [0.7, 1.3, 3.0], "look": [0.3, 1.1, 0.0], "fov": 44},
   "cast": [c(CHOTU, pose="point", pos=[-0.35, 0.75], facing=1, holding="sabre", enter={"from": [-1.6, 1.3], "at": 0, "dur": 1.0}), VIK_HOOK], "layout": "manual",
   "sfx": [{"name": "footsteps-stone", "at": 0, "dur": 1.0}]},
  # 33 the laser powers up again: push-in that lands exactly on frame 1 (loop)
  {"id": "loop-laser", "set": "lab", "fx": {"lab": {"laser": 1, "laserSweep": [-0.3, -0.3], "sabre": "scanner", "screens": "scan"}},
   "camera": {"type": "dolly", "from": [-0.55, 1.3, 3.4], "to": HOOK_CAM_A, "look": [0.32, 1.3, 0.0], "lookTo": HOOK_LOOK_A, "fov": 42},
   "cast": [VIK_HOOK], "layout": "manual", "roll": [3.5, 2],
   "sfx": [{"name": "laser-hum", "at": 0.15, "dur": 2.0}]},
]

# ---------------- framing (auto-fit; see frame()) ----------------
S = {s["id"]: s for s in shots}
def cast(i): return S[i]["cast"]
SABRE_SCAN = [[-0.36, 0.95, 0.05], [0.55, 0.95, -0.17]]
HOOK = frame(SABRE_SCAN + body(VIK_HOOK, crop=0.58) + [[-0.3, 1.62, 0]], az=-14, el=-3, fov=42, push=0.22, swing=-5)
S["hook-laser"]["camera"] = HOOK
S["macro-blade"]["camera"] = {"type": "dolly", "from": [-0.22, 1.5, 0.36], "to": [0.26, 1.54, 0.3], "look": [-0.16, 1.15, -0.02], "lookTo": [0.3, 1.2, -0.06], "fov": 36}
S["macro-blade"]["focusDist"] = 0.5
# the last shot lands exactly on frame 1's camera (loop)
S["loop-laser"]["camera"] = {"type": "dolly", "from": [round(HOOK["from"][0] - 0.35, 3), HOOK["from"][1] - 0.04, round(HOOK["from"][2] + 0.7, 3)],
                             "to": HOOK["from"], "look": HOOK["look"], "fov": 42}
S["loop-laser"]["roll"] = [3.5, 2]   # shot 1 starts at roll 2
S["monitors-error"]["cast"][0]["pos"] = [2.55, -1.9]
S["monitors-error"]["camera"] = frame([[1.05, 1.95, -3.32], [2.3, 1.5, -3.32], [1.05, 1.5, -3.32]] + body(S["monitors-error"]["cast"][0], crop=0.6), az=38, el=-2, fov=44, push=0.12)
S["trophy-slam"]["cast"] = [c(VIK, pose="slam", pos=[3.3, 0.45], facing=-1), c(CHOTU, pose="idle", pos=[1.75, 0.8], facing=1, poses=[{"at": 0.4, "pose": "shock"}])]
S["trophy-slam"]["camera"] = frame([[2.65, 1.45, 0.15], [2.65, 0.95, 0.15]] + body(cast("trophy-slam")[0], crop=0.35) + body(cast("trophy-slam")[1]), az=4, el=4, fov=44, push=0.25)
# engraving: plate faces (-0.25, 0, 0.97)
S["insert-engraving"]["camera"] = {"type": "dolly", "from": [2.5, 1.1, 0.76], "to": [2.53, 1.07, 0.6], "look": [2.62, 1.03, 0.28], "fov": 34}
S["the-bet"]["cast"] = [c(VIK, pose="proud", pos=[3.3, 0.45], facing=-1), c(CHOTU, pose="gasp", pos=[1.75, 0.8], facing=1)]
S["the-bet"]["camera"] = frame([[2.65, 1.45, 0.15]] + body(cast("the-bet")[0]) + body(cast("the-bet")[1]), az=-6, el=4, fov=44, push=0.1)
S["try1-press"]["cast"][0]["pos"] = [-1.95, 1.2]
S["try1-press"]["camera"] = frame([[-2.7, 0.75, 0.9], [-2.7, 2.35, 0.9], [-3.2, 1.2, 0.9]] + body(cast("try1-press")[0], crop=0.3), az=10, el=0, fov=44, push=0.15)
S["try1-fold"]["camera"] = {"type": "dolly", "from": [-2.2, 1.15, 2.4], "to": [-2.35, 1.08, 2.05], "look": [-2.7, 0.85, 0.9], "fov": 40}
S["try2-unbox"]["cast"][0]["pos"] = [3.3, 0.45]
S["try2-unbox"]["camera"] = frame([[2.15, 1.0, 0.0], [2.45, 1.3, 0.0]] + body(cast("try2-unbox")[0], crop=0.4), az=-8, el=2, fov=44, push=0.2)
S["try2-blank"]["cast"][0]["pos"] = [3.3, 0.45]
S["try2-blank"]["camera"] = frame([[1.85, 0.96, 0.32], [2.75, 0.96, 0.15]] + body(cast("try2-blank")[0], crop=0.55), az=-10, el=16, fov=42, push=0.12)
S["try3-recipe"]["cast"] = [c(CHOTU, pose="present", pos=[-0.75, 0.2], facing=-1, holding="parchment"), c(VIK_APRON, pose="point", pos=[-2.0, -0.35], facing=1)]
S["try3-recipe"]["camera"] = frame([[-1.55, 1.0, -1.2], [-2.5, 0.6, -1.15], [-2.5, 1.35, -1.15]] + body(cast("try3-recipe")[0]) + body(cast("try3-recipe")[1], crop=0.3), az=14, el=2, fov=44, push=0.12)
S["try3-crack"]["camera"] = {"type": "dolly", "from": [-1.15, 1.45, 0.1], "to": [-1.25, 1.35, -0.15], "look": [-1.55, 0.98, -1.2], "fov": 36}
S["try3-crack"]["focusDist"] = 1.1
# door: Dada in the doorway at the back left, Chotu and Vik turn
S["door-dada"]["cast"] = [c(DADA_SMITH, pose="nod", pos=[-3.6, -3.35], facing=1, appearAt=0.45),
                          c(CHOTU, pose="look-up", pos=[-4.35, -1.0], facing=1), c(VIK, pose="shock", pos=[-2.55, -0.85], facing=-1)]
S["door-dada"]["camera"] = frame([[-4.35, 2.6, -3.8], [-2.85, 0.0, -3.8]] + body(cast("door-dada")[1]) + body(cast("door-dada")[2]), az=-6, el=3, fov=46, push=0.18, swing=0)
S["insert-palm"]["fx"]["hand"]["pos"] = [-3.3, 1.02, -1.4]
S["insert-palm"]["camera"] = {"type": "dolly", "from": [-3.0, 1.5, -0.62], "to": [-3.08, 1.42, -0.8], "look": [-3.3, 1.04, -1.45], "fov": 38}
S["insert-crucible"]["camera"] = {"type": "dolly", "from": [2.0, 0.75, 3.0], "to": [1.8, 0.62, 2.6], "look": [1.4, 0.35, 1.0], "fov": 40}
S["ore-seams"]["camera"] = frame([[-0.4, 0.8, -2.65], [-0.2, 2.0, -2.65]] + body(cast("ore-seams")[0]), az=12, el=3, fov=44, push=0.12)
S["reaction"]["cast"] = [c(CHOTU, pose="look-up", pos=[-1.1, 1.3], facing=1), c(VIK, pose="shock", pos=[0.35, 1.25], facing=-1)]
S["reaction"]["camera"] = frame(body(cast("reaction")[0]) + body(cast("reaction")[1], crop=0.4), az=0, el=3, fov=44, push=0.05, swing=1)
S["trophy-melts"]["cast"] = [c(VIK, pose="peek", pos=[1.35, 0.85], facing=-1), c(CHOTU, pose="gasp", pos=[-0.4, 1.15], facing=1)]
S["trophy-melts"]["camera"] = frame([[0.5, 0.75, 0.9], [0.5, 1.15, 0.9]] + body(cast("trophy-melts")[0], crop=0.3) + body(cast("trophy-melts")[1], crop=0.5), az=4, el=6, fov=44, push=0.2)
S["chotu-places"]["cast"][0]["pos"] = [-0.45, 0.75]
S["chotu-places"]["camera"] = frame(SABRE_SCAN + body(cast("chotu-places")[0]) + body(VIK_HOOK, crop=0.3), az=-6, el=3, fov=44, push=0.15)

assert len(shots) == len(cuts) - 1, (len(shots), len(cuts))
for i, s in enumerate(shots):
    s["duration"] = round(cuts[i + 1] - cuts[i], 2)
    for e in s.get("sfx", []):
        e.setdefault("at", 0)

L = {"slug": "02-damascus-steel", "title": "Why Nobody Can Copy This Ancient Sword", "audio": "vo/02-damascus-steel.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/02-damascus-steel.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", cuts[-1], "s + 0.5 s hold; max shot", max(s["duration"] for s in shots), "s; min", min(s["duration"] for s in shots))
