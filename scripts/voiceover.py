#!/usr/bin/env python3
"""Generate the voiceover for a Short via ElevenLabs, with word timestamps.

Usage: python3 scripts/voiceover.py <slug>
Reads:  briefs/<slug>.md  (the "## Script" section, sent exactly as written)
        voice.json        (voice id, model, settings)
Writes: audio/<slug>.mp3
        audio/<slug>.alignment.json   (raw character alignment from the API)
        src/captions/<slug>.json      ([{word, start, end}] for captions)
Needs ELEVENLABS_API_KEY in the environment.
"""
import base64, json, os, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def script_text(slug):
    text = (ROOT / "briefs" / f"{slug}.md").read_text(encoding="utf-8")
    m = re.search(r"^##\s*Script\b[^\n]*\n(.*?)(?=^##\s|\Z)", text, re.S | re.M)
    if not m:
        sys.exit("no '## Script' section in brief")
    # drop production notes written in parentheses on their own line (e.g. the loop note)
    lines = [l for l in m.group(1).strip().splitlines() if not l.strip().startswith("(")]
    return "\n".join(lines).strip()


def words_from_alignment(al):
    chars = al["characters"]
    st = al["character_start_times_seconds"]
    en = al["character_end_times_seconds"]
    words, cur, s0, e0, in_tag = [], "", None, None, False
    for c, s, e in zip(chars, st, en):
        if c in "<[":  # SSML <break/> and eleven_v3 [audio tags] are not spoken words
            in_tag = True
        if in_tag:
            if c in ">]":
                in_tag = False
            continue
        if c.isspace():
            if cur:
                words.append({"word": cur, "start": round(s0, 3), "end": round(e0, 3)})
            cur, s0 = "", None
            continue
        if s0 is None:
            s0 = s
        cur += c
        e0 = e
    if cur:
        words.append({"word": cur, "start": round(s0, 3), "end": round(e0, 3)})
    # drop tokens that are only punctuation/quotes
    return [w for w in words if re.search(r"\w", w["word"])]


CHATTERBOX_TAGS = {"advertisement", "angry", "chuckle", "clear throat", "cough", "crying", "dramatic", "fear", "gasp", "groan",
                   "happy", "laugh", "narration", "sarcastic", "shush", "sigh", "sniff", "surprised", "whispering"}


def chatterbox(slug, take, cfg):
    """Chatterbox (local, no timestamps): render via the venv worker, then captions
    come from scripts/align.py (faster-whisper). Tags: Turbo keeps its own
    paralinguistic tags; the original model gets plain text."""
    import re, subprocess
    text = script_text(slug)
    keep = CHATTERBOX_TAGS if cfg["model"] == "turbo" else set()
    text = re.sub(r"\[([^\]]+)\]\s*", lambda m: m.group(0) if m.group(1).lower() in keep else "", text)
    out = ROOT / "audio" / (f"takes/{slug}-{take}.mp3" if take else f"{slug}.mp3")
    out.parent.mkdir(exist_ok=True)
    wav = out.with_suffix(".wav")
    r = subprocess.run([cfg["python"], str(ROOT / cfg["worker"]), cfg["model"], str(wav), str(cfg["exaggeration"]), str(cfg["cfg_weight"]),
                        str(cfg.get("seed", 0))], input=text, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-2000:])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k", str(out)], check=True)
    wav.unlink()
    print(f"{out.relative_to(ROOT)} · chatterbox/{cfg['model']} · {r.stdout.strip().splitlines()[-1]}")
    if not take:
        subprocess.run([sys.executable, str(ROOT / "scripts/align.py"), slug], check=True)


def main():
    slug = sys.argv[1]
    cfg = json.loads((ROOT / "voice.json").read_text())
    if "engine" in cfg:
        if cfg["engine"] == "chatterbox":
            return chatterbox(slug, sys.argv[2] if len(sys.argv) > 2 else None, cfg["engines"]["chatterbox"])
        voice = cfg["engines"]["elevenlabs"]
    else:
        voice = cfg
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set")
    body = {
        "text": script_text(slug),
        "model_id": voice["model_id"],
        "voice_settings": voice["voice_settings"],
    }
    url = (f"https://api.elevenlabs.io/v1/text-to-speech/{voice['voice_id']}/with-timestamps"
           f"?output_format={voice.get('output_format', 'mp3_44100_128')}")
    out = (ROOT / "audio" / f"{slug}.mp3")
    if len(sys.argv) > 2:  # optional take name: audio/takes/<slug>-<take>.mp3, captions untouched
        out = ROOT / "audio" / "takes" / f"{slug}-{sys.argv[2]}.mp3"
        out.parent.mkdir(exist_ok=True)
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.load(r)
    out.write_bytes(base64.b64decode(res["audio_base64"]))
    if len(sys.argv) > 2:
        out.with_suffix(".alignment.json").write_text(json.dumps(res["alignment"]))
        w = words_from_alignment(res["alignment"])
        print(f"{out.relative_to(ROOT)} · {len(w)} words · last word ends {w[-1]['end']:.2f}s")
        return
    al = res.get("normalized_alignment") or res["alignment"]
    (ROOT / "audio" / f"{slug}.alignment.json").write_text(json.dumps(res["alignment"]))
    words = words_from_alignment(res["alignment"])
    (ROOT / "src" / "captions" / f"{slug}.json").write_text(json.dumps(words, indent=1))
    print(f"audio/{slug}.mp3 · {len(words)} words · last word ends {words[-1]['end']:.2f}s")


if __name__ == "__main__":
    main()
