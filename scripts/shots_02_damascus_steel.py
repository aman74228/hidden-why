#!/usr/bin/env python3
"""Builds src/shots/02-damascus-steel.json (v2, Chatterbox voiceover): every cut lands on a
sentence boundary (audio/02-damascus-steel.vo.json line onsets/ends + captions); each line is
one continuous shot that reuses the v1 scenes (moves join a wide and its insert), and the short
pauses after lines 3, 8, 10 and 11 hold the engraving insert, the silent reaction, the dying
forge and Vik's deadpan. The last shot lands on frame 1 (loop)."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PI = math.pi
SMITH = {"body": "#5A3E30", "trim": "#B88A5A", "legs": "#C9B48E", "shoes": "#3A2A22"}
GUS_SMITH = {"who": "gus", "outfit": SMITH, "props": ["apron", "headwrap"]}
VIK = {"who": "vik", "props": ["goggles"]}
VIK_APRON = {"who": "vik", "props": ["apron", "goggles"]}
MILO = {"who": "milo"}
ANVIL = [0.72, 0, 0.12]


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


# ---------------- v2: Chatterbox voiceover, cuts on sentence boundaries only ----------------
VO = json.loads((ROOT / "audio/02-damascus-steel.vo.json").read_text())
CAP = json.loads((ROOT / "src/captions/02-damascus-steel.json").read_text())
LS = [l["start_s"] for l in VO["lines"]]                       # line onsets
LE = [l["start_s"] + l["seconds"] for l in VO["lines"]]        # line ends (pause follows)
def word_t(w, after=0.0):
    """onset of the first caption word `w` at/after `after` (seconds, absolute)"""
    return next(x["start"] for x in CAP if x["word"].strip(".,?:…").lower() == w.lower() and x["start"] >= after - 1e-6)
PRE = 0.06                                                      # cut this far before a sentence onset (inside the pause)
bands_end = next(x["end"] for x in CAP if x["word"] == "bands.")
no_on = word_t("No", bands_end)

def body_(m, crop=0.0): return body(m, crop)
def path_ok(cam, cast, name):
    """warn if a dolly passes within 0.75 m of a character (giant near-lens blobs)"""
    if cam.get("type") != "dolly": return
    for k in range(21):
        u = k / 20; p = [a + (b - a) * u for a, b in zip(cam["from"], cam["to"])]
        for m in cast:
            if p[1] < H_[m["who"]] + 0.3 and math.hypot(p[0] - m["pos"][0], p[2] - m["pos"][1]) < 0.75:
                print(f"WARNING {name}: camera passes {math.hypot(p[0]-m['pos'][0], p[2]-m['pos'][1]):.2f} m from {m['who']} at u={u:.2f}"); return

VIK_HOOK = c(VIK, pose="lean", pos=[0.82, 0.62], facing=-1)
SABRE_SCAN = [[-0.36, 0.95, 0.05], [0.55, 0.95, -0.17]]
HOOK = frame(SABRE_SCAN + [[-0.3, 1.62, 0], [0.82, 2.27, 0.62], [1.1, 1.4, 0.62], [0.55, 1.4, 0.62]], az=-22, el=-2, fov=42, push=0.35, swing=-6,
             box=(0.06, 0.94, 0.05, 0.9))

# segments: (id, start, end) on sentence boundaries; short ones live in the pauses between lines
T = lambda n: LS[n - 1]                # onset of line n
E = lambda n: LE[n - 1]                # end of line n
seg = [
  ("hook-laser", 0, T(2) - PRE),
  ("museum-macro", T(2) - PRE, T(3) - PRE),
  ("the-bet", T(3) - PRE, E(3) + 0.04),
  ("pause-engraving", E(3) + 0.04, T(4) - PRE),
  ("try1-folding", T(4) - PRE, T(5) - PRE),
  ("try2-pure-iron", T(5) - PRE, T(6) - PRE),
  ("try3-recipe", T(6) - PRE, T(7) - PRE),
  ("gus-dirt", T(7) - PRE, T(8) - PRE),
  ("india-vanadium", T(8) - PRE, E(8) + 0.04),
  ("pause-reaction", E(8) + 0.04, T(9) - PRE),
  ("smith-bands", T(9) - PRE, no_on - PRE),
  ("no-traces", no_on - PRE, T(10) - PRE),
  ("mines-dry", T(10) - PRE, E(10) + 0.04),
  ("pause-forge-dark", E(10) + 0.04, T(11) - PRE),
  ("trophy-melts", T(11) - PRE, E(11) + 0.04),
  ("pause-deadpan", E(11) + 0.04, T(12) - PRE),
  ("loop-laser", T(12) - PRE, VO["total_s"]),
]
R = {sid: (a, b) for sid, a, b in seg}
rel = lambda sid, t: round(t - R[sid][0], 2)       # absolute time -> seconds into the shot

def path(a, b, look_a=None, look_b=None, fov=42):
    """one continuous move from camera pose a to b (dicts from frame() or explicit)"""
    return {"type": "dolly", "from": a["from"] if "from" in a else a["to"], "to": b["to"], "look": look_a or a["look"], "lookTo": look_b or b.get("lookTo", b["look"]), "fov": fov}

# cast placements (kept clear of every camera path; see path_ok)
BET_VIK = c(VIK, pose="slam", pos=[3.3, 0.45], facing=-1, poses=[{"at": 0.9, "pose": "proud"}])
BET_CHOTU = c(MILO, pose="idle", pos=[1.75, 0.8], facing=1, poses=[{"at": 0.4, "pose": "gasp"}])
PRESS_VIK = c(VIK_APRON, pose="hammer", pos=[-1.95, 1.2], facing=-1, holding="hammer", delay=-0.3)
PURE_VIK = c(VIK, pose="present", pos=[3.3, 0.45], facing=-1, poses=[{"at": 0, "pose": "present"}])
REC_CHOTU = c(MILO, pose="present", pos=[0.15, 0.55], facing=-1, holding="parchment")
REC_VIK = c(VIK_APRON, pose="point", pos=[-2.5, 0.3], facing=1)
DOOR_DADA = c(GUS_SMITH, pose="idle", pos=[-3.6, -3.35], facing=1, appearAt=0.45)
DOOR_CHOTU = c(MILO, pose="look-up", pos=[-4.6, -1.2], facing=1)
DOOR_VIK = c(VIK, pose="shock", pos=[-2.2, -0.6], facing=-1)
HILL_DADA = c(GUS_SMITH, pose="point", pos=[-1.7, -1.55], facing=1)
FORGE_DADA = c(GUS_SMITH, pose="hammer", pos=[0, 0], facing=1, holding="hammer", delay=-0.25)
MELT_VIK = c(VIK, pose="peek", pos=[1.35, 0.85], facing=-1)
MELT_CHOTU = c(MILO, pose="gasp", pos=[-0.4, 1.15], facing=1)

press_w = frame([[-2.7, 0.75, 0.9], [-2.7, 2.35, 0.9], [-3.2, 1.2, 0.9]] + body(PRESS_VIK, crop=0.3), az=10, el=0, fov=44, push=0)
pure_w = frame([[2.15, 1.0, 0.0], [2.45, 1.3, 0.0]] + body(PURE_VIK, crop=0.4), az=-8, el=2, fov=44, push=0)
pure_c = frame([[1.75, 0.96, 0.56], [2.6, 0.96, 0.5]] + body(PURE_VIK, crop=0.55), az=-12, el=16, fov=44, push=0)
rec_w = frame([[-1.55, 1.0, -1.2], [-2.5, 0.6, -1.15], [-2.5, 1.35, -1.15]] + body(REC_CHOTU) + body(REC_VIK, crop=0.3), az=14, el=2, fov=44, push=0)
door_w = frame([[-4.35, 2.6, -3.8], [-2.85, 0.0, -3.8]] + body(DOOR_CHOTU) + body(DOOR_VIK), az=-6, el=3, fov=46, push=0.12, swing=0)
melt_w = frame([[0.5, 0.75, 0.9], [0.5, 1.15, 0.9]] + body(MELT_VIK, crop=0.3) + body(MELT_CHOTU, crop=0.5), az=4, el=6, fov=44, push=0)
HAND = [-3.4, 1.0, -2.55]
strikes = [round(0.9 * k - 0.25, 2) for k in range(1, 6)]

shots = [
  {"id": "hook-laser", "beat": 1, "stillAt": 0.0, "set": "lab",
   "fx": {"lab": {"laser": 1, "laserSweep": [-0.3, 0.35], "sabre": "scanner", "screens": "scan"}},
   "camera": HOOK, "cast": [VIK_HOOK], "layout": "manual", "roll": [2, 0.5],
   "sfx": [{"name": "laser-hum", "at": 0, "dur": round(R["hook-laser"][1], 2)}, {"name": "error-beep", "at": rel("hook-laser", word_t("supercomputers"))}]},
  # line 2: one continuous push from the museum case into the watered pattern (a drop rolls along it)
  {"id": "museum-macro", "set": "museum", "fx": {"museumDrop": [0.05, 0.65]},
   "camera": {"type": "dolly", "from": [1.0, 1.35, 3.1], "to": [-0.02, 1.27, 0.27], "look": [0.0, 1.2, 0.0], "lookTo": [0.04, 1.18, -0.02], "fov": 38}, "dof": 0.8,
   "titleCard": {"label": "Damascus steel", "word": "1,000+ years", "at": 0.1, "duration": 1.8},
   "sfx": [{"name": "drip", "at": rel("museum-macro", word_t("water"))}]},
  # line 3: the bet; the trophy slams down on the bench
  {"id": "the-bet", "beat": 2, "stillAt": 1.4, "set": "lab", "fx": {"lab": {"trophy": "drop", "trophyDropAt": 0.35, "sabre": "scanner"}},
   "camera": frame([[2.65, 1.45, 0.15], [2.65, 0.95, 0.15]] + body(BET_VIK, crop=0.0) + body(BET_CHOTU), az=-2, el=4, fov=44, push=0.2),
   "cast": [BET_VIK, BET_CHOTU], "layout": "manual",
   "titleCard": {"label": "The bet", "word": "His trophy", "at": 0.8, "duration": 1.25},
   "sfx": [{"name": "metal-clang", "at": 0.35}]},
  {"id": "pause-engraving", "set": "lab", "fx": {"lab": {"trophy": "bench", "sabre": "scanner"}},
   "camera": {"type": "dolly", "from": [2.5, 1.1, 0.72], "to": [2.52, 1.08, 0.62], "look": [2.62, 1.03, 0.28], "fov": 34}, "dof": 1.6, "focusDist": 0.42,
   "sfx": [{"name": "metal-ting", "at": 0.05}]},
  # line 4: folding at the press, push in to the bar's straight stripes; card crossed on "stripes"
  {"id": "try1-folding", "set": "lab", "fx": {"lab": {"pressBar": "hot-folded", "pressHits": [0.55, 1.45, 2.35]}},
   "camera": path(press_w, {"to": [-2.85, 1.0, 2.05], "look": [-2.7, 0.82, 0.9]}),
   "cast": [PRESS_VIK], "layout": "manual",
   "titleCard": {"label": "Try 1", "word": "Folding", "at": 0.1, "duration": round(R["try1-folding"][1] - R["try1-folding"][0] - 0.15, 2), "crossed": True, "crossAt": rel("try1-folding", word_t("stripes")) - 0.1},
   "sfx": [{"name": "press-thump", "at": 0.55}, {"name": "anvil", "at": 1.45}, {"name": "press-thump", "at": 2.35}]},
  # line 5: the purest iron comes out of the box; the finished blade on the bench is blank; Vik's smile drops on "vanish"
  {"id": "try2-pure-iron", "set": "lab", "fx": {"lab": {"benchItems": ["pure-box", "blank-blade-front"], "boxOpenAt": 0.5}},
   "camera": path(pure_w, pure_c),
   "cast": [c(PURE_VIK, poses=[{"at": rel("try2-pure-iron", word_t("vanish")), "pose": "deadpan"}])], "layout": "manual",
   "titleCard": {"label": "Try 2", "word": "Pure iron", "at": 0.1, "duration": round(R["try2-pure-iron"][1] - R["try2-pure-iron"][0] - 0.15, 2), "crossed": True, "crossAt": rel("try2-pure-iron", word_t("vanish"))},
   "sfx": [{"name": "box-open", "at": 0.5}, {"name": "shimmer", "at": 0.9}]},
  # line 6: the old recipe; push from the wide to the crucible, which cracks open on "blank"
  {"id": "try3-recipe", "beat": 3, "stillAt": rel("try3-recipe", word_t("blank", T(6))) + 0.35, "set": "lab",
   "fx": {"lab": {"furnace": 0.9, "dial": [0.4, 0.9], "benchItems": ["cracked"], "crackAt": rel("try3-recipe", word_t("blank", T(6)))}},
   "camera": path(rec_w, {"to": [-1.25, 1.35, -0.15], "look": [-1.55, 0.98, -1.2]}),
   "cast": [REC_CHOTU, REC_VIK], "layout": "manual",
   "titleCard": {"label": "Try 3", "word": "The recipe", "at": 0.1, "duration": round(R["try3-recipe"][1] - R["try3-recipe"][0] - 0.15, 2), "crossed": True, "crossAt": rel("try3-recipe", word_t("blank", T(6)))},
   "sfx": [{"name": "crucible-crack", "at": rel("try3-recipe", word_t("blank", T(6)))}]},
  # line 7: the forge door opens, Gus; push in to his open palm full of dark dirt
  {"id": "gus-dirt", "beat": 4, "stillAt": rel("gus-dirt", word_t("dirt")), "set": "lab",
   "fx": {"lab": {"door": [0, 1], "doorAt": 0.1, "sabre": "scanner"},
          "hand": {"pos": HAND, "rot": [0.35, -PI / 2, 0], "s": 1.6, "open": [0, 1], "openAt": rel("gus-dirt", word_t("hand")), "grit": True, "sleeve": "#D29A72"}},
   "camera": path(door_w, {"to": [HAND[0] + 0.1, HAND[1] + 0.48, HAND[2] + 0.4], "look": [HAND[0], HAND[1] + 0.03, HAND[2]]}, fov=44),
   "cast": [DOOR_DADA, DOOR_CHOTU, DOOR_VIK], "layout": "manual",
   "sfx": [{"name": "gate-creak", "at": 0.1}, {"name": "grit-trickle", "at": rel("gus-dirt", word_t("pinch"))}]},
  # line 8: India's ore hills, Gus at the ore seams, then down into the ore: violet specks of vanadium
  {"id": "india-vanadium", "set": "hillside", "fx": {"hill": {"furnace": True}, "orePot": {"pos": [-0.4, 0.32, 1.0], "s": 1.4, "specks": 9, "glintAt": rel("india-vanadium", word_t("traces", T(8)))}},
   "props": [{"type": "block", "pos": [-0.4, 0, 1.0], "scale": 0.4, "color": "#C98F68"}],
   "camera": {"type": "dolly", "from": [-2.4, 1.6, 6.6], "to": [-0.4, 0.74, 1.36], "look": [-0.6, 1.3, -2.2], "lookTo": [-0.4, 0.48, 1.0], "fov": 44},
   "cast": [HILL_DADA], "layout": "manual",
   "titleCards": [{"label": "Wootz steel", "word": "India", "at": 0.3, "duration": 2.6},
                  {"label": "Vanadium", "word": "Tiny traces", "at": rel("india-vanadium", word_t("traces", T(8))) - 0.1, "duration": round(R["india-vanadium"][1] - word_t("traces", T(8)), 2)}],
   "sfx": [{"name": "shimmer", "at": rel("india-vanadium", word_t("traces", T(8)))}]},
  # (pause) silent reaction
  {"id": "pause-reaction", "set": "lab", "fx": {"lab": {"door": [1, 1], "sabre": "scanner"}},
   "camera": frame(body(c(MILO, pos=[-1.1, 1.3])) + body(c(VIK, pos=[0.35, 1.25]), crop=0.4), az=0, el=3, fov=44, push=0.05, swing=1),
   "cast": [c(MILO, pose="look-up", pos=[-1.1, 1.3], facing=1), c(VIK, pose="shock", pos=[0.35, 1.25], facing=-1)], "layout": "manual"},
  # line 9a: the smith hammers; push into the cake as bands appear with each strike
  {"id": "smith-bands", "beat": 5, "stillAt": rel("smith-bands", word_t("bands")) + 0.3, "set": "forge", "grade": "flashback",
   "fx": {"forgeLumps": False, "cake": {"strikes": strikes}, "sparks": {"pos": [0.72, 0.6, 0.12], "times": strikes, "color": "#FFD76A"}},
   "camera": {"type": "dolly", "from": [1.9, 1.35, 3.4], "to": [0.98, 0.86, 0.64], "look": [0.35, 0.9, 0.1], "lookTo": [0.72, 0.57, 0.12], "fov": 42},
   "cast": [FORGE_DADA],
   "sfx": [{"name": "anvil", "at": t} for t in strikes if t < R["smith-bands"][1] - R["smith-bands"][0]] + [{"name": "sizzle", "at": strikes[0] + 0.05}]},
  # line 9b: no traces, no swirls (overhead, Gus's finger)
  {"id": "no-traces", "set": "forge", "grade": "flashback",
   "fx": {"forgeLumps": False, "noSparks": True, "anvilBlades": True,
          "hand": {"pos": [0.98, 0.66, 0.52], "rot": [0, 0.2, PI], "s": 1.3, "point": True, "sleeve": "#D29A72"}},
   "camera": {"type": "dolly", "from": [0.8, 1.62, 0.62], "to": [0.78, 1.5, 0.55], "look": [0.8, 0.57, 0.14], "fov": 40}, "roll": [91, 88]},
  # line 10: the mines ran dry
  {"id": "mines-dry", "set": "hillside", "fx": {"hill": {"empty": True, "scrape": [-1.6, 0.6], "dust": True}},
   "camera": {"type": "dolly", "from": [0.1, 0.95, 1.4], "to": [0.4, 1.7, 5.4], "look": [-0.3, 0.6, -2.4], "lookTo": [0.0, 1.2, -2.4], "fov": 44},
   "titleCard": {"label": "Mines ran dry", "word": "~1750", "at": 0.2, "duration": 3.0},
   "sfx": [{"name": "coin-scrape", "at": 0.4}, {"name": "coin-scrape", "at": 1.8}]},
  # (pause) the secret went with them: the forge's last ember fades
  {"id": "pause-forge-dark", "set": "forge", "light": "forge", "lightTo": "forge-dark", "mixAt": [0.0, 0.5], "grade": "flashback",
   "fx": {"forgeLumps": False, "noSparks": True, "forgeGlow": [0.6, 0.15], "cake": {"strikes": [], "glow": [0.5, 0.08]}},
   "camera": frame(body(c(GUS_SMITH, pos=[-0.05, 0.1])) + [[0.72, 0.6, 0.12], [1.0, 0.56, 0.12]], az=28, el=4, fov=44, push=0.06),
   "cast": [c(GUS_SMITH, pose="idle", pos=[-0.05, 0.1], facing=1)], "layout": "manual"},
  # line 11: the trophy melts down; ding on "swirl"
  {"id": "trophy-melts", "beat": 6, "stillAt": rel("trophy-melts", word_t("swirl", T(11))), "set": "lab", "fx": {"lab": {"trophy": "melt", "melt": [0.05, 0.95], "sabre": "scanner"}},
   "camera": melt_w | {"from": [round(melt_w["to"][0] - 0.3, 3), melt_w["to"][1] - 0.15, round(melt_w["to"][2] - 0.9, 3)]},
   "cast": [MELT_VIK, MELT_CHOTU], "layout": "manual", "payoff": True, "payoffAt": rel("trophy-melts", word_t("swirl", T(11))),
   "sfx": [{"name": "molten-pour", "at": 0.1}]},
  # (pause) Vik, deadpan
  {"id": "pause-deadpan", "set": "lab", "fx": {"lab": {"benchItems": ["ingot", "sabre"]}},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.42, "band": [0.12, 0.88], "angleDeg": -8, "orbitDeg": 2, "push": 0.04},
   "cast": [c(VIK, pose="deadpan", pos=[3.55, 0.35], facing=-1)]},
  # line 12: the laser powers up again; lands exactly on frame 1 (loop)
  {"id": "loop-laser", "set": "lab", "fx": {"lab": {"laser": 1, "laserSweep": [-0.3, -0.3], "sabre": "scanner", "screens": "scan"}},
   "camera": {"type": "dolly", "from": [round(HOOK["from"][0] - 0.35, 3), HOOK["from"][1] - 0.04, round(HOOK["from"][2] + 0.7, 3)], "to": HOOK["from"], "look": HOOK["look"], "fov": 42},
   "cast": [VIK_HOOK], "layout": "manual", "roll": [3.5, 2],
   "sfx": [{"name": "laser-hum", "at": 0.1, "dur": round(R["loop-laser"][1] - R["loop-laser"][0], 2)}]},
]

assert [s["id"] for s in shots] == [x[0] for x in seg]
FPS = 30
fr = [round(b * FPS) for _, _, b in seg]
for i, s in enumerate(shots):
    s["duration"] = round((fr[i] - (fr[i - 1] if i else 0)) / FPS, 4)
    path_ok(s.get("camera", {}), s.get("cast", []), s["id"])
L = {"slug": "02-damascus-steel", "title": "Why Nobody Can Copy This Ancient Sword", "audio": "vo/02-damascus-steel.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/02-damascus-steel.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s + 0.5 s hold;", " ".join(f"{s['id']}:{s['duration']:.2f}" for s in shots))
