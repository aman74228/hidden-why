# CHARACTERS: the Hidden Why cast (model sheet + hard rules)

Read with CLAUDE.md and LESSONS.md before every Short. The model sheet is
**public/characters/sheet.png**, rendered from the production rigs by
`python3 scripts/character_sheet.py` (rebuild it whenever a rig changes). Nobody is redesigned
per Short: outfits may be reskinned through the `outfit` prop, faces and colours never.

## The cast (src/characters/cast.ts, rig: src/characters/Character.tsx)
| | Role | Height | Look |
|---|---|---|---|
| **Nik** (was Milo, before that Chotu) | Curious kid, asks the question in the hook | 1.42 m | Oversized round head, cowlick, orange kurta with a yellow placket, wide eyes, blush |
| **Vik** | Bets and loses (always wrong) | 2.20 m | Tall and lanky, teal jacket with lapels, navy trousers, swept quiff, smug half-lidded eyes, one brow cocked |
| **Gus** | Old craftsman, shows the answer, never lectures | 1.62 m | Short and round, white beard and side tufts, round gold spectacles, cream shawl with saffron border over a brown robe |
| **Emu** (guest, Short #4; src/sets/emus.tsx) | Animal guest | ~1.75 m | Rounded mop of drooping brown-grey feathers, shaggy neck to bare blue-grey skin, small dark head, short broad flat bill, red-brown eye, scaly grey 3-toed legs |
| Extras: soldier, farmer | Background roles | 1.90 / 1.80 m | Same rig family (cast.ts) |

Views: every rig has `view: 'front' | 'threeq' | 'side'` (same parts, re-spaced: face features
slide to the facing side, the far eye shrinks or hides, the torso, shoulders and stance narrow).
`facing: 1 | -1` mirrors. The emu picks its view from its velocity relative to the lens.

Expressions are poses (src/characters/poses.ts): neutral `idle`, curious `curious`, smug `lean` /
`proud`, shocked `shock`, worried/sweating `nervous` (Vik losing), laughing `laugh`; payoff faces
`defeated`, `jaw-drop`.

Palette, outline: see the swatches on the sheet (read straight from the code). Ink outline 4 px on
screen at every distance (`OUTLINE_PX`), ink colour from src/theme.ts.

## HARD RULES (checked by `python3 scripts/qa/sheet.py <slug>`)
1. **Exactly 2 arms and 2 hands per character**, always attached at the shoulders and wrists.
   Never add extra hand sprites. Props are parented to the existing hand bones: one-handed props
   are `holding` tools drawn in hand A's frame; two-handed props (`binoculars`, `box`, `tin`) are
   held by solving both arms with 2-bone IK (`solveArm`) so the rig's own hands grip them.
   *QA: shots that draw hand sprites (`fx.hand`, the paper / photo sheet hands) are flagged;
   the ID-colour pass flags more than 2 arms or hands, and any hand not touching its own arm.*
2. **When a prop is raised (binoculars, a box), BOTH arms bend up from the shoulders to hold it**;
   nothing is left on the fence or table where the hands were. Use `holding: 'binoculars' | 'box' | 'tin'`
   (never draw the prop on the head or the set).
3. **Binoculars are held IN FRONT of the face**: lenses over the eyes, barrels pointing at the
   camera (seen end-on), the hands on the barrels. Never drawn as goggles or as a head prop.
4. **No body part may intersect the face or eyes** unless the brief asks for it (binoculars do).
   A shot can declare an intended overlap with `"allowFace": "<reason>"`.
   *QA: arm/hand pixels covering more than 4% of a face's eye band are flagged (binoculars and
   `allowFace` exempt).*
5. **Characters stay on-model**: the same proportions, outline weight and palette in every shot.
   Compare every still against sheet.png before delivering (side by side, same expression).
   Never scale one character differently from the others in a shot (`scale` stays 1) except a
   deliberate, declared reason.
6. **QA counts hands per character on every contact-sheet frame (expect 2)**: a second render
   pass (`--props '{"qaHands":true}'`) draws each character's own arms and hands in its ID colour
   on black (out/qa/<slug>/hands/); more than 2 hands, extra arms or floating hands are flagged.
   Fewer than 2 (a hand off-frame or behind a prop) is fine and is listed in the report
   (`hands_per_shot`).

## Past Shorts
Shorts #1–4 stay as published. Short #3 (paper and photo-sheet hands) and Short #4 (the old
binocular hands) predate these rules; the rig now holds binoculars with its own hands.
