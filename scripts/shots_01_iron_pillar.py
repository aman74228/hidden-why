#!/usr/bin/env python3
"""Builds src/shots/01-iron-pillar.json (v3 rebuild): 25 shots cut every 2-3 s
on the eleven_v3 word timestamps, 5 object inserts, the explanation played out
in the courtyard with Gus's two iron bars in the rain."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PILLAR = {"pos": [0, -2.5]}
BARS = [-3.4, 0, 1.2]          # stand centre (src/sets/world.tsx BARS_POS)
BAR_P = [-3.0, 1.2, 1.2]      # pillar-style iron bar (right), mid height
BAR_S = [-3.8, 1.2, 1.2]      # modern steel bar (left)
SPOT = [0.225, 1.18, 0.024]    # gate rust spot
SMITH = {"body": "#5A3E30", "trim": "#B88A5A", "legs": "#C9B48E", "shoes": "#3A2A22"}

# cut points (s) on the voiceover word timings (src/captions/01-iron-pillar.json)
cuts = [0, 2.8, 5.0, 6.75, 8.25, 9.9, 12.6, 14.3, 17.45, 19.8, 23.3, 25.15, 27.85, 29.65, 32.4,
        35.0, 37.2, 39.45, 42.65, 45.7, 48.55, 50.95, 53.95, 57.35, 59.7, 61.0, 61.75]

VIK_RAIN = {"who": "vik", "props": ["umbrella"]}
MILO = {"who": "milo", "props": ["satchel"]}
GUS = {"who": "gus", "props": ["stick"]}

def c(base, **kw):
    d = dict(base); d.update(kw); return d

shots = [
  # 1 hook: frame 1 = Vik smugly tapping a coin on the pillar in the rain, Milo looking up
  {"id": "hook-coin-tap", "beat": 1, "stillAt": 0.0, "set": "courtyard", "sky": "storm", "light": "storm",
   "fx": {"pillar": PILLAR, "rain": [1, 1], "sparks": {"pos": [0.16, 1.55, -2.32], "times": [0.55, 1.45]}},
   "camera": {"type": "dolly", "from": [0.75, 0.72, 4.1], "to": [0.6, 0.8, 3.15], "look": [0.15, 1.5, -2.4], "lookTo": [0.12, 1.6, -2.4], "fov": 44},
   "cast": [c(VIK_RAIN, pose="coin-tap", pos=[0.86, -2.42], facing=-1, holding="coin"),
            c(MILO, pose="look-up", pos=[-0.4, -1.6], facing=1)],
   "layout": "manual", "roll": [2.5, 1.0],
   "sfx": [{"name": "rain-soft", "at": 0, "dur": 6.75, "fadeAt": 2.8},
           {"name": "metal-ting", "at": 0.55}, {"name": "metal-ting", "at": 1.45}]},
  # 2 push up the pillar in the rain
  {"id": "pillar-rise", "beat": 1, "set": "courtyard", "sky": "storm", "light": "storm", "skyTo": "golden", "lightTo": "golden", "mixAt": [1.2, 2.2],
   "fx": {"pillar": PILLAR, "rain": [1, 0.6]},
   "camera": {"type": "dolly", "from": [0.4, 0.25, 3.2], "to": [0.25, 0.6, 1.4], "look": [0, 2.0, -2.5], "lookTo": [0, 6.6, -2.5], "fov": 44},
   "titleCard": {"label": "Iron pillar · Delhi", "word": "1,600 years", "at": 0.2, "duration": 2.0}},
  # 3 INSERT: rain beading on the pillar's dark skin
  {"id": "insert-surface", "beat": 1, "set": "courtyard", "sky": "storm", "light": "storm", "fx": {"pillar": PILLAR, "rain": [0.7, 0.7], "beams": False},
   "camera": {"type": "dolly", "from": [0.55, 1.35, -1.25], "to": [0.4, 1.6, -1.55], "look": [0.0, 1.55, -2.5], "lookTo": [0.0, 1.75, -2.5], "fov": 40},
   "dof": 1.2, "focusDist": 1.0},
  {"id": "insert-chain", "beat": 1, "set": "void", "sky": "storm", "light": "golden", "fx": {"macro": "chain"},
   "camera": {"type": "dolly", "from": [0.45, 0.5, 1.45], "to": [0.2, 0.38, 1.15], "look": [-0.2, 0.08, 0], "lookTo": [-0.1, 0.05, 0], "fov": 40},
   "roll": [-4, -2], "dof": 1.2, "focusDist": 1.2,
   "titleCard": {"label": "Your bike chain", "word": "1 monsoon", "at": 0.3, "duration": 1.2},
   "sfx": [{"name": "drip", "at": 0.3}]},
  # 4b the whole rusty bike in the rain (completes "...rusts in one monsoon")
  {"id": "bike-wide", "beat": 1, "set": "courtyard", "sky": "storm", "light": "storm", "fx": {"rain": [0.8, 0.8], "beams": False},
   "camera": {"type": "dolly", "from": [-3.6, 0.8, -3.6], "to": [-4.3, 0.65, -4.5], "look": [-5.2, 0.55, -6.3], "lookTo": [-5.25, 0.5, -6.3], "fov": 42},
   "titleCard": {"label": "Your bike chain", "word": "1 monsoon", "at": 0, "duration": 1.4, "intro": False},
   "sfx": [{"name": "drip", "at": 0.6}]},
  # 5 Vik laughs
  {"id": "vik-laughs", "beat": 2, "set": "courtyard", "light": "golden", "fx": {"pillar": PILLAR, "rain": [0.25, 0.15], "beams": True},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.6, "band": [0.24, 0.97], "angleDeg": -14, "orbitDeg": 14, "push": 0.18},
   "cast": [c(MILO, pose="idle", pos=[-0.7, 0.4], facing=1),
            c(VIK_RAIN, pose="laugh", pos=[0.7, 0.5], facing=-1, enter={"from": [2.6, 1.0], "at": 0, "dur": 0.8})]},
  # 6 Vik: "Easy. Somebody painted it."
  {"id": "vik-paint", "beat": 2, "set": "courtyard", "light": "golden", "fx": {"pillar": PILLAR, "rain": [0.15, 0.1]},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.5, "band": [0.3, 0.97], "angleDeg": 12, "orbitDeg": -10, "push": 0.2},
   "cast": [c(VIK_RAIN, pose="talk", pos=[0.7, -1.6], facing=-1)],
   "titleCard": {"label": "Guess 1", "word": "Paint", "at": 0.15, "duration": 3.6}},
  # 7 INSERT: coin scratch -> bare metal
  {"id": "insert-scratch", "beat": 2, "stillAt": 2.0, "set": "void", "light": "macro", "fx": {"macro": "scratch"},
   "camera": {"type": "dolly", "from": [0.1, 0.05, 2.6], "to": [-0.05, -0.05, 2.0], "look": [0, 0, 0], "fov": 40},
   "roll": [3, 0],
   "titleCard": {"label": "Guess 1", "word": "Paint", "at": 0, "duration": 3.1, "crossed": True, "crossAt": 1.55, "intro": False},
   "sfx": [{"name": "coin-scrape", "at": 0.25}]},
  # 8 Vik: "Then someone polishes it every night." (dusk)
  {"id": "vik-polish", "beat": 3, "set": "courtyard", "sky": "dusk", "light": "dusk", "fx": {"pillar": PILLAR},
   "camera": {"type": "fit", "angleDeg": -20, "orbitDeg": 18, "push": 0.15},
   "cast": [c(MILO, pose="idle", pos=[-0.8, -1.5], facing=1), c(VIK_RAIN, pose="point", pos=[0.75, -1.4], facing=-1, props=[])],
   "titleCard": {"label": "Guess 2", "word": "Polishing", "at": 0.15, "duration": 2.2}},
  # 9 night time-lapse
  {"id": "night-watch", "beat": 3, "set": "courtyard", "sky": "night", "light": "night", "fx": {"pillar": PILLAR, "night": True},
   "props": [{"type": "block", "pos": [-2.1, 0, 0.05], "scale": 1.5, "color": "#C99068"}],
   "camera": {"type": "dolly", "from": [0.6, 0.9, 7.6], "to": [-0.3, 1.0, 6.7], "look": [-1.2, 1.35, -1], "lookTo": [-1.2, 1.6, -1], "fov": 44},
   "cast": [{"who": "vik", "pose": "sleep", "pos": [-2.0, 0.75], "facing": 1},
            c(MILO, pose="idle", pos=[-0.8, 1.0], facing=-1)], "layout": "manual",
   "titleCard": {"label": "Guess 2", "word": "Polishing", "at": 0, "duration": 3.4, "crossed": True, "crossAt": 2.3, "intro": False},
   "sfx": [{"name": "crickets", "at": 0, "dur": 3.5}]},
  # 10 Vik: "Fine. It's a modern fake." (morning)
  {"id": "vik-fake", "beat": 3, "set": "courtyard", "sky": "noon", "light": "noon", "fx": {"pillar": PILLAR, "motes": True},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.55, "band": [0.28, 0.97], "angleDeg": 18, "orbitDeg": -14, "push": 0.2},
   "cast": [c(MILO, pose="idle", pos=[-0.7, -1.2], facing=1), {"who": "vik", "pose": "cross-talk", "pos": [0.6, -1.2], "facing": -1}],
   "titleCard": {"label": "Guess 3", "word": "Fake", "at": 0.1, "duration": 1.9}},
  # 11 forge wide
  {"id": "forge-wide", "beat": 3, "stillAt": 1.6, "set": "forge", "grade": "flashback", "fx": {"merge": [0, 0.3]},
   "camera": {"type": "fit", "angleDeg": 24, "orbitDeg": 26, "push": 0.25},
   "cast": [{"who": "gus", "pose": "hammer", "pos": [0, 0], "facing": 1, "holding": "hammer", "outfit": SMITH, "props": ["apron", "headwrap"]}],
   "titleCard": {"label": "Guess 3", "word": "Fake", "at": 0, "duration": 2.6, "intro": False},
   "sfx": [{"name": "anvil", "at": round(0.88 + 0.9 * k, 2)} for k in range(3)]},
  # 12 forge close orbit with sparks
  {"id": "forge-close", "beat": 3, "set": "forge", "grade": "flashback", "fx": {"merge": [0.3, 0.8], "forgeClose": True},
   "camera": {"type": "orbit", "center": [0.72, 0, 0.12], "radius": 2.1, "height": 1.3, "fromDeg": 20, "toDeg": 70, "lookY": 0.95},
   "dof": 2.0, "focusDist": 1.9,
   "cast": [{"who": "gus", "pose": "hammer", "pos": [0, 0], "facing": 1, "holding": "hammer", "outfit": SMITH, "props": ["apron", "headwrap"]}],
   "sfx": [{"name": "anvil", "at": round(0.88 + 0.9 * k, 2)} for k in range(2)]},
  # 13 INSERT: hot iron full of grey specks; guess 3 crossed out
  {"id": "insert-specks", "beat": 3, "set": "forge", "grade": "flashback", "fx": {"merge": [1, 1], "forgeClose": True, "noSparks": True},
   "camera": {"type": "dolly", "from": [1.08, 0.92, 0.92], "to": [0.98, 0.84, 0.74], "look": [0.72, 0.61, 0.14], "lookTo": [0.72, 0.6, 0.14], "fov": 38},
   "roll": [-3, 1], "dof": 2.0, "focusDist": 0.7,
   "titleCard": {"label": "Guess 3", "word": "Fake", "at": 0, "duration": 2.7, "crossed": True, "crossAt": 1.0, "intro": False}},
  # 14 Gus taps the pillar and smiles
  {"id": "gus-taps", "beat": 4, "stillAt": 1.6, "set": "courtyard", "light": "golden", "fx": {"pillar": PILLAR, "ripple": {"pos": [-0.19, 0.98, -2.42], "times": [0.85, 1.25]}},
   "camera": {"type": "fit", "push": 0.22, "angleDeg": 8, "orbitDeg": 10, "band": [0.16, 0.78]},
   "cast": [c(GUS, pose="tap", pos=[-1.06, -2.42], facing=1, delay=-0.4),
            c(MILO, pose="look-up", pos=[1.0, -1.7], facing=-1),
            {"who": "vik", "pose": "cross-arms", "pos": [2.1, -1.7], "facing": -1}], "layout": "manual",
   "sfx": [{"name": "metal-ting", "at": 0.85}]},
  # 15 "You see, that stuff is phosphorus." Gus with two bars in the rain
  {"id": "bars-wide", "beat": 5, "set": "courtyard", "sky": "storm", "light": "storm",
   "fx": {"pillar": PILLAR, "rain": [0.9, 0.9], "bars": {"skin": [0, 0.08], "rust": [0, 0.12]}},
   "camera": {"type": "dolly", "from": [-3.25, 1.05, 6.7], "to": [-3.4, 1.05, 6.15], "look": [-3.4, 0.95, 1.2], "lookTo": [-3.4, 0.95, 1.2], "fov": 56},
   "cast": [c(GUS, pose="point", pos=[-4.5, 1.2], facing=1),
            c(MILO, pose="look-up", pos=[-2.3, 1.3], facing=-1, props=["satchel", "leaf"])], "layout": "manual",
   "titleCard": {"label": "The secret", "word": "Phosphorus", "at": 0.45, "duration": 1.7},
   "sfx": [{"name": "rain-soft", "at": 0, "dur": 2.2}]},
  # 16 INSERT: phosphorus inside the iron, x20
  {"id": "insert-phosphorus", "beat": 5, "set": "void", "light": "macro", "fx": {"macro": "phosphorus"},
   "camera": {"type": "dolly", "from": [0, 0, 6], "to": [0.2, 0.2, 3.4], "look": [0, 0, -3]},
   "titleCard": {"label": "Phosphorus", "word": "×20", "at": 0.15, "duration": 2.0},
   "sfx": [{"name": "pop-soft", "at": 0.4}]},
  # 17 every time rain wets it and the sun dries it (wet/dry cycles)
  {"id": "bars-cycles", "beat": 5, "stillAt": 1.2, "set": "courtyard", "sky": "storm", "light": "storm", "skyTo": "golden", "lightTo": "golden",
   "fx": {"pillar": PILLAR, "rain": [1, 1], "cycles": 1.5, "bars": {"skin": [0.1, 0.4], "rust": [0.15, 0.45]}},
   "camera": {"type": "dolly", "from": [-2.9, 1.05, 6.4], "to": [-3.9, 1.05, 6.3], "look": [-3.35, 0.95, 1.2], "lookTo": [-3.45, 0.95, 1.2], "fov": 56},
   "cast": [c(GUS, pose="point", pos=[-4.5, 1.2], facing=1)], "layout": "manual"},
  # 18 INSERT: a thin glassy skin grows on the pillar-iron bar
  {"id": "bar-skin", "beat": 5, "set": "courtyard", "light": "golden", "fx": {"rain": [0.4, 0.4], "bars": {"skin": [0.4, 0.85], "rust": [0.45, 0.5]}},
   "camera": {"type": "dolly", "from": [-2.8, 1.55, 2.15], "to": [-2.9, 1.3, 1.62], "look": [-3.0, 1.35, 1.2], "lookTo": [-3.0, 1.25, 1.2], "fov": 36},
   "dof": 2.2, "focusDist": 0.55,
   "titleCard": {"label": "It grows a", "word": "Skin", "at": 0.3, "duration": 2.6},
   "sfx": [{"name": "shimmer", "at": 0.6}]},
  # 19 tight hard coat seals the iron: drops bead off
  {"id": "bar-seal", "beat": 5, "set": "courtyard", "sky": "storm", "light": "storm", "fx": {"rain": [0.8, 0.8], "bars": {"skin": [0.85, 1], "rust": [0.5, 0.55]}},
   "camera": {"type": "dolly", "from": [-2.3, 0.9, 2.0], "to": [-2.6, 1.5, 1.7], "look": [-3.0, 1.0, 1.2], "lookTo": [-3.0, 1.6, 1.2], "fov": 38},
   "roll": [-3, 1], "dof": 1.6, "focusDist": 0.8,
   "sfx": [{"name": "drip", "at": 0.5}, {"name": "drip", "at": 1.5}]},
  # 20 "A raincoat the pillar made for itself." Gus smiles, Milo under a leaf
  {"id": "raincoat", "beat": 5, "set": "courtyard", "light": "golden", "fx": {"pillar": PILLAR, "rain": [0.3, 0.2], "bars": {"skin": [1, 1], "rust": [0.55, 0.7]}},
   "camera": {"type": "dolly", "from": [-3.4, 1.05, 6.8], "to": [-3.4, 1.05, 6.2], "look": [-3.4, 0.95, 1.2], "lookTo": [-3.4, 0.95, 1.2], "fov": 56},
   "cast": [c(GUS, pose="smile-nod", pos=[-4.5, 1.2], facing=1),
            c(MILO, pose="laugh", pos=[-2.3, 1.3], facing=-1, props=["satchel", "leaf"])], "layout": "manual"},
  # 21 modern steel: too clean, it rusts and flakes
  {"id": "steel-rusts", "beat": 5, "set": "courtyard", "sky": "storm", "light": "storm", "fx": {"rain": [0.9, 0.9], "bars": {"skin": [1, 1], "rust": [0.7, 1]}},
   "camera": {"type": "dolly", "from": [-4.5, 1.0, 3.1], "to": [-4.05, 1.2, 1.95], "look": [-3.8, 1.25, 1.2], "lookTo": [-3.8, 1.2, 1.2], "fov": 38},
   "dof": 2.0, "focusDist": 0.8,
   "titleCard": {"label": "Modern steel", "word": "Too clean", "at": 0.5, "duration": 2.4}},
  # 22 Vik storms home to his brand-new gate
  {"id": "vik-gate", "beat": 6, "set": "street", "light": "golden", "fx": {"spot": 0},
   "camera": {"type": "dolly", "from": [2.2, 0.9, 6.4], "to": [0.7, 1.0, 4.6], "look": [0.6, 1.2, 0.5], "lookTo": [0.4, 1.2, 0.5], "fov": 42},
   "cast": [{"who": "vik", "pose": "stomp", "pos": [1.15, 1.25], "facing": -1, "enter": {"from": [4.2, 2.6], "at": 0, "dur": 1.6},
             "poses": [{"at": 0, "pose": "stomp"}, {"at": 1.8, "pose": "proud"}]}], "layout": "manual",
   "sfx": [{"name": "footsteps-stone", "at": 0, "dur": 1.7}, {"name": "gate-creak", "at": 2.2}]},
  # 23 "And there it is..." push along the gate
  {"id": "gate-pushin", "beat": 6, "set": "street", "light": "golden", "fx": {"spot": 1},
   "camera": {"type": "dolly", "from": [-0.6, 1.0, 2.6], "to": [0.12, 1.15, 0.75], "look": [-0.2, 1.1, 0], "lookTo": [0.2, 1.18, 0]},
   "roll": [-2, 0]},
  # 24 INSERT: the spot
  {"id": "insert-spot", "beat": 6, "stillAt": 0.8, "set": "street", "light": "golden", "fx": {"spot": 1},
   "camera": {"type": "dolly", "from": [0.29, 1.21, 0.5], "to": [0.26, 1.19, 0.36], "look": SPOT, "fov": 34},
   "dof": 2.0, "focusDist": 0.55},
  # 25 Vik's face drops; hold, then hard cut to frame 1
  {"id": "face-drop", "beat": 6, "payoff": True, "payoffAt": 0.0, "set": "street", "light": "golden", "fx": {"spot": 1},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.42, "band": [0.12, 0.88], "angleDeg": -6, "orbitDeg": 2, "push": 0.08},
   "cast": [{"who": "vik", "pose": "shock", "pos": [0.9, 1.4], "facing": -1}]},
]

assert len(shots) == len(cuts) - 1, (len(shots), len(cuts))
for i, s in enumerate(shots):
    s["duration"] = round(cuts[i + 1] - cuts[i], 2)
    for e in s.get("sfx", []):
        e.setdefault("at", 0)

L = {"slug": "01-iron-pillar", "title": "Why This 1,600-Year-Old Pillar Won't Rust", "audio": "vo/01-iron-pillar.mp3",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py (strict CLAUDE.md levels), not in Remotion
     "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/01-iron-pillar.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", cuts[-1], "s + 0.5 s hold; max shot", max(s["duration"] for s in shots), "s")
