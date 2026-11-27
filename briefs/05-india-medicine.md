# Brief #5: What If India Stopped Making Medicine?
Slug: `05-india-medicine` · Series: **What if…** (new format) · Target 54–58 s · 196 spoken words (Chatterbox ≈ 237 wpm of speech)
Read CLAUDE.md, LESSONS.md and **CHARACTERS.md** first. Cast: **Nik** (curious kid, renamed from Milo; same look), **Vik** (bets and loses), **Gus** (shows the answer).

## The new "What if" format (applies from this Short on)
- 0–2 s: Nik asks Gus the what-if, out loud, mid-action.
- By 5 s: Vik bets on the outcome (always wrong).
- Gus takes them INTO the what-if: real places where the change happens in front of them. Explanations stay in the world, never diagrams.
- Escalate place by place (bigger stakes each stop), then Vik asks "why?", Gus answers with one object demo.
- Payoff within ~4 s of the answer: the bet is collected with a twist; the last line loops into the question.
- Tone: proud and positive about the country, never mocking another country, no flags waved at anyone.

## Script: render sentence by sentence (Chatterbox, default voice, cfg 0.3, fixed seed), then run vo_pauses.py
| # | Line | Exag. | Pause after |
|---|---|---|---|
| 1 | What if India stopped making medicine… tomorrow? | 0.65 | 0.4 s |
| 2 | Vik bets his whole chocolate stash that nobody would even notice. | 0.7 | 0.35 s |
| 3 | But Gus just walks Nik into a pharmacy in London, and taps the shelf. | 0.55 | 0.3 s |
| 4 | About one in every four medicines here comes from India, and they blink out of existence. | 0.6 | 0.4 s |
| 5 | So they jump to America, where about four in ten generic prescriptions are Indian, and those boxes vanish too. | 0.6 | 0.4 s |
| 6 | Then to a village clinic, where most of UNICEF's children's vaccines were made in India… and the cold box goes empty. | 0.5 | 0.6 s |
| 7 | Now Vik is sweating, but he asks the real question: why India? | 0.7 | 0.4 s |
| 8 | Gus holds up two pills that do exactly the same job. | 0.55 | 0.3 s |
| 9 | When a medicine's patent runs out, anyone can make it, and Indian factories learned to make the same pill for a tiny fraction of the price, by the billions. | 0.55 | 0.4 s |
| 10 | In two thousand and one, one Indian company took an HIV treatment that cost ten thousand dollars a year, and offered it for under a dollar a day. | 0.55 | 0.5 s |
| 11 | And Vik? He hands over his chocolate… then reaches for a headache pill. Made in India. | 0.75 | 0.4 s |
| 12 | So next time you open a medicine box, check the back, and ask… | 0.6 | none (loop cut to line 1) |
If over 60 s: shorten pauses first (min 0.25 s), then cut "about" from lines 4 and 5.

## Story scorecard
- Question hook in the first 2 s ✅ · Bet with a cost by 5 s ✅ (Vik's chocolate stash)
- Escalation: one shelf in London → a whole country's prescriptions → babies' vaccines ✅
- New question every ≤ 10 s ✅ (each stop asks "where next?", then "why India?")
- Explanation ≤ 12 s, in the world ✅ (two identical pills, then the 2001 price drop)
- Payoff = bet collected + twist (he needs an Indian pill) + loop ✅

## Real-object reference
- **Pharmacy shelves (London, modern)**: white shelving, rows of small white-and-coloured cardboard medicine boxes and blister packs, plain made-up product names only (NO real brands or logos). Each "Indian" box gets a small saffron "Made in India" line on the back/side.
- **US pharmacy counter**: amber plastic pill bottles with white caps and white labels, a counter bell, bag of prescriptions.
- **Village clinic**: whitewashed room, wooden bench, a blue vaccine cold box (insulated carrier) with small glass vials with coloured caps, a mother holding a baby in the background (calm, no needles in arm on screen).
- **The vanish effect**: Indian-made items flash a soft saffron outline, then disappear with a tiny dust puff, leaving gaps on the shelf. No whoosh; use a soft "pop" / cardboard tick.
- **Gus's demo**: two identical white round tablets on Gus's palm, one from a fancy gold box, one from a plain box; a price tag above each (big number vs tiny number).
- **2001 beat**: a modest 2001 office/lab: old CRT monitor, wall calendar showing 2001, a price tag "$10,000 / year" flipping to "under $1 / day". No real company names or logos.
- **Payoff**: Vik's chocolate stash (a stack of wrapped bars in a tin) handed to Nik; Vik rubs his temple, opens a plain painkiller box, turns it over: "Made in India" in saffron.

## Sets
1. **Gus's workshop** (REUSE): the question and the bet.
2. **London pharmacy** (NEW). 3. **US pharmacy counter** (NEW, small). 4. **Village clinic** (NEW, small). 5. **2001 lab office** (NEW, tiny insert).
Travel between places: hard cuts with a saffron location card (no transition effects).

## Shot list (re-time to the real VO; cut only on sentence boundaries)
| # | Line | Scene / action | Characters | Camera | On-screen | Must understand |
|---|---|---|---|---|---|---|
| 1 | 1 | Nik tugs Gus's sleeve holding a medicine box, asking | Nik, Gus | MCU, push-in | — | The question |
| 2 | 2 | Vik slams his chocolate tin on the bench, smug | Vik, Nik | MCU, push on tin | Card: "THE BET: VIK'S CHOCOLATE" | Stakes by 5 s |
| 3 | 3 | Hard cut: London pharmacy; Gus taps a full shelf | Gus, Nik, Vik | Wide → MCU | Card: "LONDON" | We're inside the what-if |
| 4 | 4 | Every 4th box glows saffron, then pops away; gaps appear | — | Insert on shelf, slow push | Card: "1 IN 4 MEDICINES" | Big share, visible |
| 5 | 5 | US counter: amber bottles in a row; 4 of 10 vanish | Nik, Vik | Insert, then 2-shot reacting | Cards: "USA" · "4 IN 10 GENERICS" | Bigger |
| 6 | 6 | Clinic: Gus opens the cold box; vials vanish; mother and baby wait | Gus, Nik, Vik | Wide → insert on cold box | Card: "UNICEF VACCINES: ~6 IN 10" | Highest stakes, calm and respectful |
| 7 | 7 | Vik sweating, tugging his collar | Vik | CU | — | Turn: why? |
| 8 | 8 | Gus's palm with two identical pills, price tags above | Gus | Insert | — | Same medicine |
| 9 | 9 | Quick montage in ONE factory: a pill press stamping thousands of tablets, conveyor of boxes | — | Insert, push | — | Scale + low price |
| 10 | 10 | 2001 office: price tag flips $10,000/yr → under $1/day | — | Insert on tag | Card: "2001" | The proof |
| 11 | 11 | Vik hands the tin to Nik; rubs temple; flips a painkiller box: "Made in India"; ding | Vik, Nik | MCU → insert on box → Vik's face | — | Bet lost + twist |
| 12 | 12 | Nik turns a medicine box over, looks at camera (matches shot 1) | Nik | MCU | — | Loop |

## SFX (CC0 only, no whooshes)
Pharmacy door bell, shelf/cardboard ticks, soft pops for vanishing items, pill bottle rattle, clinic ambience (fan, birds), cold-box lid click, pill press thumps, price tag flip, chocolate tin rattle, ding (payoff only). Music bed per CLAUDE.md; dip 3 dB on line 6.

## Fact sheet (keep claims at this strength)
| Claim | Source |
|---|---|
| India is the largest supplier of generic medicines, ~20% of global supply | PIB (Govt of India) 2026 factsheet; Invest India |
| ~25% of all medicine in the UK and ~40% of US generic demand come from India | ISPE, "Indian Pharmaceutical Industry Creating Global Impact" (2025) |
| Indian makers provide about 60% of UNICEF's vaccine supplies | PIB 2026 factsheet |
| Generics: once a patent expires, others can make the same medicine at far lower prices | General pharma knowledge |
| In 2001 an Indian generic maker offered AIDS triple therapy for $350/yr (under $1/day) vs about $10,000–15,000/yr in the US/Europe | MSF press release (Feb 2001); Nature (2001) |
| **Nuance:** some official figures put India at only ~14% of US *imported* generics; we say "about four in ten generic prescriptions" per ISPE and keep "about". We never name the company. | Angel One/IBEF (14%); ISPE (40%) |
| Vik's bet, the vanishing effect, the payoff | Invented cartoon storyline |

## Upload pack
- **Title:** What If India Stopped Making Medicine?
- **Description:**
  One in five generic medicines on Earth is made in India. So what happens if it all stops… tomorrow?

  #whatif #india #medicine
- **Tags:** what if india stopped making medicine, pharmacy of the world, india generic medicine, india vaccines, what if, what if india, generic drugs explained, made in india, animated what if, hidden why
- **Settings:** Not made for kids · Education · Altered/synthetic: No · Comments on
- **Pinned comment:** "Check your medicine box. Where was it made? 👀💊"
- **Thumbnail frame:** the London shelf with saffron gaps, Nik's shocked face
- **Schedule:** next weekday slot after the render, 3:30 AM IST (5 PM ET)

## Deliver
VO → full VO MP3 for review → 6 stills (shots 1, 2, 4, 6, 8, 11) + 15 s preview + 2 fps QA sheet → one fix round → full render.
