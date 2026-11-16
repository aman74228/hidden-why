#!/usr/bin/env python3
"""Builds src/shots/01-iron-pillar.json from the brief's shot list, re-timed
to the ElevenLabs word timestamps (cuts on sentence boundaries)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PILLAR = {"pos": [0, -2.5]}
SMITH = {"body": "#5A3E30", "trim": "#B88A5A", "legs": "#C9B48E", "shoes": "#3A2A22"}

# cut points (s) from the voiceover sentence timings
cuts = [0, 6.20, 9.30, 12.10, 17.15, 20.75, 26.10, 30.45, 36.85, 39.45, 45.50, 50.20, 55.00, 59.10, 62.00, 66.25, 68.40]
d = lambda i: round(cuts[i + 1] - cuts[i], 2)
clangs = lambda dur: [{"name": "clang", "at": round(0.9 * k, 2), "volume": 0.4} for k in range(1, int(dur / 0.9) + 1)]

shots = [
  {"id": "hook-pillar-rain", "beat": 1, "stillAt": 4.6, "set": "courtyard", "sky": "storm", "light": "storm",
   "skyTo": "golden", "lightTo": "golden", "mixAt": [2.6, 4.6],
   "fx": {"pillar": PILLAR, "rain": [1, 0.0]},
   "camera": {"type": "dolly", "from": [0.6, 0.35, 6.4], "to": [0.35, 0.45, 5.6], "look": [0, 1.4, -2.5], "lookTo": [0, 3.3, -2.5]},
   "cast": [{"who": "chotu", "pose": "point", "pos": [0.75, -1.7], "facing": -1, "appearAt": 3.2, "enter": {"from": [1.9, -1.2], "at": 3.4, "dur": 1.0}}],
   "layout": "manual",
   "titleCard": {"label": "Iron pillar · Delhi", "word": "1,600 years", "at": 0.8, "duration": 5.2},
   "sfx": [{"name": "rain", "at": 0, "dur": 5.0, "volume": 0.45}]},
  {"id": "scale-chotu", "beat": 1, "set": "courtyard", "fx": {"pillar": PILLAR},
   "camera": {"type": "dolly", "from": [-1.4, 0.7, 9.8], "to": [1.4, 0.7, 9.8], "look": [0, 3.6, -2.5]},
   "cast": [{"who": "chotu", "pose": "point", "pos": [0.9, -1.9], "facing": -1}], "layout": "manual",
   "titleCard": {"label": "7 metres tall", "word": "6+ tonnes", "at": 0.15, "duration": 2.9}},
  {"id": "rusty-bicycle", "beat": 1, "set": "courtyard", "fx": {"bicycle": {"pos": [-3.6, 0, -1.2], "rotY": 0.25}},
   "camera": {"type": "dolly", "from": [-4.7, 0.65, 1.2], "to": [-3.1, 0.6, 1.0], "look": [-3.6, 0.55, -1.2]}},
  {"id": "vik-arrives", "beat": 2, "set": "courtyard", "fx": {"pillar": PILLAR},
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.62, "band": [0.2, 0.97], "angleDeg": -8},
   "cast": [
     {"who": "chotu", "pose": "idle", "pos": [-0.6, 0.6], "facing": 1},
     {"who": "vik", "pose": "cross-laugh", "pos": [0.6, 0.6], "facing": -1, "enter": {"from": [2.8, 0.9], "at": 0, "dur": 1.0},
      "poses": [{"at": 0, "pose": "cross-laugh"}, {"at": 3.25, "pose": "cross-talk"}]}]},
  {"id": "coin-scratch", "beat": 2, "stillAt": 2.4, "set": "void", "fx": {"macro": "scratch"},
   "camera": {"type": "static", "pos": [0, 0, 2.3], "look": [0, 0, 0], "drift": 0.12},
   "titleCard": {"label": "Guess 1", "word": "Paint", "at": 0.15, "duration": 3.3, "crossed": True, "crossAt": 1.45}},
  {"id": "night-watch", "beat": 3, "set": "courtyard", "sky": "night", "light": "night", "fx": {"pillar": PILLAR, "night": True},
   "props": [{"type": "block", "pos": [-2.1, 0, 0.05], "scale": 1.5, "color": "#C99068"}],
   "camera": {"type": "static", "pos": [0.2, 0.9, 7.6], "look": [-0.4, 2.1, -2], "drift": 0.12},
   "cast": [{"who": "vik", "pose": "sleep", "pos": [-2.0, 0.75], "facing": 1},
            {"who": "chotu", "pose": "idle", "pos": [-0.8, 1.0], "facing": -1}], "layout": "manual",
   "titleCard": {"label": "Guess 2", "word": "Polishing", "at": 0.3, "duration": 5.0, "crossed": True, "crossAt": 4.2}},
  {"id": "forge-wide", "beat": 3, "stillAt": 3.6, "set": "forge", "grade": "flashback", "fx": {"merge": [0, 0.35]},
   "camera": {"type": "fit", "angleDeg": 18, "orbitDeg": 22},
   "cast": [{"who": "dada", "pose": "hammer", "pos": [0, 0], "facing": 1, "holding": "hammer", "outfit": SMITH}],
   "titleCard": {"label": "Guess 3", "word": "Fake", "at": 0.2, "duration": 4.0, "crossed": True, "crossAt": 3.0},
   "sfx": clangs(d(6))},
  {"id": "forge-close", "beat": 3, "set": "forge", "grade": "flashback", "fx": {"merge": [0.35, 1], "forgeClose": True},
   "camera": {"type": "orbit", "center": [0.72, 0, 0.12], "radius": 1.25, "height": 0.95, "fromDeg": 20, "toDeg": 55, "lookY": 0.6},
   "cast": [{"who": "dada", "pose": "hammer", "pos": [0, 0], "facing": 1, "holding": "hammer", "outfit": SMITH}],
   "sfx": clangs(d(7))},
  {"id": "dada-taps", "beat": 4, "stillAt": 1.3, "set": "courtyard", "fx": {"pillar": PILLAR, "ripple": {"pos": [-0.19, 0.98, -2.42], "times": [0.45, 0.85]}},
   "camera": {"type": "fit", "push": 0.12, "angleDeg": 6},
   "cast": [{"who": "dada", "pose": "tap", "pos": [-1.06, -2.42], "facing": 1},
            {"who": "chotu", "pose": "idle", "pos": [1.0, -1.7], "facing": -1},
            {"who": "vik", "pose": "cross-arms", "pos": [2.1, -1.7], "facing": -1}], "layout": "manual",
   "sfx": [{"name": "ring", "at": 0.45, "volume": 0.45}]},
  {"id": "phosphorus", "beat": 5, "set": "void", "fx": {"macro": "phosphorus"},
   "camera": {"type": "dolly", "from": [0, 0, 6.5], "to": [0.3, 0.1, 1.4], "look": [0, 0, -3], "lookTo": [0.2, 0, -3]},
   "titleCard": {"label": "Phosphorus", "word": "×20", "at": 2.2, "duration": 3.7}},
  {"id": "wet-dry", "beat": 5, "set": "void", "fx": {"macro": "skin", "skinStory": 0},
   "camera": {"type": "static", "pos": [0, 0.9, 3.6], "look": [0, 0.1, 0], "drift": 0.3}},
  {"id": "skin-grows", "beat": 5, "stillAt": 2.6, "set": "void", "fx": {"macro": "skin", "skinStory": d(10), "skinRust": True},
   "camera": {"type": "static", "pos": [-0.5, 0.8, 3.3], "look": [0, 0.1, 0], "drift": 0.3},
   "titleCard": {"label": "Protective", "word": "Skin", "at": 0.3, "duration": 4.3}},
  {"id": "raincoat", "beat": 5, "set": "void", "fx": {"macro": "skin", "skinMode": "seal"},
   "camera": {"type": "static", "pos": [0.8, 0.75, 3.0], "look": [0, 0.15, 0], "drift": 0.25}},
  {"id": "split", "beat": 5, "set": "void", "fx": {"macro": "split"},
   "camera": {"type": "static", "pos": [0, 1.25, 5.6], "look": [0, 1.2, 0], "drift": 0.06},
   "labels": [{"text": "TOO CLEAN", "x": 0.27, "y": 0.13}, {"text": "SELF-SEALED", "x": 0.73, "y": 0.13}]},
  {"id": "gate-pushin", "beat": 6, "stillAt": 4.0, "set": "street",
   "camera": {"type": "dolly", "from": [-0.4, 1.0, 4.3], "to": [0.15, 1.1, 1.7], "look": [-0.35, 1.15, 0], "lookTo": [0.2, 1.06, 0.024]},
   "cast": [{"who": "vik", "pose": "cross-arms", "pos": [-0.75, 0.7], "facing": 1, "enter": {"from": [-3.4, 1.3], "at": 0, "dur": 1.3},
             "poses": [{"at": 1.4, "pose": "proud"}]}], "layout": "manual"},
  {"id": "face-drop", "beat": 6, "set": "street",
   "camera": {"type": "fit", "focus": ["vik"], "crop": 0.55, "band": [0.2, 0.97], "angleDeg": 10, "push": 0.04},
   "cast": [{"who": "vik", "pose": "shock", "pos": [-0.75, 0.7], "facing": 1}], "layout": "manual",
   "payoff": True, "payoffAt": 0.15},
]
for i, s in enumerate(shots):
    s["duration"] = d(i)
    keys = ["id", "beat", "stillAt", "duration"]
    shots[i] = {**{k: s[k] for k in keys if k in s}, **{k: v for k, v in s.items() if k not in keys}}

out = {"slug": "01-iron-pillar", "title": "Why This 1,600-Year-Old Pillar Won't Rust",
       "audio": "vo/01-iron-pillar.mp3", "music": True, "payoffHold": 0.5, "shots": shots}
(ROOT / "src/shots/01-iron-pillar.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(len(shots), "shots,", cuts[-1], "s + 0.5 s hold")
