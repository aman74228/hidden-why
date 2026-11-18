#!/usr/bin/env python3
"""Line-by-line Chatterbox voiceover for a Short.

reads  audio/<slug>.lines.json  ({text, spoken?, exaggeration, pause_after} per line)
       voice.json               (engines.chatterbox: model, seed, cfg_weight, pauses)
1. renders every line (model loaded once), seed = voice seed (retries: seed+1, seed+2)
2. whisper-checks each line against its spoken text; a garbled/mispronounced line is
   re-rendered (max 3 tries) and the best try kept
3. scripts/vo_pauses.py inserts punctuation pauses (no time-stretching)
4. joins with each line's pause_after; if the total is under --min (52 s) the whole
   take is re-rendered with cfg 0.5; if over --max (60 s) the between-line pauses
   shrink first (never below 0.25 s), comma pauses never
writes audio/<slug>.mp3, audio/<slug>.vo.json (report), captions via scripts/align.py
usage: vo_lines.py <slug> [--min 52] [--max 60]"""
import argparse, difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import vo_pauses as vp

ap = argparse.ArgumentParser(); ap.add_argument("slug"); ap.add_argument("--min", type=float, default=52); ap.add_argument("--max", type=float, default=60)
ap.add_argument("--cfg", type=float, default=None, help="override cfg_weight (no automatic cfg retry)")
a = ap.parse_args()
V = json.loads((ROOT / "voice.json").read_text())["engines"]["chatterbox"]
spec = json.loads((ROOT / "audio" / f"{a.slug}.lines.json").read_text())
lines = spec["lines"]
work = ROOT / "audio" / "takes" / f"{a.slug}-lines"; work.mkdir(parents=True, exist_ok=True)
SAME = {"vic": "vik", "vick": "vik", "vics": "viks", "vicks": "viks", "dadda": "dada", "data": "dada", "darda": "dada", "guss": "gus", "gust": "gus", "gas": "gus", "goose": "gus"}
NUM = {"1750": ["seventeen", "fifty"]}

def words(s):
    out = []
    for w in s.split():
        n = re.sub(r"[^a-z0-9']", "", w.lower()).replace("'", "")
        out += NUM.get(n, [SAME.get(n, n)]) if n else []
    return out

def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    sm = difflib.SequenceMatcher(a=r, b=h, autojunk=False)
    err = sum(max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal")
    return err / max(1, len(r)), [(" ".join(r[i1:i2]), " ".join(h[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]

def render(jobs):
    r = subprocess.run([V["python"], str(ROOT / V["worker"]), "batch", V["model"]], input=json.dumps(jobs), capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-3000:])
    return json.loads(r.stdout.strip().splitlines()[-1])

def take(cfg):
    best = {}
    timing = []
    todo = list(range(len(lines)))
    for attempt in range(3):
        if not todo: break
        jobs = [{"text": lines[i].get("spoken", lines[i]["text"]), "out": str(work / f"line{i+1:02d}-cfg{cfg}-try{attempt+1}.wav"),
                 "exaggeration": lines[i]["exaggeration"], "cfg_weight": cfg, "seed": V["seed"] + attempt} for i in todo]
        new = [j for j in jobs if not Path(j["out"]).exists()]  # reuse tries already on disk
        if new:
            timing.append(render(new))
        nxt = []
        for i, j in zip(todo, jobs):
            heard = " ".join(w[0] for w in vp.words_of(vp.trim(vp.load(j["out"]))))
            e, diff = wer(j["text"], heard)
            print(f"  line {i+1:2d} try {attempt+1}: WER {e:.2f} {diff if diff else ''}", flush=True)
            if i not in best or e < best[i]["wer"]:
                best[i] = {"file": j["out"], "wer": round(e, 3), "diff": diff, "try": attempt + 1, "heard": heard}
            if e > 0: nxt.append(i)
        todo = nxt
    return best, timing

cfg = a.cfg if a.cfg is not None else V["cfg_weight"]
for round_ in range(2):
    best, timing = take(cfg)
    parts = []
    for i, ln in enumerate(lines):
        outp = work / f"line{i+1:02d}-final.wav"
        info = vp.process(best[i]["file"], ln.get("spoken", ln["text"]), outp)
        parts.append((outp, info))
    pauses = [ln["pause_after"] for ln in lines]
    total = sum(p[1]["seconds"] for p in parts) + sum(pauses)
    print(f"cfg {cfg}: total {total:.2f}s")
    if total < a.min and cfg < 0.5 and a.cfg is None:
        cfg = 0.5; print("under the minimum: re-rendering with cfg 0.5"); continue
    break
if total > a.max:  # shrink between-line pauses first (min 0.25 s), proportionally
    over = total - a.max
    room = [max(0, p - 0.25) for p in pauses]
    k = min(1, over / max(1e-6, sum(room)))
    pauses = [round(p - r * k, 3) for p, r in zip(pauses, room)]
    total = sum(p[1]["seconds"] for p in parts) + sum(pauses)

SR = vp.SR
audio = []
starts = []
t = 0.0
for (f, info), p in zip(parts, pauses):
    x = vp.load(f); starts.append(round(t, 3)); audio += [x, np.zeros(int(round(p * SR)), np.float32)]; t += len(x) / SR + p
y = np.concatenate(audio)
mp3 = ROOT / "audio" / f"{a.slug}.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)],
               input=y.astype(np.float32).tobytes(), check=True)
nwords = sum(len(ln["text"].split()) for ln in lines)
speech = sum(p[1]["speech_seconds"] for p in parts)
rep = {"slug": a.slug, "engine": f"chatterbox/{V['model']}", "seed": V["seed"], "cfg_weight": cfg, "total_s": round(len(y) / SR, 2),
       "words": nwords, "wpm_overall": round(nwords / (len(y) / SR) * 60, 1), "wpm_speech_only": round(nwords / speech * 60, 1),
       "render": timing, "lines": [{"n": i + 1, "start_s": starts[i], "seconds": parts[i][1]["seconds"], "pause_after": pauses[i],
                                     "exaggeration": lines[i]["exaggeration"], "try": best[i]["try"], "wer": best[i]["wer"], "diff": best[i]["diff"],
                                     "heard": best[i]["heard"], "punct_pauses": parts[i][1]["pauses"], "unmatched_punct": parts[i][1]["unmatched_punct"]}
                                    for i in range(len(lines))]}
(ROOT / "audio" / f"{a.slug}.vo.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False))
print(json.dumps({k: rep[k] for k in ["total_s", "words", "wpm_overall", "wpm_speech_only", "cfg_weight"]}))
# captions: each line's own word timings (whisper on that line), shifted through the
# inserted pauses and the line's start; mapped onto the display text ("1750" <- "seventeen fifty")
caps = []
for i, ln in enumerate(lines):
    disp = ln["text"].split()
    exp, owner = [], []
    for k, tok in enumerate(disp):
        for piece in words(tok):
            exp.append(piece); owner.append(k)
    heard = parts[i][1]["words"]
    hn = [words(w[0])[0] if words(w[0]) else "" for w in heard]
    sm = difflib.SequenceMatcher(a=exp, b=hn, autojunk=False)
    t = [[None, None] for _ in disp]
    for blk in sm.get_matching_blocks():
        for q in range(blk.size):
            k = owner[blk.a + q]; w = heard[blk.b + q]
            t[k][0] = w[1] if t[k][0] is None else t[k][0]; t[k][1] = w[2]
    known = [k for k in range(len(disp)) if t[k][0] is not None]
    for k in range(len(disp)):  # interpolate unmatched words between neighbours
        if t[k][0] is None:
            p_ = max([q for q in known if q < k], default=None); n_ = min([q for q in known if q > k], default=None)
            s0 = t[p_][1] if p_ is not None else 0.0; e0 = t[n_][0] if n_ is not None else parts[i][1]["seconds"]
            t[k] = [s0, max(s0 + 0.05, e0)]
    for k, tok in enumerate(disp):
        caps.append({"word": tok, "start": round(starts[i] + t[k][0], 3), "end": round(starts[i] + t[k][1], 3)})
(ROOT / "src" / "captions" / f"{a.slug}.json").write_text(json.dumps(caps, indent=1, ensure_ascii=False))
print(f"captions: {len(caps)} words (per-line whisper timings) -> src/captions/{a.slug}.json")
