#!/usr/bin/env python3
"""Builds src/shots/04-emu-war.json from the Chatterbox voiceover
(audio/04-emu-war.vo.json line onsets + caption words): every cut lands in a
pause, on a sentence end or on a comma/ellipsis pause. Shots stay <= 3.5 s.
Tone: a comedy of failure. No emu is ever hit: gunfire = soft distant pops and dust
puffs in emptied ground; guns are period props that never point at the lens."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PI = math.pi
VIK = {"who": "vik"}
MILO = {"who": "milo"}
GUS = {"who": "gus"}
SOLDIER = {"who": "soldier"}
FARMER = {"who": "farmer"}

H_ = {"milo": 1.42, "vik": 2.2, "gus": 1.62, "soldier": 1.9, "farmer": 1.8}
W_ = {"milo": 0.62, "vik": 0.6, "gus": 0.88, "soldier": 0.62, "farmer": 0.66}

def body(m, crop=0.0):
    """points of a cast member: head top, sides at chest, feet (or crop height); includes elev"""
    x, z = m["pos"]; h = H_[m["who"]]; w = W_[m["who"]] / 2; e = m.get("elev", 0)
    return [[x, h + 0.06 + e, z], [x - w, h * 0.62 + e, z], [x + w, h * 0.62 + e, z], [x, max(0.0, h * crop + e), z]]

def _proj(pos, look, fov, pt):
    f = [l - p for l, p in zip(look, pos)]; n = math.sqrt(sum(v * v for v in f)); f = [v / n for v in f]
    r = [-f[2], 0.0, f[0]]; rn = math.hypot(r[0], r[2]); r = [r[0] / rn, 0, r[2] / rn]
    u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    d = [a - b for a, b in zip(pt, pos)]; z = sum(a * b for a, b in zip(d, f))
    if z <= 0.05: return None
    t = math.tan(math.radians(fov / 2))
    return 0.5 + sum(a * b for a, b in zip(d, r)) / z / (t * 1080 / 1920) / 2, 0.5 - sum(a * b for a, b in zip(d, u)) / z / t / 2

def frame(pts, az=0, el=6, fov=44, push=0.15, swing=4, lookDY=0.0, box=(0.07, 0.93, 0.08, 0.88)):
    """camera distance so every point fits the portrait box at the END of the move; starts `push` further out, `swing` deg round.
    az=0: camera on the +z side looking -z; az=180: camera on the -z side (field) looking +z (screen right = world -x)"""
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    look = [(a + b) / 2 for a, b in zip(lo, hi)]; look[1] += lookDY
    def at(d, a):
        a_, e_ = math.radians(a), math.radians(el)
        return [look[0] + d * math.sin(a_) * math.cos(e_), look[1] + d * math.sin(e_), look[2] + d * math.cos(a_) * math.cos(e_)]
    def fits(pos):
        for pt in pts:
            q = _proj(pos, look, fov, pt)
            if q is None or not (box[0] <= q[0] <= box[1] and box[2] <= q[1] <= box[3]): return False
        return True
    d = 0.25
    while d < 40 and not fits(at(d, az)): d *= 1.03
    r3 = lambda v: [round(x, 3) for x in v]
    return {"type": "dolly", "from": r3(at(d * (1 + push), az - swing)), "to": r3(at(d, az)), "look": r3(look), "fov": fov}

def c(base, **kw):
    d = dict(base); d.update(kw); return d

def path_ok(cam, cast, name):
    """warn if a dolly passes within 0.75 m of a character (giant near-lens blobs)"""
    if cam.get("type") != "dolly": return
    for k in range(21):
        u = k / 20; p = [a + (b - a) * u for a, b in zip(cam["from"], cam["to"])]
        for m in cast:
            if p[1] < H_[m["who"]] + m.get("elev", 0) + 0.3 and math.hypot(p[0] - m["pos"][0], p[2] - m["pos"][1]) < 0.75:
                print(f"WARNING {name}: camera passes {math.hypot(p[0]-m['pos'][0], p[2]-m['pos'][1]):.2f} m from {m['who']} at u={u:.2f}"); return

def dolly(fr, to, look, look_to=None, fov=42, **kw):
    d = {"type": "dolly", "from": [round(v, 3) for v in fr], "to": [round(v, 3) for v in to], "look": [round(v, 3) for v in look], "fov": fov}
    if look_to: d["lookTo"] = [round(v, 3) for v in look_to]
    d.update(kw); return d

VO = json.loads((ROOT / "audio/04-emu-war.vo.json").read_text())
CAP = json.loads((ROOT / "src/captions/04-emu-war.json").read_text())
LS = [l["start_s"] for l in VO["lines"]]
LE = [l["start_s"] + l["seconds"] for l in VO["lines"]]
T = lambda n: LS[n - 1]
E = lambda n: LE[n - 1]
def word_t(w, after=0.0):
    """onset of the first caption word `w` at/after `after` (seconds, absolute)"""
    return next(x["start"] for x in CAP if x["word"].strip(".,?:…").lower() == w.lower() and x["start"] >= after - 1e-6)
PRE = 0.06

seg = [
  ("hook-binoculars", 0, word_t("to", T(1)) - PRE),  # cut in the ellipsis pause
  ("hook-emu", word_t("to", T(1)) - PRE, T(2) - PRE),
  ("bet-hat", T(2) - PRE, T(3) - PRE),
  ("flock-wheat", T(3) - PRE, word_t("so", T(3)) - PRE),
  ("truck-arrives", word_t("so", T(3)) - PRE, T(4) - PRE),
  ("herd", T(4) - PRE, word_t("but", T(4)) - PRE),
  ("split-drone", word_t("but", T(4)) - PRE, T(5) - PRE),
  ("ambush-hide", T(5) - PRE, word_t("and", T(5)) - PRE),
  ("emu-line", word_t("and", T(5)) - PRE, T(6) - PRE),
  ("soldier-sweat", T(6) - PRE, word_t("and", T(6)) - PRE),
  ("gun-jam", word_t("and", T(6)) - PRE, T(7) - PRE),
  ("truck-track", T(7) - PRE, word_t("but", T(7)) - PRE),
  ("emus-overtake", word_t("but", T(7)) - PRE, word_t("and", word_t("hour", T(7))) - PRE),
  ("gun-pov", word_t("and", word_t("hour", T(7))) - PRE, T(8) - PRE),
  ("pull-out", T(8) - PRE, T(9) - PRE),
  ("gus-bowls", T(9) - PRE, word_t("marbles", T(9)) - PRE),
  ("strike-floor", word_t("marbles", T(9)) - PRE, word_t("strike", T(9)) - PRE),
  ("pause-reaction", word_t("strike", T(9)) - PRE, T(10) - PRE),
  ("scatter-throw", T(10) - PRE, word_t("and", T(10)) - PRE),
  ("clip-one", word_t("and", T(10)) - PRE, T(11) - PRE),
  ("gus-rule", T(11) - PRE, word_t("and", T(11)) - PRE),
  ("emus-spread", word_t("and", T(11)) - PRE, T(12) - PRE),
  ("empty-post", T(12) - PRE, word_t("now", T(12)) - PRE),
  ("emu-hat", word_t("now", T(12)) - PRE, E(12) + 0.04),
  ("pause-vik-drop", E(12) + 0.04, T(13) - PRE),
  ("loop-binoculars", T(13) - PRE, VO["total_s"]),
]
R = {sid: (a, b) for sid, a, b in seg}
rel = lambda sid, t: round(t - R[sid][0], 2)
dur = lambda sid: R[sid][1] - R[sid][0]

# ---------------- anchors (src/sets/emus.tsx) ----------------
GATE_POST = [-1.3, 1.5, 1.2]           # Vik's hat goes on top of this post
ROAD_Z = 4.2
TRUCK_STOP = [-1.0, 0, ROAD_Z]
BED_Y = 0.83
WH_GUN = [0.3, 0.86, 1.35]             # Lewis gun on the dirt bank, barrel to the water (-z)
SHOP = [0.4, 0, 1.6]
DROP_CAST = [c(VIK, pos=[-0.62, 1.75], facing=-1, pose="jaw-drop"), c(MILO, pos=[0.45, 1.45], elev=0.46, facing=1, pose="laugh")]
DROP_CAM = None                    # marble play area on the floorboards (ball rolls +x)

# the hook: Milo climbing the gate (road side), binoculars on the field; camera in the field
HOOK_MILO = c(MILO, pos=[0.35, 1.45], elev=0.46, facing=1, pose="binoculars", props=["binoculars"])
HOOK = frame(body(HOOK_MILO, crop=0.42) + [[0.35, 0.9, 1.2]], az=188, el=2, fov=40, push=0.22, swing=-5, box=(0.12, 0.88, 0.1, 0.86))
HOOK_EMU = {"pos": [0.72, 0.5], "facing": 1, "gait": "stand", "seed": 2, "s": 0.95, "rise": {"at": 0.08, "dur": 0.26, "from": 1.4}}  # head lands at x ~0.37, in front of the lenses
HOOK_B = frame([[0.35, 1.95, 1.45], [0.6, 1.25, 1.45], [0.05, 1.25, 1.45], [0.75, 1.2, 0.5]], az=192, el=1, fov=40, push=0.12, swing=-3, box=(0.1, 0.9, 0.12, 0.8))

# Vik at the gate (road side), Milo still on the gate
BET_VIK = c(VIK, pos=[-0.62, 1.75], facing=1, pose="hat-tap", props=["fedora"],
            poses=[{"at": 1.15, "pose": "present", "holding": "fedora", "props": []}, {"at": 1.95, "pose": "cross-arms", "holding": None, "props": []}])
BET_MILO = c(MILO, pos=[0.18, 1.45], elev=0.46, facing=1, pose="look-up")
HAT_AT = 1.95

# truck: three soldiers ride the bed in
DRIVE = {"from": [-9.5, 0, ROAD_Z], "at": 0.0, "dur": 1.9}
RIDERS = [(-2.95, ROAD_Z + 0.5, "cross-arms", 11, -1), (-2.15, ROAD_Z + 0.35, "frown", 12, 1), (-1.4, ROAD_Z + 0.55, "idle", 13, -1)]
TRUCK_START = frame(sum([body({"who": "soldier", "pos": [x + dx, z], "elev": BED_Y}, crop=0.0) for x, z, *_ in RIDERS for dx in (-8.5, 0)], []) + [[-12.5, 0.2, ROAD_Z], [1.8, 0.2, ROAD_Z]], az=6, el=10, fov=42, push=0.0, swing=0)
TRUCK_END = frame(sum([body({"who": "soldier", "pos": [x, z], "elev": BED_Y}, crop=0.3) for x, z, *_ in RIDERS], []) + [[-1.0, 1.4, 4.5], [-3.0, 0.9, 3.8], [-3.35, 0.8, 5.1]], az=8, el=10, fov=42, push=0.0, swing=0)
def rider(x, z, pose, seed, facing=1):
    return c(SOLDIER, pos=[x, z], elev=BED_Y, facing=facing, pose=pose, seed=seed,
             enter={"from": [x - 8.5, z], "at": 0.0, "dur": 1.9, "pow": 3, "ride": True})

SOLDIERS_FENCE = [c(SOLDIER, pos=[-5.6, 2.7], facing=-1, pose="aim", seed=3), c(SOLDIER, pos=[-3.9, 2.8], facing=1, pose="aim", seed=4, props=["moustache"])]
GUNS_FENCE = [{"pos": [-5.0, 0.25, 2.0], "rot": [0, round(PI / 2 + 0.15, 3), 0]}, {"pos": [-3.3, 0.25, 2.05], "rot": [0, round(PI / 2 - 0.1, 3), 0]}]

# water hole: soldiers in the trench behind the bank (camera side)
WH_SOLDIER = c(SOLDIER, pos=[0.95, 2.1], elev=-0.55, facing=-1, pose="aim", seed=5)
AMB = frame(body(c(SOLDIER, pos=[0.95, 2.1], elev=-0.55), crop=0.4) + [[WH_GUN[0] - 0.1, WH_GUN[1] + 0.2, WH_GUN[2] - 0.9], [WH_GUN[0] - 0.1, WH_GUN[1] - 0.1, WH_GUN[2] + 0.4]], az=24, el=6, fov=44, push=0.0, swing=0, box=(0.12, 0.88, 0.3, 0.86))
WH_SOLDIER2 = c(SOLDIER, pos=[-0.75, 2.35], elev=-0.6, facing=1, pose="frown", seed=6, props=["moustache"])

# truck chase (treadmill: the world slides by at 8 m/s, emus at ~13.9 m/s = +5.9 relative)
SPEED = 8.0
REL = 5.9
CHASE_TRUCK = {"pos": [0, 0, ROAD_Z], "wheelSpin": SPEED, "bumpy": 1, "guns": 1, "dust": True}
CHASE_CAM = frame([[-2.6, 0.0, ROAD_Z], [2.5, 0.0, ROAD_Z], [-2.6, 2.4, ROAD_Z], [2.5, 2.4, ROAD_Z], [-1.55, 2.85, ROAD_Z + 0.45]], az=4, el=5, fov=42, push=0.0, swing=0, box=(0.04, 0.96, 0.25, 0.75))
GUNNER = c(SOLDIER, pos=[-1.55, ROAD_Z + 0.45], elev=BED_Y, facing=1, pose="aim", seed=7, shake=1)

# workshop
SHOP_GUS = c(GUS, pos=[-1.25, 1.55], facing=1, pose="present", holding="bowling")
SHOP_MILO = c(MILO, pos=[1.5, 1.1], facing=-1, pose="look-up")
SHOP_VIK = c(VIK, pos=[2.15, 0.85], facing=-1, pose="cross-arms", props=["fedora"])
BALL_SPEED_A = 0.55
RELEASE = 0.9
travel_a = BALL_SPEED_A * (dur("gus-bowls") - RELEASE)
FLOOR = {"pos": [0.2, 0, 1.5], "size": [7, 4.4]}
CLIP_SPEED = 1.6
hits_t = rel("clip-one", word_t("hits", T(10)))
CLIP_T0 = -0.6
CLIP_FROM = 0.786 - CLIP_SPEED * (hits_t - CLIP_T0)

def sfx_steps(t0, t1, every=0.28, gain=-7):
    out, t = [], t0
    while t < t1:
        out.append({"name": "footsteps-dirt", "at": round(t, 2), "gain": gain}); t += every
    return out
WIND = lambda sid, gain=-9: {"name": "farm-wind", "at": 0, "dur": round(dur(sid), 2), "gain": gain}

split_at = rel("split-drone", word_t("split", T(4))) - 0.1
puffs = [round(split_at + 0.55 + k * 0.32, 2) for k in range(6) if split_at + 0.55 + k * 0.32 < dur("split-drone") - 0.2]
jam_at = rel("gun-jam", word_t("jammed", T(6))) - 0.06

DROP_CAM = frame(body(DROP_CAST[0], crop=0.45) + body(DROP_CAST[1], crop=0.4), az=182, el=2, fov=44, push=0.06, swing=-1)

_pull = body(c(SOLDIER, pos=[-1.35, ROAD_Z + 0.4], elev=BED_Y)) + body(c(SOLDIER, pos=[0.4, ROAD_Z + 1.15])) + [[2.5, 1.75, 0.55], [2.9, 0.0, 0.55], [2.1, 0.0, 0.55]]
PULL_START = frame(_pull, az=200, el=4, fov=44, push=0.0, swing=0, box=(0.1, 0.9, 0.1, 0.88))
PULL_END = frame(_pull, az=204, el=8, fov=44, push=0.0, swing=0, box=(0.2, 0.8, 0.16, 0.84))

shots = [
  # 1 HOOK: Milo on the gate, binoculars up; an emu head pops up right in front of the lenses on "birds?"
  {"id": "hook-binoculars", "set": "farm",
   "camera": HOOK, "cast": [HOOK_MILO], "layout": "manual", "dof": 1.0, "focusDist": 2.0,
   "sfx": [WIND("hook-binoculars")]},
  # 1b ...to birds? an emu head pops up right in front of the lenses (tighter, quick push)
  {"id": "hook-emu", "beat": 1, "stillAt": 0.6, "set": "farm",
   "fx": {"farm": {"emus": [HOOK_EMU]}},
   "camera": HOOK_B, "cast": [c(HOOK_MILO, poses=[{"at": 0.3, "pose": "shock", "props": ["binoculars"]}])], "layout": "manual", "dof": 1.0, "focusDist": 1.6,
   "sfx": [WIND("hook-emu"), {"name": "footsteps-dirt", "at": 0.08, "gain": -4}, {"name": "pop-soft", "at": 0.3, "gain": -6}]},
  # 2 the bet: Vik taps his saffron-band fedora, then sets it on the gate post like a trophy
  {"id": "bet-hat", "beat": 2, "stillAt": 0.75, "set": "farm",
   "fx": {"farm": {"hatPost": GATE_POST, "hatPostAt": HAT_AT}},
   "camera": frame(body(BET_VIK, crop=0.25) + body(BET_MILO, crop=0.35) + [[GATE_POST[0] - 0.25, GATE_POST[1] + 0.2, GATE_POST[2]]], az=186, el=3, fov=44, push=0.18, swing=-4),
   "cast": [BET_VIK, BET_MILO], "layout": "manual", "dof": 1.0, "focusDist": 2.3,
   "titleCard": {"label": "The bet", "word": "Vik's hat", "at": 0.15, "duration": round(dur("bet-hat") - 0.35, 2)},
   "sfx": [WIND("bet-hat", -11), {"name": "pop-soft", "at": 0.3, "gain": -8}, {"name": "pop-soft", "at": 0.7, "gain": -8}, {"name": "pop-soft", "at": HAT_AT, "gain": -5}]},
  # 3a twenty thousand emus wading through the golden wheat (crane down)
  {"id": "flock-wheat", "set": "farm",
   "fx": {"farm": {"flocks": [{"n": 30, "center": [-1, -5.2], "spread": [16, 6.5], "seed": 3, "gait": "walk", "vel": [0.35, 0.12], "minDist": 0.95}]}},
   "camera": dolly([3, 12, 11], [1.5, 5.2, 6.5], [0, 0.6, -5.5], look_to=[0, 0.8, -4.5], fov=44),
   "titleCard": {"label": "Australia", "word": "1932", "at": 0.15, "duration": round(dur("flock-wheat") - 0.3, 2)},
   "sfx": [WIND("flock-wheat", -8)] + sfx_steps(0.2, dur("flock-wheat"), 0.45, -10)},
  # 3b ...so the army sent three soldiers and two machine guns: the truck pulls up; push in on the guns
  {"id": "truck-arrives", "set": "farm",
   "fx": {"farm": {"truck": dict(pos=TRUCK_STOP, drive=DRIVE, guns=2, dust=True)}},
   "camera": dict(TRUCK_END, **{"from": TRUCK_START["to"], "look": TRUCK_START["look"], "lookTo": TRUCK_END["look"]}),
   "cast": [rider(x, z, p, sd, f) for x, z, p, sd, f in RIDERS], "layout": "manual",
   "titleCard": {"label": "Ammo", "word": "10,000 bullets", "at": 0.9, "duration": round(dur("truck-arrives") - 1.05, 2)},
   "sfx": [{"name": "truck-engine", "at": 0, "dur": round(dur("truck-arrives"), 2), "gain": -4}]},
  # 4a day one: farmers wave their hats and herd the flock toward the guns at the fence
  {"id": "herd", "set": "farm",
   "fx": {"farm": {"flocks": [{"n": 24, "center": [1.5, -5.0], "spread": [9, 4], "seed": 7, "gait": "walk", "vel": [-0.8, 0.55], "minDist": 0.8}], "guns": GUNS_FENCE}},
   "camera": dolly([8.5, 6.2, 10], [6.5, 4.9, 8.2], [-0.5, 0.5, -3.5], look_to=[-1.5, 0.5, -2.5], fov=44),
   "cast": [c(FARMER, pos=[5.2, -8.4], facing=-1, pose="wave", holding="strawhat", props=["nohat"], seed=21), c(FARMER, pos=[2.0, -9.2], facing=-1, pose="wave", holding="strawhat", props=["nohat"], seed=22)] + SOLDIERS_FENCE,
   "layout": "manual",
   "sfx": [WIND("herd", -10)] + sfx_steps(0.1, dur("herd"), 0.3, -8)},
  # 4b ...but the emus split into little groups and ran out of range (drone view; dust puffs in empty ground)
  {"id": "split-drone", "beat": 3, "stillAt": round(split_at + 0.9, 2), "set": "farm",
   "fx": {"farm": {"flocks": [{"n": 34, "center": [-0.5, -3.2], "spread": [7, 3.6], "seed": 9, "gait": "walk", "minDist": 0.75, "split": {"at": split_at, "speed": 3.4, "groups": 6}}],
                   "guns": GUNS_FENCE, "puffs": {"center": [-0.5, -3.2], "r": 1.4, "times": puffs}}},
   "camera": dolly([0.5, 11.5, 8.5], [1.5, 10.2, 7.2], [-0.5, 0, -3.2], look_to=[-0.5, 0, -2.6], fov=46),
   "cast": SOLDIERS_FENCE, "layout": "manual",
   "sfx": [WIND("split-drone", -10)] + [{"name": "gunfire-distant", "at": p, "gain": -9} for p in puffs] + sfx_steps(split_at, dur("split-drone"), 0.18, -8)},
  # 5a the ambush at the water hole: low over the gun on the dirt bank, rack focus to the emus
  {"id": "ambush-hide", "set": "waterhole",
   "fx": {"waterhole": {"gun": {"pos": WH_GUN, "rot": [0, round(PI / 2, 3), 0]},
                        "flocks": [{"n": 14, "center": [0, 0], "spread": [1, 1], "seed": 13, "line": {"from": [15, -27], "to": [3.5, -12.5], "speed": 1.6}}]}},
   "camera": dict(AMB, **{"from": [AMB["to"][0] + 0.4, AMB["to"][1] + 0.1, AMB["to"][2] + 0.6]}),
   "cast": [WH_SOLDIER], "layout": "manual", "dof": 2.0, "focusDist": [3.4, 13.0],
   "titleCard": {"label": "Plan B", "word": "The ambush", "at": 0.15, "duration": round(dur("ambush-hide") - 0.3, 2)},
   "sfx": [WIND("ambush-hide", -12)]},
  # 5b ...and over a thousand emus walked straight toward it
  {"id": "emu-line", "set": "waterhole",
   "fx": {"waterhole": {"flocks": [{"n": 22, "center": [0, 0], "spread": [1, 1], "seed": 15, "line": {"from": [17, -29], "to": [2.5, -10.5], "speed": 1.7}}]}},
   "camera": dolly([-2.2, 1.0, -5.0], [-1.4, 0.92, -6.0], [5, 1.0, -14], look_to=[4, 1.0, -12.5], fov=42),
   "sfx": [WIND("emu-line", -12)] + sfx_steps(0.1, dur("emu-line"), 0.32, -8)},
  # 6a sweat on a soldier's face: waiting until the birds are close...
  {"id": "soldier-sweat", "set": "waterhole",
   "fx": {"waterhole": {"gun": {"pos": WH_GUN, "rot": [0, round(PI / 2, 3), 0]},
                        "flocks": [{"n": 12, "center": [0, 0], "spread": [1, 1], "seed": 17, "line": {"from": [9, -19], "to": [1.5, -7.5], "speed": 1.4}}]}},
   "camera": frame(body(WH_SOLDIER, crop=0.6), az=14, el=1, fov=40, push=0.12, swing=3, box=(0.12, 0.88, 0.1, 0.92)),
   "cast": [c(WH_SOLDIER, pose="aim-sweat")], "layout": "manual", "dof": 1.6, "focusDist": 1.3},
  # 6b ...and the gun jammed after just twelve: insert, "chk", the pan magazine stuck; emus scatter unharmed
  {"id": "gun-jam", "beat": 4, "stillAt": round(jam_at + 0.3, 2), "set": "waterhole",
   "fx": {"waterhole": {"gun": {"pos": WH_GUN, "rot": [0, round(PI / 2, 3), 0], "jamAt": jam_at},
                        "flocks": [{"n": 16, "center": [1.0, -7.2], "spread": [7, 2.6], "seed": 19, "gait": "walk", "split": {"at": round(jam_at + 0.25, 2), "speed": 4.2, "groups": 5, "dirDeg": [195, 225, 265, 305, 340]}}]}},
   "camera": dolly([1.25, 1.2, 1.95], [1.0, 1.12, 1.75], [0.3, 0.95, 1.2], look_to=[0.25, 0.9, 0.9], fov=40),
   "dof": 1.6, "focusDist": 0.85,
   "sfx": [{"name": "gun-jam", "at": round(jam_at, 2), "gain": -2}, {"name": "gun-jam", "at": round(jam_at + 0.3, 2), "gain": -6}] + sfx_steps(jam_at + 0.3, dur("gun-jam"), 0.16, -9)},
  # 7a so they bolted a machine gun onto a truck: tracking side shot, bouncing, gunner hanging on
  {"id": "truck-track", "set": "farm",
   "fx": {"farm": {"truck": CHASE_TRUCK, "scroll": SPEED, "wheatRect": [-30, 70, -9, -1.0],
                   "flocks": [{"n": 6, "center": [-9, 2.4], "spread": [6, 0.8], "seed": 23, "vel": [REL, 0], "gait": "run", "minDist": 1.2}]}},
   "camera": dict(CHASE_CAM, **{"from": [CHASE_CAM["to"][0] + 1.2, CHASE_CAM["to"][1] + 0.2, CHASE_CAM["to"][2] + 1.2]}),
   "cast": [GUNNER], "layout": "manual",
   "sfx": [{"name": "truck-engine", "at": 0, "dur": round(dur("truck-track"), 2), "gain": -3}]},
  # 7b ...but the emus outran it at nearly fifty kilometres an hour
  {"id": "emus-overtake", "set": "farm",
   "fx": {"farm": {"truck": CHASE_TRUCK, "scroll": SPEED, "wheatRect": [-30, 70, -9, -1.0],
                   "flocks": [{"n": 9, "center": [-13, 6.4], "spread": [9, 1.4], "seed": 29, "vel": [REL, 0], "gait": "run", "minDist": 1.3},
                              {"n": 7, "center": [-10, 2.4], "spread": [8, 0.8], "seed": 31, "vel": [REL, 0], "gait": "run", "minDist": 1.3}]}},
   "camera": dict(CHASE_CAM, **{"from": [CHASE_CAM["to"][0] - 1.0, CHASE_CAM["to"][1] + 0.3, CHASE_CAM["to"][2] + 2.0], "to": [CHASE_CAM["to"][0] + 0.8, CHASE_CAM["to"][1], CHASE_CAM["to"][2] + 1.4]}),
   "cast": [GUNNER], "layout": "manual",
   "titleCard": {"label": "Top speed", "word": "50 km/h", "at": 0.2, "duration": round(dur("emus-overtake") - 0.4, 2)},
   "sfx": [{"name": "truck-engine", "at": 0, "dur": round(dur("emus-overtake"), 2), "gain": -4}] + sfx_steps(0.0, dur("emus-overtake"), 0.15, -8)},
  # 7c ...and the ground was so bumpy nobody could aim: shaky POV down the gun, emus weaving away
  {"id": "gun-pov", "set": "farm",
   "fx": {"farm": {"truck": CHASE_TRUCK, "scroll": SPEED, "wheatRect": [-30, 70, -9, -1.0],
                   "flocks": [{"n": 7, "center": [9, ROAD_Z - 0.4], "spread": [6, 3.2], "seed": 37, "vel": [REL * 0.5, 0], "gait": "run", "minDist": 1.4, "zigzag": 0.9}]}},
   "camera": dolly([-1.55, 1.98, ROAD_Z + 1.12], [-1.45, 1.95, ROAD_Z + 1.08], [10, 1.35, ROAD_Z + 0.3], look_to=[10, 1.3, ROAD_Z + 0.0], fov=50),
   "shake": 0.05,
   "sfx": [{"name": "truck-engine", "at": 0, "dur": round(dur("gun-pov"), 2), "gain": -2}]},
  # 8 after a week, the soldiers pulled out: loading the truck; one emu watches from the fence and blinks
  {"id": "pull-out", "set": "farm",
   "fx": {"farm": {"truck": dict(pos=TRUCK_STOP, guns=1, crates=True),
                   "emus": [{"pos": [2.5, 0.55], "facing": -1, "gait": "stand", "seed": 41, "lookCam": False, "blinkAt": [0.9, 1.8]}]}},
   "camera": dict(PULL_END, **{"from": PULL_START["to"], "look": PULL_START["look"], "lookTo": PULL_END["look"]}),
   "cast": [c(SOLDIER, pos=[-1.35, ROAD_Z + 0.4], elev=BED_Y, facing=-1, pose="frown", seed=11), c(SOLDIER, pos=[0.4, ROAD_Z + 1.15], facing=1, pose="stomp", seed=12, props=["moustache"])],
   "layout": "manual", "dof": 1.2, "focusDist": [1.5, 3.0],
   "sfx": [WIND("pull-out", -10), {"name": "truck-engine", "at": 0.3, "dur": round(dur("pull-out") - 0.3, 2), "gain": -10}]},
  # 9a Gus rolls a bowling ball at a tight pack of marbles (Milo and Vik watch)
  {"id": "gus-bowls", "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR,
          "marbles": {"mode": "rack", "origin": SHOP, "rotY": round(PI / 2, 4), "rollAt": RELEASE, "rollFrom": [0, -1.4], "speed": BALL_SPEED_A}},
   "camera": frame(body(SHOP_GUS) + [[1.0, 0.05, 1.6], [0.35, 0.05, 1.2], [0.35, 0.05, 2.0]], az=6, el=12, fov=44, push=0.12, swing=3),
   "cast": [c(SHOP_GUS, poses=[{"at": 0.45, "pose": "bowl"}, {"at": RELEASE - 0.05, "pose": "bowl", "holding": None}, {"at": RELEASE + 0.6, "pose": "smile-nod", "holding": None}])],
   "layout": "manual",
   "sfx": [{"name": "bowling-roll", "at": RELEASE, "gain": -5}]},
  # 9b strike: floor-level insert, the ball bursts the pack apart
  {"id": "strike-floor", "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR,
          "marbles": {"mode": "rack", "origin": SHOP, "rotY": round(PI / 2, 4), "rollAt": 0, "rollFrom": [0, round(-1.4 + travel_a, 3)], "speed": BALL_SPEED_A}},
   "camera": dolly([0.3, 0.26, 3.05], [0.55, 0.22, 2.85], [0.45, 0.07, 1.6], look_to=[0.6, 0.07, 1.6], fov=42), "dof": 1.4, "focusDist": 1.3,
   "sfx": [{"name": "bowling-roll", "at": 0, "gain": -6}, {"name": "marbles-scatter", "at": round((1.4 - travel_a - 0.144) / BALL_SPEED_A, 2), "gain": -2}]},
  # (pause, "Strike.") reaction: Milo grins; Vik glances nervously up at his hat
  {"id": "pause-reaction", "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR},
   "camera": frame(body(SHOP_MILO, crop=0.3) + body(SHOP_VIK, crop=0.45), az=-6, el=3, fov=44, push=0.05, swing=1),
   "cast": [c(SHOP_MILO, pose="laugh"), c(SHOP_VIK, pose="nervous-up")], "layout": "manual"},
  # 10a then he scatters them across the floorboards (high angle)
  {"id": "scatter-throw", "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR,
          "marbles": {"mode": "scatter", "origin": SHOP, "rotY": round(PI / 2, 4), "throwAt": 0.25, "throwFrom": [0.05, -1.45], "noBall": True}},
   "camera": frame(body(c(GUS, pos=[-1.3, 1.55])) + [[2.3, 0.05, 1.6], [1.0, 0.05, 0.4], [1.0, 0.05, 2.8]], az=4, el=38, fov=46, push=0.1, swing=3),
   "cast": [c(GUS, pos=[-1.3, 1.55], facing=1, pose="bowl")], "layout": "manual",
   "sfx": [{"name": "marbles-scatter", "at": 0.3, "gain": -4}, {"name": "marble-click", "at": 0.75, "gain": -6}, {"name": "marble-click", "at": 0.95, "gain": -8}]},
  # 10b ...and the ball hits just one: insert down the clear lane
  {"id": "clip-one", "beat": 5, "stillAt": round(hits_t + 0.2, 2), "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR,
          "marbles": {"mode": "scatter", "origin": SHOP, "rotY": round(PI / 2, 4), "rollAt": CLIP_T0, "rollFrom": [0, round(CLIP_FROM, 3)], "speed": CLIP_SPEED, "struck": True}},
   "camera": dolly([-1.2, 1.55, 3.4], [-0.8, 1.35, 3.0], [0.7, 0.05, 1.55], look_to=[1.0, 0.05, 1.55], fov=44), "dof": 1.0, "focusDist": 2.0,
   "sfx": [{"name": "bowling-roll", "at": 0, "gain": -6}, {"name": "marble-click", "at": round(hits_t, 2), "gain": -2}]},
  # 11a a machine gun only wins against a crowd: Gus holds the ball, nods at the scattered marbles
  {"id": "gus-rule", "set": "forge",
   "fx": {"forgeLumps": False, "noSparks": True, "floorboards": FLOOR,
          "marbles": {"mode": "scatter", "origin": SHOP, "rotY": round(PI / 2, 4), "rollAt": -20, "rollFrom": [0, -2], "speed": CLIP_SPEED, "struck": True, "noBall": True}},
   "camera": frame(body(c(GUS, pos=[-1.0, 1.25])) + [[0.9, 0.05, 1.9], [0.2, 0.05, 2.4]], az=10, el=8, fov=44, push=0.12, swing=3),
   "cast": [c(GUS, pos=[-1.0, 1.25], facing=1, pose="smile-nod", holding="bowling")], "layout": "manual"},
  # 11b ...and the emus refused to be a crowd: spread out all over the field, unbothered
  {"id": "emus-spread", "set": "farm",
   "fx": {"farm": {"flocks": [{"n": 16, "center": [0, -4.5], "spread": [26, 7], "seed": 43, "gait": "peck", "minDist": 3.0}]}},
   "camera": dolly([-3.5, 3.6, 9.5], [2.5, 3.2, 9.0], [-0.5, 0.7, -4], look_to=[0.5, 0.7, -4], fov=46),
   "sfx": [WIND("emus-spread", -8)]},
  # 12a "And Vik's hat?" the post is empty
  {"id": "empty-post", "set": "farm",
   "camera": frame(body(c(VIK, pos=[-0.62, 1.75]), crop=0.3) + [[GATE_POST[0] - 0.2, GATE_POST[1] + 0.15, GATE_POST[2]]], az=184, el=2, fov=44, push=0.12, swing=-3), "dof": 1.0, "focusDist": 2.4,
   "cast": [c(VIK, pos=[-0.62, 1.75], facing=1, pose="gasp")], "layout": "manual",
   "sfx": [WIND("empty-post", -11)]},
  # 12b "Now an emu's wearing it." (thumbnail frame)
  {"id": "emu-hat", "beat": 6, "stillAt": 0.6, "set": "farm",
   "fx": {"farm": {"emus": [{"pos": [-0.75, 0.25], "vel": [0.32, 0], "gait": "strut", "seed": 47, "hat": True}]}},
   "camera": dolly([-0.25, 1.72, -1.05], [-0.12, 1.7, -0.85], [-0.32, 1.58, 0.25], look_to=[-0.12, 1.58, 0.25], fov=40), "dof": 1.2, "focusDist": 1.15,
   "sfx": [{"name": "footsteps-dirt", "at": 0.1, "gain": -8}, {"name": "footsteps-dirt", "at": 0.5, "gain": -8}, {"name": "footsteps-dirt", "at": 0.9, "gain": -8}]},
  # (pause) payoff: Vik's jaw drops, Milo laughs; ding on Vik's face
  {"id": "pause-vik-drop", "set": "farm",
   "camera": DROP_CAM,
   "cast": DROP_CAST, "layout": "manual",
   "payoff": True, "payoffAt": 0.0},
  # 13 back on the gate with the binoculars; lands exactly on frame 1 (loop)
  {"id": "loop-binoculars", "set": "farm",
   "camera": dolly([HOOK["from"][0] + 0.45, HOOK["from"][1] + 0.08, HOOK["from"][2] - 0.6], HOOK["from"], HOOK["look"], fov=HOOK["fov"]), "dof": 1.0, "focusDist": 2.0,
   "cast": [c(HOOK_MILO, poses=[{"at": 0, "pose": "laugh", "props": []}, {"at": 1.2, "pose": "binoculars", "props": ["binoculars"]}])], "layout": "manual",
   "sfx": [WIND("loop-binoculars")]},
]

assert [s["id"] for s in shots] == [x[0] for x in seg]
FPS = 30
fr = [round(b * FPS) for _, _, b in seg]
for i, s in enumerate(shots):
    s["duration"] = round((fr[i] - (fr[i - 1] if i else 0)) / FPS, 4)
    path_ok(s.get("camera", {}), s.get("cast", []), s["id"])
    if s["duration"] > 3.55: print(f"NOTE {s['id']} runs {s['duration']:.2f} s")
L = {"slug": "04-emu-war", "title": "The War Australia Lost to Birds", "audio": "vo/04-emu-war.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/04-emu-war.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s + 0.5 s hold;", " ".join(f"{s['id']}:{s['duration']:.2f}" for s in shots))
