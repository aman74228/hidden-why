#!/usr/bin/env python3
"""Builds src/shots/03-plane-windows.json from the Chatterbox voiceover
(audio/03-plane-windows.vo.json line onsets + per-line caption words): every cut lands
inside a pause, on a sentence end or (long lines 2, 4, 6, 10, 12) on a comma/question
pause. Pauses after lines 5, 9 and 12 hold silent reactions. The last shot ends on the
hook's opening framing (loop)."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PI = math.pi
VIK = {"who": "vik"}
NIK = {"who": "nik"}
GUS = {"who": "gus"}


# ---- auto-framing: choose the camera distance so every listed point fits the
# portrait frame (x 7-93%, y 6-90%) at the END of the move; the move starts
# `push` further out and `swing` degrees around (always gliding).
H_ = {"nik": 1.42, "vik": 2.2, "gus": 1.62}
W_ = {"nik": 0.62, "vik": 0.6, "gus": 0.88}

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


def body_(m, crop=0.0): return body(m, crop)
def path_ok(cam, cast, name):
    """warn if a dolly passes within 0.75 m of a character (giant near-lens blobs)"""
    if cam.get("type") != "dolly": return
    for k in range(21):
        u = k / 20; p = [a + (b - a) * u for a, b in zip(cam["from"], cam["to"])]
        for m in cast:
            if p[1] < H_[m["who"]] + 0.3 and math.hypot(p[0] - m["pos"][0], p[2] - m["pos"][1]) < 0.75:
                print(f"WARNING {name}: camera passes {math.hypot(p[0]-m['pos'][0], p[2]-m['pos'][1]):.2f} m from {m['who']} at u={u:.2f}"); return

def path(a, b, look_a=None, look_b=None, fov=42):
    """one continuous move from camera pose a to b (dicts from frame() or explicit)"""
    return {"type": "dolly", "from": a["from"] if "from" in a else a["to"], "to": b["to"], "look": look_a or a["look"], "lookTo": look_b or b.get("lookTo", b["look"]), "fov": fov}


VO = json.loads((ROOT / "audio/03-plane-windows.vo.json").read_text())
CAP = json.loads((ROOT / "src/captions/03-plane-windows.json").read_text())
LS = [l["start_s"] for l in VO["lines"]]
LE = [l["start_s"] + l["seconds"] for l in VO["lines"]]
T = lambda n: LS[n - 1]
E = lambda n: LE[n - 1]
def word_t(w, after=0.0):
    """onset of the first caption word `w` at/after `after` (seconds, absolute)"""
    return next(x["start"] for x in CAP if x["word"].strip(".,?:…").lower() == w.lower() and x["start"] >= after - 1e-6)
PRE = 0.06

seg = [
  ("hook-window", 0, T(2) - PRE),
  ("lounge-jet", T(2) - PRE, word_t("had", T(2)) - PRE),
  ("cabin50-windows", word_t("had", T(2)) - PRE, T(3) - PRE),
  ("the-bet", T(3) - PRE, T(4) - PRE),
  ("sky-climb", T(4) - PRE, word_t("so", T(4)) - PRE),
  ("cabin-breathe", word_t("so", T(4)) - PRE, T(5) - PRE),
  ("breakup", T(5) - PRE, E(5) + 0.04),
  ("pause-nik-sad", E(5) + 0.04, T(6) - PRE),
  ("tank-lower", T(6) - PRE, word_t("again", T(6)) - PRE),
  ("tank-counter", word_t("again", T(6)) - PRE, T(7) - PRE),
  ("crack-macro", T(7) - PRE, T(8) - PRE),
  ("gus-paper", T(8) - PRE, T(9) - PRE),
  ("paper-pull", T(9) - PRE, E(9) + 0.04),
  ("pause-reaction", E(9) + 0.04, word_t("a", T(10)) - PRE),  # runs over "You see," to its comma pause
  ("stress-corner", word_t("a", T(10)) - PRE, word_t("but", T(10)) - PRE),
  ("stress-curve", word_t("but", T(10)) - PRE, T(11) - PRE),
  ("modern-takeoff", T(11) - PRE, T(12) - PRE),
  ("brownie-pick", T(12) - PRE, word_t("it", T(12)) - PRE),
  ("brownie-crack", word_t("it", T(12)) - PRE, E(12) + 0.04),
  ("pause-vik-drop", E(12) + 0.04, T(13) - PRE),
  ("loop-window", T(13) - PRE, VO["total_s"]),
]
R = {sid: (a, b) for sid, a, b in seg}
rel = lambda sid, t: round(t - R[sid][0], 2)
dur = lambda sid: R[sid][1] - R[sid][0]

# ---------------- set anchors (src/sets/planes.tsx) ----------------
WIN_Y = 1.14
WALL_Z = -1.0
TABLE = [0.9, 0, 0.7]; TABLE_TOP = 0.72
TANK = [0, 0, -2.2]
COUNTER = [6.4, 0, 1.4]
PAPER = [0.0, 1.05, 1.0]; PAPER_S = 1.6
SQ_X = PAPER[0] - 0.13 * PAPER_S; RD_X = PAPER[0] + 0.13 * PAPER_S
SQ_XP = 0.15 - 0.13 * PAPER_S; RD_XP = 0.15 + 0.13 * PAPER_S

# hook / loop: Nik at the modern oval window (window at x = 0)
HOOK_NIK = c(NIK, pos=[-0.7, -0.5], facing=1, pose="look-up", poses=[{"at": 0, "pose": "look-up"}, {"at": 1.75, "pose": "point"}])
HOOK = frame([[0.35, WIN_Y + 0.32, WALL_Z], [0.35, WIN_Y - 0.32, WALL_Z]] + body(HOOK_NIK, crop=0.38), az=-6, el=2, fov=40, push=0.22, swing=-5)

# lounge cast
BET_VIK = c(VIK, pose="slam", pos=[1.65, 0.45], facing=-1, poses=[{"at": 0.9, "pose": "proud"}])
BET_NIK = c(NIK, pose="idle", pos=[0.1, 0.95], facing=1, poses=[{"at": 0.45, "pose": "gasp"}])
GLASS_NIK = c(NIK, pos=[-2.9, -3.75], facing=1, pose="look-up")
GLASS_VIK = c(VIK, pos=[-0.35, -3.4], facing=-1, pose="cross-arms")
# 50s cabin cast
C50_NIK = c(NIK, pos=[0.1, -0.4], facing=-1, pose="look-up")
BREATH_NIK = c(NIK, pos=[0.1, -0.1], facing=-1, pose="lift", holding="balloon")
# hangar
TANK_VIK = c(VIK, pos=[-6.4, 0.6], facing=1, pose="cross-arms", poses=[{"at": 1.6, "pose": "shock"}])
TANK_NIK = c(NIK, pos=[-6.0, 1.5], facing=1, pose="look-up")
# workshop (forge)
SHOP_GUS = c(GUS, pos=[-1.1, 0.55], facing=1, pose="present")
SHOP_NIK = c(NIK, pos=[1.0, 0.6], facing=-1, pose="look-up")
SHOP_VIK = c(VIK, pos=[1.55, 0.2], facing=-1, pose="cross-arms")

paper_pts = [[PAPER[0] - 0.42, PAPER[1] - 0.25, PAPER[2]], [PAPER[0] + 0.42, PAPER[1] + 0.25, PAPER[2]]]
shop_w = frame(paper_pts + body(SHOP_GUS, crop=0.5) + body(SHOP_NIK, crop=0.5), az=0, el=4, fov=44, push=0.12, swing=3, box=(0.04, 0.96, 0.08, 0.92))
# gus-paper, tight (fills ~60% of the frame height): Gus stands right behind the paper and
# holds it out at his belly (his face above it), Nik close at his side; the paper reads on a phone
SHOP_PAPER = [0.0, 0.86, 1.0]
SHOP_GUS_T = c(GUS, pos=[0.0, 0.5], facing=1, pose="present")
SHOP_NIK_T = c(NIK, pos=[0.86, 0.85], facing=-1, pose="look-up")
_sp = [[SHOP_PAPER[0] - 0.44, SHOP_PAPER[1] - 0.27, SHOP_PAPER[2]], [SHOP_PAPER[0] + 0.44, SHOP_PAPER[1] + 0.27, SHOP_PAPER[2]]]
shop_t = frame(_sp + body(SHOP_GUS_T) + body(SHOP_NIK_T) + [[SHOP_PAPER[0] - 0.66, SHOP_PAPER[1], SHOP_PAPER[2]], [-0.6, 1.5, 0.5]], az=0, el=5, fov=40, push=0.08, swing=2, box=(0.04, 0.96, 0.18, 0.82))
pull_a = rel("paper-pull", word_t("tears", T(9)))
holds_t = rel("paper-pull", word_t("round", word_t("tears", T(9))))
crack_t = rel("crack-macro", word_t("crack", T(7)))
pumps0 = rel("tank-lower", word_t("pumped", T(6)))
pumps = [round(pumps0 + 0.42 * k, 2) for k in range(12) if pumps0 + 0.42 * k < dur("tank-lower") - 0.05]
pumps2 = [round(0.1 + 0.3 * k, 2) for k in range(12) if 0.1 + 0.3 * k < dur("tank-counter") - 0.05]
to_end = takeoff_end = None
def takeoff(k):
    lift = max(0, k - 0.35) / 0.65
    return [-9 + k * 14, 1.2 + lift * lift * 3.2, -4]
JET0, JET1 = takeoff(0.3), takeoff(0.95)
BROWNIE = [TABLE[0] - 0.02, TABLE_TOP + 0.08, TABLE[2] + 0.16]
CRACKS_T = rel("brownie-crack", word_t("cracks", T(12)))
_vd = frame(body(c(VIK, pos=[1.7, 0.45]), crop=0.62), az=-8, el=0, fov=44, push=0.0)
VIKDROP = {"type": "dolly", "from": [round(_vd["to"][0] - 0.25, 3), _vd["to"][1] - 0.05, round(_vd["to"][2] + 1.1, 3)], "to": _vd["to"], "look": _vd["look"], "fov": 44}
PAPER_FX = {"pos": PAPER, "s": PAPER_S}
PHOTO = [0.15, 1.25, 1.0]
PHOTO_FX = {"pos": PHOTO, "s": PAPER_S}
PHOTO_GUS = c(GUS, pos=[-0.82, 0.35], facing=1, pose="smile-nod")
REACT_PLATE = [1.35, 0.62, 0.75]  # the bet's brownies on a crate, behind Vik's shoulder (his glance)
# stress-curve lands on the sheet + Gus's whole figure (never a half-body crop)
CURVE_START = frame([[PHOTO[0] - 0.45, PHOTO[1] - 0.3, PHOTO[2]], [PHOTO[0] + 0.45, PHOTO[1] + 0.3, PHOTO[2]]] + body(PHOTO_GUS), az=-4, el=4, fov=42, push=0.0, swing=0, box=(0.12, 0.88, 0.12, 0.86))
CURVE_START = {"type": "dolly", "from": CURVE_START["to"], "look": CURVE_START["look"], "fov": 42}
CURVE_END = frame([[PHOTO[0] - 0.45, PHOTO[1] - 0.3, PHOTO[2]], [PHOTO[0] + 0.58, PHOTO[1] + 0.3, PHOTO[2]]] + body(PHOTO_GUS), az=4, el=4, fov=42, push=0.0, swing=0, box=(0.06, 0.94, 0.08, 0.9))

shots = [
  # 1 HOOK: Nik's face at a modern oval window, turns to camera on "plane?"
  {"id": "hook-window", "beat": 1, "stillAt": 0.0, "set": "cabin", "light": "cabinModern", "fx": {"cabin": {"era": "modern", "outside": "clouds", "scroll": 0.03}},
   "camera": HOOK, "cast": [HOOK_NIK], "layout": "manual", "dof": 1.2,
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("hook-window"), 2)}]},
  # 2a the 1950s lounge, the silver jet outside, glide past it
  {"id": "lounge-jet", "set": "lounge", "fx": {"lounge": {"plate": "stack", "beams": False}},
   "camera": {"type": "dolly", "from": [-3.4, 1.35, -0.6], "to": [-1.6, 1.5, -1.4], "look": [-2.2, 2.0, -9.0], "lookTo": [-0.4, 2.0, -9.4], "fov": 56},
   "cast": [], "layout": "manual",  # no cast: no half-faces on the frame edge; the jet has the frame
   "titleCard": {"label": "The first", "word": "Jet airliner", "at": 0.1, "duration": round(dur("lounge-jet") - 0.25, 2)},
   "sfx": [{"name": "airport-chime", "at": 0.1}, {"name": "jet-rumble", "at": 0, "dur": round(dur("lounge-jet"), 2)}]},
  # 2b inside: big near-square windows, sun pouring in, the world going by
  {"id": "cabin50-windows", "set": "cabin", "fx": {"cabin": {"era": "50s", "outside": "fields", "scroll": 0.04}},
   "camera": {"type": "dolly", "from": [-2.6, 1.45, 3.2], "to": [-0.9, 1.4, 2.7], "look": [-1.0, 1.05, -1.0], "lookTo": [0.3, 1.05, -1.0], "fov": 46},
   "cast": [], "layout": "manual",  # Nik out: whole, he blocked the windows; at the edge he read as a mistake
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("cabin50-windows"), 2)}]},
  # 3 THE BET: Vik slams the plate of square brownies down
  {"id": "the-bet", "beat": 2, "stillAt": 1.5, "set": "lounge", "fx": {"lounge": {"plate": "slam", "slamAt": 0.35, "plateScale": 1.6}},
   "camera": frame([[TABLE[0] - 0.4, TABLE_TOP, TABLE[2] + 0.4], [TABLE[0] + 0.4, TABLE_TOP + 0.2, TABLE[2] - 0.4]] + body(BET_VIK, crop=0.5) + body(BET_NIK, crop=0.45), az=-4, el=12, fov=44, push=0.3),
   "cast": [BET_VIK, BET_NIK], "layout": "manual",
   "titleCard": {"label": "The bet", "word": "His desserts", "at": 0.7, "duration": round(dur("the-bet") - 0.9, 2)},
   "sfx": [{"name": "plate-clink", "at": 0.35}]},
  # 4a higher than any airliner before: the jet climbs above the clouds
  {"id": "sky-climb", "set": "sky", "fx": {"sky": {"jet": "climb", "drift": 7}},
   "camera": {"type": "dolly", "from": [6.8, 0.4, 7.4], "to": [5.0, 1.5, 5.6], "look": [0.6, 1.6, 0], "lookTo": [0.9, 2.0, 0], "fov": 44},
   "sfx": [{"name": "jet-rumble", "at": 0, "dur": round(dur("sky-climb"), 2)}]},
  # 4b pumped up like a balloon: the cabin wall swells and relaxes; Nik's balloon too
  {"id": "cabin-breathe", "set": "cabin", "fx": {"cabin": {"era": "50s", "outside": "clouds", "breathe": True, "scroll": 0.05}},
   "camera": {"type": "dolly", "from": [-1.8, 1.45, 3.6], "to": [-0.6, 1.4, 3.0], "look": [0.0, 1.3, -1.0], "lookTo": [0.35, 1.3, -1.0], "fov": 46},
   "cast": [BREATH_NIK], "layout": "manual",
   "sfx": [{"name": "cabin-creak", "at": 1.0}, {"name": "cabin-creak", "at": 3.4}]},
  # 5 two broke apart in the sky: far away, a silver silhouette comes apart (no people)
  {"id": "breakup", "set": "sky", "sky": "storm", "fx": {"sky": {"jet": "breakup", "breakAt": rel("breakup", word_t("broke", T(5))) - 0.15, "stormy": True, "drift": 0.3}},
   "camera": {"type": "dolly", "from": [0.6, 1.2, 8], "to": [0.2, 1.6, 4], "look": [-0.8, 3.7, -60], "lookTo": [0.4, 3.4, -60], "fov": 17},
   "sfx": [{"name": "thunder-soft", "at": rel("breakup", word_t("broke", T(5))) - 0.1}]},
  # (pause) Nik's face falls
  {"id": "pause-nik-sad", "set": "lounge", "light": "dusk", "fx": {"lounge": {"plate": "none", "dim": 1}},
   "camera": frame(body(c(NIK, pos=[-2.4, -2.6]), crop=0.4), az=14, el=3, fov=44, push=0.06, swing=2),
   "cast": [c(NIK, pos=[-2.4, -2.6], facing=1, pose="sad")],
   "allowCrop": "deliberate tight reaction close-up after 'broke apart in the sky'"},
  # 6a the water tank: the whole fuselage lowered in; pumps start on "pumped"
  {"id": "tank-lower", "beat": 3, "stillAt": 2.6, "set": "hangar",
   "fx": {"hangar": {"lower": [3.9, 0.95], "lowerAt": [0.1, 3.3], "counter": [0, 180], "pumps": pumps}},
   "camera": {"type": "dolly", "from": [8.6, 7.8, 2.6], "to": [6.6, 5.0, 1.0], "look": [0.5, 3.0, -2.2], "lookTo": [-0.6, 0.9, -2.2], "fov": 48},
   "cast": [TANK_VIK, TANK_NIK], "layout": "manual",
   "titleCard": {"label": "The water", "word": "Tank test", "at": 0.25, "duration": round(dur("tank-lower") - 0.5, 2)},
   "sfx": [{"name": "water-splash", "at": 1.5}] + [{"name": "press-thump", "at": t} for t in pumps]},
  # 6b again and again, thousands of times: the cycle counter races
  {"id": "tank-counter", "set": "hangar", "fx": {"hangar": {"lower": [0.95, 0.95], "counter": [180, 3057], "pumps": pumps2, "cables": True}},
   "camera": {"type": "dolly", "from": [5.3, 1.8, 5.2], "to": [5.55, 1.74, 4.25], "look": [COUNTER[0], 1.65, COUNTER[2]], "fov": 42}, "dof": 1.4, "focusDist": 2.9,
   "sfx": [{"name": "counter-tick", "at": 0, "dur": round(dur("tank-counter"), 2)}] + [{"name": "press-thump", "at": t} for t in pumps2[::2]]},
  # 7 it burst; the crack starts at a sharp corner (underwater macro)
  {"id": "crack-macro", "beat": 4, "stillAt": crack_t + 0.9, "set": "tankmacro", "fx": {"tankMacro": {"crackAt": 0.25, "crackDur": crack_t + 0.9, "burstAt": rel("crack-macro", word_t("burst", T(7)))}},
   "camera": {"type": "dolly", "from": [1.4, 1.0, 3.0], "to": [0.85, 0.85, 1.75], "look": [0.3, 0.45, 0], "lookTo": [0.5, 0.68, 0], "fov": 40}, "dof": 1.0, "focusDist": 1.75,
   "sfx": [{"name": "bubbles", "at": rel("crack-macro", word_t("burst", T(7)))}, {"name": "metal-crack", "at": crack_t - 0.05}]},
  # 8 Gus's workshop: the paper with a square hole and a round hole
  {"id": "gus-paper", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pos=SHOP_PAPER, dim=0.6, pull=[0, 0.25], pullAt=[rel("gus-paper", word_t("pulls", T(8))) - 0.1, rel("gus-paper", word_t("pulls", T(8))) + 0.5])},
   "camera": shop_t, "cast": [SHOP_GUS_T, SHOP_NIK_T], "layout": "manual",
   "sfx": [{"name": "paper-rustle", "at": rel("gus-paper", word_t("pulls", T(8))) - 0.1}]},
  # 9 he pulls: the square tears at its corner, the round one holds
  {"id": "paper-pull", "beat": 5, "stillAt": pull_a + 0.7, "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pull=[0.25, 1], pullAt=[0, 1.4], tear=[0, 1], tearAt=[pull_a - 0.15, pull_a + 0.55])},
   "camera": {"type": "dolly", "from": [-0.05, 1.12, 2.75], "to": [0.0, 1.07, 2.35], "look": [SQ_X, 1.05, 1.0], "lookTo": [RD_X - 0.05, 1.05, 1.0], "fov": 40}, "dof": 1.0, "focusDist": 0.8,
   "sfx": [{"name": "paper-rip", "at": pull_a - 0.1}, {"name": "paper-stretch", "at": holds_t}]},
  # (pause) reaction: Nik grins; Vik is losing: shoulders up, nervous smile, eyes sliding to the brownies
  {"id": "pause-reaction", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True, "plate": {"pos": REACT_PLATE, "s": 1.25}},
   "camera": frame(body(c(NIK, pos=[-0.5, 0.6]), crop=0.3) + body(c(VIK, pos=[0.45, 0.4]), crop=0.55) + [[REACT_PLATE[0] + 0.34, REACT_PLATE[1] + 0.1, REACT_PLATE[2]], [REACT_PLATE[0] - 0.3, REACT_PLATE[1] - 0.1, REACT_PLATE[2]]], az=0, el=3, fov=44, push=0.05, swing=1, box=(0.04, 0.96, 0.1, 0.92)),
   "cast": [c(NIK, pose="laugh", pos=[-0.5, 0.6], facing=1), c(VIK, pose="nervous", pos=[0.45, 0.4], facing=-1)], "layout": "manual"},
  # 10a photoelastic demo: Gus holds a clear sheet up to the forge light between two polarising films;
  #     as he flexes it the rainbow fringes crowd into the square's sharp corners
  {"id": "stress-corner", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "photo": dict(PHOTO_FX, load=[0.25, 1.0], loadAt=[0.2, rel("stress-corner", word_t("point", T(10)))])},
   "camera": {"type": "dolly", "from": [SQ_X + 0.3, PHOTO[1] + 0.08, 2.75], "to": [SQ_X + 0.06, PHOTO[1] + 0.03, 2.05], "look": [SQ_X + 0.1, PHOTO[1], PHOTO[2]], "lookTo": [SQ_X, PHOTO[1], PHOTO[2]], "fov": 40}, "dof": 1.0, "focusDist": 1.0,
   "sfx": [{"name": "shimmer", "at": rel("stress-corner", word_t("squeezes", T(10))) - 0.1}]},
  # 10b a curve spreads it all the way round: Gus's finger traces the circle; pull back to Gus
  {"id": "stress-curve", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "photo": dict(PHOTO_FX, load=[1.0, 1.0], trace=True, traceAt=0.05)},
   "camera": dict(CURVE_START, to=CURVE_END["to"], lookTo=CURVE_END["look"]),  # starts wide (Gus whole) and pushes in: no edge entry
   "cast": [PHOTO_GUS], "layout": "manual"},
  # 11 every airliner since: a modern jet takes off; push in on its rounded windows
  {"id": "modern-takeoff", "set": "runway", "fx": {"runway": {"takeoff": [0.3, 0.95]}},
   "camera": {"type": "dolly", "from": [JET0[0] + 4, 1.0, 9.5], "to": [JET1[0] + 0.9, JET1[1] + 0.32, -2.05], "look": JET0, "lookTo": [JET1[0] + 0.5, JET1[1] + 0.2, -3.5], "fov": 40},
   "sfx": [{"name": "jet-rumble", "at": 0, "dur": round(dur("modern-takeoff"), 2)}]},
  # 12a "And Vik's square brownie?" Vik holds one up, smug
  {"id": "brownie-pick", "set": "lounge", "fx": {"lounge": {"plate": "stack"}},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.5, "band": [0.14, 0.86], "angleDeg": -10, "orbitDeg": 4, "push": 0.08},
   "cast": [c(VIK, pos=[1.7, 0.45], facing=-1, pose="present", holding="brownie"), c(NIK, pos=[-0.2, 0.9], facing=1, pose="idle")], "layout": "manual"},
  # 12b it cracks right at the corner (payoff: ding on "corner")
  {"id": "brownie-crack", "beat": 6, "stillAt": rel("brownie-crack", word_t("corner", T(12))) - 0.1, "set": "lounge",
   "fx": {"lounge": {"plate": "stack"}, "brownie": {"pos": BROWNIE, "rot": [0, round(PI / 4, 4), 0], "s": 0.22, "crackAt": CRACKS_T, "crackDur": 0.23, "split": 1}},
   "camera": {"type": "dolly", "from": [BROWNIE[0] + 0.15, BROWNIE[1] + 0.45, BROWNIE[2] + 0.75], "to": [BROWNIE[0] + 0.06, BROWNIE[1] + 0.33, BROWNIE[2] + 0.55], "look": BROWNIE, "fov": 40}, "dof": 1.3, "focusDist": 0.4,
   "sfx": [{"name": "brownie-crack", "at": round(CRACKS_T - 0.02, 2)}]},
  # (pause) Vik's face drops, Nik laughs
  {"id": "pause-vik-drop", "set": "lounge", "fx": {"lounge": {"plate": "stack"}},
   "camera": VIKDROP, "payoff": True, "payoffAt": 0.0,
   "cast": [c(VIK, pos=[1.7, 0.45], facing=-1, pose="defeated")], "layout": "manual"},
  # 13 back at the modern oval window; lands exactly on frame 1 (loop)
  {"id": "loop-window", "set": "cabin", "light": "cabinModern", "fx": {"cabin": {"era": "modern", "outside": "clouds", "scroll": 0.03}},
   "camera": {"type": "dolly", "from": [round(HOOK["from"][0] - 0.5, 3), HOOK["from"][1] + 0.05, round(HOOK["from"][2] + 0.6, 3)], "to": HOOK["from"], "look": HOOK["look"], "fov": HOOK["fov"]}, "dof": 1.2,
   "cast": [c(HOOK_NIK, poses=[{"at": 0, "pose": "point"}, {"at": round(dur("loop-window") - 0.9, 2), "pose": "look-up"}])], "layout": "manual",
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("loop-window") + 0.5, 2)}]},
]

def sheet_clear(shot, centre, half_w=0.5, half_h=0.32):
    """warn if any character's screen box overlaps the sheet's at any point of the move (characters draw on top)"""
    cam = shot.get("camera", {})
    if cam.get("type") != "dolly" or not shot.get("cast"): return
    sheet = [[centre[0] + dx, centre[1] + dy, centre[2]] for dx in (-half_w, half_w) for dy in (-half_h, half_h)]
    for k in range(11):
        u = k / 10; e = 0.5 - 0.5 * math.cos(math.pi * u)
        pos = [a + (b - a) * e for a, b in zip(cam["from"], cam["to"])]
        look = [a + (b - a) * e for a, b in zip(cam["look"], cam.get("lookTo", cam["look"]))]
        def box(pts):
            q = [_proj(pos, look, cam["fov"], p) for p in pts]
            q = [v for v in q if v]
            if not q: return None
            x0, x1 = max(0, min(v[0] for v in q)), min(1, max(v[0] for v in q))
            y0, y1 = max(0, min(v[1] for v in q)), min(1, max(v[1] for v in q))
            return (x0, x1, y0, y1) if x0 < x1 and y0 < y1 else None
        bs = box(sheet)
        for m in shot["cast"]:
            x, z = m["pos"]; w = W_[m["who"]] / 2 + 0.12; h = H_[m["who"]]
            bm = box([[x - w, 0, z], [x + w, 0, z], [x - w, h, z], [x + w, h, z]])
            if bs and bm and bm[0] < bs[1] and bs[0] < bm[1] and bm[2] < bs[3] and bs[2] < bm[3]:
                print(f"WARNING {shot['id']}: {m['who']} overlaps the sheet at u={u:.1f}"); return

assert [s["id"] for s in shots] == [x[0] for x in seg]
for s_ in shots:
    if "paper" in s_.get("fx", {}): sheet_clear(s_, s_["fx"]["paper"]["pos"])
    if "photo" in s_.get("fx", {}): sheet_clear(s_, s_["fx"]["photo"]["pos"])
FPS = 30
fr = [round(b * FPS) for _, _, b in seg]
for i, s in enumerate(shots):
    s["duration"] = round((fr[i] - (fr[i - 1] if i else 0)) / FPS, 4)
    path_ok(s.get("camera", {}), s.get("cast", []), s["id"])
L = {"slug": "03-plane-windows", "title": "Why Plane Windows Can't Be Square", "audio": "vo/03-plane-windows.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "musicDip": [{"from": round(T(5) - 0.2, 2), "to": round(T(6) - 0.1, 2), "underVoiceDb": 18, "floorExempt": True}],  # serious beat (line 5): music ~18 dB under the voice
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/03-plane-windows.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s + 0.5 s hold;", " ".join(f"{s['id']}:{s['duration']:.2f}" for s in shots))
