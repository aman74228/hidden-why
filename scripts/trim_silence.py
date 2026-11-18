#!/usr/bin/env python3
"""Finalise a take by trimming silences only (no tempo change).

usage: trim_silence.py <slug> <take> [--sent 0.30] [--word 0.16] [--pause-after WORD:SECONDS ...]
Silences (ffmpeg silencedetect at --noise dB, >=0.10 s) are shortened to --sent after a
sentence end (. ! ? ...), to --word elsewhere. --pause-after inserts extra silence
after the first word matching WORD (e.g. "vanadium.:0.5"). 6 ms crossfades at cuts.
reads  audio/takes/<slug>-<take>.mp3 + .alignment.json
writes audio/<slug>.mp3, audio/<slug>.alignment.json, src/captions/<slug>.json
"""
import argparse, json, re, subprocess, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from voiceover import words_from_alignment

ap = argparse.ArgumentParser()
ap.add_argument("slug"); ap.add_argument("take")
ap.add_argument("--sent", type=float, default=0.30)
ap.add_argument("--word", type=float, default=0.16)
ap.add_argument("--noise", type=float, default=-42)
ap.add_argument("--pause-after", nargs="*", default=[])
a = ap.parse_args()
SR = 44100
src = ROOT / "audio" / "takes" / f"{a.slug}-{a.take}.mp3"
al = json.loads(src.with_suffix(".alignment.json").read_text())
words = words_from_alignment(al)
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                   capture_output=True, check=True).stdout, dtype=np.float32)
dur = len(pcm) / SR
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", f"silencedetect=noise={a.noise}dB:d=0.10", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
se = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
sil = list(zip(ss, se + [dur] * (len(ss) - len(se))))

def word_before(t):
    prev = [w for w in words if w["start"] < t]
    return prev[-1]["word"] if prev else ""

pauses = {}
for p in a.pause_after:
    k, v = p.rsplit(":", 1); pauses[k.lower()] = float(v)

edits = []  # (start, end, insert_seconds): remove [start,end) and insert silence
for s0, s1 in sil:
    s0 = max(0.0, s0)
    if s0 <= 0.01:   # leading silence -> 0.05
        edits.append((0.0, max(0.0, s1 - 0.05), 0.0)); continue
    if s1 >= dur - 0.01:  # trailing silence -> 0.15
        edits.append((s0 + 0.15, dur, 0.0)); continue
    wb = word_before(s0)
    cap = a.sent if re.search(r"[.!?…]+[\"']?$", wb) else a.word
    extra = pauses.pop(wb.lower(), 0.0)
    if s1 - s0 > cap:
        mid = (s0 + s1) / 2
        edits.append((mid - (s1 - s0 - cap) / 2, mid + (s1 - s0 - cap) / 2, extra))
    elif extra:
        edits.append(((s0 + s1) / 2, (s0 + s1) / 2, extra))
if pauses:
    sys.exit(f"pause words not found: {list(pauses)}")

fade = int(0.006 * SR)
out, cur = [], 0
for b, e, ins in edits:
    bi, ei = int(b * SR), int(e * SR)
    seg = pcm[cur:bi].copy()
    if len(seg) > 2 * fade and cur > 0:
        seg[:fade] *= np.linspace(0, 1, fade)
    if len(seg) > 2 * fade:
        seg[-fade:] *= np.linspace(1, 0, fade)
    out.append(seg); out.append(np.zeros(int(ins * SR), np.float32)); cur = ei
seg = pcm[cur:].copy()
if len(seg) > fade: seg[:fade] *= np.linspace(0, 1, fade)
out.append(seg)
res = np.concatenate(out)

def remap(t):
    shift = 0.0
    for b, e, ins in edits:
        if t >= e: shift += (e - b) - ins
        elif t > b: shift += (t - b)
    return max(0.0, t - shift)

dst = ROOT / "audio" / f"{a.slug}.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                "-c:a", "libmp3lame", "-b:a", "192k", str(dst)], input=res.tobytes(), check=True)
cap_words = [{"word": w["word"], "start": round(remap(w["start"]), 3), "end": round(remap(w["end"]), 3)} for w in words]
# snap word boundaries to the real pauses in the finished audio: the API's
# alignment drifts by up to ~0.6 s around gaps (captions must hit the word onset)
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(dst), "-af", "silencedetect=noise=-38dB:d=0.15", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
se = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
snapped = 0
for s0, s1 in zip(ss, se):
    if s0 <= 0.05:
        cap_words[0]["start"] = round(max(cap_words[0]["start"], s1), 3); continue
    mid = (s0 + s1) / 2
    best = min(range(len(cap_words) - 1), key=lambda i: abs((cap_words[i]["end"] + cap_words[i + 1]["start"]) / 2 - mid))
    gm = (cap_words[best]["end"] + cap_words[best + 1]["start"]) / 2
    if abs(gm - mid) < 0.7:
        cap_words[best]["end"] = round(s0, 3)
        cap_words[best + 1]["start"] = round(s1, 3)
        snapped += 1
# the words between snapped pauses follow their anchors (piecewise-linear time warp)
orig = [{"start": w["start"], "end": w["end"]} for w in [{"start": round(remap(w["start"]), 3), "end": round(remap(w["end"]), 3)} for w in words]]
anch = sorted({(orig[i][k], cap_words[i][k]) for i in range(len(cap_words)) for k in ("start", "end") if abs(orig[i][k] - cap_words[i][k]) > 1e-6} | {(0.0, 0.0), (len(res) / SR + 1, len(res) / SR + 1)})
ax, ay = [], []
for x_, y_ in anch:
    if not ax or (x_ > ax[-1] and y_ >= ay[-1]):
        ax.append(x_); ay.append(y_)
for i in range(len(cap_words)):
    for k in ("start", "end"):
        if abs(orig[i][k] - cap_words[i][k]) < 1e-6:
            cap_words[i][k] = round(float(np.interp(orig[i][k], ax, ay)), 3)
for i, a_ in enumerate(cap_words):  # keep order sane after snapping: starts are the anchors, ends give way
    nxt = cap_words[i + 1]["start"] if i + 1 < len(cap_words) else a_["end"] + 1
    if i + 1 < len(cap_words) and nxt < a_["start"]:
        cap_words[i + 1]["start"] = nxt = a_["start"] + 0.05
    if a_["end"] < a_["start"] + 0.04:
        a_["end"] = round(min(a_["start"] + 0.15, nxt), 3)
    a_["end"] = round(min(a_["end"], nxt), 3)
print(f"snapped {snapped} word boundaries to pauses")
(ROOT / "src" / "captions" / f"{a.slug}.json").write_text(json.dumps(cap_words, indent=1))
(ROOT / "audio" / f"{a.slug}.alignment.json").write_text(json.dumps(al))
print(f"{dur:.2f}s -> {len(res)/SR:.2f}s; removed {sum(e-b for b,e,_ in edits):.2f}s in {len(edits)} gaps; last word ends {cap_words[-1]['end']:.2f}s")
