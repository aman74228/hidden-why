# Brief #4: The War Australia Lost to Birds
Slug: `04-emu-war` · Strand: Strange war tactics (cartoony, no gore) · Target 54–58 s · 196 spoken words (Chatterbox reads about 237 wpm of speech, so this lands at about 50 s of speech plus pauses)
Read CLAUDE.md and LESSONS.md first. Cast: **Milo** (curious kid), **Vik** (bets and loses), **Gus** (shows the answer).

## Tone note
This is a comedy of failure, not a shooting video. Never show an emu being hit, wounded or dead: no blood, no carcasses, no feathers exploding. Gunfire reads as dust puffs in empty ground and birds sprinting away unharmed. Soldiers are frustrated, not menacing. The guns are period props, never pointed at the camera.

## New rules applied (from the Results table)
- The bet lands by 5 s, and nothing sits between the hook and the bet. "Australia, 1932" and "10,000 bullets" go on cards, not in the voiceover.
- The setup (5–20 s) is lean: one line of context, then straight into failures.
- After the answer (line 11), the payoff comes immediately (line 12), with no summary line.
- Final cut 60 s or less.

## Script: render sentence by sentence (Chatterbox, default voice, cfg 0.3, fixed seed), then run vo_pauses.py
| # | Line | Exag. | Pause after |
|---|---|---|---|
| 1 | How did an army with machine guns lose a war… to birds? | 0.6 | 0.4 s |
| 2 | Vik bets his favourite hat the birds never stood a chance. | 0.7 | 0.35 s |
| 3 | But twenty thousand emus were eating farms bare, so the army sent three soldiers and two machine guns. | 0.5 | 0.35 s |
| 4 | On day one, farmers herded the birds toward the guns, but the emus split into little groups and ran out of range. | 0.55 | 0.4 s |
| 5 | So the soldiers set a trap at a water hole, and over a thousand emus walked straight toward it. | 0.55 | 0.3 s |
| 6 | The gunners waited until the birds were close… and the gun jammed after just twelve. | 0.65 | 0.5 s |
| 7 | So they bolted a machine gun onto a truck, but the emus outran it at nearly fifty kilometres an hour, and the ground was so bumpy nobody could aim. | 0.6 | 0.4 s |
| 8 | After a week, the soldiers pulled out. | 0.45 | 0.5 s |
| 9 | That's when Gus rolls a bowling ball at a tight pack of marbles. Strike. | 0.6 | 0.4 s |
| 10 | Then he scatters them across the floor, and the ball hits just one. | 0.55 | 0.5 s (reaction shot) |
| 11 | You see, a machine gun only wins against a crowd, and the emus refused to be a crowd. | 0.55 | 0.35 s |
| 12 | And Vik's hat? An emu's wearing it. | 0.75 | 0.4 s |
| 13 | So next time someone says birds can't win a war, ask them… | 0.6 | none (loop cut to line 1) |
Target 54–58 s. If over 60 s, shorten pauses first (minimum 0.25 s). If still over, cut "On day one," from line 4.

## Story scorecard
- Question hook in the first 2 s ✅ (the absurd twist "to birds" lands last)
- Bet with a cost by 5 s ✅ (Vik's favourite hat)
- Flow uses but/so links, no fragment lists ✅
- Escalation: herding fails → the ambush gun jams → the truck can't aim → the army retreats ✅
- New question every 10 s or less ✅ (each failure sets up "so what did they try next?")
- Explanation 12 s or less, split by a reaction beat ✅ (strike → Vik's reaction → scattered marbles → the rule)
- One number plus one sensory detail ✅ ("nearly fifty kilometres an hour"; the bumpy truck ride)
- Payoff collects the bet straight after the answer, and the last line loops into the hook ✅

## Real-object reference (build props to look like this)
- **Emu**: about 1.5–1.9 m tall, shaggy grey-brown double-plumed feathers that look like hair, long bare blue-grey neck, small head, big round eyes, long powerful legs with three forward toes. Runs upright with a bouncy stride. NOT an ostrich (no black-and-white plumage, no bare pink legs).
- **Wheat field, Western Australia**: flat, dry, golden wheat with red-brown dirt, low scrub, a few gum trees, a wooden post-and-wire fence, a corrugated-iron farm shed and a windmill water pump.
- **Lewis gun (WWI-era light machine gun)**: long fat cylindrical cooling shroud around the barrel, a flat round pan magazine on top, a wooden stock, on a small bipod. Period-accurate shape, matte dark metal.
- **Soldiers**: three men in 1930s Australian khaki uniforms with slouch hats (one side of the brim pinned up). Cartoon-friendly, frustrated expressions.
- **Water hole / dam**: a muddy earth dam with a dirt bank, still brown water, reeds, hoof-churned mud.
- **1930s truck**: an open flatbed farm truck with a round-nosed bonnet, big round headlights, spoked wheels, wooden bed rails, dust trail.
- **Vik's hat**: a dark brown felt fedora with a saffron (#F2A33A) band. Establish it clearly in shot 2 so the payoff reads.
- **Gus's demo**: a black bowling ball with three finger holes, about 40 glass marbles (clear with coloured swirls) on a dusty wooden workshop floor.

## Sets
1. **Wheat farm, 1932** (NEW): golden field, fence, shed, windmill, gum trees, a farmhouse veranda (8+ props). Warm late-afternoon light, dust haze.
2. **Water hole** (NEW, small): earth dam, reeds, a gum tree, the soldiers' hide behind a dirt bank with the Lewis gun.
3. **Gus's workshop** (REUSE): marbles on the floorboards, bowling ball, warm light beams.

## Shot list (times are targets; re-time to the real voiceover; cut only on sentence boundaries)
| # | Line | Scene / action | Characters | Camera | On-screen | Viewer must understand |
|---|---|---|---|---|---|---|
| 1 | 1 | Milo on a farm fence, binoculars up; an emu head pops up right in front of the lenses | Milo, emu | MCU, quick push-in | — | The enemy is a bird |
| 2 | 2 | Vik taps his saffron-band fedora, then sets it on a fence post like a trophy, smug | Vik, Milo | MCU, push on the hat | Card: "THE BET: VIK'S HAT" | Stakes, by 5 s |
| 3 | 3 | A huge flock of emus wading through golden wheat, stalks flattening; cut to a truck pulling up with three soldiers and two Lewis guns | Emus, soldiers | Wide crane-down, then MCU on the guns | Cards: "AUSTRALIA, 1932" then "10,000 BULLETS" | Big problem, tiny army |
| 4 | 4 | Farmers wave hats to herd the flock; the flock splits into small groups that bolt in every direction, leaving the soldiers aiming at nothing | Farmers, emus, soldiers | Overhead drone view as the flock splits like a starburst | — | They won't bunch up |
| 5 | 5 | The water hole: soldiers crouched behind a dirt bank; a long line of emus marching toward the water | Soldiers, emus | Low angle over the gun, rack focus to the emus | Card: "THE AMBUSH" | A trap is set |
| 6 | 6 | Sweat on a soldier's face; he squeezes; the gun goes "chk"; the pan magazine is stuck; emus scatter unharmed | Soldiers, emus | CU on the soldier, then insert on the jammed gun | — | It failed at the worst moment |
| 7 | 7 | The truck bouncing across rough ground, gunner hanging on, barrel wobbling wildly; emus running alongside, overtaking it | Soldiers, emus | Tracking side shot, then a shaky POV down the gun | Speed card: "≈ 50 KM/H" | Faster than the truck; can't aim |
| 8 | 8 | Soldiers loading the truck to leave; one emu watches from the fence and blinks | Soldiers, emu | Wide, slow pull-back | — | The army gave up |
| 9 | 9 | Gus's workshop: a tight triangle of marbles; Gus rolls the bowling ball; strike, marbles burst apart | Gus, Milo, Vik | Low floor-level insert, then MCU | — | A crowd is easy to hit |
| 9b | (pause) | Reaction: Milo grins; Vik glances nervously at his hat | Milo, Vik | 2-shot | — | Breather |
| 10 | 10 | Gus scatters the marbles across the floorboards; rolls again; the ball clips one marble and the rest sit untouched | Gus | High angle over the floor, then insert | — | Spread out = nearly impossible to hit |
| 11 | 11 | Gus holds the bowling ball, nods at the scattered marbles | Gus | MCU | — | Guns beat crowds, not scattered birds |
| 12 | 12 | Back at the farm fence: an emu stands proudly wearing Vik's fedora, then struts off; Vik's jaw drops; Milo laughs; ding | Emu, Vik, Milo | CU on the emu in the hat, then Vik's face | — | Bet lost, callback |
| 13 | 13 | Milo back on the fence with binoculars (matches shot 1) | Milo | MCU matching shot 1 | — | Loop into the hook |
| 14 | — | Hold 0.5 s, hard cut to shot 1 | — | — | — | Seamless loop |

## SFX cues (CC0 library only, no whooshes)
Farm ambience (wind in wheat, distant magpie), emu footsteps/thuds on dirt, an emu's deep drumming boom (low, soft), truck engine and rattling bed, a dry "chk" gun jam click, distant muffled gunfire (soft pops, never loud, at least 12 dB under the voice), bowling-ball roll and strike clatter, marbles scattering, single marble click, ding (payoff only). Music bed per CLAUDE.md: light, comic, march-like is fine.

## Fact sheet (keep claims at this strength)
| Claim in the script | Source |
|---|---|
| About 20,000 emus were damaging wheat farms in Western Australia, 1932 | Britannica, "Emu War"; National Geographic |
| The army sent three soldiers with two Lewis machine guns (and 10,000 rounds, on a card) | Britannica; History Hit; Wikipedia, "Emu War" |
| On 2 Nov, settlers herded the birds toward an ambush, but they split into small groups and ran out of range | Wikipedia, "Emu War"; History Hit |
| At a dam ambush, over 1,000 emus were heading toward the gunners, who waited until they were close; the gun jammed after only 12 birds | Wikipedia, "Emu War"; Scientific American blog |
| A gun was mounted on a truck, but the truck couldn't keep up on rough ground and the gunner couldn't aim | Britannica; Mental Floss; History Hit |
| Emus run at nearly 50 km/h | General zoology (emu top speed about 48–50 km/h) |
| The soldiers withdrew after about a week (8 Nov) | Britannica; Australian Geographic |
| **Nuance we deliberately keep:** the soldiers returned on 13 Nov and by 10 Dec claimed 986 kills for 9,860 rounds, with minimal impact on the emu population. The script only says they pulled out "after a week", which is true of the first campaign. | Wikipedia; Britannica |
| Vik's hat, the hat-wearing emu and Gus's bowling demo | Invented cartoon storyline (the scatter demo is a real, repeatable demo) |

## Upload pack
- **Title:** The War Australia Lost to Birds
- **Description:**
  In 1932, Australia sent soldiers with machine guns after 20,000 emus. The emus won. Here's the hidden reason why.

  #history #emuwar #australia
- **Tags:** emu war, great emu war, australia emu war, emu war explained, australia lost to emus, emus vs army, weird history, strange war stories, animated history, hidden why
- **Settings:** Not made for kids · Category: Education · Altered or synthetic content: No · Comments on
- **Pinned comment:** "Would you have bet your hat on the army? 🎩"
- **Thumbnail frame:** the emu wearing Vik's fedora
- **Schedule:** Thursday 26 Nov, 3:30 AM IST (Wednesday 5:00 PM ET). Fallback: Saturday 28 Nov, 2:30 AM IST (Friday 5:00 PM ET)

## Deliver
Voice (sentence by sentence, then vo_pauses.py) → full VO MP3 for review → shots → 6 stills (shots 1, 2, 4, 6, 10, 12) plus a 15 s opening preview with the mix plus a 2 fps QA contact sheet. One fix round, then the full render.
