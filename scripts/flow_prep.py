#!/usr/bin/env python3
"""Prepare Google Flow clips for a Short built from them (src/shots/<slug>.json, shots with "flow").

1. Upscale every clip used to 1080x1920 with lanczos, 30 fps (frame repeats, never a speed
   change), no audio -> public/<dir>/hd/<NN>.mp4 (git-ignored; rebuilt on demand).
2. Build the ambience bed from the clips' own audio, cut exactly like the picture (holds are
   silent), with any speech removed (faster-whisper with VAD; each detected speech segment is
   muted with 80 ms fades) -> audio/<slug>.ambience.wav. mix.py levels it (list key "ambience").

usage: python3 scripts/flow_prep.py <slug> [--force]
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
slug = sys.argv[1]
force = "--force" in sys.argv
L = json.loads((ROOT / f"src/shots/{slug}.json").read_text())
FPS, SR = 30, 48000

def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True, check=True).stdout)

clips = sorted({s["flow"]["clip"] for s in L["shots"] if s.get("flow")})
for c in clips:
    src = ROOT / "public" / c
    hd = src.parent / "hd" / src.name
    hd.parent.mkdir(parents=True, exist_ok=True)
    if force or not hd.exists() or hd.stat().st_mtime < src.stat().st_mtime:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "scale=1080:1920:flags=lanczos,fps=30",
                        "-an", "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", str(hd)], check=True)
        print("upscaled", c, "->", hd.relative_to(ROOT))

# ---- ambience: the clips' own sound, speech removed ----
def audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy() if raw else np.zeros((0, 2), np.float32)

_model = None
def speech_spans(x):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel("small.en", device="cpu", compute_type="int8")
    mono = x.mean(axis=1)
    pcm16 = np.interp(np.arange(0, len(mono), SR / 16000), np.arange(len(mono)), mono).astype(np.float32)
    segs, _ = _model.transcribe(pcm16, vad_filter=True, language="en")
    return [(s.start, s.end, s.text.strip()) for s in segs if s.no_speech_prob < 0.6 and s.text.strip()]

report = {}
clean = {}
for c in clips:
    x = audio(ROOT / "public" / c)
    spans = speech_spans(x) if len(x) else []
    f = int(0.08 * SR)
    for a, b, txt in spans:
        i0, i1 = max(0, int((a - 0.12) * SR)), min(len(x), int((b + 0.12) * SR))
        x[i0:i1] = 0
        if i0 > f: x[i0 - f:i0] *= np.linspace(1, 0, f)[:, None]
        if i1 + f < len(x): x[i1:i1 + f] *= np.linspace(0, 1, f)[:, None]
    clean[c] = x
    report[c] = {"seconds": round(len(x) / SR, 2), "speech_removed": [[round(a, 2), round(b, 2), t] for a, b, t in spans]}

parts = []
for s in L["shots"]:
    n = int(round(round(s["duration"] * FPS) / FPS * SR))
    seg = np.zeros((n, 2), np.float32)
    if s.get("flow"):
        x = clean[s["flow"]["clip"]]
        i0 = int(s["flow"].get("from", 0) * SR)
        end = int(s["flow"]["to"] * SR) if s["flow"].get("to") else len(x)
        fz = s["flow"].get("freeze")
        if fz:  # mid-shot freeze: silence while the picture holds (tiny fades either side)
            iz, nd, k = int(fz["at"] * SR), int(round(fz["dur"] * FPS) / FPS * SR), int(0.03 * SR)
            a, b = x[i0:iz].copy(), x[iz:end].copy()
            a[-k:] *= np.linspace(1, 0, k)[:, None]; b[:k] *= np.linspace(0, 1, k)[:, None]
            take = np.concatenate([a, np.zeros((nd, 2), np.float32), b])[:n]
        else:
            take = x[i0:min(i0 + n, end)]
        seg[:len(take)] = take
        k = int(0.03 * SR)  # tiny fades at every cut (no clicks)
        seg[:k] *= np.linspace(0, 1, k)[:, None]
        seg[max(0, len(take) - k):len(take)] *= np.linspace(1, 0, min(k, len(take)))[:, None]
    parts.append(seg)
parts.append(np.zeros((int(L.get("payoffHold", 0.5) * SR), 2), np.float32))
amb = np.concatenate(parts)
out = ROOT / "audio" / f"{slug}.ambience.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", str(out)],
               input=amb.astype(np.float32).tobytes(), check=True)
(ROOT / "audio" / f"{slug}.ambience.json").write_text(json.dumps(report, indent=1))
print("ambience ->", out.relative_to(ROOT), json.dumps(report))
