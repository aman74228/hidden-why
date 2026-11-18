#!/usr/bin/env python3
"""Re-render ONE line of an existing Chatterbox voiceover and drop it into the
same slot, so nothing after it moves (the line's pause_after absorbs the
length difference; min 0.25 s).

usage: vo_redo_line.py <slug> <line-number>
Same settings as vo_lines.py (voice.json seed/cfg, the line's exaggeration from
audio/<slug>.lines.json, whisper check, max 3 tries seed, seed+1, seed+2),
then vo_pauses.py. Rebuilds audio/<slug>.mp3 from the per-line finals with the
start times in audio/<slug>.vo.json, and replaces only that line's words in
src/captions/<slug>.json."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import vo_pauses as vp
slug, n = sys.argv[1], int(sys.argv[2])
V = json.loads((ROOT / "voice.json").read_text())["engines"]["chatterbox"]
spec = json.loads((ROOT / "audio" / f"{slug}.lines.json").read_text())["lines"]
rep = json.loads((ROOT / "audio" / f"{slug}.vo.json").read_text())
ln, rl = spec[n - 1], rep["lines"][n - 1]
cfg = rep["cfg_weight"]
work = ROOT / "audio" / "takes" / f"{slug}-lines"
text = ln.get("spoken", ln["text"])

src = (ROOT / "scripts" / "vo_lines.py").read_text()
ns = {"re": __import__("re"), "difflib": __import__("difflib")}
exec(src[src.index("SAME ="):src.index("def render")], ns)
wer, words = ns["wer"], ns["words"]

best = None
for attempt in range(3):
    out = work / f"line{n:02d}-redo-cfg{cfg}-try{attempt+1}.wav"
    if not out.exists():
        job = [{"text": text, "out": str(out), "exaggeration": ln["exaggeration"], "cfg_weight": cfg, "seed": V["seed"] + attempt}]
        r = subprocess.run([V["python"], str(ROOT / V["worker"]), "batch", V["model"]], input=json.dumps(job), capture_output=True, text=True)
        if r.returncode: sys.exit(r.stderr[-3000:])
    heard = " ".join(w[0] for w in vp.words_of(vp.trim(vp.load(out))))
    e, diff = wer(text, heard)
    print(f"line {n} try {attempt+1}: WER {e:.2f} {diff} | {heard}", flush=True)
    if best is None or e < best["wer"]:
        best = {"file": out, "wer": round(e, 3), "diff": diff, "try": attempt + 1, "heard": heard}
    if e == 0: break

final = work / f"line{n:02d}-final.wav"
old = work / f"line{n:02d}-final.old.wav"
if not old.exists(): final.rename(old)
info = vp.process(best["file"], text, final)
slot = (rep["lines"][n]["start_s"] if n < len(rep["lines"]) else rep["total_s"]) - rl["start_s"]
pause = round(slot - info["seconds"], 3)
print(f"old {rl['seconds']}s + {rl['pause_after']}s pause; new {info['seconds']}s + {pause}s pause (slot {slot:.2f}s)")
if pause < 0.25: sys.exit("new line too long for its slot (pause < 0.25 s)")

SR = vp.SR
total = int(round(rep["total_s"] * SR))
y = np.zeros(total, np.float32)
for i, l in enumerate(rep["lines"]):
    x = vp.load(work / f"line{i+1:02d}-final.wav")
    a = int(round(l["start_s"] * SR)); y[a:a + len(x)] = x[:max(0, total - a)]
mp3 = ROOT / "audio" / f"{slug}.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)],
               input=y.tobytes(), check=True)

rl.update({"seconds": info["seconds"], "pause_after": pause, "try": best["try"], "wer": best["wer"], "diff": best["diff"], "heard": best["heard"],
           "punct_pauses": info["pauses"], "unmatched_punct": info["unmatched_punct"], "redo": f"re-rendered alone (vo_redo_line.py), seed {V['seed'] + best['try'] - 1}"})
rep["words"] = sum(len(l["text"].split()) for l in spec)
(ROOT / "audio" / f"{slug}.vo.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False))

# captions: swap only this line's words (same slot), timed from its own whisper words
caps = json.loads((ROOT / "src" / "captions" / f"{slug}.json").read_text())
before = sum(len(l["text"].split()) for l in spec[:n - 1])
disp = ln["text"].split()
old_count = len(caps) - (sum(len(l["text"].split()) for l in spec) - len(disp))
heard = info["words"]
t0 = rl["start_s"]
new = []
hw = [(words(w[0]) or [""])[0] for w in heard]
j = 0
for tok in disp:
    want = (words(tok) or [""])
    k = next((q for q in range(j, len(hw)) if hw[q] == want[0]), None)
    if k is None: new.append(None); continue
    k2 = k + len(want) - 1
    new.append([heard[k][1], heard[min(k2, len(heard) - 1)][2]]); j = k2 + 1
for i, v in enumerate(new):
    if v is None:
        s0 = new[i - 1][1] if i and new[i - 1] else 0.0
        e0 = next((x[0] for x in new[i + 1:] if x), info["seconds"])
        new[i] = [s0, max(s0 + 0.05, e0)]
caps[before:before + old_count] = [{"word": tok, "start": round(t0 + a, 3), "end": round(t0 + b, 3)} for tok, (a, b) in zip(disp, new)]
(ROOT / "src" / "captions" / f"{slug}.json").write_text(json.dumps(caps, indent=1, ensure_ascii=False))
print("captions:", " ".join(c["word"] for c in caps[before:before + len(disp)]))
