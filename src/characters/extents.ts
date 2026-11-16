import {CAST, CastName} from './cast';
import {PoseName, poseAt} from './poses';

const D = Math.PI / 180;

// Horizontal reach of a character (world units, relative to its x) over the
// pose's animation cycle: [left, right] — includes arms, hands and fingers.
export const reachX = (who: CastName, pose: PoseName = 'idle', facing: 1 | -1 = 1, scale = 1): [number, number] => {
  const s = CAST[who];
  // at least as wide as the head (Chotu's head is wider than his body)
  const half = Math.max(s.body.w / 2, s.headR * s.headSX * 1.15);
  let l = half;
  let r = half;
  for (let k = 0; k < 12; k++) {
    const p = poseAt(pose, k * 0.17, 0);
    if (p.armsCrossed) break; // folded arms stay inside the torso
    for (const side of [1, -1] as const) {
      const [a1, a2] = side === 1 ? p.armA : p.armB;
      const t1 = side * a1 * D;
      const t2 = t1 + side * a2 * D;
      const hand = s.armR * 1.7 + (p.finger && side === 1 ? s.armR * 2.4 : 0);
      const ex = side * s.shoulderX + Math.sin(t1) * s.upper;
      const hx = ex + Math.sin(t2) * (s.lower + hand);
      const x = Math.max(Math.abs(ex), Math.abs(hx)) * Math.sign(hx || ex) + side * s.armR * 1.2;
      // mirrored characters swap sides
      const wx = x * facing;
      l = Math.max(l, -wx);
      r = Math.max(r, wx);
    }
  }
  return [l * scale, r * scale];
};
