#!/usr/bin/env python3
"""Chatterbox audition: render a text with the built-in default voice and report
length, render time and pitch (Praat). Runs the worker in the Chatterbox venv.
usage: audition_chatterbox.py <out_dir> <name>:<model>:<exaggeration>:<cfg>:<text_file> ..."""
import json, math, subprocess, sys
from pathlib import Path
import numpy as np, parselmouth
ROOT = Path(__file__).resolve().parent.parent
cfgv = json.loads((ROOT / "voice.json").read_text())["engines"]["chatterbox"]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
rep_path = out / "report.json"
rep = json.loads(rep_path.read_text()) if rep_path.exists() else []
for spec in sys.argv[2:]:
    name, model, ex, cfg, tf = spec.split(":")
    wav = out / f"{name}.wav"
    r = subprocess.run([cfgv["python"], str(ROOT / "scripts/tts_chatterbox.py"), model, str(wav), ex, cfg, str(cfgv.get("seed", 0))],
                       input=Path(tf).read_text(), capture_output=True, text=True)
    if r.returncode:
        print(name, "FAILED", r.stderr[-800:]); continue
    timing = json.loads(r.stdout.strip().splitlines()[-1])
    snd = parselmouth.Sound(str(wav))
    f0 = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=500).selected_array["frequency"]; f0 = f0[f0 > 0]
    p10, p50, p90 = np.percentile(f0, [10, 50, 90]); st = 12 * math.log2(p90 / p10); dur = snd.get_total_duration()
    row = {"name": name, "model": model, "exaggeration": None if model == "turbo" else float(ex), "cfg_weight": None if model == "turbo" else float(cfg),
           "seconds": round(dur, 2), "median_hz": round(p50, 1), "range_semitones": round(st, 1),
           "distance_to_ref": round(abs(12 * math.log2(p50 / 124)) + abs(st - 16.5), 1),
           "render_s": timing["render_s"], "model_load_s": timing["load_s"], "realtime_factor": round(timing["render_s"] / dur, 2)}
    rep = [x for x in rep if x["name"] != name] + [row]
    rep_path.write_text(json.dumps(rep, indent=1))
    print(json.dumps(row))
