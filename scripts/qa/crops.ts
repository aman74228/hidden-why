// Edge-crop check: every 0.5 s, project each cast member's face and body boxes
// and flag any that straddle the left, right or top frame edge (a half-face or
// half-body on the edge reads as a mistake). Legs cut by the bottom edge are
// normal framing and are not checked. A shot can opt out with
// `"allowCrop": "<reason>"` (a deliberate tight reaction crop).
// Prints JSON. Run: npx -y tsx scripts/qa/crops.ts <slug>
import fs from 'node:fs';
import {shotBoxesAt} from '../../src/scene/framing';

const slug = process.argv[2];
const L = JSON.parse(fs.readFileSync(`src/shots/${slug}.json`, 'utf8'));
const FPS = 30;
const STEP = 15;
const frames: number[] = L.shots.map((s: {duration: number}) => Math.max(1, Math.round(s.duration * FPS)));
const starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));
const total = frames.reduce((a, b) => a + b, 0);

type Box = {x0: number; x1: number; y0: number; y1: number};
// fraction of the box inside the frame horizontally / from the top
const visible = (b: Box) => {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  if (w <= 0 || h <= 0) return 1;
  const fx = Math.max(0, Math.min(1, b.x1) - Math.max(0, b.x0)) / w;
  const fy = Math.max(0, b.y1 - Math.max(0, b.y0)) / h;
  return fx * Math.min(1, fy);
};

const out: unknown[] = [];
for (let f = 0; f < total; f += STEP) {
  const i = starts.findIndex((s, k) => f >= s && f < s + frames[k]);
  const shot = L.shots[i];
  if (shot.allowCrop) continue;
  const p = Math.min(1, Math.max(0, (f - starts[i]) / Math.max(1, frames[i] - 1)));
  for (const b of shotBoxesAt(shot, p)) {
    for (const part of ['face', 'body'] as const) {
      const v = visible(b[part]);
      if (v > 0.04 && v < 0.96) {
        out.push({t: +(f / FPS).toFixed(2), shot: shot.id, who: b.who, part, visible: +v.toFixed(2)});
        break;
      }
    }
  }
}
console.log(JSON.stringify(out));
