#!/usr/bin/env python3
"""Word timestamps for captions: align audio/<slug>.mp3 to the brief's script.

Usage: python3 scripts/align.py <slug>
Writes src/captions/<slug>.json  ->  [{"word","start","end"}, ...]

1) Try faster-whisper (word_timestamps) and map recognised words onto the
   script's spelling with difflib.
2) If faster-whisper isn't installed or its model download is blocked, fall
   back to ffmpeg silencedetect: find speech segments and spread the script's
   words across them proportionally to character length.
"""
import difflib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def script_words(slug):
    text = (ROOT / "briefs" / f"{slug}.md").read_text(encoding="utf-8")
    m = re.search(r"^##\s*Script\s*$(.*?)(?=^##\s|\Z)", text, re.S | re.M | re.I)
    body = m.group(1) if m else text
    body = re.sub(r"\[[^\]]*\]|\([^)]*\)|^\s*[-*>]\s*|^\s*\w+:\s", " ", body, flags=re.M)  # drop stage notes / speaker tags
    return [w for w in body.split() if re.search(r"\w", w)]


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def duration(mp3):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                         capture_output=True, text=True).stdout
    return float(out.strip())


def with_whisper(mp3, words):
    from faster_whisper import WhisperModel  # noqa
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(str(mp3), word_timestamps=True, vad_filter=True)
    rec = [w for s in segs for w in (s.words or [])]
    a = [norm(w) for w in words]
    b = [norm(w.word) for w in rec]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    times = [None] * len(words)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            r = rec[blk.b + k]
            times[blk.a + k] = (r.start, r.end)
    # interpolate unmatched words between known neighbours
    known = [i for i, t in enumerate(times) if t]
    if not known:
        raise RuntimeError("no alignment")
    for i in range(len(words)):
        if times[i]:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        s = times[prev][1] if prev is not None else 0.0
        e = times[nxt][0] if nxt is not None else s + 0.4
        n = (nxt if nxt is not None else len(words)) - (prev if prev is not None else -1)
        step = (e - s) / max(n, 1)
        j = i - (prev if prev is not None else -1)
        times[i] = (s + step * (j - 1), s + step * j)
    return [{"word": w, "start": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(words, times)]


def with_silence(mp3, words):
    dur = duration(mp3)
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "silencedetect=noise=-35dB:d=0.18", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    speech, cur = [], 0.0
    for s, e in zip(starts, ends + [dur] * (len(starts) - len(ends))):
        if s - cur > 0.05:
            speech.append((cur, s))
        cur = e
    if dur - cur > 0.05:
        speech.append((cur, dur))
    total = sum(e - s for s, e in speech)
    weights = [len(norm(w)) + 2 for w in words]
    per = total / sum(weights)
    out, si, t = [], 0, speech[0][0]
    for w, wt in zip(words, weights):
        d = wt * per
        while si < len(speech) - 1 and t + d * 0.5 > speech[si][1]:
            si += 1
            t = max(t, speech[si][0])
        out.append({"word": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return out


def main():
    slug = sys.argv[1]
    mp3 = ROOT / "audio" / f"{slug}.mp3"
    words = script_words(slug)
    try:
        res = with_whisper(mp3, words)
        how = "faster-whisper"
    except Exception as e:  # not installed / model download blocked
        print(f"faster-whisper unavailable ({e.__class__.__name__}: {e}); using silencedetect fallback")
        res = with_silence(mp3, words)
        how = "silencedetect"
    dst = ROOT / "src" / "captions" / f"{slug}.json"
    dst.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"{how}: {len(res)} words -> {dst.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
