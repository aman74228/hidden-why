#!/usr/bin/env python3
"""Finalise an ElevenLabs take: shrink long *silent* gaps between words, apply a
gentle tempo change, and write the voiceover + caption timings.
Gaps that contain sound (a laugh, a scoff, a breath) are kept as-is.

usage: tighten_vo.py <slug> <take> [--tempo 1.06] [--max-gap 0.42]
reads  audio/takes/<slug>-<take>.mp3 + .alignment.json
writes audio/<slug>.mp3, audio/<slug>.alignment.json, src/captions/<slug>.json
"""
import argparse, json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from voiceover import words_from_alignment

ap = argparse.ArgumentParser()
ap.add_argument("slug"); ap.add_argument("take")
ap.add_argument("--tempo", type=float, default=1.06)
ap.add_argument("--max-gap", type=float, default=0.42)
a = ap.parse_args()
src = ROOT / "audio" / "takes" / f"{a.slug}-{a.take}.mp3"
al = json.loads(src.with_suffix(".alignment.json").read_text())
words = words_from_alignment(al)

def mean_db(t0, t1):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", str(src),
                        "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: (\S+)", o)
    return float(m.group(1)) if m else -99

cuts = []  # (start, end) of audio removed
for w0, w1 in zip(words, words[1:]):
    g = w1["start"] - w0["end"]
    if g > a.max_gap + 0.05 and mean_db(w0["end"] + 0.03, w1["start"] - 0.03) < -45:
        mid = (w0["end"] + w1["start"]) / 2
        cuts.append((mid - (g - a.max_gap) / 2, mid + (g - a.max_gap) / 2))

def remap(t):
    s = sum(max(0, min(t, e) - b) for b, e in cuts)
    return (t - s) / a.tempo

keep, cur = [], 0.0
for b, e in cuts:
    keep.append((cur, b)); cur = e
keep.append((cur, None))
sel = "+".join(f"between(t,{b:.3f},{e:.3f})" if e else f"gte(t,{b:.3f})" for b, e in keep)
dst = ROOT / "audio" / f"{a.slug}.mp3"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
                "-af", f"aselect='{sel}',asetpts=N/SR/TB,atempo={a.tempo}", "-c:a", "libmp3lame", "-b:a", "192k", str(dst)], check=True)
out = [{"word": w["word"], "start": round(remap(w["start"]), 3), "end": round(remap(w["end"]), 3)} for w in words]
(ROOT / "src" / "captions" / f"{a.slug}.json").write_text(json.dumps(out, indent=1))
(ROOT / "audio" / f"{a.slug}.alignment.json").write_text(json.dumps(al))
print(f"removed {sum(e-b for b,e in cuts):.2f}s of silence in {len(cuts)} gaps, tempo {a.tempo}; last word ends {out[-1]['end']:.2f}s")
