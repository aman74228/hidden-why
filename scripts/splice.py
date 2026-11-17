#!/usr/bin/env python3
"""Partial re-render: re-render only some shots and splice them into the
existing out/<slug>.mp4 without re-encoding anything else, then re-mux the
current strict mix (scripts/mix.py).

usage: python3 scripts/splice.py <slug> <shot-id> [<shot-id> ...] [--audio-only]

How: each replaced range is widened to the surrounding keyframes of the
existing video (x264 puts keyframes on cuts, so ranges usually equal the
shots). Those frame ranges are rendered with Remotion using the same codec
settings as scripts/render.sh; untouched GOPs are stream-copied; everything
is joined with the concat demuxer (-c copy).
"""
import bisect, json, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
args = [a for a in sys.argv[1:] if not a.startswith("--")]
slug, ids = args[0], args[1:]
audio_only = "--audio-only" in sys.argv
video = ROOT / "out" / f"{slug}.mp4"
run = lambda *c, **k: subprocess.run(list(c), cwd=ROOT, check=True, **k)

L = json.loads((ROOT / f"src/shots/{slug}.json").read_text())
lens = [max(1, int(s["duration"] * FPS + 0.5)) for s in L["shots"]]
starts = [sum(lens[:i]) for i in range(len(lens))]
total = sum(lens) + int(L.get("payoffHold", 0.5) * FPS + 0.5)
probe = run("ffprobe", "-v", "error", "-select_streams", "v", "-skip_frame", "nokey", "-show_entries", "frame=pts_time",
            "-of", "csv=p=0", str(video), capture_output=True, text=True).stdout.split()
keys = sorted({int(round(float(t.strip(",")) * FPS)) for t in probe if t.strip(",")} | {total})

ranges = []
for sid in ids:
    i = next(k for k, s in enumerate(L["shots"]) if s["id"] == sid)
    a, b = starts[i], starts[i] + lens[i] + (total - sum(lens) if i == len(lens) - 1 else 0)
    a = keys[bisect.bisect_right(keys, a) - 1]
    b = keys[bisect.bisect_left(keys, b)]
    ranges.append([a, b])
ranges.sort()
merged = []
for a, b in ranges:
    if merged and a <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], b)
    else:
        merged.append([a, b])
print("re-render frame ranges:", merged)

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    vid = video
    if not audio_only and merged:
        run("node", "scripts/prep.mjs", slug, capture_output=True)
        b = td / "bundle"
        run("npx", "remotion", "bundle", "src/index.ts", "--out-dir", str(b), capture_output=True)
        parts, cur = [], 0
        for k, (a, e) in enumerate(merged):
            if a > cur:
                parts.append(("copy", cur, a))
            seg = td / f"new{k}.mp4"
            run("npx", "remotion", "render", str(b), slug, str(seg), "--codec=h264", "--crf=18", "--muted", "--concurrency=1",
                f"--frames={a}-{e - 1}", capture_output=True)
            parts.append(("new", seg, a, e))
            cur = e
        if cur < total:
            parts.append(("copy", cur, total))
        # split the original exactly at the range boundaries (all keyframes) with the
        # segment muxer: -ss/-t stream copies drag extra frames past a cut
        cuts = sorted({x for p in parts if p[0] == "new" for x in (p[2], p[3])} - {0, total})
        segdir = td / "old"
        segdir.mkdir()
        run("ffmpeg", "-v", "error", "-i", str(video), "-map", "0:v", "-c", "copy", "-f", "segment",
            "-segment_frames", ",".join(map(str, cuts)), "-reset_timestamps", "1", str(segdir / "%03d.mp4"))
        olds = sorted(segdir.glob("*.mp4"))
        bounds = [0] + cuts
        lst = []
        for p in parts:
            if p[0] == "copy":
                out = olds[bounds.index(p[1])]
            else:
                out = p[1]
            lst.append(f"file '{out}'")
        (td / "list.txt").write_text("\n".join(lst))
        vid = td / "video.mp4"
        run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(td / "list.txt"), "-c", "copy", str(vid))
    mix = td / "mix.wav"
    run("python3", "scripts/mix.py", slug, str(mix), capture_output=True)
    shutil.copy(td / "mix.levels.json", ROOT / "out" / f"{slug}.mix.levels.json")
    final = td / "final.mp4"
    run("ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(mix), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
        "-af", "alimiter=limit=0.79:level=false:attack=1:release=60", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(final))
    shutil.copy(final, video)

n = int(run("ffprobe", "-v", "error", "-count_packets", "-select_streams", "v", "-show_entries", "stream=nb_read_packets",
            "-of", "csv=p=0", str(video), capture_output=True, text=True).stdout.strip().strip(","))
print(f"{video.relative_to(ROOT)}: {n} video frames (expected {total})")
