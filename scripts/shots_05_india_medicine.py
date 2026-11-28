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
  ("sweat", "05", T(7) - PRE, T(8) - PRE),
  ("same-pill", "06", T(8) - PRE, T(9) - PRE),
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
  "london": 3.0,                                 # after Gus's hand leaves Nik's cheek (1.6-2.9 s); rest is a hold
  "usa": 0.0,                                    # ends at 4.0 s (Vik's jacket goes see-through in the smoke after 4.1 s)
  "clinic": 0.0,                                 # from 0 so the tail (Vik worried) is left for line 7
  "sweat": None,                                 # = the rest of 05 after clinic (continuous), then a hold on Vik
  "same-pill": 1.0,
  "factory": 0.3,
  "office-2001": round(D["09"] - dur("office-2001"), 3),   # ends on the push-in onto the blank tag
  "payoff": 0.6,                                 # hands over the tin, rubs his temple, turns the box over
  "loop": round(D["01"] - dur("loop"), 3),       # the last 3.7 s of 01, then a hard cut to frame 1
}
FROM["sweat"] = round(FROM["clinic"] + dur("clinic"), 3)
EXACTLY = rel("same-pill", word_t("exactly", T(8)))
MADE = rel("payoff", word_t("made", T(11)))
UNICEF = rel("clinic", word_t("unicef's", T(6)))
# London: play 03 from 3.0 s (after Gus's hand leaves Nik's cheek) to a full-shelf frame (4.5 s, boxes glowing),
# freeze it with a slow push-in under line 4, then resume so the first box pops (clip 4.75 s) on "blink".
# The shot cuts at clip time LON_END: no end-of-shot hold.
LON_FREEZE, LON_POP = 4.5, 4.75
BLINK = rel("london", word_t("blink", T(4)))
LON_END = round(LON_POP + dur("london") - BLINK, 3)
LON_FD = round(dur("london") - (LON_END - 3.0), 3)
assert LON_END <= D["03"], LON_END
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
  {"id": "london", "beat": 3, "stillAt": round(LINE4 + 1.5, 2), "captionY": 0.74, "flowTo": LON_END,
   # freeze: 2.5 s wide + push-in, then a hard cut to a tight crop on the glowing upper boxes (visible
   # x 0.14-0.50, y 0.0-0.357 of the frame: above Nik's hair, left of Gus's head, so no head in frame; 1.8x
   # cannot avoid them) with its own push-in, until "and they"; back to the wide clip as it resumes
   "flowFreeze": {"at": LON_FREEZE, "dur": LON_FD, "zoom": 0.04,
                  "cut": {"after": 2.5, "zoom": [2.8, 2.95], "origin": [round(0.14 / (1 - 1 / 2.8), 4), 0.0]}},
   "titleCard": {"label": "London", "word": "1 in 4 medicines", "at": round(LINE4, 2), "duration": round(dur("london") - LINE4 - 0.15, 2)},
   "sfx": [{"name": "airport-chime", "at": 0.15, "gain": -8}] + [{"name": "pop-soft", "at": round(t - 3.0 + LON_FD, 2), "gain": -6} for t in (4.77, 4.92, 5.08, 5.25)]},
  # 5 USA counter: amber bottles, 4 in 10 vanish
  {"id": "usa", "captionY": 0.62, "flowTo": 4.0, "flowZoom": 1.12,
   # the stat card sits on the counter, not at the top: 04 cuts to a close-up where Nik's face fills the top third
   "overlays": [{"kind": "card", "label": "USA", "word": "4 IN 10 GENERICS", "at": 0.2, "pos": [0.5, 0.86], "scale": 1.4}],
   "sfx": [{"name": "marble-click", "at": 0.4, "gain": -8}] + [{"name": "pop-soft", "at": t, "gain": -6} for t in (2.7, 3.0, 3.4, 3.8)]},
  # 6 village clinic: the vaccine cold box goes empty (serious beat: music dips 3 dB)
  {"id": "clinic", "beat": 4, "stillAt": 4.6, "captionY": 0.74,
   "titleCard": {"label": "UNICEF vaccines", "word": "~6 in 10", "at": UNICEF, "duration": round(5.0 - UNICEF, 2)},  # gone before the Gus close-up (clip 6.0 s) and Vik leaning in: it would cover their faces,
   "sfx": [{"name": "box-open", "at": 2.1, "gain": -6}, {"name": "shimmer", "at": 3.8, "gain": -14}] + [{"name": "pop-soft", "at": t, "gain": -11} for t in (4.2, 4.5, 4.8)]},
  # 7 "Now Vik is sweating...": the end of 05 (Vik at right, worried), last frame held with a slow push-in toward him
  {"id": "sweat", "captionY": 0.78, "flowHoldAt": [0.76, 0.22]},
  # 7-8 the same pill: gold box vs plain box; price tags pop on "exactly the same job"
  {"id": "same-pill", "beat": 5, "stillAt": round(EXACTLY + 0.8, 2), "captionY": 0.82,
   # tags ~2x, each just above its own box (gold x 0.06-0.46, plain x 0.55-0.92, tops ~0.47 in clip 06 at 2.4-3.9 s)
   "overlays": [{"kind": "tag", "text": "₹₹₹₹", "at": EXACTLY, "pos": [0.285, 0.405], "rot": -4, "scale": 2.6},
                {"kind": "tag", "text": "₹", "at": round(EXACTLY + 0.25, 2), "pos": [0.745, 0.405], "rot": 4, "scale": 2.6}],
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
    if "flowFreeze" in s:  # mid-shot freeze (no end hold)
        s["flow"]["freeze"] = s.pop("flowFreeze"); s["flow"]["to"] = s.pop("flowTo"); s["flow"]["zoomAt"] = [0.5, 0.4]
    if "flowTo" in s:  # cut away early: hold the last clean frame
        s["flow"]["to"] = s.pop("flowTo"); s["flow"]["holdZoom"] = 0.06; s["flow"]["zoomAt"] = [0.5, 0.15]
    if "flowZoom" in s:  # constant crop (garbled shelf text out of frame)
        z = s.pop("flowZoom"); s["flow"]["zoom"] = [z, z]
    if "flowHoldAt" in s:
        s["flow"]["holdZoom"] = 0.08; s["flow"]["zoomAt"] = s.pop("flowHoldAt")
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
    left = min(s["flow"].get("to", 99), s["flow"]["clipDur"]) - s["flow"]["from"] + s["flow"].get("freeze", {}).get("dur", 0)
    if s["duration"] > left + 0.02 and "holdZoom" not in s["flow"]:
        raise SystemExit(f"{s['id']}: needs {s['duration']:.2f} s but clip has {left:.2f} s from {s['flow']['from']}")
L = {"slug": SLUG, "title": "What If India Stopped Making Medicine?", "audio": f"vo/{SLUG}.mp3", "kind": "flow",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py
     "ambience": {"file": f"audio/{SLUG}.ambience.wav", "lufs": -30.0},
     "musicDip": [{"from": round(T(6) - 0.2, 2), "to": round(T(7) - 0.1, 2), "db": 3.0, "floorExempt": True}],  # line 6 (brief): music down 3 dB
     "payoffHold": 0.5, "shots": shots}
(ROOT / f"src/shots/{SLUG}.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
print(len(shots), "shots,", round(sum(s["duration"] for s in shots), 2), "s;", " ".join(f"{s['id']}:{s['duration']:.2f}(from {s['flow']['from']})" for s in shots))
