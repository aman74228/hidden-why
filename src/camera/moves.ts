import * as THREE from 'three';

// Camera helpers. Every move returns {pos, look} for progress p in [0,1].
// Rules: low, wide, always gliding. Use one move per shot; cut every 4–6 s.

type V3 = [number, number, number];

export type CameraMove =
  | {type: 'dolly'; from: V3; to: V3; look?: V3; lookTo?: V3; fov?: number}
  | {type: 'orbit'; center: V3; radius: number; height: number; fromDeg: number; toDeg: number; lookY?: number; fov?: number}
  | {type: 'pushIn'; target: V3; angleDeg?: number; height?: number; fromDist: number; toDist: number; fov?: number}
  | {type: 'static'; pos: V3; look: V3; drift?: number; fov?: number};

export const DEFAULT_FOV = 42;

// Smooth glide easing (ease-in-out sine) — never fully stops mid-shot.
const glide = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));
const lerp3 = (a: V3, b: V3, t: number) => new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

export const dolly = (from: V3, to: V3, look: V3 = [0, 1, 0], lookTo?: V3) => (p: number) => {
  const e = glide(p);
  return {pos: lerp3(from, to, e), look: lerp3(look, lookTo ?? look, e)};
};

export const orbit = (center: V3, radius: number, height: number, fromDeg: number, toDeg: number, lookY = 1) => (p: number) => {
  const a = ((fromDeg + (toDeg - fromDeg) * glide(p)) * Math.PI) / 180;
  return {
    pos: new THREE.Vector3(center[0] + Math.sin(a) * radius, height, center[2] + Math.cos(a) * radius),
    look: new THREE.Vector3(center[0], lookY, center[2]),
  };
};

export const pushIn = (target: V3, fromDist: number, toDist: number, angleDeg = 0, height?: number) => (p: number) => {
  const d = fromDist + (toDist - fromDist) * glide(p);
  const a = (angleDeg * Math.PI) / 180;
  const h = height ?? target[1] - 0.15;
  return {
    pos: new THREE.Vector3(target[0] + Math.sin(a) * d, h, target[2] + Math.cos(a) * d),
    look: new THREE.Vector3(...target),
  };
};

export const staticDrift = (pos: V3, look: V3, drift = 0.25) => (p: number) => ({
  pos: new THREE.Vector3(pos[0] + (p - 0.5) * drift, pos[1], pos[2] - p * drift * 0.5),
  look: new THREE.Vector3(...look),
});

export const resolveMove = (m: CameraMove) => {
  switch (m.type) {
    case 'dolly':
      return dolly(m.from, m.to, m.look, m.lookTo);
    case 'orbit':
      return orbit(m.center, m.radius, m.height, m.fromDeg, m.toDeg, m.lookY);
    case 'pushIn':
      return pushIn(m.target, m.fromDist, m.toDist, m.angleDeg, m.height);
    case 'static':
      return staticDrift(m.pos, m.look, m.drift);
  }
};
