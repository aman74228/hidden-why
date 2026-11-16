import * as THREE from 'three';
import {CAST} from '../characters/cast';
import type {CharacterProps} from '../characters/Character';
import {H, W} from '../theme';

// Camera helpers. Every move returns {pos, look} for progress p in [0,1].
// Rules: low, wide, always gliding. Use one move per shot; cut every 4–6 s.
// Default move is `fit`: auto-frames the cast into the 25–82% vertical band.

type V3 = [number, number, number];

export type FitMove = {
  type: 'fit';
  angleDeg?: number; // camera yaw around the cast (0 = from +z)
  orbitDeg?: number; // glide: total yaw sweep over the shot (default 6)
  push?: number; // glide: start this much further out, push in (default 0.06)
  band?: [number, number]; // vertical band (fraction from top) for heads..feet
  crop?: number; // 1 = full body; 0.55 = chest-up close-up
  camHeight?: number; // override (metres)
  focus?: string[]; // only frame these cast members (default: all)
  fov?: number;
};

export type CameraMove =
  | FitMove
  | {type: 'dolly'; from: V3; to: V3; look?: V3; lookTo?: V3; fov?: number}
  | {type: 'orbit'; center: V3; radius: number; height: number; fromDeg: number; toDeg: number; lookY?: number; fov?: number}
  | {type: 'pushIn'; target: V3; angleDeg?: number; height?: number; fromDist: number; toDist: number; fov?: number}
  | {type: 'static'; pos: V3; look: V3; drift?: number; fov?: number};

export const DEFAULT_FOV = 40;
export const DEFAULT_BAND: [number, number] = [0.25, 0.84];
export const ASPECT = W / H;

export type CamPose = {pos: THREE.Vector3; look: THREE.Vector3};

// Smooth glide easing (ease-in-out sine) — never fully stops mid-shot.
export const glide = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));
const lerp3 = (a: V3, b: V3, t: number) => new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

export const dolly = (from: V3, to: V3, look: V3 = [0, 1, 0], lookTo?: V3) => (p: number): CamPose => {
  const e = glide(p);
  return {pos: lerp3(from, to, e), look: lerp3(look, lookTo ?? look, e)};
};

export const orbit = (center: V3, radius: number, height: number, fromDeg: number, toDeg: number, lookY = 1) => (p: number): CamPose => {
  const a = ((fromDeg + (toDeg - fromDeg) * glide(p)) * Math.PI) / 180;
  return {
    pos: new THREE.Vector3(center[0] + Math.sin(a) * radius, height, center[2] + Math.cos(a) * radius),
    look: new THREE.Vector3(center[0], lookY, center[2]),
  };
};

export const pushIn = (target: V3, fromDist: number, toDist: number, angleDeg = 0, height?: number) => (p: number): CamPose => {
  const d = fromDist + (toDist - fromDist) * glide(p);
  const a = (angleDeg * Math.PI) / 180;
  const h = height ?? target[1] - 0.15;
  return {
    pos: new THREE.Vector3(target[0] + Math.sin(a) * d, h, target[2] + Math.cos(a) * d),
    look: new THREE.Vector3(...target),
  };
};

export const staticDrift = (pos: V3, look: V3, drift = 0.25) => (p: number): CamPose => ({
  pos: new THREE.Vector3(pos[0] + (p - 0.5) * drift, pos[1], pos[2] - p * drift * 0.5),
  look: new THREE.Vector3(...look),
});

/* ---------------- auto framing ---------------- */
type Member = {x: number; z: number; h: number; w: number};

const members = (cast: CharacterProps[], focus?: string[]): Member[] =>
  cast
    .filter((c) => !focus || focus.includes(c.who))
    .map((c) => {
      const s = CAST[c.who];
      const k = c.scale ?? 1;
      const reach = c.pose === 'point' || c.pose === 'shock' ? 0.55 : c.pose === 'talk' ? 0.35 : 0.2;
      return {x: c.pos?.[0] ?? 0, z: c.pos?.[1] ?? 0, h: s.height * k, w: (s.body.w + reach * 2) * k};
    });

const bisect = (ok: (d: number) => boolean, lo = 0.4, hi = 80) => {
  // smallest d for which ok(d) is true (ok is monotone false→true)
  for (let i = 0; i < 48; i++) {
    const m = (lo + hi) / 2;
    if (ok(m)) hi = m;
    else lo = m;
  }
  return hi;
};

// Frames the cast so heads sit at band[0] and the nearest feet at band[1].
export const fitPose = (cast: CharacterProps[], m: FitMove, angleDeg: number, distScale = 1): CamPose => {
  const ms = members(cast, m.focus);
  if (!ms.length) return {pos: new THREE.Vector3(0, 0.8, 6), look: new THREE.Vector3(0, 0.9, 0)};
  const fov = ((m.fov ?? DEFAULT_FOV) * Math.PI) / 180;
  const t = Math.tan(fov / 2);
  const th = t * ASPECT;
  const band = m.band ?? DEFAULT_BAND;
  const crop = m.crop ?? 1;
  const nt = 1 - 2 * band[0];
  const nb = 2 * band[1] - 1;
  const span = Math.atan(nt * t) + Math.atan(nb * t);
  const hMax = Math.max(...ms.map((k) => k.h));
  const hc = m.camHeight ?? (crop >= 1 ? Math.min(0.75, 0.42 * hMax) : hMax * (1 - crop * 0.5));

  const a = (angleDeg * Math.PI) / 180;
  const f = new THREE.Vector2(-Math.sin(a), -Math.cos(a)); // forward (x,z)
  const r = new THREE.Vector2(Math.cos(a), -Math.sin(a)); // right (x,z)
  // centre: midpoint of lateral extents, mean depth
  const lats = ms.flatMap((k) => [k.x * r.x + k.z * r.y - k.w / 2, k.x * r.x + k.z * r.y + k.w / 2]);
  const latC = (Math.min(...lats) + Math.max(...lats)) / 2;
  const depC = ms.reduce((s, k) => s + (k.x * f.x + k.z * f.y), 0) / ms.length;
  const cx = r.x * latC + f.x * depC;
  const cz = r.y * latC + f.y * depC;

  const geo = (d: number) => {
    const camX = cx - f.x * d;
    const camZ = cz - f.y * d;
    let top = -Infinity;
    let bot = Infinity;
    let latOk = true;
    for (const k of ms) {
      const dep = (k.x - camX) * f.x + (k.z - camZ) * f.y;
      const lat = (k.x - camX) * r.x + (k.z - camZ) * r.y;
      if (dep <= 0.2) return {top: Infinity, bot: -Infinity, latOk: false, camX, camZ};
      top = Math.max(top, Math.atan2(k.h - hc, dep));
      bot = Math.min(bot, Math.atan2(k.h * (1 - Math.min(crop, 1)) - hc, dep));
      if ((Math.abs(lat) + k.w / 2) / dep > th * 0.95) latOk = false;
    }
    return {top, bot, latOk, camX, camZ};
  };

  const dV = bisect((d) => geo(d).top - geo(d).bot <= span);
  const dH = bisect((d) => geo(d).latOk);
  const widthLimited = dH > dV;
  const d = Math.max(dV, dH) * distScale;
  const g = geo(d);
  // width-limited: keep the feet on the band's lower edge; else heads on the top edge
  const pitch = widthLimited || distScale !== 1 ? g.bot + Math.atan(nb * t) : g.top - Math.atan(nt * t);
  const pos = new THREE.Vector3(g.camX, hc, g.camZ);
  const look = new THREE.Vector3(
    pos.x + f.x * Math.cos(pitch),
    pos.y + Math.sin(pitch),
    pos.z + f.y * Math.cos(pitch),
  );
  return {pos, look};
};

export const fit = (cast: CharacterProps[], m: FitMove) => (p: number): CamPose => {
  const e = glide(p);
  const ang = (m.angleDeg ?? 0) + (m.orbitDeg ?? 6) * (e - 0.5);
  const push = 1 + (m.push ?? 0.06) * (1 - e);
  return fitPose(cast, m, ang, push);
};

export const resolveMove = (m: CameraMove | undefined, cast: CharacterProps[] = []): ((p: number) => CamPose) => {
  if (!m) return fit(cast, {type: 'fit'});
  switch (m.type) {
    case 'fit':
      return fit(cast, m);
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
