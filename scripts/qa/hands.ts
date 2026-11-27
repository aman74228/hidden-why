// Hand-count QA helper (CHARACTERS.md rules 1, 4, 6). For every QA sample frame, lists each
// cast member's index (= its ID colour in the qaHands render pass), face box and whether
// something is allowed in front of the face (binoculars, or a shot's "allowFace"); plus every
// shot that draws hand sprites that are not a character's own hands (fx.hand, the paper /
// photo sheet's hands) — those break rule 1.
// Prints JSON. Run: npx -y tsx scripts/qa/hands.ts <slug>
import fs from 'node:fs';
import {shotBoxesAt, layoutCast} from '../../src/scene/framing';

const slug = process.argv[2];
const L = JSON.parse(fs.readFileSync(`src/shots/${slug}.json`, 'utf8'));
const FPS = 30;
const STEP = 15;
const frames: number[] = L.shots.map((s: {duration: number}) => Math.max(1, Math.round(s.duration * FPS)));
const starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));
const total = frames.reduce((a, b) => a + b, 0) + Math.round((L.payoffHold ?? 0.5) * FPS);

const sprites: unknown[] = [];
L.shots.forEach((s: any) => {
  const fx = s.fx ?? {};
  if (fx.hand) sprites.push({shot: s.id, what: 'fx.hand (a loose hand sprite)'});
  if (fx.paper && fx.paper.hands !== false) sprites.push({shot: s.id, what: 'paper sheet with its own hand sprites'});
  if (fx.photo && fx.photo.hands !== false) sprites.push({shot: s.id, what: 'photo sheet with its own hand sprites'});
});

const out: {frame: number; shot: string; cast: unknown[]}[] = [];
for (let f = 0; f < total; f += STEP) {
  let i = starts.findIndex((s0, k) => f >= s0 && f < s0 + frames[k]);
  if (i < 0) i = L.shots.length - 1;
  const shot = L.shots[i];
  const t = Math.min(f - starts[i], frames[i] - 1) / FPS;
  const p = Math.min(1, Math.max(0, (f - starts[i]) / Math.max(1, frames[i] - 1)));
  const cast = layoutCast(shot);
  const boxes = shotBoxesAt(shot, p);
  out.push({
    frame: f,
    shot: shot.id,
    cast: cast.map((c: any, k: number) => {
      let holding = c.holding, props = c.props ?? [];
      for (const q of c.poses ?? []) if (t >= q.at) {
        if (q.holding !== undefined) holding = q.holding ?? undefined;
        if (q.props) props = q.props;
      }
      const allowFace = holding === 'binoculars' || props.includes('binoculars') || Boolean(shot.allowFace);
      return {i: k, who: c.who, face: boxes[k]?.face, allowFace};
    }),
  });
}
console.log(JSON.stringify({frames: out, sprites}));
