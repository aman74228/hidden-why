# Hidden Why — motion studio

One reusable Remotion + React Three Fiber studio (1080×1920, 30 fps). Rules: see `CLAUDE.md`.

```
src/characters/   Milo, Vik, Gus rigs (flat 2D parts in 3D, 4px outlines) + poses
src/sets/         toon sets (courtyard, desert, workshop, plain) + sky/ground/light presets
src/camera/       dolly / orbit / pushIn / static-drift helpers
src/overlays/     Captions (1–2 words @ 60%), TitleCard (label + big word)
src/scene/        JSON-driven Short template (cuts, whoosh, ding, -22 dB bed, 0.5 s loop hold)
src/shots/        one shot list per Short  (<slug>.json → composition id <slug>)
src/captions/     word timestamps per Short (scripts/align.py)
briefs/ audio/    your brief + ElevenLabs voiceover
```

Per Short:
```bash
python3 scripts/align.py <slug>     # captions from audio/<slug>.mp3 + briefs/<slug>.md
npm run stills -- <slug>            # one still per beat -> out/stills/<slug>/
npm run render -- <slug>            # -> out/<slug>.mp4
npm run studio                      # live preview
```
`src/shots/studio-test.json` is a reference shot list exercising every component.
