#!/usr/bin/env python3
"""Voice audition: render one text with several ElevenLabs voices (eleven_v3,
stability 0.0 = "Creative") and measure pitch for each take.

usage: audition.py <out_dir> <text_file> <name>=<voice_id>[@<search>] ...
  <search>: for a shared-library voice, a search term to find its owner id so the
  voice can be added to the account if TTS refuses it.
writes <out_dir>/<name>.mp3 and <out_dir>/report.json; pitch via Praat (parselmouth)."""
import json, math, os, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path
import numpy as np

KEY = os.environ["ELEVENLABS_API_KEY"]
API = "https://api.elevenlabs.io/v1"

def req(method, url, body=None):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                               headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=300) as f:
        return f.read()

def tts(vid, text):
    return req("POST", f"{API}/text-to-speech/{vid}?output_format=mp3_44100_128",
               {"text": text, "model_id": "eleven_v3", "voice_settings": {"stability": 0.0, "similarity_boost": 0.75, "use_speaker_boost": True}})

def add_shared(vid, search, name):
    q = urllib.parse.urlencode({"search": search, "page_size": 100})
    for v in json.loads(req("GET", f"{API}/shared-voices?{q}"))["voices"]:
        if v["voice_id"] == vid:
            req("POST", f"{API}/voices/add/{v['public_owner_id']}/{vid}", {"new_name": name})
            return True
    return False

def pitch(mp3):
    import parselmouth
    wav = Path(str(mp3) + ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "22050", str(wav)], check=True)
    snd = parselmouth.Sound(str(wav)); wav.unlink()
    f0 = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=500).selected_array["frequency"]
    f0 = f0[f0 > 0]
    p10, p50, p90 = np.percentile(f0, [10, 50, 90])
    return snd.get_total_duration(), float(p50), float(p10), float(p90), 12 * math.log2(p90 / p10)

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
text = Path(sys.argv[2]).read_text().strip()
rep = []
for arg in sys.argv[3:]:
    name, rest = arg.split("=", 1)
    vid, _, search = rest.partition("@")
    dst = out / f"{name}.mp3"
    if not dst.exists():
        try:
            audio = tts(vid, text)
        except urllib.error.HTTPError as e:
            if not search or not add_shared(vid, search, name):
                print(name, "FAILED", e.code, e.read()[:200]); continue
            audio = tts(vid, text)
        dst.write_bytes(audio)
    dur, med, p10, p90, st = pitch(dst)
    rep.append({"name": name, "voice_id": vid, "seconds": round(dur, 2), "median_hz": round(med, 1),
                "p10_hz": round(p10, 1), "p90_hz": round(p90, 1), "range_semitones": round(st, 1)})
    print(f"{name:22s} {vid}  {dur:5.2f}s  median {med:6.1f} Hz  p10-p90 {st:4.1f} st")
(out / "report.json").write_text(json.dumps(rep, indent=1))
