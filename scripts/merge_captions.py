#!/usr/bin/env python3
"""Merge two caption timings: whisper word times (src/captions/<slug>.json from
align.py) + the pause anchors from trim_silence.py (words that start right after
a real pause in the finished audio). The pause anchors win (whisper often starts a
sentence early, inside the pause); whisper times are kept inside sentences.

usage: merge_captions.py <slug> <anchors.json>"""
import json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
slug, anchors = sys.argv[1], json.loads(Path(sys.argv[2]).read_text())
dst = ROOT / "src/captions" / f"{slug}.json"
wh = json.loads(dst.read_text())
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(ROOT / "audio" / f"{slug}.mp3"), "-af", "silencedetect=noise=-38dB:d=0.15", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
assert len(wh) == len(anchors)
n = 0
for i, (w, a) in enumerate(zip(wh, anchors)):
    if any(abs(a["start"] - e) < 0.002 for e in ends):  # this word starts right after a pause
        w["start"] = a["start"]; n += 1
        s0 = max([s for s in starts if s < a["start"]], default=None)
        if i and s0 is not None:
            wh[i - 1]["end"] = round(min(wh[i - 1]["end"], s0), 3)
for i in range(1, len(wh)):  # monotonic: a word never starts before the previous one + 50 ms
    if wh[i]["start"] < wh[i - 1]["start"] + 0.05:
        wh[i]["start"] = round(wh[i - 1]["start"] + 0.05, 3)
for i, w in enumerate(wh):
    nxt = wh[i + 1]["start"] if i + 1 < len(wh) else w["end"]
    w["end"] = round(min(max(w["end"], w["start"] + 0.05), max(nxt, w["start"] + 0.05)), 3)
dst.write_text(json.dumps(wh, indent=1))
print(f"{n} pause anchors applied -> {dst.relative_to(ROOT)}")
