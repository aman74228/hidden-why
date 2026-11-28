# Short #5 (05-india-medicine): Google Flow clips

Upload the clips here with exactly these names (they are committed, not git-ignored, so renders
work in fresh sessions).

| File | Scene | Lines |
|---|---|---|
| 01.mp4 | Hook: Nik asks Gus | line 1, plus its last 3.7 s for the line 12 loop |
| 02.mp4 | Bet: Vik's chocolate tin | line 2 |
| 03.mp4 | London pharmacy | lines 3–4 |
| 04.mp4 | US pharmacy counter | line 5 |
| 05.mp4 | Village clinic cold box | line 6 |
| 06.mp4 | Gold box vs plain box, identical tablets | lines 7–8 |
| 07.mp4 | Medicine factory | line 9 |
| 08.mp4 | Payoff: Vik hands over the chocolate | line 11 |
| 09.mp4 | 2001 office desk, push-in onto a blank price tag (the 2001 price card lands on it) | line 10 |

Source: Google Flow, Omni 1.2 Flash, 720x1280, 8 s each, visible Flow watermark.

Built by `scripts/shots_05_india_medicine.py`; `scripts/flow_prep.py 05-india-medicine` upscales the clips
(lanczos, 1080x1920, 30 fps) into `hd/` (git-ignored, rebuilt automatically) and builds the ambience
bed from their own sound with any speech removed. Clip 03 is 0.45 s short of lines 3–4: its last
frame is held with a slow push-in.
