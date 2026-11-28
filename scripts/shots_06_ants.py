#!/usr/bin/env python3
"""Builds src/shots/06-ants.json: Short #6 cut from the Google Flow clips in public/flow/06/
(README.md there) to the voiceover (the master clock, audio/06-ants.vo.json).

Lines 1-2 are [FLOW] lines: the clip's own speech is in the VO, so those shots start EXACTLY at
the line start, at the excerpt's clip time (lip sync). Other cuts land 0.06 s before a line or
word. Clips are trimmed, never speed-ramped; freezes are a held frame with a push-in.
Build checks (CLAUDE.md, brief): frame 0 in motion (Nik mid-question); hook text 0-2 s; Vik's
bet by 5 s; no shot over 3 s in the first 15 s (framings inside a shot count as shots); loop:
09's last frame -> frame 0 (frame 0 is a punch-in on Nik so the framing matches 09's close-up)."""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLUG = "06-ants"
VO = json.loads((ROOT / f"audio/{SLUG}.vo.json").read_text())
CAP = json.loads((ROOT / f"src/captions/{SLUG}.json").read_text())
LINES = json.loads((ROOT / f"audio/{SLUG}.lines.json").read_text())["lines"]
LS = [l["start_s"] for l in VO["lines"]]
T = lambda n: LS[n - 1]
PRE, FPS = 0.06, 30

def W(word, after):
    return next(x["start"] for x in CAP if x["word"].strip(".,?!:…").lower() == word.lower() and x["start"] >= after - 1e-6)

def clip_dur(n):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ROOT / f"public/flow/06/{n}.mp4")],
                                capture_output=True, text=True, check=True).stdout)
D = {f"{n:02d}": round(clip_dur(f"{n:02d}"), 3) for n in range(1, 10)}

def origin(c, z):
    """zoom origin that puts source point c at the frame centre, clamped so no edge shows"""
    return [round(min(1.0, max(0.0, (0.5 - c[k] * z) / (1 - z))), 4) for k in (0, 1)]

FREEZE = 0.05  # a "to" just past "from": the first frame is held for the whole shot
L1, L2 = LINES[0]["flow"], LINES[1]["flow"]
assert abs(T(2) - (T(1) + VO["lines"][0]["seconds"] + VO["lines"][0]["pause_after"])) < 0.02

# (id, start time in the Short, clip, flow spec, extras)
S = []
def shot(sid, t0, clip, frm, **kw):
    S.append(dict(id=sid, t0=t0, clip=clip, frm=frm, **kw))

# --- first 15 s: every framing <= 3 s ---------------------------------------------------------
# 1 hook: Nik mid-question (his own voice), punch-in to 09's close-up framing; hook text 0-2 s
# zoom 1.5 maps Nik's face (0.49, 0.34) onto where 09's last frame has it (0.54, 0.33): same size, same place
Z1 = 1.5
shot("hook", 0.0, "01", L1["from"], zoom=Z1, zoomAt=[round((0.54 - 0.49 * Z1) / (1 - Z1), 4), round((0.33 - 0.34 * Z1) / (1 - Z1), 4)], captionY=0.9,
     overlays=[{"kind": "card", "word": "NO MORE ANTS?", "at": 0.0, "until": 2.0, "noPop": True, "pos": [0.5, 0.765], "scale": 2.0}])
# 2 the bet: Vik slaps down the sandwich, "Good! Nobody would even notice!" (his own voice)
shot("bet", T(2), "02", L2["from"], captionY=0.86, sfx=[{"name": "plate-clink", "at": 0.05, "gain": -10}])
# 3 punch-in on the sandwich: "Vik bets his whole picnic on it."
shot("picnic", T(3) - PRE, "02", 4.3, zoom=1.8, zoomAt=origin((0.5, 0.7), 1.8), captionY=0.86,
     card={"label": "The bet", "word": "Vik's picnic"})
# 4 the ant trail on the log (clip 01's unused opening): "twenty quadrillion ants on Earth,"
shot("quadrillion", T(4) - PRE, "01", 0.0, zoom=1.35, zoomAt=[0.69, 1.0], captionY=0.62,
     card={"label": "Ants on Earth", "word": "20 quadrillion"})
# 5 clip 03 marching (wide), then a macro freeze on the ants: "and together they outweigh ..."
OUTW = W("together", T(4)) - PRE
shot("outweigh", OUTW, "03", 0.0, freeze={"at": 1.1, "cut": {"after": 0.0, "zoom": [2.0, 2.15], "origin": origin((0.42, 0.5), 2.0)}, "zoom": 0.0},
     captionY=0.82, card={"label": "Together they outweigh", "word": "all wild birds + mammals"},
     sfx=[{"name": "counter-tick", "at": t, "gain": -16} for t in (0.15, 0.5, 0.85)])
# 6 "That's about two and a half million for every person.": Nik with an ant on his magnifier
shot("person", T(5) - PRE, "09", 0.3, captionY=0.82)
# --- after 15 s ---------------------------------------------------------------------------------
# 7 the vanish: glow starts on "vanish", the leaves fall on "drops" (clip 5.4-5.8 s)
DROPS = W("drops", T(6))
VAN_FROM = round(5.6 - (DROPS - (T(6) - PRE)), 3)
shot("vanish", T(6) - PRE, "03", VAN_FROM, zoomRange=[1.0, 1.3], zoomAt=[0.45, 0.6], captionY=0.82,
     sfx=[{"name": "shimmer", "at": round(1.6 - VAN_FROM, 2), "gain": -12}] +
         [{"name": "pop-soft", "at": round(c - VAN_FROM, 2), "gain": -12} for c in (2.0, 3.2, 4.2, 5.0, 5.5)])
# 8 the mess builds (04): wide, then a slow punch-in on the pile and the held noses
MESS_B = W("without", T(7)) - PRE
shot("mess", T(7) - PRE, "04", 0.0, captionY=0.84)
shot("mess-noses", MESS_B, "04", None, zoom=1.15, zoomAt=[0.35, 0.75], captionY=0.84)
# 9 hard soil (05): the trowel hits cracked ground on "packs down hard"
shot("soil", T(8) - PRE, "05", 0.8, captionY=0.70, sfx=[{"name": "press-thump", "at": round(5.25 - 0.8, 2), "gain": -12}])
# 10 Gus's two-pot demo (06): pour, freeze on each pot with its label, then the spill-over plays
DEMO_B = T(10) + 0.86 - PRE  # just after "tunnels"
PACKED = W("packed", T(10)) - 0.12
SPILL = W("it", T(10)) - PRE
shot("demo", T(9) - PRE, "06", 0.0, to=3.0, captionY=0.84, sfx=[{"name": "drip", "at": 1.5, "gain": -12}, {"name": "bubbles", "at": 2.0, "gain": -14}])
shot("demo-tunnels", DEMO_B, "06", 3.0, to=3.0 + FREEZE, zoom=1.8, zoomAt=origin((0.24, 0.6), 1.8), holdZoom=0.05, captionY=0.88,
     overlays=[{"kind": "label", "text": "TUNNELS", "at": 0.1, "pos": [0.43, 0.77], "scale": 1.0}])
shot("demo-packed", PACKED, "06", 3.0, to=3.0 + FREEZE, zoom=1.8, zoomAt=origin((0.78, 0.6), 1.8), holdZoom=0.05, captionY=0.88,
     overlays=[{"kind": "label", "text": "PACKED", "at": 0.1, "pos": [0.57, 0.77], "scale": 1.0}])
shot("demo-spill", SPILL, "06", 3.0, captionY=0.68, sfx=[{"name": "water-splash", "at": 0.45, "gain": -12}])
# 11 seeds (07): reveal the seed piles, then two framings of a pile that just lies there
SEEDS_B = W("carry", T(11)) - 0.3
SEEDS_C = W("now", T(11)) - PRE
shot("seeds", T(11) - PRE, "07", 1.0, captionY=0.70, sfx=[{"name": "grit-trickle", "at": 0.6, "gain": -14}])
shot("seeds-pile", SEEDS_B, "07", 2.4, to=2.4 + FREEZE, zoom=1.8, zoomAt=origin((0.45, 0.74), 1.8), holdZoom=0.06, captionY=0.62)
shot("seeds-lie", SEEDS_C, "07", 2.4, to=2.4 + FREEZE, zoom=2.6, zoomAt=origin((0.45, 0.74), 2.6), holdZoom=0.06, captionY=0.62)
# 12 pull back to the thinning forest: the rest of 07, ending on its last frame
shot("forest", T(12) - PRE, "07", "END", captionY=0.70)
# 13 payoff (08): the buried picnic, then Nik's thumbs-up and Vik laughing; ding on Vik's face
PAY_B = W("leaves", T(13)) + 0.55
shot("payoff", T(13) - PRE, "08", 0.0, captionY=0.70)
shot("payoff-laugh", PAY_B, "08", 5.2, captionY=0.70, payoff=True, payoffWord="after")
# 14 loop: Nik with an ant on his magnifier looks up; its last frame cuts to frame 0
shot("loop", T(14) - PRE, "09", "END", captionY=0.82)

END = VO["total_s"]
fr = [round(s["t0"] * FPS) for s in S] + [round(END * FPS)]
shots = []
for i, s in enumerate(S):
    dur = (fr[i + 1] - fr[i]) / FPS
    clip = s["clip"]
    frm = s["frm"]
    if frm == "END":
        frm = round(D[clip] - dur, 3)
    elif frm is None:  # continues the previous shot's clip
        p = shots[-1]["flow"]
        frm = round(p["from"] + shots[-1]["duration"], 3)
    fl = {"clip": f"flow/06/{clip}.mp4", "from": frm, "clipDur": D[clip]}
    if "to" in s: fl["to"] = round(s["to"], 3)
    if "zoom" in s: fl["zoom"] = [s["zoom"], s["zoom"]]
    if "zoomRange" in s: fl["zoom"] = s["zoomRange"]
    if "zoomAt" in s: fl["zoomAt"] = s["zoomAt"]
    if "holdZoom" in s: fl["holdZoom"] = s["holdZoom"]
    if "freeze" in s:
        fz = s["freeze"]
        used = fz["at"] - frm
        fl["freeze"] = {"at": fz["at"], "dur": round(dur - used, 3), "zoom": fz.get("zoom", 0.0), "cut": fz["cut"]}
        fl["to"] = fz["at"] + 0.01
    left = min(fl.get("to", 99), D[clip]) - frm + fl.get("freeze", {}).get("dur", 0)
    if dur > left + 0.02 and "holdZoom" not in fl and "to" not in fl:
        raise SystemExit(f"{s['id']}: needs {dur:.2f} s but clip {clip} has {left:.2f} s from {frm}")
    o = {"id": s["id"], "duration": round(dur, 4), "set": "studio", "cast": [], "flow": fl, "captionY": s["captionY"], "sfx": s.get("sfx", [])}
    if "overlays" in s: o["overlays"] = s["overlays"]
    if "card" in s: o["titleCard"] = {**s["card"], "at": 0.1, "duration": round(dur - 0.2, 2)}
    if s.get("payoff"):
        o["payoff"] = True
        o["payoffAt"] = round(W(s["payoffWord"], s["t0"]) - s["t0"], 2)
    shots.append(o)

# build-check report (first 15 s: each framing <= 3 s)
t = 0.0
for o in shots:
    fz = o["flow"].get("freeze")
    parts = [o["duration"]] if not fz else [fz["at"] - o["flow"]["from"], fz["dur"]]
    if t < 15:
        for p in parts:
            assert p <= 3.0 + 1e-6, f"{o['id']}: framing {p:.2f} s > 3 s in the first 15 s"
    t += o["duration"]
L = {"slug": SLUG, "title": "What If All the Ants Disappeared?", "audio": f"vo/{SLUG}.mp3", "kind": "flow",
     "music": False, "sfx": False,  # soundtrack is mixed by scripts/mix.py
     "ambience": {"file": f"audio/{SLUG}.ambience.wav", "lufs": -30.0},
     "payoffHold": 0.5, "shots": shots}
(ROOT / f"src/shots/{SLUG}.json").write_text(json.dumps(L, indent=1, ensure_ascii=False))
t = 0.0
for o in shots:
    print(f"{t:6.2f} {o['id']:13s} {o['duration']:5.2f}s  {o['flow']['clip'][-6:]} from {o['flow']['from']}" + (f" freeze@{o['flow']['freeze']['at']} {o['flow']['freeze']['dur']}s" if o['flow'].get('freeze') else "") + (f" to {o['flow']['to']}" if 'to' in o['flow'] and not o['flow'].get('freeze') else ""))
    t += o["duration"]
print(f"{len(shots)} shots, {t:.2f} s; Vik's bet lands {T(2):.2f}-{T(2) + VO['lines'][1]['seconds']:.2f} s")
