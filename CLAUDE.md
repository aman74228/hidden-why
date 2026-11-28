# Hidden Why — Studio Rules (read every session)
Channel: Hidden Why — ancient engineering and everyday mysteries, explained in a minute.
ONE reusable studio. Never create a new project per Short. Each Short = a brief in /briefs + its voiceover in /audio.
**Before starting any Short, read LESSONS.md** (everything fixed on Short #1: hook, no voids/flat frames, inserts, mix levels, render pitfalls, partial re-render, script & story rules). Check against it before showing stills.

## Stack
Remotion + three.js (React Three Fiber), 1080x1920, 30 fps. No AI video generators by default.
Exception, "What if" Shorts: Google Flow clips are allowed when the brief asks for them. They live in
public/flow/<NN>/ (README.md maps clip -> lines), are cut to the VO (trim or hold, never speed-ramp),
upscaled with lanczos (scripts/flow_prep.py) and assembled by the shot list (`"flow"` shots, src/scene/FlowScene.tsx).
Flow clips: no text. Dialogue only for lines marked [FLOW] in the brief (keep that clip's speech at −14 LUFS, duck music under it, don't render those lines in Chatterbox); all other Flow audio is ambience only (−30 LUFS). Keep children away from medicine/pills in prompts (the safety filter blocks those).

## Cast (reusable rigs; reskin outfits per story, keep faces/colours)
- Nik: asks the question in the hook. Small kid, oversized round head, orange kurta, cowlick. Wide eyes, points.
- Vik: the mocker, guesses wrong 3 times, proven wrong at payoff. Tall, lanky, teal jacket, smug half-lidded eyes, raised eyebrow. Arms crossed, smirk.
- Gus: old craftsman, never explains, only shows. Short, round, white beard, cream shawl, small round spectacles. Calm nod, tiny smile.
Names changed Nov 2026: Nik was Milo (and before that Chotu), Gus was Dada (Short #1 audio and its captions still say the old names; no published caption says Milo).
Model sheet + hard rules: **CHARACTERS.md** (read before any Short; check every still against public/characters/sheet.png).
Poses: idle, talk, point, laugh, cross-arms, shock, nod.

## Look
- Flat 2D characters (round heads, dot eyes, bean bodies, stick limbs, 4px dark outline) inside lit 3D toon sets.
- Palette: warm saffron-gold key light, deep indigo-teal shadows, never pure black. Accent #F2A33A.
- Camera low, wide, always gliding; a cut or strong camera move every 2–3 s, 3+ object inserts per Short. Helpers: dolly, orbit, push-in.
- Sets: CC0 textures + HDRI (scripts/fetch_assets.py), 8+ props per set, light beams, bloom, particles, subtle grain. Look playbook: .claude/skills/cartoon-3d-short.
- Captions: bold white, dark outline, sentence case, 1–2 words at a time, ~68 px, centred at 70% height (nudged within 62–86% only to keep off faces), synced to the voiceover.
- Title cards: indigo panel, #F2A33A border, small upper label + big lower word.
- Ending: hold payoff 0.5 s, hard cut so it loops into the first frame.

## Audio
- Voiceover: Chatterbox (Resemble AI, MIT), original model, built-in default voice, base exaggeration 0.5 / cfg 0.3 / fixed seed 1750 (voice.json, `"engine": "chatterbox"`; ElevenLabs is off, no credits). Render line by line with `scripts/vo_lines.py <slug>` (whisper check, `scripts/vo_pauses.py`). Pace fix (Short #3 ran ~237 wpm): slow every line with a pitch-preserving stretch of 0.88–0.92 (rubberband, else ffmpeg atempo), never speed up. Target overall ≤200 wpm including pauses; script ~170–185 words; final length 55–65 s (a little over 60 is OK).
- Pauses between sentences: 0.25–0.4 s in the first 15 s; only the payoff and respectful beats get longer ones.
- Word timestamps: if the engine gives none, captions come from forced alignment of the final MP3 to the brief's script (scripts/align.py, faster-whisper; fallback: ffmpeg silencedetect).

### Sound sourcing (CC0 only; Freesound is out — it blocks the cloud machine)
- Order: 1) Kenney CC0 packs (kenney.nl blocks the cloud machine too, so use Kenney's own uploads on opengameart.org); 2) OpenGameArt.org filtered to CC0 (search with field_art_licenses_tid[]=4, then confirm CC0 on the item page); 3) Wikimedia Commons CC0/PD as a fallback (upload.wikimedia.org currently answers 429 to the cloud machine).
- Audition the top 3 per cue (duration, loudness, noise floor/SNR) and pick the cleanest. Store as public/sfx/<name>.mp3.
- Log every file in public/sfx/credits.json: name, source, file, author, URL, license. CC0/PD only, never CC-BY or NC.
- NO whoosh/swoosh sounds, ever.
- Library (reusable for all Shorts): rain-soft (light rain ambience, loopable) · coin-scrape · crickets · anvil · metal-ting · pop-soft · drip · shimmer (soft magic sparkle) · gate-creak · ding (cartoon) · footsteps-stone · crowd-murmur-soft (still missing).
- Music: public/sfx/music.mp3, a playful CC0 loop of 30 s or more (now: "Children's March Theme"; no CC0 pizzicato found). If nothing fits, ask the user.

### Mix (strict) — `scripts/mix.py <slug> <out.wav>` builds it and writes a .levels.json LUFS report
- Voice -14 LUFS.
- Music the whole time, 8–10 dB under the voice, ducked a further 3 dB under speech, never below voice -12 dB; music peaks <= -15 dBFS, 0.3 s fade-in.
- Exception: serious beats may dip music below the 12 dB floor (e.g. ~18 dB under the voice for one line), declared in the shot list as `musicDip` with `floorExempt`.
- Every SFX at least 6 dB under the voice.
- Rain at -32 LUFS, fading out at the first cut.
- Nothing peaks above the voice.

## Build checks (from analytics on Shorts 01–03; details in LESSONS.md §11)
1. Frame 0 is in motion: a character or the key object already doing something strange. No title card, no fade-in, no empty/establishing frame first.
2. On-screen hook text in the first 2 s: the hook claim in ≤5 words, large and centred.
3. Vik's bet, with the stake object on screen, lands by 5 s. If the VO puts it later, flag it; don't re-time around it.
4. No shot longer than 3 s in the first 15 s; cut on sentence boundaries.
5. Voice: Chatterbox, slowed 0.88–0.92 (pitch-preserving), overall ≤200 wpm incl. pauses, ~170–185 words, final 55–65 s.
6. Sentence pauses 0.25–0.4 s in the first 15 s (longer only at the payoff and respectful beats).
7. The end frame loops cleanly into frame 0.
QA on every preview and render:
- Contact-sheet frames at 0, 1, 2, 5, 10, 15 s: each shows the exact noun being spoken; none empty or text-only.
- Report the time Vik's bet lands, the VO wpm and the total length.
- If any of checks 1–5 fails: STOP and tell Aman before the full render.

## Workflow per Short
1. Read /briefs/<slug>.md and /audio/<slug>.mp3.
2. Build scenes exactly per the shot list.
3. Show me 6 stills (one per beat) and a 10 s opening preview with the mix before the final render.
4. QA: `python3 scripts/qa/sheet.py <slug>` must show zero flags; look at the contact sheet too.
5. Render to /out/<slug>.mp4 (`bash scripts/render.sh <slug>`), commit and push.
6. Later fixes: partial re-render only (`python3 scripts/splice.py <slug> <shot-id> ...`, or `--audio-only`).
