# Hidden Why — Studio Rules (read every session)
Channel: Hidden Why — ancient engineering and everyday mysteries, explained in a minute.
ONE reusable studio. Never create a new project per Short. Each Short = a brief in /briefs + its voiceover in /audio.
**Before starting any Short, read LESSONS.md** (everything fixed on Short #1: hook, no voids/flat frames, inserts, mix levels, render pitfalls, partial re-render, script & story rules). Check against it before showing stills.

## Stack
Remotion + three.js (React Three Fiber), 1080x1920, 30 fps. No AI video generators.

## Cast (reusable rigs; reskin outfits per story, keep faces/colours)
- Milo: asks the question in the hook. Small kid, oversized round head, orange kurta, cowlick. Wide eyes, points.
- Vik: the mocker, guesses wrong 3 times, proven wrong at payoff. Tall, lanky, teal jacket, smug half-lidded eyes, raised eyebrow. Arms crossed, smirk.
- Gus: old craftsman, never explains, only shows. Short, round, white beard, cream shawl, small round spectacles. Calm nod, tiny smile.
Names changed Nov 2026: Milo was Chotu, Gus was Dada (Short #1 audio and its captions still say the old names).
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
- Voiceover: Chatterbox (Resemble AI, MIT), original model, built-in default voice (no cloning), exaggeration 0.5 base / cfg 0.3 / fixed seed 1750, all in voice.json (`"engine": "chatterbox"`; the ElevenLabs settings stay under `engines.elevenlabs` to switch back). Render line by line from audio/<slug>.lines.json (per-line exaggeration + pause after) with `scripts/vo_lines.py <slug>`: it whisper-checks every line (max 3 tries), inserts punctuation pauses (`scripts/vo_pauses.py`), joins, and writes audio/<slug>.mp3 + captions. No speed-up, ever.
- Word timestamps: Chatterbox gives none, so captions come from forced alignment of the final MP3 to the brief's script (scripts/align.py, faster-whisper; fallback: ffmpeg silencedetect).

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
- Every SFX at least 6 dB under the voice.
- Rain at -32 LUFS, fading out at the first cut.
- Nothing peaks above the voice.

## Workflow per Short
1. Read /briefs/<slug>.md and /audio/<slug>.mp3.
2. Build scenes exactly per the shot list.
3. Show me 6 stills (one per beat) and a 10 s opening preview with the mix before the final render.
4. QA: `python3 scripts/qa/sheet.py <slug>` must show zero flags; look at the contact sheet too.
5. Render to /out/<slug>.mp4 (`bash scripts/render.sh <slug>`), commit and push.
6. Later fixes: partial re-render only (`python3 scripts/splice.py <slug> <shot-id> ...`, or `--audio-only`).
