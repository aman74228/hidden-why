#!/usr/bin/env python3
"""Chatterbox (Resemble AI, MIT) TTS worker. Runs inside the Chatterbox venv
(voice.json -> engines.chatterbox.python), called by scripts/voiceover.py and
scripts/audition_chatterbox.py. Built-in default voice, no cloning.

usage: tts_chatterbox.py <model: turbo|original> <out.wav> <exaggeration> <cfg_weight> <seed> < text
Long texts are split into sentences and joined with short gaps (both models
are trained on short utterances). Prints render seconds as JSON on stdout."""
import json, re, sys, time
import torch, torchaudio as ta

model_name, out, ex, cfg, seed = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
text = sys.stdin.read().strip()
torch.manual_seed(seed)
t0 = time.time()
if model_name == "turbo":
    from chatterbox.tts_turbo import ChatterboxTurboTTS
    model = ChatterboxTurboTTS.from_pretrained(device="cpu")
else:
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_pretrained(device="cpu")
load_s = time.time() - t0

def gen(s):
    kw = {}
    import inspect
    params = inspect.signature(model.generate).parameters
    if "exaggeration" in params: kw["exaggeration"] = ex
    if "cfg_weight" in params: kw["cfg_weight"] = cfg
    return model.generate(s, **kw)

# one utterance per line (the script's lines are sentence groups); split very long lines on sentence ends
parts = []
for line in [l.strip() for l in text.splitlines() if l.strip()]:
    parts += [p for p in re.split(r"(?<=[.?!…])\s+(?=[A-Z\[])", line) if p] if len(line) > 220 else [line]
t1 = time.time()
wavs = []
gap = torch.zeros(1, int(0.12 * model.sr))
for i, p in enumerate(parts):
    w = gen(p)
    wavs += [w, gap] if i < len(parts) - 1 else [w]
ta.save(out, torch.cat(wavs, dim=1), model.sr)
print(json.dumps({"load_s": round(load_s, 1), "render_s": round(time.time() - t1, 1), "parts": len(parts), "sr": model.sr}))
