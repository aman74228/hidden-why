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
MILO = {"who": "milo"}
GUS = {"who": "gus"}


# ---- auto-framing: choose the camera distance so every listed point fits the
# portrait frame (x 7-93%, y 6-90%) at the END of the move; the move starts
# `push` further out and `swing` degrees around (always gliding).
H_ = {"milo": 1.42, "vik": 2.2, "gus": 1.62}
W_ = {"milo": 0.62, "vik": 0.6, "gus": 0.88}

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
  ("pause-milo-sad", E(5) + 0.04, T(6) - PRE),
  ("tank-lower", T(6) - PRE, word_t("again", T(6)) - PRE),
  ("tank-counter", word_t("again", T(6)) - PRE, T(7) - PRE),
  ("crack-macro", T(7) - PRE, T(8) - PRE),
  ("gus-paper", T(8) - PRE, T(9) - PRE),
  ("paper-pull", T(9) - PRE, E(9) + 0.04),
  ("pause-reaction", E(9) + 0.04, T(10) - PRE),
  ("stress-corner", T(10) - PRE, word_t("but", T(10)) - PRE),
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

# hook / loop: Milo at the modern oval window (window at x = 0)
HOOK_MILO = c(MILO, pos=[-0.52, -0.5], facing=1, pose="look-up", poses=[{"at": 0, "pose": "look-up"}, {"at": 1.75, "pose": "point"}])
HOOK = frame([[0.3, WIN_Y + 0.3, WALL_Z], [0.3, WIN_Y - 0.3, WALL_Z]] + body(HOOK_MILO, crop=0.38), az=-8, el=2, fov=40, push=0.22, swing=-5)

# lounge cast
BET_VIK = c(VIK, pose="slam", pos=[1.85, 0.45], facing=-1, poses=[{"at": 0.9, "pose": "proud"}])
BET_MILO = c(MILO, pose="idle", pos=[-0.15, 0.95], facing=1, poses=[{"at": 0.45, "pose": "gasp"}])
GLASS_MILO = c(MILO, pos=[-2.6, -2.7], facing=1, pose="look-up")
GLASS_VIK = c(VIK, pos=[-1.7, -3.05], facing=1, pose="cross-arms")
# 50s cabin cast
C50_MILO = c(MILO, pos=[-0.15, 0.1], facing=-1, pose="look-up")
BREATH_MILO = c(MILO, pos=[0.45, 0.0], facing=-1, pose="lift", holding="balloon")
# hangar
TANK_VIK = c(VIK, pos=[-2.4, 1.5], facing=1, pose="cross-arms", poses=[{"at": 1.6, "pose": "shock"}])
TANK_MILO = c(MILO, pos=[-1.4, 2.0], facing=1, pose="look-up")
# workshop (forge)
SHOP_GUS = c(GUS, pos=[-0.95, 0.45], facing=1, pose="smile-nod")
SHOP_MILO = c(MILO, pos=[0.8, 0.5], facing=-1, pose="look-up")
SHOP_VIK = c(VIK, pos=[1.55, 0.2], facing=-1, pose="cross-arms")

paper_pts = [[PAPER[0] - 0.42, PAPER[1] - 0.25, PAPER[2]], [PAPER[0] + 0.42, PAPER[1] + 0.25, PAPER[2]]]
shop_w = frame(paper_pts + body(SHOP_GUS, crop=0.35) + body(SHOP_MILO, crop=0.35), az=0, el=5, fov=44, push=0.12, swing=3)
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
PAPER_FX = {"pos": PAPER, "s": PAPER_S}

shots = [
  # 1 HOOK: Milo's face at a modern oval window, turns to camera on "plane?"
  {"id": "hook-window", "beat": 1, "stillAt": 0.0, "set": "cabin", "fx": {"cabin": {"era": "modern", "outside": "clouds", "scroll": 0.03}},
   "camera": HOOK, "cast": [HOOK_MILO], "layout": "manual", "dof": 1.2,
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("hook-window"), 2)}]},
  # 2a the 1950s lounge, the silver jet outside, glide past it
  {"id": "lounge-jet", "set": "lounge", "fx": {"lounge": {"plate": "stack"}},
   "camera": {"type": "dolly", "from": [-4.4, 1.05, 2.8], "to": [-2.2, 1.25, 2.2], "look": [-1.5, 1.7, -13], "lookTo": [1.5, 1.8, -13], "fov": 44},
   "cast": [GLASS_MILO, GLASS_VIK], "layout": "manual",
   "titleCard": {"label": "The first", "word": "Jet airliner", "at": 0.1, "duration": round(dur("lounge-jet") - 0.25, 2)},
   "sfx": [{"name": "airport-chime", "at": 0.1}, {"name": "jet-rumble", "at": 0, "dur": round(dur("lounge-jet"), 2)}]},
  # 2b inside: big near-square windows, sun pouring in, the world going by
  {"id": "cabin50-windows", "set": "cabin", "fx": {"cabin": {"era": "50s", "outside": "fields", "scroll": 0.04}},
   "camera": {"type": "dolly", "from": [-2.6, 1.45, 3.2], "to": [-0.9, 1.4, 2.7], "look": [-1.0, 1.05, -1.0], "lookTo": [0.3, 1.05, -1.0], "fov": 46},
   "cast": [C50_MILO], "layout": "manual",
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("cabin50-windows"), 2)}]},
  # 3 THE BET: Vik slams the plate of square brownies down
  {"id": "the-bet", "beat": 2, "stillAt": 1.5, "set": "lounge", "fx": {"lounge": {"plate": "slam", "slamAt": 0.35}},
   "camera": frame([[TABLE[0] - 0.3, TABLE_TOP, TABLE[2] + 0.3], [TABLE[0] + 0.3, TABLE_TOP + 0.15, TABLE[2] - 0.3]] + body(BET_VIK, crop=0.3) + body(BET_MILO, crop=0.3), az=-4, el=6, fov=44, push=0.25),
   "cast": [BET_VIK, BET_MILO], "layout": "manual",
   "titleCard": {"label": "The bet", "word": "His desserts", "at": 0.7, "duration": round(dur("the-bet") - 0.9, 2)},
   "sfx": [{"name": "plate-clink", "at": 0.35}]},
  # 4a higher than any airliner before: the jet climbs above the clouds
  {"id": "sky-climb", "set": "sky", "fx": {"sky": {"jet": "climb", "drift": 7}},
   "camera": {"type": "dolly", "from": [6.8, 0.4, 7.4], "to": [5.0, 1.5, 5.6], "look": [0.6, 1.6, 0], "lookTo": [0.9, 2.0, 0], "fov": 44},
   "sfx": [{"name": "jet-rumble", "at": 0, "dur": round(dur("sky-climb"), 2)}]},
  # 4b pumped up like a balloon: the cabin wall swells and relaxes; Milo's balloon too
  {"id": "cabin-breathe", "set": "cabin", "fx": {"cabin": {"era": "50s", "outside": "clouds", "breathe": True, "scroll": 0.05}},
   "camera": {"type": "dolly", "from": [-1.8, 1.45, 3.6], "to": [-0.6, 1.4, 3.0], "look": [0.0, 1.3, -1.0], "lookTo": [0.35, 1.3, -1.0], "fov": 46},
   "cast": [BREATH_MILO], "layout": "manual",
   "sfx": [{"name": "cabin-creak", "at": 1.0}, {"name": "cabin-creak", "at": 3.4}]},
  # 5 two broke apart in the sky: far away, a silver silhouette comes apart (no people)
  {"id": "breakup", "set": "sky", "sky": "storm", "fx": {"sky": {"jet": "breakup", "breakAt": rel("breakup", word_t("broke", T(5))) - 0.15, "stormy": True, "drift": 0.3}},
   "camera": {"type": "dolly", "from": [0.6, 1.2, 8], "to": [0.2, 1.6, 4], "look": [-0.6, 3.6, -60], "lookTo": [0.2, 3.3, -60], "fov": 30},
   "sfx": [{"name": "thunder-soft", "at": rel("breakup", word_t("broke", T(5))) - 0.1}]},
  # (pause) Milo's face falls
  {"id": "pause-milo-sad", "set": "lounge", "light": "dusk", "fx": {"lounge": {"plate": "none", "dim": 1}},
   "camera": frame(body(c(MILO, pos=[-2.4, -2.6]), crop=0.4), az=14, el=3, fov=44, push=0.06, swing=2),
   "cast": [c(MILO, pos=[-2.4, -2.6], facing=1, pose="sad")]},
  # 6a the water tank: the whole fuselage lowered in; pumps start on "pumped"
  {"id": "tank-lower", "beat": 3, "stillAt": 2.6, "set": "hangar",
   "fx": {"hangar": {"lower": [3.9, 0.95], "lowerAt": [0.1, 3.3], "counter": [0, 180], "pumps": pumps}},
   "camera": {"type": "dolly", "from": [2.2, 9.0, 7.6], "to": [1.6, 6.2, 4.4], "look": [0, 3.2, -2.2], "lookTo": [0, 1.0, -2.2], "fov": 46},
   "cast": [TANK_VIK, TANK_MILO], "layout": "manual",
   "titleCard": {"label": "The water", "word": "Tank test", "at": 0.25, "duration": round(dur("tank-lower") - 0.5, 2)},
   "sfx": [{"name": "water-splash", "at": 1.5}] + [{"name": "press-thump", "at": t} for t in pumps]},
  # 6b again and again, thousands of times: the cycle counter races
  {"id": "tank-counter", "set": "hangar", "fx": {"hangar": {"lower": [0.95, 0.95], "counter": [180, 3057], "pumps": pumps2, "cables": True}},
   "camera": {"type": "dolly", "from": [5.3, 1.8, 5.2], "to": [5.55, 1.74, 4.25], "look": [COUNTER[0], 1.65, COUNTER[2]], "fov": 42}, "dof": 1.4, "focusDist": 2.9,
   "sfx": [{"name": "counter-tick", "at": 0, "dur": round(dur("tank-counter"), 2)}] + [{"name": "press-thump", "at": t} for t in pumps2[::2]]},
  # 7 it burst; the crack starts at a sharp corner (underwater macro)
  {"id": "crack-macro", "beat": 4, "stillAt": crack_t + 0.9, "set": "tankmacro", "fx": {"tankMacro": {"crackAt": 0.25, "crackDur": crack_t + 0.9, "burstAt": rel("crack-macro", word_t("burst", T(7)))}},
   "camera": {"type": "dolly", "from": [1.5, 1.05, 2.8], "to": [0.78, 0.8, 1.2], "look": [0.35, 0.5, 0], "lookTo": [0.55, 0.75, 0], "fov": 40}, "dof": 1.2, "focusDist": 1.2,
   "sfx": [{"name": "bubbles", "at": rel("crack-macro", word_t("burst", T(7)))}, {"name": "metal-crack", "at": crack_t - 0.05}]},
  # 8 Gus's workshop: the paper with a square hole and a round hole
  {"id": "gus-paper", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pull=[0, 0.25], pullAt=[rel("gus-paper", word_t("pulls", T(8))) - 0.1, rel("gus-paper", word_t("pulls", T(8))) + 0.5])},
   "camera": shop_w, "cast": [SHOP_GUS, SHOP_MILO], "layout": "manual",
   "sfx": [{"name": "paper-rustle", "at": rel("gus-paper", word_t("pulls", T(8))) - 0.1}]},
  # 9 he pulls: the square tears at its corner, the round one holds
  {"id": "paper-pull", "beat": 5, "stillAt": pull_a + 0.7, "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pull=[0.25, 1], pullAt=[0, 1.4], tear=[0, 1], tearAt=[pull_a - 0.15, pull_a + 0.55])},
   "camera": {"type": "dolly", "from": [-0.05, 1.12, 2.75], "to": [0.0, 1.07, 2.35], "look": [SQ_X, 1.05, 1.0], "lookTo": [RD_X - 0.05, 1.05, 1.0], "fov": 40}, "dof": 1.0, "focusDist": 0.8,
   "sfx": [{"name": "paper-rip", "at": pull_a - 0.1}, {"name": "paper-stretch", "at": holds_t}]},
  # (pause) reaction: Vik's eyes go wide, Milo grins
  {"id": "pause-reaction", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True},
   "camera": frame(body(c(MILO, pos=[-0.5, 0.6])) + body(c(VIK, pos=[0.55, 0.4]), crop=0.4), az=0, el=3, fov=44, push=0.05, swing=1),
   "cast": [c(MILO, pose="laugh", pos=[-0.5, 0.6], facing=1), c(VIK, pose="shock", pos=[0.55, 0.4], facing=-1)], "layout": "manual"},
  # 10a a sharp corner squeezes the stress into one point (glowing lines crowd into the corner)
  {"id": "stress-corner", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pull=[1, 1], tear=[1, 1], stress="corner", stressAt=rel("stress-corner", word_t("squeezes", T(10))) - 0.3)},
   "camera": {"type": "dolly", "from": [SQ_X + 0.25, 1.14, 2.45], "to": [SQ_X + 0.05, 1.09, 1.95], "look": [SQ_X, 1.05, 1.0], "fov": 40}, "dof": 1.0, "focusDist": 0.6},
  # 10b a curve spreads it all the way round: Gus's finger traces the circle; pull back to Gus
  {"id": "stress-curve", "set": "forge", "fx": {"forgeLumps": False, "noSparks": True,
     "paper": dict(PAPER_FX, pull=[1, 1], tear=[1, 1], stress="curve", stressAt=0.05, trace=True)},
   "camera": {"type": "dolly", "from": [RD_X + 0.02, 1.08, 1.95], "to": [-0.2, 1.25, 3.7], "look": [RD_X, 1.05, 1.0], "lookTo": [-0.35, 1.05, 0.4], "fov": 42},
   "cast": [c(SHOP_GUS, pose="smile-nod")], "layout": "manual",
   "sfx": [{"name": "shimmer", "at": 0.1}]},
  # 11 every airliner since: a modern jet takes off; push in on its rounded windows
  {"id": "modern-takeoff", "set": "runway", "fx": {"runway": {"takeoff": [0.3, 0.95]}},
   "camera": {"type": "dolly", "from": [JET0[0] + 4, 1.0, 9.5], "to": [JET1[0] + 1.2, JET1[1] + 1.7, 0.1], "look": JET0, "lookTo": [JET1[0] + 0.2, JET1[1] + 0.1, -3.5], "fov": 44},
   "sfx": [{"name": "jet-rumble", "at": 0, "dur": round(dur("modern-takeoff"), 2)}]},
  # 12a "And Vik's square brownie?" Vik holds one up, smug
  {"id": "brownie-pick", "set": "lounge", "fx": {"lounge": {"plate": "stack"}},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.5, "band": [0.14, 0.86], "angleDeg": -10, "orbitDeg": 4, "push": 0.08},
   "cast": [c(VIK, pos=[1.7, 0.45], facing=-1, pose="present", holding="brownie"), c(MILO, pos=[-0.2, 0.9], facing=1, pose="idle")], "layout": "manual"},
  # 12b it cracks right at the corner (payoff: ding on "corner")
  {"id": "brownie-crack", "beat": 6, "stillAt": rel("brownie-crack", word_t("corner", T(12))) - 0.1, "set": "lounge",
   "fx": {"lounge": {"plate": "stack"}, "brownie": {"pos": BROWNIE, "s": 0.2, "crackAt": 0.1, "snapAt": rel("brownie-crack", word_t("corner", T(12)))}},
   "camera": {"type": "dolly", "from": [BROWNIE[0] + 0.15, BROWNIE[1] + 0.45, BROWNIE[2] + 0.75], "to": [BROWNIE[0] + 0.06, BROWNIE[1] + 0.33, BROWNIE[2] + 0.55], "look": BROWNIE, "fov": 40}, "dof": 1.3, "focusDist": 0.4,
   "payoff": True, "payoffAt": rel("brownie-crack", word_t("corner", T(12))),
   "sfx": [{"name": "brownie-crack", "at": rel("brownie-crack", word_t("corner", T(12))) - 0.05}]},
  # (pause) Vik's face drops, Milo laughs
  {"id": "pause-vik-drop", "set": "lounge", "fx": {"lounge": {"plate": "stack"}},
   "camera": frame(body(c(VIK, pos=[1.7, 0.45]), crop=0.45) + body(c(MILO, pos=[0.3, 0.9]), crop=0.3), az=-6, el=3, fov=44, push=0.05),
   "cast": [c(VIK, pos=[1.7, 0.45], facing=-1, pose="deadpan"), c(MILO, pos=[0.3, 0.9], facing=1, pose="laugh")], "layout": "manual"},
  # 13 back at the modern oval window; lands exactly on frame 1 (loop)
  {"id": "loop-window", "set": "cabin", "fx": {"cabin": {"era": "modern", "outside": "clouds", "scroll": 0.03}},
   "camera": {"type": "dolly", "from": [round(HOOK["from"][0] - 0.5, 3), HOOK["from"][1] + 0.05, round(HOOK["from"][2] + 0.6, 3)], "to": HOOK["from"], "look": HOOK["look"], "fov": HOOK["fov"]}, "dof": 1.2,
   "cast": [c(HOOK_MILO, poses=[{"at": 0, "pose": "point"}, {"at": round(dur("loop-window") - 0.9, 2), "pose": "look-up"}])], "layout": "manual",
   "sfx": [{"name": "cabin-hum", "at": 0, "dur": round(dur("loop-window") + 0.5, 2)}]},
]

assert [s["id"] for s in shots] == [x[0] for x in seg]
FPS = 30
fr = [round(b * FPS) for _, _, b in seg]
for i, s in enumerate(shots):
    s["duration"] = round((fr[i] - (fr[i - 1] if i else 0)) / FPS, 4)
    path_ok(s.get("camera", {}), s.get("cast", []), s["id"])
L = {"slug": "03-plane-windows", "title": "Why Plane Windows Can't Be Square", "audio": "vo/03-plane-windows.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "musicDip": [[round(T(5) - 0.2, 2), round(T(6) - 0.1, 2), 3.0]],  # brief: music dips 3 dB more during line 5
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/03-plane-windows.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s + 0.5 s hold;", " ".join(f"{s['id']}:{s['duration']:.2f}" for s in shots))
