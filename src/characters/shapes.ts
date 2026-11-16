import * as THREE from 'three';

// All character parts are flat convex-ish polygons. Outlines are the same
// polygon grown outward by the outline width (computed per frame so the
// outline is always ~4px on screen).

export type V2 = [number, number];

export type ShapeSpec =
  | {kind: 'circle'; r: number}
  | {kind: 'ellipse'; rx: number; ry: number}
  | {kind: 'capsule'; len: number; r: number} // from origin downward (-y)
  | {kind: 'bean'; w: number; h: number; flare?: number}
  | {kind: 'rrect'; w: number; h: number; r: number}
  | {kind: 'halfdisc'; r: number; up?: boolean}
  | {kind: 'poly'; pts: V2[]};

const SEG = 40;

export const shapePoints = (s: ShapeSpec): V2[] => {
  switch (s.kind) {
    case 'circle':
      return ellipsePts(s.r, s.r);
    case 'ellipse':
      return ellipsePts(s.rx, s.ry);
    case 'capsule': {
      const pts: V2[] = [];
      const n = 12;
      // top cap (centre 0,0) then bottom cap (centre 0,-len)
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI;
        pts.push([Math.cos(a) * s.r, Math.sin(a) * s.r]);
      }
      for (let i = 0; i <= n; i++) {
        const a = Math.PI + (i / n) * Math.PI;
        pts.push([Math.cos(a) * s.r, -s.len + Math.sin(a) * s.r]);
      }
      return pts;
    }
    case 'bean': {
      const f = s.flare ?? 0.14;
      const pts: V2[] = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2;
        const sy = Math.sin(a);
        // wider at the bottom, slightly squarer silhouette
        const cx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.8);
        const cy = Math.sign(sy) * Math.pow(Math.abs(sy), 0.9);
        pts.push([(s.w / 2) * cx * (1 - f * sy), (s.h / 2) * cy]);
      }
      return pts;
    }
    case 'rrect': {
      const pts: V2[] = [];
      const {w, h} = s;
      const r = Math.min(s.r, w / 2, h / 2);
      const corners: [number, number, number][] = [
        [w / 2 - r, h / 2 - r, 0],
        [-w / 2 + r, h / 2 - r, Math.PI / 2],
        [-w / 2 + r, -h / 2 + r, Math.PI],
        [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
      ];
      for (const [cx, cy, a0] of corners) {
        for (let i = 0; i <= 6; i++) {
          const a = a0 + (i / 6) * (Math.PI / 2);
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
      }
      return pts;
    }
    case 'halfdisc': {
      const pts: V2[] = [];
      const sign = s.up ? 1 : -1;
      for (let i = 0; i <= SEG / 2; i++) {
        const a = (i / (SEG / 2)) * Math.PI;
        pts.push([Math.cos(a) * s.r, sign * Math.sin(a) * s.r]);
      }
      return s.up ? pts : pts.reverse();
    }
    case 'poly':
      return s.pts;
  }
};

const ellipsePts = (rx: number, ry: number): V2[] => {
  const pts: V2[] = [];
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return pts;
};

const signedArea = (p: V2[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

// Miter offset of a polygon (outward). Works well for convex shapes.
export const growPoints = (pts: V2[], d: number): V2[] => {
  if (d === 0) return pts;
  const ccw = signedArea(pts) > 0 ? 1 : -1;
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const e1 = norm([p[0] - prev[0], p[1] - prev[1]]);
    const e2 = norm([next[0] - p[0], next[1] - p[1]]);
    // outward normals
    const n1: V2 = [e1[1] * ccw, -e1[0] * ccw];
    const n2: V2 = [e2[1] * ccw, -e2[0] * ccw];
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cos = Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);
    return [p[0] + (m[0] * d) / cos, p[1] + (m[1] * d) / cos];
  });
};

const norm = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

export const toGeometry = (pts: V2[]) => {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ShapeGeometry(shape);
};
