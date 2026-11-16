#!/usr/bin/env python3
"""Builds a Short's soundtrack with ffmpeg directly from its shot list —
identical placement to src/scene/Short.tsx (VO, music bed at -22 dB looped,
whoosh 6 frames before each cut, per-shot sfx, ding at payoff) — without
re-rendering frames. usage: mix_audio.py <slug> <out.wav>"""
import json, math, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
jsround = lambda x: math.floor(x + 0.5)  # match JS Math.round (Python rounds halves to even)
slug, out = sys.argv[1], sys.argv[2]
L = json.loads((ROOT / f"src/shots/{slug}.json").read_text())
frames = [max(1, jsround(s["duration"] * FPS)) for s in L["shots"]]
starts = [sum(frames[:i]) for i in range(len(frames))]
total = (sum(frames) + jsround(L.get("payoffHold", 0.5) * FPS)) / FPS

ev = []  # (file, start_s, volume, loop_dur_or_None)
if L.get("audio"):
    ev.append((ROOT / "public" / L["audio"], 0.0, 1.0, None))
if L.get("music", True):
    ev.append((ROOT / "public/sfx/music-bed.wav", 0.0, 10 ** (-22 / 20), total))
if L.get("sfx", True):
    for s in starts[1:]:
        ev.append((ROOT / "public/sfx/whoosh.wav", max(0, s - 6) / FPS, 0.4, None))
    for i, sh in enumerate(L["shots"]):
        for e in sh.get("sfx", []):
            ev.append((ROOT / f"public/sfx/{e['name']}.wav", (starts[i] + jsround(e["at"] * FPS)) / FPS, e.get("volume", 0.6), e.get("dur")))
        if sh.get("payoff"):
            ev.append((ROOT / "public/sfx/ding.wav", (starts[i] + jsround(sh.get("payoffAt", 0) * FPS)) / FPS, 0.8, None))

args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
parts = []
for k, (f, at, vol, loop) in enumerate(ev):
    if loop:
        args += ["-stream_loop", "-1"]
    args += ["-i", str(f)]
    trim = f"atrim=0:{loop}," if loop else ""
    ms = int(round(at * 1000))
    parts.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,{trim}volume={vol:.4f},adelay={ms}|{ms}[a{k}]")
mix = "".join(f"[a{k}]" for k in range(len(ev)))
fc = ";".join(parts) + f";{mix}amix=inputs={len(ev)}:normalize=0:dropout_transition=0,atrim=0:{total:.3f}[out]"
args += ["-filter_complex", fc, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s16le", out]
subprocess.run(args, check=True)
print(f"{len(ev)} sounds mixed, {total:.3f}s -> {out}")
