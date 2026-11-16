import * as THREE from 'three';
import {ASPECT, CamPose, CameraMove, DEFAULT_FOV, resolveMove} from '../camera/moves';
import {CAST} from '../characters/cast';
import type {CharacterProps} from '../characters/Character';
import type {Shot} from './types';

// Screen-space boxes (fractions of the frame, 0..1 from top-left) for every
// character in a shot — used to keep captions and title cards off faces.

export type Box = {x0: number; x1: number; y0: number; y1: number};
export type CastBoxes = {who: string; face: Box; body: Box; legs: Box};

const cam = new THREE.PerspectiveCamera(DEFAULT_FOV, ASPECT, 0.1, 400);

const project = (v: THREE.Vector3) => {
  const p = v.clone().project(cam);
  return {x: (p.x + 1) / 2, y: (1 - p.y) / 2, behind: p.z > 1};
};

const boxOf = (pts: THREE.Vector3[]): Box => {
  const ps = pts.map(project);
  return {
    x0: Math.min(...ps.map((p) => p.x)),
    x1: Math.max(...ps.map((p) => p.x)),
    y0: Math.min(...ps.map((p) => p.y)),
    y1: Math.max(...ps.map((p) => p.y)),
  };
};

export const castBoxes = (pose: CamPose, fov: number, cast: CharacterProps[]): CastBoxes[] => {
  cam.fov = fov;
  cam.position.copy(pose.pos);
  cam.lookAt(pose.look);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  return cast.map((c) => {
    const s = CAST[c.who];
    const k = c.scale ?? 1;
    const x = c.pos?.[0] ?? 0;
    const z = c.pos?.[1] ?? 0;
    const rect = (y0: number, y1: number, w: number) => {
      const out: THREE.Vector3[] = [];
      for (const y of [y0, y1])
        for (const sx of [-1, 1]) out.push(new THREE.Vector3(x, y * k, z).addScaledVector(right, (sx * w * k) / 2));
      return out;
    };
    const hy = s.neckY + s.headDY;
    const hr = s.headR * 1.25;
    return {
      who: c.who,
      face: boxOf(rect(hy - hr, hy + hr + (s.name === 'chotu' ? 0.12 : 0.05), hr * 2)),
      body: boxOf(rect(s.hipY, s.neckY, s.body.w)),
      legs: boxOf(rect(0, s.hipY, s.body.w)),
    };
  });
};

// The camera a shot actually uses: `fit` by default; shots with a title card
// frame heads lower (30%) so the card at the top never covers a face.
export const effectiveCamera = (shot: Shot): CameraMove => {
  const m: CameraMove = shot.camera ?? {type: 'fit'};
  if (m.type === 'fit' && shot.titleCard && !m.band) return {...m, band: [0.32, 0.84]};
  return m;
};

export const shotBoxesAt = (shot: Shot, p: number) => {
  const m = effectiveCamera(shot);
  return castBoxes(resolveMove(m, shot.cast ?? [])(p), m.fov ?? DEFAULT_FOV, shot.cast ?? []);
};

// Lowest y (fraction from top) a top-anchored overlay may reach without
// touching a face, over a time window of the shot.
export const faceFreeBottom = (shot: Shot, p0: number, p1: number, x0 = 0.125, x1 = 0.875) => {
  let top = 1;
  for (let i = 0; i <= 8; i++) {
    const p = p0 + ((p1 - p0) * i) / 8;
    for (const b of shotBoxesAt(shot, Math.min(1, Math.max(0, p))))
      if (b.face.x1 > x0 && b.face.x0 < x1) top = Math.min(top, b.face.y0);
  }
  return top - 0.01;
};

// Best vertical centre for a caption box (w,h as frame fractions): avoid
// faces strongly, bodies moderately, legs lightly; stay near 60% and inside
// the Shorts safe area (30–80%).
export const placeCaption = (boxes: CastBoxes[], w: number, h: number, pref = 0.6): number => {
  const area = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  let best = pref;
  let bestScore = Infinity;
  for (let y = 0.3; y <= 0.8001; y += 0.01) {
    const cap: Box = {x0: 0.5 - w / 2, x1: 0.5 + w / 2, y0: y - h / 2, y1: y + h / 2};
    let score = Math.abs(y - pref) * 0.02;
    for (const b of boxes) {
      const face = {x0: b.face.x0 - 0.02, x1: b.face.x1 + 0.02, y0: b.face.y0 - 0.025, y1: b.face.y1 + 0.02}; // clearance
      score += area(cap, face) * 60 + area(cap, b.body) * 6 + area(cap, b.legs) * 1;
    }
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = y;
    }
  }
  return best;
};

export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
