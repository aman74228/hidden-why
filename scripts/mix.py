#!/usr/bin/env python3
"""Strict soundtrack mix for a Short (CLAUDE.md "Mix (strict)"), straight from
the shot list + caption word timings. Reports LUFS per stem.

  voice  -14 LUFS integrated (limited to -1.5 dBTP first, then re-levelled)
  music  the whole time, 9 dB under the voice (-23 LUFS), ducked a further 3 dB under speech
  sfx    every cue at least 6 dB under the voice: its loudest 400 ms is -20 LUFS
  rain   -32 LUFS, fading out at the first cut
  no stem peaks above the voice

usage: mix.py <slug> <out.wav> [--music public/sfx/<loop>.mp3]
Cue names are the CLAUDE.md library (public/sfx/<name>.mp3, credits in
public/sfx/credits.json); a missing file is skipped and listed.
"""
import argparse, json, math, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
FPS = 30
PLACEHOLDER: dict = {}  # name -> stand-in file while a library sound is missing
V_LUFS, M_UNDER, DUCK, SFX_MOM, RAIN_LUFS = -14.0, 8.0, 3.0, -21.0, -32.0
SFX_PEAK = -10.5  # dBFS: transients stay ~9 dB under the voice peak (no spikes)
RAIN_PEAK = -24.0
MUSIC_PEAK = -15.0  # dBFS
MUSIC_FLOOR = -26.0  # music short-term loudness never below voice - 12 dB
jsround = lambda x: math.floor(x + 0.5)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def ff(arr, af):
    """run an ffmpeg audio filter over an array"""
    out = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", af,
                          "-f", "f32le", "-ar", str(SR), "-ac", "2", "-"], input=arr.astype(np.float32).tobytes(),
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).copy()


def meter(arr):
    """(integrated LUFS, true peak dBTP, max momentary LUFS)"""
    log = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                          "-af", "ebur128=peak=true:metadata=0", "-f", "null", "-"], input=arr.astype(np.float32).tobytes(),
                         capture_output=True).stderr.decode()
    summ = log[log.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+|-inf)", summ).group(1).replace("-inf", "-120"))
    tp = re.search(r"Peak:\s+(-?[\d.]+|-inf)", summ)
    P = float(tp.group(1).replace("-inf", "-120")) if tp else -120.0
    moms = [float(x) for x in re.findall(r"M:\s*(-?[\d.]+)", log)]
    return I, P, max(moms) if moms else -120.0


def level(arr, target, momentary=False):
    """static gain to `target` LUFS: integrated, or the loudest 400 ms (momentary)"""
    pad = max(0, int(0.5 * SR) - len(arr))  # clips under the 400 ms meter window: pad with silence
    I, _, M = meter(np.pad(arr, ((0, pad), (0, 0))))
    ref = M if momentary or I <= -70 else I
    return arr * 10 ** ((target - ref) / 20)


def db(x):
    return 20 * math.log10(max(x, 1e-9))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("out")
    ap.add_argument("--music", default=None)
    ap.add_argument("--stems", default=None, help="folder to also write voice/music/sfx/rain stems")
    a = ap.parse_args()
    L = json.loads((ROOT / f"src/shots/{a.slug}.json").read_text())
    words = json.loads((ROOT / f"src/captions/{a.slug}.json").read_text())
    frames = [max(1, jsround(s["duration"] * FPS)) for s in L["shots"]]
    starts = [sum(frames[:i]) / FPS for i in range(len(frames))]
    total = (sum(frames) + jsround(L.get("payoffHold", 0.5) * FPS)) / FPS
    N = int(round(total * SR))
    fit = lambda x: np.pad(x, ((0, max(0, N - len(x))), (0, 0)))[:N]

    # ---- voice: limit peaks, then level to -14 LUFS (two passes) ----
    voice = fit(decode(ROOT / "audio" / f"{a.slug}.mp3"))
    for _ in range(3):
        voice = level(voice, V_LUFS)
        voice = ff(voice, "alimiter=limit=0.84:level=false:attack=2:release=50")[:N]
        voice = fit(voice)
    vI, vP, _ = meter(voice)
    v_peak = np.abs(voice).max()

    # speech mask from word timings (merged, padded), smoothed 80 ms
    mask = np.zeros(N, np.float32)
    for w in words:
        s0, s1 = int(max(0, w["start"] - 0.08) * SR), int(min(total, w["end"] + 0.15) * SR)
        mask[s0:s1] = 1
    k = int(0.08 * SR)
    mask = np.convolve(mask, np.ones(k) / k, mode="same")

    # ---- music ----
    report = {"voice": {"lufs": round(vI, 1), "true_peak_dbtp": round(vP, 1)}}
    mpath = Path(a.music) if a.music else next((p for p in [ROOT / "public/sfx/music.mp3"] if p.exists()), None)
    music = np.zeros((N, 2), np.float32)
    if mpath:
        m = decode(mpath)
        reps = int(math.ceil(N / len(m)))
        m = np.tile(m, (reps, 1))[:N]
        # steady bed: gentle compression so quiet passages never drop out
        m = ff(m, "acompressor=threshold=-30dB:ratio=4:attack=20:release=500:makeup=6")[:len(m)]
        def ride(m):  # gain-ride to a constant level (1 s RMS, smoothed, at most +/-9 dB)
            W4 = SR
            n4 = len(m) // W4
            rms = np.sqrt((m[: n4 * W4].reshape(n4, W4, 2) ** 2).mean(axis=(1, 2))) + 1e-6
            g = np.clip(np.median(rms) / rms, 0.35, 2.8)
            g = np.convolve(np.pad(g, (1, 1), mode="edge"), np.ones(3) / 3, mode="valid")
            gs = np.interp(np.arange(len(m)), np.arange(n4) * W4 + W4 / 2, g)
            return m * gs[:, None].astype(np.float32)
        m = level(m, V_LUFS - M_UNDER)
        # no music hits louder than the voice: cap peaks, soft 0.3 s fade-in (the loop's first downbeat was a spike)
        mlim = 10 ** (MUSIC_PEAK / 20)
        for _ in range(4):  # ride, level, limit, repeat: steady loudness with peaks capped
            m = ride(m)
            m = level(m, V_LUFS - M_UNDER)
            m = fit(np.clip(ff(m, f"alimiter=limit={mlim:.4f}:level=false:attack=1:release=80")[:N], -mlim, mlim))
        fin = int(0.3 * SR)
        m[:fin] *= np.linspace(0, 1, fin)[:, None]
        env = 1 - (1 - 10 ** (-DUCK / 20)) * mask
        music = m * env[:, None]
        # floor: wherever the ducked bed's 3 s loudness dips under voice-12 dB, lift it there (smoothly)
        for _ in range(3):
            hop = SR // 2
            pos, gain = [], []
            for k in range(0, N - 3 * SR, hop):
                Lk = meter(music[k:k + 3 * SR])[0]
                pos.append(k + 1.5 * SR)
                gain.append(10 ** (max(0.0, (MUSIC_FLOOR + 0.4) - Lk) / 20))
            if max(gain) <= 1.0001:
                break
            g = np.convolve(np.pad(gain, (2, 2), mode="edge"), np.ones(5) / 5, mode="valid")
            g = np.maximum(g, gain)
            music = music * np.interp(np.arange(N), pos, g)[:, None].astype(np.float32)
            music = np.clip(ff(music, f"alimiter=limit={mlim:.4f}:level=false:attack=1:release=80")[:N], -mlim, mlim)
            music = fit(music)
        # brief-requested dips (shot list "musicDip": [[start_s, end_s, dB], ...]), never below the floor
        dips = []
        for d0, d1, ddb in L.get("musicDip", []):
            a0, a1 = int(d0 * SR), min(N, int(d1 * SR))
            Ld = meter(music[a0:a1])[0]
            # the floor is checked on 3 s windows: use the quietest window touching the dip
            w3 = [meter(music[k:k + 3 * SR])[0] for k in range(max(0, a0 - 3 * SR), min(N - 3 * SR, a1), SR // 2)]
            Lmin = min(w3) if w3 else Ld
            allowed = round(min(ddb, max(0.0, Lmin - (MUSIC_FLOOR + 0.3))), 1)
            ramp = int(0.25 * SR)
            gd = np.ones(N, np.float32)
            gd[a0:a1] = 10 ** (-allowed / 20)
            gd = np.convolve(gd, np.ones(ramp) / ramp, mode="same").astype(np.float32)
            music = music * gd[:, None]
            dips.append({"from_s": d0, "to_s": d1, "asked_db": ddb, "applied_db": allowed, "lufs_before": round(Ld, 1)})
        if dips:
            report["music_dips"] = dips
        fade = int(0.3 * SR)
        music[-fade:] *= np.linspace(1, 0, fade)[:, None]
        mI, mP, _ = meter(music)
        sp = mask > 0.5
        mS = meter(music[sp])[0] if sp.any() else mI
        mQ = meter(music[~sp])[0] if (~sp).any() else mI
        report["music"] = {"file": str(mpath.relative_to(ROOT)), "lufs": round(mI, 1), "under_speech_lufs": round(mS, 1),
                           "between_lines_lufs": round(mQ, 1), "true_peak_dbtp": round(mP, 1)}

    # ---- sfx ----
    cues = []
    for i, sh in enumerate(L["shots"]):
        for e in sh.get("sfx", []):
            cues.append((e["name"], starts[i] + jsround(e.get("at", 0) * FPS) / FPS, e.get("dur"), e.get("fadeAt")))
        if sh.get("payoff"):
            cues.append(("ding", starts[i] + jsround(sh.get("payoffAt", 0) * FPS) / FPS, None, None))
    sfx = np.zeros((N, 2), np.float32)
    rain = np.zeros((N, 2), np.float32)
    used, missing, cue_lufs = {}, set(), {}
    cues.sort(key=lambda c: c[1])
    for ci, (name, at, dur, fade_at) in enumerate(cues):
        f = ROOT / "public/sfx" / f"{name}.mp3"
        if not f.exists() and name in PLACEHOLDER:
            f = ROOT / "public/sfx" / PLACEHOLDER[name]
        if not f.exists():
            missing.add(name)
            continue
        x = decode(f)
        if dur:  # loop to length
            n = int(dur * SR)
            x = np.tile(x, (int(math.ceil(n / len(x))), 1))[:n]
        is_rain = name.startswith("rain")
        nxt = next((c[1] for c in cues[ci + 1:] if c[0] == name), None)
        if nxt is not None and not dur:  # a repeat cuts the previous one (no stacking)
            x = x[: max(int(0.06 * SR), int((nxt - at) * SR))]
        x = level(x, RAIN_LUFS, False) if is_rain else level(x, SFX_MOM, True)
        # never peak above the voice: soft-limit each cue's transients
        lim = 10 ** ((RAIN_PEAK if is_rain else SFX_PEAK) / 20)
        if np.abs(x).max() > lim:
            x = ff(x, f"alimiter=limit={lim:.4f}:level=false:attack=0.5:release=40")[: len(x)]
            x = np.clip(x, -lim, lim)
        g = 0.006 * SR
        x[: int(g)] *= np.linspace(0, 1, int(g))[:, None]
        x[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
        s0 = int(at * SR)
        x = x[: max(0, N - s0)]
        tgt = rain if is_rain else sfx
        tgt[s0:s0 + len(x)] += x
        if is_rain and fade_at is not None:  # fade out at the first cut
            f0, f1 = int(fade_at * SR), int((fade_at + 0.45) * SR)
            rain[f0:f1] *= np.linspace(1, 0, f1 - f0)[:, None]
            rain[f1:] = 0
        used[name] = f.name
        xp = np.pad(x, ((0, max(0, int(0.5 * SR) - len(x))), (0, 0)))
        cue_lufs[name] = round(meter(xp)[0] if is_rain else meter(xp)[2], 1)
    for stem in (sfx, rain):
        if np.abs(stem).max() > v_peak * 0.89:
            stem *= v_peak * 0.89 / np.abs(stem).max()
    sI, sP, sM = meter(sfx)
    rI, rP, _ = meter(rain[: int(3.5 * SR)])
    report["sfx"] = {"stem_lufs": round(sI, 1), "stem_max_momentary_lufs": round(sM, 1), "true_peak_dbtp": round(sP, 1),
                     "per_cue_max_momentary_lufs": cue_lufs, "files": used, "missing_skipped": sorted(missing)}
    report["rain"] = {"lufs_while_playing": round(rI, 1), "fades_at": next((c[3] for c in cues if c[0].startswith("rain") and c[3]), None)}

    # duck SFX under speech so each 400 ms window stays >= 7 dB under the voice
    W = int(0.4 * SR)
    nW = N // W
    def rms_w(arr):
        return np.sqrt((arr[: nW * W].reshape(nW, W, 2) ** 2).mean(axis=(1, 2))) + 1e-9
    vr, sr_ = rms_w(voice), rms_w(sfx)
    v_typ = np.median(vr[vr > 10 ** (-40 / 20)])  # typical speech level, for the gaps between lines
    ref = np.where(vr > 10 ** (-40 / 20), vr, v_typ)
    gw = np.minimum(1.0, (ref * 10 ** (-7 / 20)) / sr_)
    gw = np.minimum(gw, np.convolve(np.pad(gw, (1, 1), mode="edge"), np.ones(3) / 3, mode="valid"))
    gsm = np.concatenate([np.repeat(gw, W), np.full(N - nW * W, gw[-1] if nW else 1.0)])
    kk = int(0.02 * SR)
    gsm = np.minimum(gsm, np.convolve(gsm, np.ones(kk) / kk, mode="same")).astype(np.float32)
    sfx *= gsm[:, None]
    # moment-by-moment checks (400 ms windows)
    W = int(0.4 * SR)
    def win_db(a):
        n = len(a) // W
        r = np.sqrt((a[: n * W] ** 2).mean(axis=(1, 2)) if a.ndim == 3 else (a[: n * W].reshape(n, W, 2) ** 2).mean(axis=(1, 2)))
        return 20 * np.log10(r + 1e-9)
    vw, sw, rw = win_db(voice), win_db(sfx + rain), win_db(music)
    speech_w = vw > -40
    v_typ_db = float(np.median(vw[speech_w]))
    bad = ((sw > vw - 6) & speech_w) | ((sw > v_typ_db - 6) & ~speech_w)
    over = int(bad.sum())
    report["checks_offending_seconds"] = [round(i * 0.4, 1) for i in np.nonzero(bad)[0]]
    mus_st = []
    S3 = 3 * SR
    for k in range(0, N - S3 - int(0.5 * SR), SR // 2):
        mus_st.append(meter(music[k:k + S3])[0])
    report["checks"] = {"sfx_windows_within_6dB_of_voice": over, "music_min_short_term_lufs": round(min(mus_st), 1) if mus_st else None,
                        "music_floor_ok": bool(mus_st) and min(mus_st) >= MUSIC_FLOOR}
    if a.stems:
        Path(a.stems).mkdir(parents=True, exist_ok=True)
        for nm, st in (("voice", voice), ("music", music), ("sfx", sfx), ("rain", rain)):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le",
                            str(Path(a.stems) / f"{nm}.wav")], input=st.astype(np.float32).tobytes(), check=True)
    mix = voice + music + sfx + rain
    mix = ff(mix, "alimiter=limit=0.89:level=false:attack=2:release=60")[:N]
    fI, fP, _ = meter(mix)
    report["mix"] = {"lufs": round(fI, 1), "true_peak_dbtp": round(fP, 1), "seconds": round(total, 3)}
    report["peak_check"] = {"voice_peak_dbfs": round(db(v_peak), 1), "music_peak_dbfs": round(db(np.abs(music).max()), 1),
                            "sfx_peak_dbfs": round(db(np.abs(sfx).max()), 1), "rain_peak_dbfs": round(db(np.abs(rain).max()), 1)}
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", a.out],
                   input=mix.astype(np.float32).tobytes(), check=True)
    rep = Path(a.out).with_suffix(".levels.json")
    rep.write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
