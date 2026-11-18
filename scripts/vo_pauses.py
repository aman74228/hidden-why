#!/usr/bin/env python3
"""Punctuation pauses for Chatterbox lines (it ignores punctuation).

For one rendered sentence: get word timings (faster-whisper), map the script's
punctuation onto them, and at each inner punctuation mark cut at the word
boundary (quietest 10 ms near the gap, nearest zero crossing) and insert
silence topped up to the target (the measured natural gap counts; an over-long gap
is trimmed to it): comma / colon / dash / inner full stop / question / ellipsis, values
from voice.json (engines.chatterbox.pauses). 10 ms fades at every cut. Leading
and trailing silence is trimmed to 40 ms. The speech itself is never stretched.

as a module:  process(wav_in, text, wav_out, model=None) -> info dict
as a script:  vo_pauses.py <in.wav> <out.wav> "<sentence text>"
"""
import difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PAUSES = json.loads((ROOT / "voice.json").read_text())["engines"]["chatterbox"]["pauses"]
SR = 24000


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def save(x, path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(path)], input=x.astype(np.float32).tobytes(), check=True)


norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())


def kind(tok):
    t = tok.rstrip("\"')")
    if t.endswith("…") or t.endswith("..."): return "ellipsis"
    if t.endswith("?"): return "question"
    if t.endswith(":"): return "colon"
    if t.endswith(("—", "–")) or tok in ("—", "–", "-"): return "dash"
    if t.endswith((".", "!")): return "stop"
    if t.endswith((",", ";")): return "comma"
    return None


NUM_WORDS = {"1750": ["seventeen", "fifty"], "1000": ["a", "thousand"]}

_model = None
def whisper():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel("small.en", device="cpu", compute_type="int8")
    return _model


def words_of(x):
    pcm16 = np.interp(np.arange(0, len(x), SR / 16000), np.arange(len(x)), x).astype(np.float32)
    segs, _ = whisper().transcribe(pcm16, word_timestamps=True, vad_filter=False, language="en")
    out = []
    for s in segs:
        for w in s.words:
            word = w.word.strip()
            sp = NUM_WORDS.get(re.sub(r"[^0-9]", "", word)) if re.fullmatch(r"[0-9,.?!]+", word) else None
            if sp:  # whisper writes "seventeen fifty" as "1750,": split it back into spoken words
                d = (w.end - w.start) / len(sp)
                for k, piece in enumerate(sp):
                    out.append((piece + (re.sub(r"[0-9]", "", word) if k == len(sp) - 1 else ""), w.start + k * d, w.start + (k + 1) * d))
            else:
                out.append((word, w.start, w.end))
    return out


def trim(x, thr_db=-42, keep=0.04):
    win = int(0.01 * SR)
    n = len(x) // win
    rms = 20 * np.log10(np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)
    on = np.nonzero(rms > thr_db)[0]
    if not len(on): return x
    a = max(0, on[0] * win - int(keep * SR)); b = min(len(x), (on[-1] + 1) * win + int(keep * SR))
    return x[a:b]


def cut_point(x, t0, t1):
    """quietest 10 ms window between t0..t1 (widened to >= 60 ms), then nearest zero crossing"""
    if t1 - t0 < 0.06:
        m = (t0 + t1) / 2; t0, t1 = m - 0.03, m + 0.03
    a, b = max(0, int(t0 * SR)), min(len(x) - 1, int(t1 * SR))
    win = int(0.01 * SR)
    best, bi = 1e9, a
    for i in range(a, max(a + 1, b - win), int(0.002 * SR)):
        e = float((x[i:i + win] ** 2).mean())
        if e < best: best, bi = e, i + win // 2
    zc = np.nonzero(np.diff(np.signbit(x[max(0, bi - 240): bi + 240])))[0]
    return (max(0, bi - 240) + zc[np.argmin(np.abs(zc - 240))]) if len(zc) else bi


def silent_span(x, c, lo, hi, thr_db=-42):
    """silent run around sample c (10 ms windows under thr_db), kept inside lo..hi"""
    win = int(0.01 * SR)
    quiet = lambda i: 20 * np.log10(np.sqrt((x[i:i + win] ** 2).mean()) + 1e-9) < thr_db
    a = b = c
    while a - win >= lo and quiet(a - win): a -= win
    while b + win <= hi and quiet(b): b += win
    return a, b


def process(wav_in, text, wav_out):
    x = trim(load(wav_in))
    toks = text.split()
    rec = words_of(x)
    sm = difflib.SequenceMatcher(a=[norm(t) for t in toks], b=[norm(w[0]) for w in rec], autojunk=False)
    match = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): match[blk.a + k] = blk.b + k
    fade = int(PAUSES.get("fade_ms", 10) / 1000 * SR)
    cuts = []  # (sample, seconds of silence, kind)
    for i, t in enumerate(toks[:-1]):
        k = kind(t)
        if not k: continue
        j = match.get(i)
        if j is None or j + 1 >= len(rec):
            continue
        c = cut_point(x, rec[j][2], rec[j + 1][1])
        # the voice often leaves its own gap: measure it and top up (or trim) to the target,
        # never add on top (line 10 of Short #3: 0.32 s natural gap + 0.18 s = 0.5 s comma)
        lo = int(max(0, rec[j][1]) * SR); hi = int(min(len(x) / SR, rec[j + 1][2]) * SR)
        a_, b_ = silent_span(x, c, lo, hi)
        have = (b_ - a_) / SR
        cuts.append((c, round(PAUSES[k] - have, 3), k, t, round(have, 3), a_, b_))
    out, cur = [], 0
    for c, delta, _, _, have, a_, b_ in sorted(cuts):
        if delta >= 0:
            c0, c1 = c, c
        else:  # too long already: drop the excess silence around the cut
            ex = int(-delta * SR)
            c0 = max(a_, c - ex // 2); c1 = min(b_, c0 + ex)
        seg = x[cur:c0].copy()
        if cur > 0 and len(seg) > fade: seg[:fade] *= np.linspace(0, 1, fade)
        if len(seg) > fade: seg[-fade:] *= np.linspace(1, 0, fade)
        out += [seg, np.zeros(int(max(0, delta) * SR), np.float32)]
        cur = c1
    seg = x[cur:].copy()
    if cur > 0 and len(seg) > fade: seg[:fade] *= np.linspace(0, 1, fade)
    out.append(seg)
    y = np.concatenate(out)
    save(y, wav_out)
    # word times in the output: shifted by every pause inserted before them
    cs = sorted(cuts)
    def shift(t):
        return t + sum(d for c, d, *_ in cs if c / SR <= t)
    timed = [(w, round(shift(a), 3), round(shift(b), 3)) for w, a, b in rec]
    missed = [t for i, t in enumerate(toks[:-1]) if kind(t) and match.get(i) is None]
    return {"seconds": round(len(y) / SR, 2), "speech_seconds": round(len(x) / SR, 2),
            "pauses": [(t, k, PAUSES[k], {"natural": h, "added": d}) for _, d, k, t, h, _, _ in sorted(cuts)], "unmatched_punct": missed,
            "heard": " ".join(w[0] for w in rec), "words": timed}


if __name__ == "__main__":
    print(json.dumps(process(sys.argv[1], sys.argv[3], sys.argv[2]), indent=1))
