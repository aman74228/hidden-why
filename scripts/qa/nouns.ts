// Caption-noun check: every caption word that names a thing (emus, soldiers, guns,
// truck, hat, marbles, ball, farmers, the cast...) must be visible on screen while it
// is spoken. For each such word, the shot playing at its midpoint is checked: the
// thing has to be in that shot and at least one of its anchor points has to project
// inside the frame. A shot can declare deliberate absences:
//   "nounsOk": {"hat": "the empty post is the point"}
// Prints JSON lines. Run: npx -y tsx scripts/qa/nouns.ts <slug>
import fs from 'node:fs';
import * as THREE from 'three';
import {effectiveCamera, layoutCast} from '../../src/scene/framing';
import {ASPECT, DEFAULT_FOV, resolveMove} from '../../src/camera/moves';

type V3 = [number, number, number];
const slug = process.argv[2];
const L = JSON.parse(fs.readFileSync(`src/shots/${slug}.json`, 'utf8'));
const words: {word: string; start: number; end: number}[] = JSON.parse(fs.readFileSync(`src/captions/${slug}.json`, 'utf8'));
const FPS = 30;
const frames: number[] = L.shots.map((s: {duration: number}) => Math.max(1, Math.round(s.duration * FPS)));
const starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));

// spoken word -> thing
const NOUN: Record<string, string> = {
  emu: 'emus', emus: 'emus', bird: 'emus', birds: 'emus',
  soldier: 'soldiers', soldiers: 'soldiers', gunner: 'soldiers', gunners: 'soldiers', army: 'soldiers',
  farmer: 'farmers', farmers: 'farmers',
  gun: 'guns', guns: 'guns',
  truck: 'truck',
  hat: 'hat',
  marble: 'marbles', marbles: 'marbles',
  ball: 'ball', bowling: 'ball',
  nik: 'nik', vik: 'vik', gus: 'gus',
};

const cam = new THREE.PerspectiveCamera(DEFAULT_FOV, ASPECT, 0.1, 400);
const inFrame = (p: V3) => {
  const v = new THREE.Vector3(...p);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  if (v.clone().sub(cam.position).dot(fwd) <= 0.05) return false;
  const q = v.project(cam);
  return q.x > -0.96 && q.x < 0.96 && q.y > -0.96 && q.y < 0.96;
};

// anchor points of each thing in a shot at time t (seconds into the shot)
const anchors = (shot: any, t: number): Record<string, V3[]> => {
  const out: Record<string, V3[]> = {};
  const add = (k: string, p: V3) => (out[k] = [...(out[k] ?? []), p]);
  const fx = shot.fx ?? {};
  const env = fx.farm ?? fx.waterhole ?? {};
  for (const f of env.flocks ?? []) {
    const vx = f.vel?.[0] ?? 0, vz = f.vel?.[1] ?? 0;
    const cx = f.line ? (f.line.from[0] + f.line.to[0]) / 2 : f.center[0] + vx * t;
    const cz = f.line ? (f.line.from[1] + f.line.to[1]) / 2 : f.center[1] + vz * t;
    const sx = f.line ? Math.abs(f.line.to[0] - f.line.from[0]) / 2 : f.spread[0] / 2;
    const sz = f.line ? Math.abs(f.line.to[1] - f.line.from[1]) / 2 : f.spread[1] / 2;
    for (const [dx, dz] of [[0, 0], [-sx, 0], [sx, 0], [0, -sz], [0, sz]]) add('emus', [cx + dx, 1.3, cz + dz]);
    if (f.line) for (const q of [f.line.from, f.line.to]) add('emus', [q[0], 1.3, q[1]]);
    if (f.hat !== undefined) add('hat', [f.center[0], 1.75, f.center[1]]);
  }
  for (const e of env.emus ?? []) {
    const p: V3 = [e.pos[0] + (e.vel?.[0] ?? 0) * t, 1.35 * (e.s ?? 1), e.pos[1] + (e.vel?.[1] ?? 0) * t];
    if (!e.rise || t >= e.rise.at) for (const [dx, y] of [[0, 0.6], [0, 1.1], [0.4, 1.65], [-0.4, 1.65], [0, 1.65]]) add('emus', [p[0] + dx * (e.s ?? 1), y * (e.s ?? 1), p[2]]);
    if (e.hat) add('hat', [p[0], 1.72 * (e.s ?? 1), p[2]]);
  }
  for (const g of env.guns ?? []) add('guns', g.pos);
  if (env.gun) add('guns', env.gun.pos);
  if (env.truck) {
    const tr = env.truck;
    let x = tr.pos[0], z = tr.pos[2];
    if (tr.drive) {
      const k = Math.min(1, Math.max(0, (t - (tr.drive.at ?? 0)) / tr.drive.dur));
      x = tr.drive.from[0] + (tr.pos[0] - tr.drive.from[0]) * k;
      z = tr.drive.from[2] + (tr.pos[2] - tr.drive.from[2]) * k;
    }
    for (const dx of [-2.2, 0, 2.2]) add('truck', [x + dx, 1.2, z]);
    if (tr.guns) add('guns', [x + (tr.gunPost?.[0] ?? -0.9), 1.5, z + (tr.gunPost?.[2] ?? 0.3)]);
    for (const g of tr.heldGuns ?? []) add('guns', [x + g.pos[0], g.pos[1], z + g.pos[2]]);
  }
  if (env.hatPost && t >= (env.hatPostAt ?? 0)) add('hat', env.hatPost);
  if (fx.marbles) {
    const o = fx.marbles.origin ?? [0, 0, 0];
    add('marbles', [o[0], 0.05, o[2]]);
    if (!fx.marbles.noBall && t >= (fx.marbles.rollAt ?? 0)) add('ball', [o[0], 0.1, o[2]]);
  }
  for (const c of layoutCast(shot)) {
    if (c.appearAt !== undefined && t < c.appearAt) continue;
    if (c.hideAt !== undefined && t >= c.hideAt) continue;
    let x = c.pos?.[0] ?? 0, z = c.pos?.[1] ?? 0;
    const e = c.elev ?? 0;
    if (c.enter) {
      // same eases as Character's entrance
      const u = Math.min(1, Math.max(0, (t - (c.enter.at ?? 0)) / (c.enter.dur ?? 1.2)));
      const pw = c.enter.pow ?? 2;
      const k = c.enter.glide ? 0.5 - 0.5 * Math.cos(Math.PI * u) : c.enter.easeIn ? Math.pow(u, pw) : 1 - Math.pow(1 - u, pw);
      x = c.enter.from[0] + (x - c.enter.from[0]) * k;
      z = c.enter.from[1] + (z - c.enter.from[1]) * k;
    }
    const k = c.who === 'nik' || c.who === 'vik' || c.who === 'gus' ? c.who : c.who === 'soldier' ? 'soldiers' : 'farmers';
    for (const y of [0.4, 1.0, 1.6]) add(k, [x, y + e, z]);
    let holding = c.holding, props = c.props ?? [];
    for (const p of c.poses ?? []) if (t >= p.at) {
      if (p.holding !== undefined) holding = p.holding ?? undefined;
      if (p.props) props = p.props;
    }
    if (props.includes('fedora') || holding === 'fedora') add('hat', [x, 1.9 + e, z]);
    if (holding === 'bowling') add('ball', [x, 0.9 + e, z]);
  }
  return out;
};

const out: unknown[] = [];
for (const w of words) {
  const key = w.word.toLowerCase().replace(/['’]s$/, '').replace(/[^a-z]/g, '');
  const thing = NOUN[key];
  if (!thing) continue;
  const tm = (w.start + w.end) / 2;
  const f = Math.round(tm * FPS);
  let i = starts.findIndex((s0, k) => f >= s0 && f < s0 + frames[k]);
  if (i < 0) i = L.shots.length - 1;
  const shot = L.shots[i];
  if (shot.nounsOk?.[thing]) continue;
  if (shot.flow) continue; // footage (Google Flow): nothing to project; checked by eye on the contact sheet
  const p = Math.min(1, Math.max(0, (f - starts[i]) / Math.max(1, frames[i] - 1)));
  const m = effectiveCamera(shot);
  const pose = resolveMove(m, shot.cast ?? [])(p);
  cam.fov = m.fov ?? DEFAULT_FOV;
  cam.position.copy(pose.pos);
  cam.lookAt(pose.look);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const pts = anchors(shot, (f - starts[i]) / FPS)[thing] ?? [];
  if (!pts.some(inFrame)) out.push({t: +tm.toFixed(2), shot: shot.id, word: w.word, thing, reason: pts.length ? 'off screen' : 'not in the shot'});
}
console.log(JSON.stringify(out));
