# Brief #6: What If All the Ants Disappeared?
Slug: `06-ants` · Series: **What if…** · Global audience · Target 55–65 s
Read CLAUDE.md (Build checks), LESSONS.md §11 and CHARACTERS.md first. Cast: **Nik**, **Vik**, **Gus**.
Footage: Google Flow clips `public/flow/06/01.mp4`–`09.mp4` (720x1280, 8 s each, all checked by Aman).

## Voice plan
- **[FLOW]** lines are spoken inside their Flow clip. Keep that clip's dialogue audio at −14 LUFS, duck the music under it, and do NOT render those lines in Chatterbox.
- All other lines: Chatterbox (default voice, base exaggeration 0.5, cfg 0.3, seed 1750), rendered line by line, whisper-checked, then slowed with a pitch-preserving stretch of **0.90** (0.88–0.92 band). Never speed up.
- Pauses: 0.25–0.4 s in the first 15 s; longer (0.5–0.6 s) only before the payoff line.
- Target: overall ≤200 wpm including pauses, final 55–65 s. Report the actual wpm and length.

## Script (177 spoken words: 166 narration + 11 [FLOW])
| # | Who | Line | Exag. | Pause after | Clip |
|---|---|---|---|---|---|
| 1 | **[FLOW] Nik** | What if all the ants disappeared? | — | 0.25 s | 01 |
| 2 | **[FLOW] Vik** | Good! Nobody would even notice! | — | 0.25 s | 02 |
| 3 | Narrator | Vik bets his whole picnic on it. | 0.7 | 0.3 s | 02 (tail, sandwich on screen) |
| 4 | Narrator | But there are about twenty quadrillion ants on Earth, and together they outweigh every wild bird and mammal combined. | 0.55 | 0.3 s | 03 (start, ants marching) |
| 5 | Narrator | That's about two and a half million for every person. | 0.55 | 0.3 s | 03 |
| 6 | Narrator | So when they vanish, everything they were carrying just… drops. | 0.6 | 0.4 s | 03 (the vanish) |
| 7 | Narrator | Ants are the planet's cleanup crew. Without them, fallen fruit, dead leaves and bugs pile up and rot right where they land. | 0.55 | 0.35 s | 04 |
| 8 | Narrator | Then the ground changes. Ant tunnels let air and water into the soil, and without them, it packs down hard. | 0.55 | 0.35 s | 05 |
| 9 | Narrator | So Gus waters two pots. | 0.6 | 0.3 s | 06 (start) |
| 10 | Narrator | The one full of tunnels drinks the water straight down to the roots. The packed one? It just spills over. | 0.6 | 0.4 s | 06 |
| 11 | Narrator | And the seeds? Many plants rely on ants to carry their seeds underground. Now they just lie there. | 0.55 | 0.35 s | 07 |
| 12 | Narrator | So forests start to thin, one missing tiny worker at a time. | 0.5 | 0.55 s | 07 (pull-back) |
| 13 | Narrator | And Vik's picnic? Buried under rotting leaves. Turns out he'd miss them after all. | 0.75 | 0.4 s | 08 |
| 14 | Narrator | So next time you step on one, ask yourself… | 0.6 | none (loop cut to frame 0) | 09 |
If over 65 s: shorten pauses first (min 0.25 s), then cut line 5.

## Build checks (must pass before the full render)
1. **Frame 0 in motion:** clip 01 starts mid-action (Nik following the ant trail). No title card, no fade-in.
2. **Hook text, 0–2 s:** large, centred, ≤5 words: **"NO MORE ANTS?"** (indigo/saffron card style, big).
3. **Bet by 5 s:** Vik's [FLOW] line with the sandwich on screen. Trim clip 01 to just Nik's line (~2.5 s) so Vik lands by 5 s. If it lands later, STOP and report.
4. **No shot longer than 3 s in the first 15 s:** split clips 01–03 into 2–3 framings each (cut, or a punch-in on the same clip), cutting on sentence boundaries.
5. **Loop:** clip 09's last frame hard-cuts into frame 0 of clip 01 (same pose and framing).

## Shot list (re-time to the real VO; trim or hold, never speed-ramp)
| # | Clip | Lines | Use | On-screen |
|---|---|---|---|---|
| 1 | 01 | 1 | Nik following the ants, looks up and asks | Hook text "NO MORE ANTS?" 0–2 s |
| 2 | 02 | 2–3 | Vik slaps down the sandwich, "Nobody would even notice!"; punch-in on the sandwich for line 3 | Card: "THE BET: VIK'S PICNIC" |
| 3 | 03 | 4–6 | Ant trail (wide, then macro punch-in); the ants vanish exactly on "drops" | Cards: "20 QUADRILLION ANTS", then "OUTWEIGH ALL WILD BIRDS + MAMMALS" |
| 4 | 04 | 7 | The mess builds; Nik and Vik holding their noses | — |
| 5 | 05 | 8 | Gus's trowel hits hard, cracked soil; a plant wilts | — |
| 6 | 06 | 9–10 | Two pots: water sinks through the tunnels vs spills over (Gus's demo) | Small labels under the pots: "TUNNELS" / "PACKED" |
| 7 | 07 | 11–12 | Seeds lie there; pull back to a thinning forest | — |
| 8 | 08 | 13 | Payoff: the picnic is buried, Vik pinches his nose; one ant returns, Vik's thumbs-up | Ding on Vik's face |
| 9 | 09 | 14 | Nik with an ant on his finger looks up (matches frame 0) | — |

## SFX (CC0 only, no whooshes)
Garden birds and wind (01, 02, 08, 09), tiny ant footsteps/ticks (03), sparkle pops on the vanish (03), flies buzzing (04, 08, at least 12 dB under the voice), trowel clunk on hard ground (05), water pour + gurgle vs splash-over (06), soft seed patter (07), ding (payoff only). Music per CLAUDE.md, playful; duck under the [FLOW] lines.

## Fact sheet
| Claim | Source |
|---|---|
| About 20 quadrillion ants on Earth (a conservative estimate) | Schultheiss et al., PNAS 119(40), 2022 |
| Ants outweigh all wild birds and mammals combined (~12 Mt dry carbon) | Schultheiss et al., PNAS 2022 |
| About 2.5 million ants per person | NPR, Sept 2022, reporting the PNAS study |
| Ants aerate the soil, disperse seeds and break down organic material (the "cleanup crew") | Wong et al., The Conversation / phys.org, Sept 2022; UWA news release |
| **Nuance:** "what if they vanished" is a thought experiment; we show plausible effects (more litter, harder soil, fewer seeds spread), never claim an exact collapse date. | — |
| Vik's bet, the picnic, the vanishing effect | Invented cartoon storyline |

## Upload pack
- **Title:** What If All the Ants Disappeared?
- **Description:**
  There are about 20 quadrillion ants on Earth. Vik thinks nobody would miss them. Here's what would actually happen.

  #whatif #ants #nature
- **Tags:** what if all the ants disappeared, what if ants disappeared, ants, why ants are important, 20 quadrillion ants, ant facts, what if, nature explained, animated what if, hidden why
- **Settings:** Not made for kids · Education · Altered or synthetic content: No (an obvious cartoon) · Comments on
- **Pinned comment:** "Would YOU miss them? 🐜"
- **Thumbnail frame:** Vik pinching his nose over the buried picnic
- **Schedule:** the next free slot after the render (weekdays 3:30 AM IST = 5 PM ET; weekends 11 PM IST)
