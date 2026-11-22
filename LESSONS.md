# Lessons from Short #1 (01-iron-pillar)

Everything the user had to send back on Short #1, turned into rules. Read this
with CLAUDE.md before starting any Short; check each section before showing stills.

## 1. Hook (0–3 s)
- Frame 1 is already the story: a character *doing* the hook action (Vik tapping the
  coin on the pillar in the rain, Milo looking up). No establishing shot, no logo, no fade-in.
- The action must read as motion: a visible wind-up and strike (two taps), a tiny spark
  and a matching SFX on each hit, and a slow push-in. Every character fully in frame.
- No frozen poses anywhere: every character breathes, blinks (1.5–4 s gaps, 4 frames)
  and sways; every hold has a creeping camera move. Only the 0.5 s payoff hold is still.

## 2. No voids, no flat frames
- Never a near-black, empty or flat-colour frame. An insert shows a real, textured,
  lit object with context (an edge, a rim light or a background), not a texture on a void.
- Close-ups of metal: PBR + HDRI washes out up close, and grazing-only light goes black.
  Use the generated hammered-iron material (`IronMat`/`hammeredIron()` in
  src/sets/materials.tsx): dark grey-brown, pitting, dull sheen, a faint carved band.
  Prefer close-ups of the real prop in its set (the pillar in the courtyard) over macros.
- "Doesn't rust" must show zero orange; reserve orange for things that rust.
- Hot iron = glowing mottled texture (`hotIron()`), grey impurity specks *on* its surface.
- Glassy sheen = a thin shell + a narrow moving highlight + sparkles; never a pale tube
  or a wide white band.
- Rust spot: coin-sized, irregular, with a short faint run-off (≤ 3x the spot's height).
  Never a blob on a stick (lollipop / ice-cream cone).
- Characters are billboards drawn on top: they cannot stand *behind* a prop. For a
  demo, put the props in the foreground, fully visible, and the characters beside them
  pointing (Gus left, Milo right), never in front of them.

## 3. Object inserts
- 3+ per Short; at most ~1.5 s each; each one must be identifiable in a single frame.
- A chain insert = toothed sprocket on spider arms + figure-8 link plates with rollers,
  chain wrapping the teeth. Never a flat disc.
- Follow a macro with a wider shot of the whole object (bike chain -> whole rusty bike).

## 4. Camera and captions
- A cut or strong camera move every 2–3 s; no shot over 3.5 s.
- Props closer than ~2 m to the lens and orbits through characters make giant blobs:
  check every camera path against cast positions.
- Captions: sentence case, ~68 px, at 70% height, nudged within 62–86% only when they
  would cover a face, judged over every shot a caption chunk spans (cuts mid-chunk).
  `npx -y tsx scripts/qa/faces.ts <slug>` must print `[]`.

## 5. Audio
- Sources: CC0 only, in this order: Kenney packs (via Kenney's own OpenGameArt uploads,
  kenney.nl blocks the cloud machine), OpenGameArt CC0, Wikimedia CC0/PD (rate-limited
  from the cloud machine). Freesound blocks the cloud machine. Credits in public/sfx/credits.json.
- NO whoosh/swoosh sounds, ever.
- `scripts/mix.py` enforces the mix; read its report (`*.levels.json`) every time:
  - voice -14 LUFS, limited to -1.5 dBTP;
  - music 8 dB under the voice between lines, ducked 3 dB more under speech,
    gain-ridden + compressed, and its 3 s loudness never below voice -12 dB
    (`checks.music_floor_ok`);
  - music peaks capped at -15 dBFS and a 0.3 s fade-in (the loop's first downbeat was
    the "spike in the first second");
  - every SFX: loudest 400 ms at -21 LUFS, transients limited to -10.5 dBFS, ducked so
    each 400 ms window stays >= 6 dB under the voice (`checks.sfx_windows_within_6dB_of_voice == 0`);
  - rain -32 LUFS, peaks <= -24 dBFS, fading out at the first cut;
  - nothing peaks above the voice (`peak_check`).
- Voice: Chatterbox original model, built-in default voice, seed 1750 (voice.json); rendered line by line with per-line exaggeration (`vo_lines.py`), max 3 tries per line; never speed up
  only (laughs/scoffs stay). Don't speed the voice up beyond what was approved.

## 6. Rendering pitfalls
- Each shot has its own WebGL context: anything GPU-side (PMREM environment maps,
  render targets) must be cached per renderer, never shared. A shared PMREM texture
  rendered metal black in the long render while every still looked fine.
- Stills and short renders start fresh, so they can hide bugs that only appear in the
  full sequential render. After a full render, compare it against the QA frames
  (luma per shot) before sending.
- Remotion writes a silent track: always mux the mix.py soundtrack (`scripts/render.sh`).
- CPU-only WebGL here: ~0.3 fps, ~1.7 h for a 62 s Short. Don't re-render everything for a fix.

## 7. Workflow
1. Voice -> `scripts/shots_<slug>.py` -> stills (6, one per beat) -> 10 s opening preview with the mix.
2. QA before the full render: `python3 scripts/qa/sheet.py <slug>` (2 fps contact sheet;
   flags dark/empty frames, > 3 s without movement, captions over faces). Fix to zero flags
   and also look at the sheet yourself.
3. Full render: `bash scripts/render.sh <slug>`.
4. Fixes after the final render: partial re-render only.
   `python3 scripts/splice.py <slug> <shot-id> ...` re-renders just those shots (widened to
   the surrounding keyframes, which x264 puts on cuts), stream-copies every other GOP, and
   re-muxes the current mix. Audio-only fixes: `--audio-only` (no frames rendered).
   Cut the old video with the segment muxer at keyframes (`-f segment -segment_frames`), never
   `-ss/-t -c copy` (that dragged 1–2 extra frames past every cut and drifted picture vs sound
   by 5 frames). Verify after every splice: same frame count, untouched frames bit-identical
   (framemd5), replaced frames different.
5. Commit and push after every step; send the files.

## 8. Script & story (from the Storytelling playbook)
- Chatterbox voice (cfg 0.3, seed 1750) speaks ~214–245 wpm (speech only), depending on the script: Short #2 214, Short #3 ~240. Budget ~195 words for 55–58 s.
- cfg_weight and exaggeration do NOT slow it (Short #3 tests, lines 4 + 10: cfg 0.5 243–247 wpm, 0.3 230–244, 0.15 228–237, 0.05 218–248; exaggeration 0.35 241–250; cfg 0.0 crashes). Too short -> add words (or longer pauses), never time-stretch.
- vo_pauses.py measures the natural gap at each punctuation mark and tops it up (or trims it) to the target; it never adds on top (a 0.32 s natural gap + 0.18 s gave a 0.55 s comma).
- Serious beats: low exaggeration (0.35) and `"pick": "lowest_pitch"` in lines.json (all tries rendered, the clean take with the lowest median pitch kept).
- Contradiction in the first 2 s; Vik's bet with a cost by 8 s; each wrong guess bigger than the last.
- A new open question every 8–10 s; explanation ≤ 12 s, split in two with a reaction between.
- Payoff = twist + callback to the hook; last line flows into the first for a clean loop.
- Every insert shows the exact noun in its line.
- Scripts flow with 'but/so' links, never fragment lists. Shots cut on whole sentences. Emotion comes from per-line exaggeration (Chatterbox reads no tags).
- Chatterbox ignores punctuation; always run vo_pauses.py (comma 0.18 s, colon/dash 0.30, inner full stop 0.35, question 0.40, ellipsis 0.55; values in voice.json).
- Say numbers the way they should be heard ("seventeen fifty" in the spoken line; captions keep "1750").

## 9. Short #3 review (03-plane-windows)
- The key visual of a Short gets the frame: the 1950s jet big, little glare, its windows countable.
- Under water: no glowing metal. Matte fuselage, darker water, light from the work lamps only.
- Macros need real surface detail: riveted aluminium skin, panel seams, a doubler and structure behind
  a cut-out. Start a crack where it really starts (a rivet hole by the corner). No flat backgrounds.
- No diagram overlays: show the physics in-world (photoelastic fringes between polarising films).
- Characters are drawn on top: in demo shots check that no character's screen box crosses the prop
  (`sheet_clear` in scripts/shots_03_plane_windows.py).
- Food close-ups: glossy crackled top, crumbly edges, a piece breaking off; the payoff ding lands on the
  loser's face, not on the object.
- Hook frame: no blown-out ceiling; the hook object (the window) clearly visible beside the face.
- Serious beats may dip the music to ~18 dB under the voice (`musicDip` with `floorExempt`).


## 10. Short #3 fix round 2
- Vik's poses must match the story beat. He is losing from the answer onwards; never celebrate.
  Losing reaction = `nervous` (head sunk into the shoulders, wobbly smile, worried brows, sweat drop,
  eyes sliding to the bet's prize); payoff face = `defeated` (brows up and in, mouth down, slump).
  Never `deadpan` or a neutral face on the payoff.
- A crack on food or props: it starts at a sharp corner that points at the lens, crosses the top in
  6–8 frames as a dark fissure with a lit lip, the piece shifts a few mm, and it holds until the cut.
  Its SFX lands on the word ("cracks"), not on the payoff.
- Whole figures only: never a half-face or half-body on the frame edge. Cut the character, or frame
  them whole; a pull-back must land on the whole figure early (`endAt` ~0.4).
- Demo two-shots: a portrait frame is width-limited (visible height ≈ 1.8 × group width). To make a
  demo read on a phone, stage the holder right behind the prop and the second character close
  beside it, so the group is ~1.5 m wide.
