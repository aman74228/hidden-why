// Caption-over-face check: for every caption chunk, project the on-screen
// cast's face boxes at that moment and flag overlaps with the caption box
// (centred at 70% height). Prints JSON lines. Run: npx -y tsx scripts/qa/faces.ts <slug>
import fs from 'node:fs';
import {chunkWords, captionBox} from '../../src/overlays/Captions';
import {overlaps, placeCaption, shotBoxesAt} from '../../src/scene/framing';

const slug = process.argv[2];
const L = JSON.parse(fs.readFileSync(`src/shots/${slug}.json`, 'utf8'));
const words = JSON.parse(fs.readFileSync(`src/captions/${slug}.json`, 'utf8'));
const FPS = 30;
const frames = L.shots.map((s: {duration: number}) => Math.max(1, Math.round(s.duration * FPS)));
const starts = frames.map((_: number, i: number) => frames.slice(0, i).reduce((a: number, b: number) => a + b, 0));
const out: unknown[] = [];
for (const c of chunkWords(words)) {
  for (const t of [c.start, (c.start + c.end) / 2, c.end - 0.02]) {
    const f = Math.round(t * FPS);
    let i = starts.findIndex((s: number, k: number) => f >= s && f < s + frames[k]);
    if (i < 0) i = L.shots.length - 1;
    const p = Math.min(1, Math.max(0, (f - starts[i]) / Math.max(1, frames[i] - 1)));
    const text = c.text.replace(/["“”.,;:]/g, '');
    const b = captionBox(text);
    // placement is decided once per chunk, at its start (same as Short.tsx)
    const f0 = Math.round(c.start * FPS);
    let i0 = starts.findIndex((s: number, k: number) => f0 >= s && f0 < s + frames[k]);
    if (i0 < 0) i0 = L.shots.length - 1;
    const p0 = Math.min(1, Math.max(0, (f0 - starts[i0]) / Math.max(1, frames[i0] - 1)));
    const at = (tt: number) => {
      const ff = Math.round(tt * FPS);
      let k = starts.findIndex((s0: number, kk: number) => ff >= s0 && ff < s0 + frames[kk]);
      if (k < 0) k = L.shots.length - 1;
      return shotBoxesAt(L.shots[k], Math.min(1, Math.max(0, (ff - starts[k]) / Math.max(1, frames[k] - 1))));
    };
    void p0; void i0;
    const y = placeCaption([...at(c.start), ...at((c.start + c.end) / 2), ...at(c.end - 0.02)], b.w, b.h);
    const cap = {x0: 0.5 - b.w / 2, x1: 0.5 + b.w / 2, y0: y - b.h / 2, y1: y + b.h / 2};
    for (const cb of shotBoxesAt(L.shots[i], p)) {
      if (overlaps(cap, cb.face)) {
        out.push({t: +t.toFixed(2), shot: L.shots[i].id, caption: text, who: cb.who, y: +y.toFixed(2)});
        break;
      }
    }
  }
}
console.log(JSON.stringify(out));
