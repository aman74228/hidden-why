#!/usr/bin/env python3
"""Builds src/shots/05-india-medicine.json: Short #5 cut from the Google Flow clips in
public/flow/05/ (see README.md there) to the Chatterbox voiceover (the master clock).
Cuts land 0.06 s before each line's onset; clips are trimmed, never speed-ramped. Where a
clip is shorter than its lines (03), its last frame is held with a slow push-in."""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLUG = "05-india-medicine"
VO = json.loads((ROOT / f"audio/{SLUG}.vo.json").read_text())
CAP = json.loads((ROOT / f"src/captions/{SLUG}.json").read_text())
LS = [l["start_s"] for l in VO["lines"]]
T = lambda n: LS[n - 1]
def word_t(w, after=0.0):
    return next(x["start"] for x in CAP if x["word"].strip(".,?:…").lower() == w.lower() and x["start"] >= after - 1e-6)
PRE = 0.06
FPS = 30

def clip_dur(n):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ROOT / f"public/flow/05/{n}.mp4")],
                                capture_output=True, text=True, check=True).stdout)

seg = [
  ("hook", "01", 0, T(2) - PRE),
  ("bet", "02", T(2) - PRE, T(3) - PRE),
  ("london", "03", T(3) - PRE, T(5) - PRE),
  ("usa", "04", T(5) - PRE, T(6) - PRE),
  ("clinic", "05", T(6) - PRE, T(7) - PRE),
  ("same-pill", "06", T(7) - PRE, T(9) - PRE),
  ("factory", "07", T(9) - PRE, T(10) - PRE),
  ("office-2001", "09", T(10) - PRE, T(11) - PRE),
  ("payoff", "08", T(11) - PRE, T(12) - PRE),
  ("loop", "01", T(12) - PRE, VO["total_s"]),
]
R = {sid: (a, b) for sid, _, a, b in seg}
rel = lambda sid, t: round(t - R[sid][0], 2)
dur = lambda sid: R[sid][1] - R[sid][0]
D = {n: round(clip_dur(n), 3) for n in {c for _, c, _, _ in seg}}

# where each shot starts inside its clip (the best window for that line)
FROM = {
  "hook": 0.0,                                   # Nik runs in with the box and asks Gus
  "bet": 2.0,                                    # Vik sets the tin down, arms crossed, smug
  "london": 0.0,                                 # whole clip + 0.47 s hold
  "usa": 0.5,
  "clinic": 0.8,
  "same-pill": 1.0,
  "factory": 0.3,
  "office-2001": round(D["09"] - dur("office-2001"), 3),   # ends on the push-in onto the blank tag
  "payoff": 0.6,                                 # hands over the tin, rubs his temple, turns the box over
  "loop": round(D["01"] - dur("loop"), 3),       # the last 3.7 s of 01, then a hard cut to frame 1
}
EXACTLY = rel("same-pill", word_t("exactly", T(8)))
MADE = rel("payoff", word_t("made", T(11)))
UNICEF = rel("clinic", word_t("unicef's", T(6)))
LINE4 = rel("london", T(4))
CARD_LAND = rel("office-2001", word_t("under", T(10))) - 0.25
P = FROM["payoff"]

def steps(t0, t1, every, name="footsteps-dirt", gain=-10):
    out, t = [], t0
    while t < t1:
        out.append({"name": name, "at": round(t, 2), "gain": gain}); t += every
    return out

shots = [
  # 1 HOOK: Nik, medicine box in hand, asks Gus the what-if
  {"id": "hook", "beat": 1, "stillAt": 1.6, "captionY": 0.72},
  # 2 the bet: Vik's chocolate tin
  {"id": "bet", "beat": 2, "stillAt": 1.6, "captionY": 0.72,
   "titleCard": {"label": "The bet", "word": "Vik's chocolate", "at": 0.15, "duration": round(dur("bet") - 0.3, 2)},
   "sfx": [{"name": "plate-clink", "at": 0.6, "gain": -4}, {"name": "marbles-scatter", "at": 0.75, "gain": -8}]},
  # 3-4 London pharmacy: every 4th box glows and pops away
  {"id": "london", "beat": 3, "stillAt": round(LINE4 + 1.5, 2), "captionY": 0.74, "flowHold": True,
   "titleCard": {"label": "London", "word": "1 in 4 medicines", "at": round(LINE4, 2), "duration": round(dur("london") - LINE4 - 0.15, 2)},
   "sfx": [{"name": "airport-chime", "at": 0.15, "gain": -8}] + [{"name": "pop-soft", "at": t, "gain": -6} for t in (5.0, 5.25, 5.5, 5.8, 6.1)]},
  # 5 USA counter: amber bottles, 4 in 10 vanish
  {"id": "usa", "captionY": 0.62,
   "titleCard": {"label": "USA", "word": "4 in 10 generics", "at": 0.2, "duration": round(dur("usa") - 0.35, 2)},
   "sfx": [{"name": "marble-click", "at": 0.4, "gain": -8}] + [{"name": "pop-soft", "at": t, "gain": -6} for t in (2.2, 2.5, 2.9, 3.3)]},
  # 6 village clinic: the vaccine cold box goes empty (serious beat: music dips 3 dB)
  {"id": "clinic", "beat": 4, "stillAt": 4.6, "captionY": 0.74,
   "titleCard": {"label": "UNICEF vaccines", "word": "~6 in 10", "at": UNICEF, "duration": round(dur("clinic") - UNICEF - 0.15, 2)},
   "sfx": [{"name": "box-open", "at": 1.3, "gain": -6}, {"name": "shimmer", "at": 3.0, "gain": -10}] + [{"name": "pop-soft", "at": t, "gain": -8} for t in (3.4, 3.7, 4.0)]},
  # 7-8 the same pill: gold box vs plain box; price tags pop on "exactly the same job"
  {"id": "same-pill", "beat": 5, "stillAt": round(EXACTLY + 0.8, 2), "captionY": 0.82,
   "overlays": [{"kind": "tag", "text": "₹₹₹₹", "at": EXACTLY, "pos": [0.25, 0.36], "rot": -5, "scale": 1.5},
                {"kind": "tag", "text": "₹", "at": round(EXACTLY + 0.25, 2), "pos": [0.77, 0.36], "rot": 4, "scale": 1.5}],
   "sfx": [{"name": "pop-soft", "at": EXACTLY, "gain": -4}, {"name": "pop-soft", "at": round(EXACTLY + 0.25, 2), "gain": -6}]},
  # 9 one factory: presses stamping tablets, boxes on the conveyor
  {"id": "factory", "captionY": 0.72,
   "sfx": [{"name": "press-thump", "at": round(0.2 + 0.45 * k, 2), "gain": -9} for k in range(int((dur("factory") - 1.0) / 0.45))]},  # stops before the pause
  # 10 2001: the price card lands on the blank tag at the end of the push-in
  {"id": "office-2001", "captionY": 0.55,
   "overlays": [{"kind": "card", "label": "2001", "word": "$10,000/yr → under $1/day", "at": round(CARD_LAND, 2), "pos": [0.585, 0.735], "rot": 18, "scale": 0.95}],
   "sfx": [{"name": "paper-rustle", "at": round(CARD_LAND - 0.05, 2), "gain": -4}]},
  # 11 payoff: Vik hands over the chocolate, rubs his temple, turns the painkiller box over: MADE IN INDIA; ding
  {"id": "payoff", "beat": 6, "stillAt": round(MADE + 0.5, 2), "captionY": 0.78, "payoff": True, "payoffAt": MADE,
   "overlays": [{"kind": "stamp", "text": "MADE IN INDIA", "at": MADE, "rot": -12, "scale": 0.95,
                 "pos": [[round(4.9 - P, 2), 0.6, 0.42], [round(5.3 - P, 2), 0.63, 0.45], [round(5.75 - P, 2), 0.72, 0.44]]}],
   "sfx": [{"name": "marbles-scatter", "at": 0.5, "gain": -8}, {"name": "press-thump", "at": round(MADE - 0.02, 2), "gain": -6}]},
  # 12 loop: Nik with the box again; hard cut back to frame 1
  {"id": "loop", "captionY": 0.84},
]
for s in shots:
    sid = s["id"]
    clip = next(c for i, c, _, _ in seg if i == sid)
    s["flow"] = {"clip": f"flow/05/{clip}.mp4", "from": FROM[sid], "clipDur": D[clip]}
    if s.pop("flowHold", False):
        s["flow"]["holdZoom"] = 0.06
        s["flow"]["zoomAt"] = [0.5, 0.45]
    s["set"] = "studio"
    s["cast"] = []
    s.setdefault("sfx", [])
assert [s["id"] for s in shots] == [x[0] for x in seg]
fr = [round(b * FPS) for _, _, _, b in seg]
for i, s in enumerate(shots):
    s["duration"] = round((fr[i] - (fr[i - 1] if i else 0)) / FPS, 4)
    left = s["flow"]["clipDur"] - s["flow"]["from"]
    if s["duration"] > left + 0.02 and "holdZoom" not in s["flow"]:
        raise SystemExit(f"{s['id']}: needs {s['duration']:.2f} s but clip has {left:.2f} s from {s['flow']['from']}")
L = {"slug": SLUG, "title": "What If India Stopped Making Medicine?", "audio": f"vo/{SLUG}.mp3", "kind": "flow",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py
     "ambience": {"file": f"audio/{SLUG}.ambience.wav", "lufs": -30.0},
     "musicDip": [{"from": round(T(6) - 0.2, 2), "to": round(T(7) - 0.1, 2), "db": 3.0, "floorExempt": True}],  # line 6 (brief): music down 3 dB
     "payoffHold": 0.5, "shots": shots}
(ROOT / f"src/shots/{SLUG}.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s;", " ".join(f"{s['id']}:{s['duration']:.2f}(from {s['flow']['from']})" for s in shots))
