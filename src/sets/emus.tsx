import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {CharCtx, Ink, Part} from '../characters/Part';
import {V2} from '../characters/shapes';
import {Fedora} from '../characters/Character';
import {Motes} from './fx';
import {Box, Cyl, Toon, mulberry, toonRamp} from './toon';

// Short #4 (04-emu-war): the 1932 wheat farm in Western Australia, the water-hole
// ambush, the 1930s truck with its Lewis gun, flat 2D emus (same drawing system as
// the cast), and Gus's bowling-ball-and-marbles demo on the workshop floorboards.
// Everything animates as a pure function of scene time.

type V3 = [number, number, number];
const D = Math.PI / 180;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/* =================================================================== */
/* canvas textures (deterministic, cached)                              */
/* =================================================================== */
const texCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number] = [1, 1]) => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  texCache.set(key, t);
  return t;
};

// red-brown Western Australian dirt: mottled, with pebbles and dry cracks
const dirtTex = () =>
  canvasTex('wa-dirt', 1024, 1024, (g, w, h) => {
    const r = mulberry(11);
    g.fillStyle = '#9C5A3A';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, s = 4 + r() * 30;
      const k = r();
      g.fillStyle = k < 0.45 ? `rgba(120,62,38,${0.15 + r() * 0.25})` : k < 0.8 ? `rgba(178,108,70,${0.12 + r() * 0.2})` : `rgba(206,150,104,${0.1 + r() * 0.18})`;
      g.beginPath();
      g.ellipse(x, y, s, s * (0.4 + r() * 0.6), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(70,40,28,0.5)' : 'rgba(225,180,140,0.45)';
      g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3);
    }
    g.strokeStyle = 'rgba(80,42,26,0.35)';
    for (let i = 0; i < 60; i++) {
      let x = r() * w, y = r() * h;
      g.lineWidth = 1 + r() * 1.5;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r() - 0.5) * 50;
        y += (r() - 0.5) * 50;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });

// far wheat seen from above/afar: golden rows with darker furrows and wind streaks
const wheatFarTex = () =>
  canvasTex('wheat-far', 1024, 1024, (g, w, h) => {
    const r = mulberry(17);
    g.fillStyle = '#D6A64C';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      g.fillStyle = `rgba(${150 + r() * 30},${100 + r() * 20},${40 + r() * 10},0.35)`;
      g.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 5000; i++) {
      const k = r();
      g.fillStyle = k < 0.5 ? `rgba(238,196,108,${0.3 + r() * 0.4})` : `rgba(170,118,52,${0.2 + r() * 0.3})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 3, 6 + r() * 10);
    }
  });

// corrugated iron: vertical ribs, sheet seams, rust streaks
const ironTex = (rust: number) =>
  canvasTex(`corrugated-${rust}`, 512, 512, (g, w, h) => {
    const r = mulberry(23 + Math.round(rust * 10));
    for (let x = 0; x < w; x++) {
      const v = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 24);
      const c = 150 + v * 70;
      g.fillStyle = `rgb(${c - 6},${c},${c + 6})`;
      g.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(60,64,70,0.35)';
      g.fillRect(0, (i + 1) * (h / 4) - 2, w, 3);
    }
    for (let i = 0; i < 26 * rust + 6; i++) {
      const x = r() * w, y = r() * h * 0.7, len = 40 + r() * 160;
      const grad = g.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, `rgba(150,70,30,${0.5 * rust + 0.15})`);
      grad.addColorStop(1, 'rgba(150,70,30,0)');
      g.fillStyle = grad;
      g.fillRect(x, y, 4 + r() * 10, len);
    }
  });

// weatherboards: horizontal cream boards with shadow lines
const boardTex = () =>
  canvasTex('weatherboard', 512, 512, (g, w, h) => {
    const r = mulberry(29);
    g.fillStyle = '#E6D8BA';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(120,96,70,0.45)';
      g.fillRect(0, y + 28, w, 4);
      g.fillStyle = 'rgba(255,250,235,0.35)';
      g.fillRect(0, y, w, 3);
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(150,120,90,${r() * 0.15})`;
      g.fillRect(r() * w, r() * h, 20 + r() * 80, 1);
    }
  });

// workshop floorboards: warm planks with grain, gaps and dust
const plankTex = () =>
  canvasTex('floorboards', 1024, 1024, (g, w, h) => {
    const r = mulberry(31);
    const pw = 64;
    for (let x = 0; x < w; x += pw) {
      const base = [150 + r() * 30, 96 + r() * 20, 58 + r() * 14];
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      g.fillRect(x, 0, pw, h);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(90,52,30,${0.12 + r() * 0.2})`;
        g.lineWidth = 1 + r() * 1.5;
        const y0 = r() * h;
        g.beginPath();
        g.moveTo(x + 2, y0);
        g.bezierCurveTo(x + pw * 0.3, y0 + 20 * (r() - 0.5), x + pw * 0.7, y0 + 20 * (r() - 0.5), x + pw - 2, y0 + 10 * (r() - 0.5));
        g.stroke();
      }
      g.fillStyle = 'rgba(40,22,14,0.8)';
      g.fillRect(x, 0, 3, h);
      for (let y = (r() * h) | 0; y < h; y += 300 + r() * 300) {
        g.fillRect(x, y, pw, 3);
      }
    }
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(230,210,180,${r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
  });

const muddyWaterTex = () =>
  canvasTex('muddy-water', 512, 512, (g, w, h) => {
    const r = mulberry(37);
    g.fillStyle = '#6A5038';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(${130 + r() * 40},${100 + r() * 30},${70 + r() * 20},${0.1 + r() * 0.15})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 60, 3 + r() * 10, r() * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  });

const hoofMudTex = () =>
  canvasTex('hoof-mud', 1024, 1024, (g, w, h) => {
    const r = mulberry(41);
    g.fillStyle = '#6E4430';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(60,34,22,${0.3 + r() * 0.3})` : `rgba(140,92,62,${0.2 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 3 + r() * 14, 3 + r() * 10, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // three-toed emu prints
    for (let i = 0; i < 140; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.28;
      g.strokeStyle = 'rgba(40,22,14,0.7)';
      g.lineWidth = 3;
      for (const da of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a + da) * 16, y + Math.sin(a + da) * 16);
        g.stroke();
      }
    }
  });

/* =================================================================== */
/* EMU: flat 2D rig (same Part/Ink drawing as the cast)                  */
/* =================================================================== */
export type EmuGait = 'stand' | 'walk' | 'run' | 'peck' | 'strut';
export type EmuView = 'side' | 'front' | 'threeq';
export type EmuProps = {
  pos: [number, number];
  vel?: [number, number]; // world velocity (m/s): picks the facing side, the view and the stride rate
  facing?: 1 | -1;
  gait?: EmuGait;
  seed?: number;
  s?: number;
  hat?: boolean;
  rise?: {at: number; dur?: number; from?: number}; // pops up from below (the hook)
  blinkAt?: number[]; // extra deliberate blinks (seconds)
  lookCam?: boolean; // turned towards the lens (3/4 view)
  view?: EmuView; // force a view (else from the velocity vs the camera)
};

// palette from the reference photos: brown-grey mop, near-black head, blue-grey bare neck skin,
// orange/red-brown eye, dark grey flat bill, thick scaly grey legs
const BODY = '#8C7C6A';
const BODY_DK = '#6E604F';
const BODY_LT = '#A49482';
const HEAD = '#3A322D';
const SKIN = '#9DB0C4';
const SKIN_LT = '#C9D6E2';
const LEG = '#7E7B77';
const LEG_DK = '#5E5B58';
const BILL = '#4C4846';
const IRIS = '#C2602A';

// smooth tube along a quadratic curve base -> head, thickness tapering
const neckPoly = (b: V2, c: V2, h: V2, w0: number, w1: number): V2[] => {
  const n = 12;
  const L: V2[] = [];
  const Rr: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = (1 - u) * (1 - u) * b[0] + 2 * (1 - u) * u * c[0] + u * u * h[0];
    const y = (1 - u) * (1 - u) * b[1] + 2 * (1 - u) * u * c[1] + u * u * h[1];
    const dx = 2 * (1 - u) * (c[0] - b[0]) + 2 * u * (h[0] - c[0]);
    const dy = 2 * (1 - u) * (c[1] - b[1]) + 2 * u * (h[1] - c[1]);
    const l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * u) / 2;
    L.push([x - (dy / l) * w, y + (dx / l) * w]);
    Rr.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  return [...L, ...Rr.reverse()];
};
// shaggy feathered neck: tapered tube along the curve, edges softly scalloped (rounded waves, no spikes)
const shaggyNeck = (b: V2, c: V2, h: V2, w0: number, w1: number, seed: number): V2[] => {
  const n = 24;
  const r = mulberry(seed * 3 + 11);
  const L: V2[] = [];
  const Rr: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = (1 - u) * (1 - u) * b[0] + 2 * (1 - u) * u * c[0] + u * u * h[0];
    const y = (1 - u) * (1 - u) * b[1] + 2 * (1 - u) * u * c[1] + u * u * h[1];
    const dx = 2 * (1 - u) * (c[0] - b[0]) + 2 * u * (h[0] - c[0]);
    const dy = 2 * (1 - u) * (c[1] - b[1]) + 2 * u * (h[1] - c[1]);
    const l = Math.hypot(dx, dy) || 1;
    const wave = 0.012 * (0.5 + 0.5 * Math.cos(u * Math.PI * 9)) + r() * 0.004;
    const w = (w0 + (w1 - w0) * Math.sqrt(u)) / 2 + wave;
    L.push([x - (dy / l) * w, y + (dx / l) * w]);
    Rr.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  return [...L, ...Rr.reverse()];
};
const curvePt = (b: V2, c: V2, h: V2, u: number): V2 => [
  (1 - u) * (1 - u) * b[0] + 2 * (1 - u) * u * c[0] + u * u * h[0],
  (1 - u) * (1 - u) * b[1] + 2 * (1 - u) * u * c[1] + u * u * h[1],
];

// smooth oval body outline (no spikes); the rump sits lower than the chest
const bodyOval = (rx: number, ry: number, droop: number): V2[] => {
  const pts: V2[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    let y = Math.sin(a) * ry;
    if (x < 0) y -= droop * (-x / rx) * (Math.sin(a) < 0 ? 1.2 : 0.6);
    pts.push([x, y]);
  }
  return pts;
};

const limb = (a: V2, b: V2, r: number, color: string, z: number, key: string, outline = true) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const rot = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
  return <Part key={key} s={{kind: 'capsule', len, r}} color={color} z={z} pos={a} rot={rot} outline={outline} />;
};

const emuBlinks = (seed: number) => {
  const r = mulberry(seed * 13 + 5);
  const out: number[] = [];
  let t = 0.3 + r() * 1.5;
  while (t < 60) {
    out.push(t);
    t += 1.4 + r() * 2.6;
  }
  return out;
};

// the hair-like plumage: soft drooping locks (capsules with round tips) + strand strokes
type Lock = {x: number; y: number; len: number; r: number; rot: number; c: string};
const mopLocks = (seed: number, rx: number, ry: number, droop: number, front: boolean): {edge: Lock[]; strands: Lock[]} => {
  const r = mulberry(seed * 17 + 9);
  const edge: Lock[] = [];
  const n = front ? 15 : 19;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = -rx * 0.98 + u * rx * (front ? 1.96 : 1.82);
    const k = x / rx;
    let y = -Math.sqrt(Math.max(0, 1 - k * k)) * ry * 0.9;
    if (x < 0 && !front) y -= droop * (-k) * 1.2;
    const len = (front ? 0.13 : 0.12) + r() * 0.1 + (!front && x < 0 ? 0.06 * -k : 0);
    edge.push({x, y: y + 0.04, len, r: 0.026 + r() * 0.012, rot: front ? (r() - 0.5) * 0.2 : 0.18 + (r() - 0.5) * 0.25, c: r() < 0.4 ? BODY_DK : r() < 0.6 ? BODY_LT : BODY});
  }
  // rump curtain (side view): longer locks hanging off the back
  if (!front)
    for (let i = 0; i < 5; i++) edge.push({x: -rx * (0.98 - i * 0.05), y: -ry * 0.1 - droop * 0.6 + i * 0.04, len: 0.16 + r() * 0.08, r: 0.028, rot: 0.45 + i * 0.08, c: i % 2 ? BODY_DK : BODY});
  const strands: Lock[] = [];
  for (let i = 0; i < 18; i++) {
    const x = (r() - 0.5) * rx * 1.7;
    const k = x / rx;
    const top = Math.sqrt(Math.max(0, 1 - k * k)) * ry * 0.75;
    const y = top - r() * ry * 1.3;
    strands.push({x, y, len: 0.06 + r() * 0.08, r: 0.007 + r() * 0.004, rot: front ? (r() - 0.5) * 0.3 : 0.25 + (r() - 0.5) * 0.3, c: r() < 0.55 ? BODY_DK : BODY_LT});
  }
  return {edge, strands};
};

export const Emu: React.FC<EmuProps> = ({pos, vel, facing: facingIn, gait = 'stand', seed = 1, s = 1, hat, rise, blinkAt, lookCam, view: viewIn}) => {
  const scene = useScene();
  const t = scene.t + seed * 0.37;
  const r = useMemo(() => mulberry(seed * 7 + 1), [seed]);
  const ph0 = useMemo(() => r() * 6.28, [r]);
  const blinks = useMemo(() => emuBlinks(seed), [seed]);

  // billboard yaw; facing side + view from the velocity's direction relative to the lens
  const yaw = Math.atan2(scene.camPos.x - pos[0], scene.camPos.z - pos[1]);
  const right: V2 = [Math.cos(yaw), -Math.sin(yaw)];
  const sp = vel ? Math.hypot(vel[0], vel[1]) : 0;
  const scr = vel ? vel[0] * right[0] + vel[1] * right[1] : 0;
  const facing: 1 | -1 = facingIn ?? (Math.abs(scr) > 0.05 ? (scr > 0 ? 1 : -1) : seed % 2 ? 1 : -1);
  const across = sp > 0.05 ? Math.abs(scr) / sp : 1;
  const view: EmuView = viewIn ?? (lookCam ? 'threeq' : across > 0.75 ? 'side' : across > 0.35 ? 'threeq' : 'front');
  const front = view === 'front';
  const tq = view === 'threeq';
  const g: EmuGait = gait;

  const centre = new THREE.Vector3(pos[0], 0.9 * s, pos[1]);
  const dist = scene.camPos.distanceTo(centre);
  const worldPerPx = (2 * dist * Math.tan((scene.fov * D) / 2)) / scene.heightPx;
  const ow = (4 * worldPerPx) / s;
  const ctx = useMemo(() => ({ow, tint: scene.charTint, rim: 0.5, rimDir: [scene.rimDir[0] * facing, scene.rimDir[1]] as V2, rimColor: scene.rimColor}), [ow, scene.charTint, facing, scene.rimDir[0], scene.rimDir[1], scene.rimColor]);

  // body proportions per view
  const rx = front ? 0.33 : tq ? 0.4 : 0.47;
  const ry = front ? 0.29 : 0.26;
  const droop = front ? 0 : tq ? 0.06 : 0.1;
  const locks = useMemo(() => mopLocks(seed, rx, ry, droop, front), [seed, rx, ry, droop, front]);

  // gait: upright, bouncy run; strides scaled to the view (front view = legs lift in place)
  const run = g === 'run';
  const walky = g === 'walk' || g === 'strut';
  const freq = run ? Math.max(2.3, 1.2 + sp * 0.12) : walky ? 1.3 : 0;
  const ph = t * freq * Math.PI * 2 + ph0;
  const strideK = front ? 0.15 : tq ? 0.65 : 1;
  const stride = (run ? 0.34 : g === 'walk' ? 0.19 : g === 'strut' ? 0.16 : 0) * strideK;
  const lift = run ? 0.22 : walky ? 0.09 : 0;
  const bob = run ? Math.abs(Math.sin(ph)) * 0.08 : walky ? Math.abs(Math.sin(ph)) * 0.03 : Math.sin(t * 2) * 0.006;
  const bodyY = 1.12 + bob;
  const tilt = (run ? 4 : g === 'peck' ? -8 : g === 'strut' ? 5 : 0) * (front ? 0 : 1);

  // legs: hip under the body, backward-bending ankle, thick scaly tarsus, 3 forward toes
  const legX = front ? [-0.1, 0.1] : tq ? [0.04, -0.08] : [0.02, 0.0];
  const legs = [0, 1].map((k) => {
    const a = ph + k * Math.PI;
    const sw = stride ? Math.cos(a) : 0;
    const up = stride || (front && (run || walky)) ? Math.max(0, Math.sin(a)) * lift : 0;
    const hip: V2 = [legX[k], bodyY - 0.2];
    const foot: V2 = [legX[k] + sw * stride + (front ? legX[k] * 0.25 : 0.04), 0.03 + up];
    const ankle: V2 = front ? [(hip[0] + foot[0]) / 2 + legX[k] * 0.1, (hip[1] + foot[1]) / 2 + 0.06] : [(hip[0] + foot[0]) / 2 - 0.09 - up * 0.3, (hip[1] + foot[1]) / 2 + 0.04 + up * 0.25];
    return {hip, ankle, foot, near: front ? true : k === 0};
  });

  // neck + head
  let head: V2 = front ? [0, 1.7] : tq ? [0.26, 1.69] : [0.42, 1.69];
  if (run && !front) head = [head[0] + 0.1, 1.62 + Math.sin(ph * 2) * 0.02];
  if (walky) head = [head[0] + Math.sin(ph) * 0.03 * strideK, head[1] + (g === 'strut' ? 0.04 + Math.abs(Math.sin(ph)) * 0.03 : 0)];
  if (g === 'stand') head = [head[0] + Math.sin(t * 0.9) * 0.02, head[1] + Math.sin(t * 1.3) * 0.012];
  if (g === 'peck') {
    const cyc = (t * 0.7 + ph0) % 1;
    const k = cyc < 0.25 ? smooth(cyc / 0.25) : cyc < 0.45 ? 1 : 1 - smooth((cyc - 0.45) / 0.25);
    head = [head[0] + k * (front ? 0 : 0.3), head[1] - k * 1.4];
  }
  const base: V2 = front ? [0, bodyY + 0.12] : tq ? [0.2, bodyY + 0.1] : [rx * 0.72, bodyY + 0.08];
  const ctrl: V2 = front ? [0, (base[1] + head[1]) / 2] : [base[0] + 0.06, (base[1] + head[1]) / 2 + 0.02];
  const neck = neckPoly(base, ctrl, head, 0.17, 0.085);
  // shaggy feathered lower neck + dark hindneck locks; bare blue-grey throat at the top front
  const neckLocks = useMemo(() => {
    const rr = mulberry(seed * 5 + 3);
    return Array.from({length: 9}, (_, i) => ({u: 0.08 + i * 0.075, len: 0.06 + rr() * 0.05, side: front ? (i % 2 ? 1 : -1) : -1, c: rr() < 0.5 ? BODY_DK : BODY}));
  }, [seed, front]);

  const blink = blinks.some((b) => t - seed * 0.37 >= b && t - seed * 0.37 < b + 0.12) || (blinkAt ?? []).some((b) => scene.t >= b && scene.t < b + 0.16);
  let dy = 0;
  if (rise) {
    const k = smooth((scene.t - rise.at) / (rise.dur ?? 0.3));
    dy = -(rise.from ?? 1.2) * (1 - k) + Math.sin(k * Math.PI) * 0.05;
  }

  const eye = (ex: number, ey: number, k = 1, key = 'e') =>
    blink ? (
      <Ink key={key} pts={[[-0.02 * k, -0.003], [0.02 * k, -0.003], [0.02 * k, 0.004], [-0.02 * k, 0.004]]} z={0.06} pos={[ex, ey]} color="#1A1410" />
    ) : (
      <group key={key}>
        <Part s={{kind: 'circle', r: 0.021 * k}} color={IRIS} z={0.056} pos={[ex, ey]} />
        <Part s={{kind: 'circle', r: 0.01 * k}} color="#140C08" z={0.058} pos={[ex + 0.002, ey]} outline={false} />
        <Part s={{kind: 'circle', r: 0.0055 * k}} color="#FFFFFF" z={0.06} pos={[ex + 0.007 * k, ey + 0.007 * k]} outline={false} />
      </group>
    );

  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} scale={[s, s * 0.42, 1]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color={C.indigoDeep} transparent opacity={0.32} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* dust trail kicked up behind a running bird */}
      {run && sp > 1.5 &&
        [0.45, 0.9, 1.4, 1.95].map((d, k) => {
          const ux = (vel?.[0] ?? 0) / sp, uz = (vel?.[1] ?? 0) / sp;
          const pulse = 0.85 + 0.15 * Math.sin(t * 9 + k * 1.7);
          return (
            <mesh key={`d${k}`} position={[-ux * d * s, (0.12 + k * 0.06) * s, -uz * d * s]} scale={(0.14 + k * 0.09) * s * pulse}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#C9946A" transparent opacity={0.42 - k * 0.09} depthWrite={false} roughness={1} />
            </mesh>
          );
        })}
      <group rotation={[0, yaw, 0]}>
        <group scale={[facing * s, s, s]} position={[0, dy * s, 0]}>
          <CharCtx.Provider value={ctx}>
            {/* legs */}
            {legs.map((l, i) => {
              const z = l.near ? 0.005 : -0.03; // legs tuck under the plumage
              const n = 4;
              return (
                <group key={i}>
                  {limb(l.hip, l.ankle, 0.038, LEG, z, `t${i}`)}
                  {limb(l.ankle, l.foot, 0.026, LEG, z, `s${i}`)}
                  {/* scale bands across the tarsus */}
                  {Array.from({length: n}, (_, k) => {
                    const u = (k + 1) / (n + 1);
                    const p: V2 = [l.ankle[0] + (l.foot[0] - l.ankle[0]) * u, l.ankle[1] + (l.foot[1] - l.ankle[1]) * u];
                    const a = Math.atan2(l.foot[1] - l.ankle[1], l.foot[0] - l.ankle[0]);
                    return <Ink key={k} pts={[[-0.022, -0.003], [0.022, -0.003], [0.022, 0.003], [-0.022, 0.003]]} z={z + 0.002} pos={p} rot={a + Math.PI / 2} color={LEG_DK} />;
                  })}
                  {/* three thick forward toes with dark claws */}
                  {(front ? [-0.5, 0, 0.5] : [-0.35, 0.0, 0.3]).map((a, k) => {
                    const tip: V2 = front ? [l.foot[0] + Math.sin(a) * 0.05, l.foot[1] - 0.025] : [l.foot[0] + Math.cos(a * 0.5) * 0.1, l.foot[1] + Math.sin(a * 0.5) * 0.025 - 0.015];
                    return (
                      <group key={k}>
                        {limb(l.foot, tip, 0.013, LEG, z + 0.001, `f${i}${k}`)}
                        <Part s={{kind: 'circle', r: 0.009}} color="#2A2826" z={z + 0.002} pos={tip} outline={false} />
                      </group>
                    );
                  })}
                </group>
              );
            })}
            {/* body: smooth oval mop + hanging hair-like locks + strand strokes */}
            <group position={[tq ? -0.04 : front ? 0 : -0.06, bodyY, 0]} rotation={[0, 0, tilt * D]}>
              {locks.edge.map((lk, i) => (
                <Part key={`l${i}`} s={{kind: 'capsule', len: lk.len, r: lk.r}} color={lk.c} z={0.015} pos={[lk.x, lk.y]} rot={lk.rot + (run ? Math.sin(ph * 2 + i) * 0.12 : 0)} sil />
              ))}
              <Part s={{kind: 'poly', pts: bodyOval(rx, ry, droop)}} color={BODY} z={0.02} sil />
              {locks.strands.map((lk, i) => (
                <Part key={`s${i}`} s={{kind: 'capsule', len: lk.len, r: lk.r}} color={lk.c} z={0.025} pos={[lk.x, lk.y]} rot={lk.rot} outline={false} />
              ))}
            </group>
            {/* neck: blue-grey skin, shaggy feathered lower half, bare pale throat near the head */}
            <Part s={{kind: 'poly', pts: neck}} color={SKIN} z={0.016} sil />
            {/* feathered lower neck: one shaggy tapered column with soft wavy edges, growing out from behind the body */}
            <Part s={{kind: 'poly', pts: shaggyNeck([base[0] - (front ? 0 : 0.03), base[1] - 0.12], ctrl, curvePt(base, ctrl, head, 0.64), front ? 0.3 : 0.27, 0.1, seed)}} color={BODY} z={0.018} sil />
            {[0.18, 0.3, 0.42, 0.52].map((u, k) => {
              const p = curvePt(base, ctrl, head, u);
              return <Part key={`ns${k}`} s={{kind: 'capsule', len: 0.07, r: 0.006}} color={k % 2 ? BODY_DK : BODY_LT} z={0.019} pos={[p[0] + (k % 2 ? -0.025 : 0.02), p[1] + 0.03]} rot={0.15} outline={false} />;
            })}
            {neckLocks.map((nl, i) => {
              const p = curvePt(base, ctrl, head, nl.u);
              return <Part key={i} s={{kind: 'capsule', len: nl.len, r: 0.016}} color={nl.c} z={0.0185} pos={[p[0] + nl.side * (front ? 0.06 : 0.065) * (1 - nl.u), p[1]]} rot={nl.side * -0.35} />;
            })}
            <Ink pts={neckPoly(curvePt(base, ctrl, head, 0.6), ctrl, [head[0] + (front ? 0 : 0.02), head[1] - 0.05], 0.06, 0.05)} z={0.0195} color={SKIN_LT} />
            {/* head: small, dark-feathered; short broad flat bill; red-brown eye */}
            <group position={[head[0], head[1], 0]}>
              <Part s={{kind: 'ellipse', rx: front ? 0.07 : 0.078, ry: 0.06}} color={HEAD} z={0.05} sil />
              {[-0.05, -0.03].map((x, k) => (
                <Part key={k} s={{kind: 'capsule', len: 0.03, r: 0.009}} color={HEAD} z={0.049} pos={[front ? x + 0.04 : x, 0.045]} rot={Math.PI - 0.9 + k * 0.3} />
              ))}
              {front ? (
                <>
                  {/* bill seen head-on: short and broad */}
                  <Part s={{kind: 'rrect', w: 0.065, h: 0.04, r: 0.016}} color={BILL} z={0.06} pos={[0, -0.025]} />
                  <Ink pts={[[-0.028, -0.001], [0.028, -0.001], [0.028, 0.003], [-0.028, 0.003]]} z={0.062} pos={[0, -0.028]} color="#2A2624" />
                  {eye(-0.042, 0.012, 0.9, 'a')}
                  {eye(0.042, 0.012, 0.9, 'b')}
                </>
              ) : (
                <>
                  {/* side / 3/4 bill: flat, broad, slightly hooked tip; nostril groove */}
                  <Part
                    s={{kind: 'poly', pts: tq ? [[0.04, 0.008], [0.105, -0.004], [0.112, -0.016], [0.1, -0.024], [0.04, -0.03]] : [[0.045, 0.01], [0.13, -0.004], [0.138, -0.018], [0.124, -0.026], [0.045, -0.032]]}}
                    color={BILL}
                    z={0.06}
                  />
                  <Ink pts={[[0.06, -0.006], [0.1, -0.012], [0.1, -0.009], [0.06, -0.003]]} z={0.062} color="#2A2624" />
                  {eye(0.012, 0.012, 1, 'a')}
                  {tq && eye(-0.04, 0.012, 0.7, 'b')}
                </>
              )}
              {hat && (
                <group rotation={[0, 0, front ? 0 : 0.1]}>
                  <Fedora R={0.1} y={0.04} z={0.07} />
                </group>
              )}
            </group>
          </CharCtx.Provider>
        </group>
      </group>
    </group>
  );
};

/* ---- flocks ---- */
export type FlockSpec = {
  n: number;
  center: [number, number];
  spread: [number, number];
  seed?: number;
  gait?: EmuGait;
  vel?: [number, number]; // whole flock drifts (m/s)
  split?: {at: number; speed: number; groups?: number; dirDeg?: number[]}; // bursts into small groups running outward
  line?: {from: [number, number]; to: [number, number]; speed: number}; // single file marching from -> to
  s?: number;
  hat?: number; // index of the emu wearing the fedora
  minDist?: number;
  zigzag?: number; // side-to-side weave amplitude (m) while running
};

const flockBase = (f: FlockSpec) => {
  const r = mulberry(f.seed ?? 5);
  const out: {x: number; z: number; g: number; ph: number; sc: number}[] = [];
  const md = f.minDist ?? 0.55;
  let tries = 0;
  while (out.length < f.n && tries < f.n * 60) {
    tries++;
    const x = f.center[0] + (r() - 0.5) * f.spread[0];
    const z = f.center[1] + (r() - 0.5) * f.spread[1];
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < md)) continue;
    out.push({x, z, g: 0, ph: r(), sc: 0.92 + r() * 0.16});
  }
  if (f.split) {
    const G = f.split.groups ?? 5;
    const dirs = f.split.dirDeg ?? Array.from({length: G}, (_, i) => (i / G) * 360 + 20);
    out.forEach((o) => {
      const a = Math.atan2(o.z - f.center[1], o.x - f.center[0]) / D;
      let best = 0;
      let bd = 1e9;
      dirs.forEach((d, i) => {
        const dd = Math.abs(((a - d + 540) % 360) - 180);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      });
      o.g = best;
    });
  }
  return {out, dirs: f.split ? f.split.dirDeg ?? Array.from({length: f.split.groups ?? 5}, (_, i) => (i / (f.split?.groups ?? 5)) * 360 + 20) : []};
};

export const Flock: React.FC<{f: FlockSpec}> = ({f}) => {
  const {t} = useScene();
  const base = useMemo(() => flockBase(f), [f]);
  return (
    <>
      {base.out.map((o, i) => {
        let x = o.x;
        let z = o.z;
        let vel: [number, number] = f.vel ?? [0, 0];
        let gait: EmuGait = f.gait ?? 'stand';
        if (f.vel) {
          x += f.vel[0] * t;
          z += f.vel[1] * t;
        }
        if (f.line) {
          // single file from -> to; the leader starts 55% of the way along; they bunch up at `to`
          const L = Math.hypot(f.line.to[0] - f.line.from[0], f.line.to[1] - f.line.from[1]);
          const dx = (f.line.to[0] - f.line.from[0]) / L, dz = (f.line.to[1] - f.line.from[1]) / L;
          const stop = L - i * 0.3;
          const d = Math.min(stop, L * 0.55 + f.line.speed * t - i * 0.95);
          const side = (o.ph - 0.5) * 0.7;
          x = f.line.from[0] + dx * d - dz * side;
          z = f.line.from[1] + dz * d + dx * side;
          const moving = d < stop - 0.01;
          vel = moving ? [dx * f.line.speed, dz * f.line.speed] : [0, 0];
          gait = moving ? 'walk' : 'stand';
        }
        if (f.zigzag) {
          z += Math.sin(t * 3.4 + o.ph * 6.28) * f.zigzag;
          vel = [vel[0], vel[1] + Math.cos(t * 3.4 + o.ph * 6.28) * f.zigzag * 3.4];
          gait = 'run';
        }
        if (f.split && t > f.split.at) {
          const k = t - f.split.at;
          const a = base.dirs[o.g] * D + (o.ph - 0.5) * 0.35;
          const ramp = Math.min(1, k / 0.35);
          const dist = f.split.speed * (k - 0.35 * (1 - ramp) * ramp * 0.5) * (0.85 + o.ph * 0.3);
          x += Math.cos(a) * dist;
          z += Math.sin(a) * dist;
          vel = [Math.cos(a) * f.split.speed, Math.sin(a) * f.split.speed];
          gait = 'run';
        }
        return <Emu key={i} pos={[x, z]} vel={vel} gait={gait} seed={(f.seed ?? 5) * 31 + i} s={(f.s ?? 1) * o.sc} hat={f.hat === i} />;
      })}
    </>
  );
};

/* =================================================================== */
/* wheat (instanced stalks, sway, flattened where emus pass)            */
/* =================================================================== */
export const Wheat: React.FC<{rect: [number, number, number, number]; spacing?: number; h?: number; seed?: number; push?: [number, number][]}> = ({rect, spacing = 0.2, h = 0.85, seed = 3, push = []}) => {
  const {t} = useScene();
  const stalks = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => {
    const r = mulberry(seed);
    const out: {x: number; z: number; ph: number; hh: number; lean: number}[] = [];
    for (let x = rect[0]; x < rect[1]; x += spacing)
      for (let z = rect[2]; z < rect[3]; z += spacing) out.push({x: x + (r() - 0.5) * spacing * 0.9, z: z + (r() - 0.5) * spacing * 0.9, ph: r() * 6.28, hh: h * (0.82 + r() * 0.3), lean: (r() - 0.5) * 0.12});
    return out;
  }, [rect[0], rect[1], rect[2], rect[3], spacing, h, seed]);
  const cols = useMemo(() => {
    const r = mulberry(seed + 1);
    const a = new Float32Array(pts.length * 3), b = new Float32Array(pts.length * 3);
    const c = new THREE.Color();
    pts.forEach((_, i) => {
      c.set(r() < 0.5 ? '#C99A44' : '#B88A3A');
      a.set([c.r, c.g, c.b], i * 3);
      c.set(r() < 0.6 ? '#E9BE62' : '#D8A650');
      b.set([c.r, c.g, c.b], i * 3);
    });
    return {a, b};
  }, [pts, seed]);
  useLayoutEffect(() => {
    const S = stalks.current, H = heads.current;
    if (!S || !H) return;
    const o = new THREE.Object3D();
    pts.forEach((p, i) => {
      let ax = p.lean + Math.sin(t * 1.4 + p.ph + p.x * 0.3) * 0.06;
      let az = Math.cos(t * 1.1 + p.ph) * 0.03;
      for (const [ex, ez] of push) {
        const dx = p.x - ex, dz = p.z - ez;
        const d = Math.hypot(dx, dz);
        if (d < 0.75) {
          const k = (1 - d / 0.75) * 0.9;
          az += (dx / (d + 0.01)) * -k;
          ax += (dz / (d + 0.01)) * k;
        }
      }
      o.position.set(p.x, p.hh / 2, p.z);
      o.rotation.set(ax, 0, az);
      o.scale.set(1, p.hh, 1);
      o.updateMatrix();
      S.setMatrixAt(i, o.matrix);
      // head at the top of the tilted stalk
      const top = new THREE.Vector3(0, p.hh / 2, 0).applyEuler(new THREE.Euler(ax, 0, az));
      o.position.set(p.x + top.x, p.hh / 2 + top.y, p.z + top.z);
      o.scale.set(1, 2.8, 1);
      o.updateMatrix();
      H.setMatrixAt(i, o.matrix);
    });
    S.instanceMatrix.needsUpdate = true;
    H.instanceMatrix.needsUpdate = true;
  }, [t, pts, push]);
  return (
    <>
      <instancedMesh ref={stalks} args={[undefined, undefined, pts.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[0.016, 1, 0.016]} />
        <instancedBufferAttribute attach="instanceColor" args={[cols.a, 3]} />
        <meshToonMaterial gradientMap={toonRamp()} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, pts.length]} castShadow frustumCulled={false}>
        <sphereGeometry args={[0.028, 6, 5]} />
        <instancedBufferAttribute attach="instanceColor" args={[cols.b, 3]} />
        <meshToonMaterial gradientMap={toonRamp()} />
      </instancedMesh>
    </>
  );
};

/* =================================================================== */
/* props                                                                */
/* =================================================================== */
export const GumTree: React.FC<{pos: V3; s?: number; seed?: number}> = ({pos, s = 1, seed = 1}) => {
  const blobs = useMemo(() => {
    const r = mulberry(seed);
    return Array.from({length: 11}, () => ({p: [(r() - 0.5) * 3.2, 4.2 + r() * 2.4, (r() - 0.5) * 2.4] as V3, sc: [0.9 + r() * 0.9, 0.55 + r() * 0.4, 0.8 + r() * 0.8] as V3, c: r() < 0.5 ? '#7C9A6A' : r() < 0.5 ? '#62805A' : '#93AE7E'}));
  }, [seed]);
  return (
    <group position={pos} scale={s}>
      <Cyl r={0.26} r2={0.16} h={3.6} pos={[0, 1.8, 0]} color="#D9CFBE" />
      <Cyl r={0.12} r2={0.07} h={2.4} pos={[-0.55, 4.0, 0.1]} rot={[0, 0, 0.45]} color="#CFC3AE" />
      <Cyl r={0.12} r2={0.06} h={2.2} pos={[0.6, 4.2, -0.1]} rot={[0.1, 0, -0.5]} color="#D3C8B4" />
      <Cyl r={0.08} r2={0.05} h={1.6} pos={[0.1, 4.9, 0.2]} rot={[0.3, 0, 0.1]} color="#D3C8B4" />
      {/* bark patches */}
      {[0.6, 1.4, 2.3, 3.0].map((y, i) => (
        <Box key={i} size={[0.2, 0.32, 0.05]} pos={[i % 2 ? 0.12 : -0.1, y, 0.2]} rot={[0, i % 2 ? 0.4 : -0.5, 0.1]} color={i % 2 ? '#A89A84' : '#B9A98E'} />
      ))}
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} scale={b.sc} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <Toon color={b.c} />
        </mesh>
      ))}
    </group>
  );
};

export const Scrub: React.FC<{pos: V3; s?: number; seed?: number}> = ({pos, s = 1, seed = 2}) => {
  const r = mulberry(seed);
  const blobs = Array.from({length: 5}, () => ({p: [(r() - 0.5) * 0.9, 0.25 + r() * 0.25, (r() - 0.5) * 0.7] as V3, k: 0.28 + r() * 0.22, c: r() < 0.5 ? '#8A9A74' : '#6E8060'}));
  return (
    <group position={pos} scale={s}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} scale={[b.k * 1.3, b.k, b.k * 1.2]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <Toon color={b.c} />
        </mesh>
      ))}
    </group>
  );
};

export const HayBale: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Cyl r={0.62} h={1.1} rot={[0, 0, Math.PI / 2]} pos={[0, 0.62, 0]} color="#D8B460" seg={18} />
    <Cyl r={0.4} h={1.12} rot={[0, 0, Math.PI / 2]} pos={[0, 0.62, 0]} color="#C49A48" seg={18} />
  </group>
);

// post-and-wire fence along a line (from -> to); optional wooden gate (5 rails) at `gateAt` (0..1)
export const Fence: React.FC<{from: [number, number]; to: [number, number]; gap?: number; gateAt?: number; scrollX?: number}> = ({from, to, gap = 2.4, gateAt, scrollX = 0}) => {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const dx = (to[0] - from[0]) / L, dz = (to[1] - from[1]) / L;
  const yaw = Math.atan2(-dz, dx);
  const n = Math.floor(L / gap);
  const off = ((scrollX % gap) + gap) % gap;
  const gateU = gateAt !== undefined ? gateAt * L : -99;
  return (
    <group>
      {Array.from({length: n + 1}, (_, i) => {
        const d = i * gap + off;
        if (d > L || Math.abs(d - gateU) < 1.4) return null;
        return <Cyl key={i} r={0.055} r2={0.045} h={1.15} pos={[from[0] + dx * d, 0.57, from[1] + dz * d]} color={i % 3 ? '#8E7E68' : '#7A6A56'} seg={8} />;
      })}
      {[0.35, 0.65, 0.95].map((y, k) => (
        <mesh key={k} position={[from[0] + dx * (L / 2), y, from[1] + dz * (L / 2)]} rotation={[0, yaw, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, L, 4]} />
          <meshBasicMaterial color="#5A5654" />
        </mesh>
      ))}
      {gateAt !== undefined && (
        <group position={[from[0] + dx * gateU, 0, from[1] + dz * gateU]} rotation={[0, yaw, 0]}>
          {[-1.3, 1.3].map((x) => (
            <Cyl key={x} r={0.11} h={1.5} pos={[x, 0.75, 0]} color="#7A6A56" seg={10} />
          ))}
          {[0.18, 0.46, 0.74, 1.02, 1.3].map((y) => (
            <Box key={y} size={[2.5, 0.1, 0.05]} pos={[0, y, 0]} color="#A89272" />
          ))}
          <Box size={[0.1, 1.3, 0.05]} pos={[-1.15, 0.72, 0.03]} color="#968062" />
          <Box size={[0.1, 1.3, 0.05]} pos={[1.15, 0.72, 0.03]} color="#968062" />
          <Box size={[2.6, 0.1, 0.05]} pos={[0, 0.72, 0.035]} rot={[0, 0, 0.46]} color="#968062" />
        </group>
      )}
    </group>
  );
};

export const Shed: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => {
  const wall = ironTex(0.6);
  const roof = ironTex(1);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 2.8, 3.6]} />
        <meshStandardMaterial map={wall} roughness={0.55} metalness={0.35} color="#B8BCC0" />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[0, 3.05, sd * 0.95]} rotation={[sd * 0.32, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.4, 0.06, 2.1]} />
          <meshStandardMaterial map={roof} roughness={0.5} metalness={0.4} color="#B0A8A0" />
        </mesh>
      ))}
      <Box size={[1.8, 2.2, 0.05]} pos={[0.8, 1.1, 1.81]} color="#2A2230" />
      <Box size={[0.9, 2.2, 0.06]} pos={[-0.55, 1.1, 1.86]} rot={[0, 0.6, 0]} color="#8E9296" />
    </group>
  );
};

export const Windmill: React.FC<{pos: V3; s?: number}> = ({pos, s = 1}) => {
  const {t} = useScene();
  const H = 7;
  const legs = [-1, 1].flatMap((a) => [-1, 1].map((b) => [a, b] as [number, number]));
  return (
    <group position={pos} scale={s}>
      {legs.map(([a, b], i) => {
        const x0 = a * 0.8, z0 = b * 0.8, x1 = a * 0.18, z1 = b * 0.18;
        const len = Math.hypot(x1 - x0, H, z1 - z0);
        return (
          <mesh key={i} position={[(x0 + x1) / 2, H / 2, (z0 + z1) / 2]} rotation={[Math.atan2(z0 - z1, H) * 1, 0, -Math.atan2(x0 - x1, H)]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, len, 6]} />
            <Toon color="#8C8C92" />
          </mesh>
        );
      })}
      {[1.5, 3.2, 4.8, 6.2].map((y, i) => {
        const w = 0.8 - (0.62 * y) / H;
        return (
          <group key={i}>
            <Box size={[w * 2, 0.04, 0.04]} pos={[0, y, w]} color="#7E7E86" />
            <Box size={[w * 2, 0.04, 0.04]} pos={[0, y, -w]} color="#7E7E86" />
            <Box size={[0.04, 0.04, w * 2]} pos={[w, y, 0]} color="#7E7E86" />
            <Box size={[0.04, 0.04, w * 2]} pos={[-w, y, 0]} color="#7E7E86" />
          </group>
        );
      })}
      <group position={[0, H + 0.2, 0.1]}>
        <Box size={[0.3, 0.3, 0.6]} pos={[0, 0, -0.1]} color="#6E6E76" />
        {/* tail vane */}
        <Box size={[0.04, 0.8, 1.6]} pos={[0, 0.1, -1.2]} color="#C8C4BC" />
        <group position={[0, 0, 0.3]} rotation={[0, 0, t * 1.6]}>
          <Cyl r={0.1} h={0.2} rot={[Math.PI / 2, 0, 0]} color="#5A5A60" />
          {Array.from({length: 18}, (_, i) => (
            <group key={i} rotation={[0, 0, (i / 18) * Math.PI * 2]}>
              <Box size={[0.18, 1.05, 0.02]} pos={[0, 0.72, 0]} rot={[0, 0.5, 0]} color={i % 2 ? '#CFCBC2' : '#B8B4AC'} />
            </group>
          ))}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[1.22, 0.02, 4, 36]} />
            <Toon color="#8A8A90" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const WaterTank: React.FC<{pos: V3}> = ({pos}) => {
  const tex = ironTex(0.4);
  return (
    <group position={pos}>
      {[-0.7, 0.7].flatMap((a) => [-0.7, 0.7].map((b) => <Box key={`${a}${b}`} size={[0.14, 1.6, 0.14]} pos={[a, 0.8, b]} color="#7A6A56" />))}
      <Box size={[1.9, 0.12, 1.9]} pos={[0, 1.62, 0]} color="#8E7E68" />
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.0, 1.6, 28]} />
        <meshStandardMaterial map={tex} roughness={0.5} metalness={0.35} color="#B8BCC0" />
      </mesh>
      <mesh position={[0, 3.38, 0]} castShadow>
        <coneGeometry args={[1.06, 0.3, 28]} />
        <meshStandardMaterial map={tex} roughness={0.5} metalness={0.35} color="#A8ACB0" />
      </mesh>
    </group>
  );
};

export const Farmhouse: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => {
  const boards = boardTex();
  const roof = ironTex(0.8);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 3, 6]} />
        <meshStandardMaterial map={boards} roughness={0.85} color="#F0E4C8" />
      </mesh>
      <mesh position={[0, 4.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[6.1, 2.2, 4]} />
        <meshStandardMaterial map={roof} roughness={0.5} metalness={0.3} color="#B65A40" />
      </mesh>
      {/* veranda: skillion roof on posts, boards, steps */}
      <mesh position={[0, 2.7, 3.9]} rotation={[0.18, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.4, 0.06, 2.2]} />
        <meshStandardMaterial map={roof} roughness={0.5} metalness={0.3} color="#B65A40" />
      </mesh>
      {[-3.9, -1.3, 1.3, 3.9].map((x) => (
        <Cyl key={x} r={0.07} h={2.5} pos={[x, 1.25, 4.85]} color="#E9E0CC" seg={8} />
      ))}
      <Box size={[8.4, 0.18, 2.1]} pos={[0, 0.09, 3.95]} color="#9A7A58" />
      <Box size={[8.2, 0.08, 0.06]} pos={[0, 0.9, 4.85]} color="#E9E0CC" />
      {[-2.6, 2.6].map((x) => (
        <group key={x}>
          <Box size={[1.2, 1.3, 0.06]} pos={[x, 1.7, 3.01]} color="#26324A" />
          <Box size={[1.36, 0.1, 0.08]} pos={[x, 2.38, 3.03]} color="#F4EEE0" />
          <Box size={[1.36, 0.1, 0.08]} pos={[x, 1.02, 3.03]} color="#F4EEE0" />
          <Box size={[0.08, 1.3, 0.08]} pos={[x, 1.7, 3.04]} color="#F4EEE0" />
        </group>
      ))}
      <Box size={[1.0, 2.2, 0.06]} pos={[0, 1.1, 3.01]} color="#6A3E2A" />
    </group>
  );
};

/* =================================================================== */
/* Lewis gun (WWI-era light machine gun) — period prop, never aimed at the lens */
/* =================================================================== */
const DARK = '#4C4F58';
export const LewisGun: React.FC<{pos: V3; rot?: V3; s?: number; jamAt?: number; bipod?: boolean; recoilAt?: number[]; wobble?: number}> = ({pos, rot = [0, 0, 0], s = 1, jamAt, bipod = true, recoilAt = [], wobble = 0}) => {
  const {t} = useScene();
  const wz = wobble * (Math.sin(t * 9.1) * 0.09 + Math.sin(t * 15.7) * 0.04);
  const wy = wobble * Math.sin(t * 6.7) * 0.1;
  // the jam: the cocking handle is yanked back twice, the pan wobbles but stays stuck
  const j = jamAt !== undefined ? t - jamAt : -1;
  const yank = j > 0 ? Math.max(0, Math.sin(Math.min(j, 1.2) * Math.PI * 4)) * (j < 1.2 ? 1 : 0) : 0;
  const wob = j > 0 && j < 1.4 ? Math.sin(j * 40) * 0.05 * (1 - j / 1.4) : 0;
  const rec = recoilAt.reduce((a, r0) => a + (t > r0 && t < r0 + 0.08 ? 0.015 : 0), 0);
  const fins = useMemo(() => Array.from({length: 14}, (_, i) => i), []);
  return (
    <group position={pos} rotation={[rot[0], rot[1] + wy, rot[2] + wz]} scale={s}>
      <group position={[-rec, 0, 0]}>
        {/* barrel shroud: fat finned cylinder along +x */}
        <Cyl r={0.06} h={0.66} rot={[0, 0, Math.PI / 2]} pos={[0.42, 0, 0]} color={DARK} seg={16} />
        {fins.map((i) => (
          <Cyl key={i} r={0.068} h={0.012} rot={[0, 0, Math.PI / 2]} pos={[0.14 + i * 0.042, 0, 0]} color="#2A2C30" seg={16} />
        ))}
        <Cyl r={0.045} r2={0.03} h={0.1} rot={[0, 0, -Math.PI / 2]} pos={[0.8, 0, 0]} color="#2A2C30" seg={12} />
        <Cyl r={0.014} h={0.1} rot={[0, 0, Math.PI / 2]} pos={[0.89, 0, 0]} color="#1E2024" seg={8} />
        {/* receiver */}
        <Box size={[0.28, 0.1, 0.085]} pos={[-0.02, 0.0, 0]} color="#3E4046" />
        {/* cocking handle (yanked on the jam) */}
        <Box size={[0.03, 0.03, 0.06]} pos={[0.02 - yank * 0.08, 0.01, 0.07]} color="#8A8C90" />
        {/* flat round pan magazine on top */}
        <group position={[-0.02, 0.085, 0]} rotation={[wob, 0, wob * 0.6]}>
          <Cyl r={0.15} h={0.04} pos={[0, 0, 0]} color="#3A3C42" seg={28} />
          <Cyl r={0.05} h={0.05} pos={[0, 0.005, 0]} color="#5A5C62" seg={16} />
          {Array.from({length: 12}, (_, i) => (
            <Box key={i} size={[0.1, 0.008, 0.012]} pos={[Math.cos((i / 12) * Math.PI * 2) * 0.1, 0.022, Math.sin((i / 12) * Math.PI * 2) * 0.1]} rot={[0, -(i / 12) * Math.PI * 2, 0]} color="#4E5056" />
          ))}
        </group>
        {/* wooden stock + pistol grip */}
        <mesh position={[-0.33, -0.03, 0]} rotation={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[0.36, 0.1, 0.06]} />
          <Toon color="#7A4E2E" />
        </mesh>
        <Box size={[0.05, 0.1, 0.05]} pos={[-0.12, -0.08, 0]} rot={[0, 0, -0.3]} color="#6A4226" />
      </group>
      {bipod && (
        <group position={[0.62, -0.02, 0]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[0.03, -0.17, sd * 0.09]} rotation={[sd * 0.5, 0, 0.15]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.38, 6]} />
              <Toon color="#2A2C30" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

/* dust puffs where bullets land: in empty ground only, never near a bird */
export const DustPuffs: React.FC<{center: [number, number]; r: number; times: number[]; seed?: number}> = ({center, r, times, seed = 3}) => {
  const {t} = useScene();
  const pts = useMemo(() => {
    const rr = mulberry(seed);
    return times.map((at) => ({at, x: center[0] + (rr() - 0.5) * 2 * r, z: center[1] + (rr() - 0.5) * 2 * r}));
  }, [center[0], center[1], r, times, seed]);
  return (
    <>
      {pts.map((p, i) => {
        const k = t - p.at;
        if (k < 0 || k > 0.9) return null;
        const g = 0.12 + k * 0.7;
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            {[0, 1, 2].map((j) => (
              <mesh key={j} position={[(j - 1) * g * 0.5, g * (0.5 + j * 0.2), (j % 2) * 0.05]} scale={g * (0.8 + j * 0.15)}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color="#C89A70" transparent opacity={0.55 * (1 - k / 0.9)} depthWrite={false} roughness={1} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
};

/* =================================================================== */
/* 1930s flatbed farm truck (faces +x)                                   */
/* =================================================================== */
export type TruckSpec = {
  pos: V3; // where it ends up (or stays)
  rotY?: number;
  drive?: {from: V3; at?: number; dur: number; easeIn?: boolean; glide?: boolean}; // glide: same ease as the camera dollies, so a tracking camera keeps it framed // pulls up: decelerates into `pos` (easeIn: pulls away from `from`)
  heldGuns?: {pos: V3; rotY?: number}[]; // Lewis guns held by the soldiers on the bed (truck-relative)
  bedOnly?: boolean; // POV from the bed: no cab / bonnet (the camera rides on the truck)
  gunPost?: V3; // truck-relative spot of the post-mounted gun
  bumpy?: number; // 0..1 rough ground: bounce + roll
  wheelSpin?: number; // m/s of ground speed (treadmill shots)
  guns?: number; // Lewis guns on the bed (0..2)
  dust?: boolean;
  crates?: boolean; // loaded up to leave
};

const Wheel: React.FC<{pos: V3; spin: number}> = ({pos, spin}) => (
  <group position={pos} rotation={[Math.PI / 2, 0, 0]}>
    <group rotation={[0, spin, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.36, 0.1, 10, 28]} />
        <Toon color="#1E1E24" />
      </mesh>
      <Cyl r={0.26} h={0.06} color="#C24A34" seg={20} />
      <Cyl r={0.09} h={0.14} color="#2A2A30" seg={12} />
      {Array.from({length: 10}, (_, i) => (
        <Box key={i} size={[0.03, 0.08, 0.27]} pos={[Math.cos((i / 10) * Math.PI * 2) * 0.15, 0, Math.sin((i / 10) * Math.PI * 2) * 0.15]} rot={[0, -(i / 10) * Math.PI * 2, 0]} color="#E8D8B8" />
      ))}
    </group>
  </group>
);

export const Truck: React.FC<{spec: TruckSpec}> = ({spec}) => {
  const {t} = useScene();
  let x = spec.pos[0], z = spec.pos[2];
  let speed = spec.wheelSpin ?? 0;
  if (spec.drive) {
    const k = clamp01((t - (spec.drive.at ?? 0)) / spec.drive.dur);
    const e = spec.drive.glide ? 0.5 - 0.5 * Math.cos(Math.PI * k) : spec.drive.easeIn ? k * k * k : 1 - Math.pow(1 - k, 3);
    x = spec.drive.from[0] + (spec.pos[0] - spec.drive.from[0]) * e;
    z = spec.drive.from[2] + (spec.pos[2] - spec.drive.from[2]) * e;
    const L = Math.hypot(spec.pos[0] - spec.drive.from[0], spec.pos[2] - spec.drive.from[2]);
    speed = k < 1 ? ((spec.drive.glide ? 0.5 * Math.PI * Math.sin(Math.PI * k) : 3 * (spec.drive.easeIn ? k * k : Math.pow(1 - k, 2))) * L) / spec.drive.dur : 0;
  }
  const dist = spec.drive ? x : t * speed;
  const spin = -dist / 0.46;
  const b = spec.bumpy ?? 0;
  const bounce = b * (Math.abs(Math.sin(t * 7.3)) * 0.07 + Math.sin(t * 13.1) * 0.025);
  const roll = b * (Math.sin(t * 5.1) * 0.05 + Math.sin(t * 11.7) * 0.02);
  const pitch = b * Math.sin(t * 6.3) * 0.035 + (speed > 0.1 && spec.drive ? 0 : 0);
  const paint = '#2F4A44';
  const cream = '#E8DCC0';
  return (
    <group position={[x, 0, z]} rotation={[0, spec.rotY ?? 0, 0]}>
      {[[1.45, 0.82], [1.45, -0.82], [-1.25, 0.82], [-1.25, -0.82]].map(([wx, wz], i) => (
        <Wheel key={i} pos={[wx, 0.46, wz]} spin={spin} />
      ))}
      <group position={[0, bounce, 0]} rotation={[roll, 0, pitch]}>
        {/* chassis + running boards */}
        <Box size={[4.4, 0.16, 1.0]} pos={[0, 0.62, 0]} color="#1E1E24" />
        {[-1, 1].map((sd) => (
          <Box key={sd} size={[1.3, 0.05, 0.32]} pos={[0.55, 0.52, sd * 0.86]} color="#1E1E24" />
        ))}
        {/* mudguards */}
        {[[1.45, 1], [1.45, -1], [-1.25, 1], [-1.25, -1]].map(([wx, sd], i) => (
          <mesh key={i} position={[wx, 0.5, sd * 0.84]} rotation={[0, 0, 0]} castShadow>
            <torusGeometry args={[0.5, 0.13, 6, 16, Math.PI]} />
            <Toon color="#1E2A28" />
          </mesh>
        ))}
        {!spec.bedOnly && (
        <>
        {/* round-nosed bonnet + radiator shell + grille */}
        <mesh position={[1.62, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 1.2, 20, 1, false, 0, Math.PI]} />
          <Toon color={paint} />
        </mesh>
        <Box size={[1.2, 0.42, 0.84]} pos={[1.62, 0.78, 0]} color={paint} />
        <mesh position={[2.24, 0.95, 0]} scale={[0.35, 1, 1]} castShadow>
          <sphereGeometry args={[0.44, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
          <Toon color="#C8C4B8" />
        </mesh>
        <Box size={[0.06, 0.62, 0.62]} pos={[2.32, 0.92, 0]} color="#2A2A30" />
        {Array.from({length: 7}, (_, i) => (
          <Box key={i} size={[0.07, 0.56, 0.02]} pos={[2.33, 0.92, -0.27 + i * 0.09]} color="#A8A498" />
        ))}
        {/* big round headlights on stalks */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[2.25, 1.12, sd * 0.62]}>
            <Cyl r={0.02} h={0.3} pos={[-0.05, -0.15, 0]} color="#1E1E24" />
            <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.15, 0.13, 0.16, 18]} />
              <Toon color="#C8C4B8" />
            </mesh>
            <mesh position={[0.085, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <circleGeometry args={[0.125, 20]} />
              <meshStandardMaterial color="#FFF4D8" emissive="#FFE8B0" emissiveIntensity={0.35} roughness={0.1} metalness={0.2} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
        {/* cab */}
        <Box size={[1.0, 1.0, 1.5]} pos={[0.6, 1.25, 0]} color={paint} />
        <Box size={[1.1, 0.07, 1.6]} pos={[0.62, 2.22, 0]} color="#1E2A28" />
        {[[0.12, 0.72], [0.12, -0.72], [1.08, 0.72], [1.08, -0.72]].map(([px, pz], i) => (
          <Box key={i} size={[0.07, 0.9, 0.07]} pos={[px, 1.76, pz]} color={paint} />
        ))}
        <Box size={[0.04, 0.6, 1.3]} pos={[1.1, 1.85, 0]} color="#9FC0CC" />
        <Cyl r={0.18} h={0.05} pos={[0.95, 1.55, 0.35]} rot={[0, 0, 1.2]} color="#1E1E24" />
        </>
        )}
        {/* flatbed: boards + rails */}
        <Box size={[2.6, 0.1, 1.9]} pos={[-1.05, 0.78, 0]} color="#8E6A48" />
        {Array.from({length: 6}, (_, i) => (
          <Box key={i} size={[2.6, 0.02, 0.02]} pos={[-1.05, 0.84, -0.8 + i * 0.32]} color="#6A4A30" />
        ))}
        {[-1, 1].map((sd) => (
          <group key={sd}>
            {[-2.25, -1.55, -0.85, -0.15].map((px) => (
              <Box key={px} size={[0.07, 0.5, 0.07]} pos={[px, 1.08, sd * 0.92]} color="#7A5A3C" />
            ))}
            <Box size={[2.4, 0.08, 0.06]} pos={[-1.2, 1.3, sd * 0.92]} color="#9A7A56" />
            <Box size={[2.4, 0.06, 0.05]} pos={[-1.2, 1.05, sd * 0.92]} color="#9A7A56" />
          </group>
        ))}
        <Box size={[0.06, 0.5, 1.9]} pos={[-2.32, 1.08, 0]} color="#7A5A3C" />
        {/* the Lewis guns on posts, pointing out to the side (never at the lens) */}
        {(spec.guns ?? 0) > 0 && (
          <>
            <Cyl r={0.04} h={0.6} pos={[(spec.gunPost ?? [-0.9, 0, 0.3])[0], 1.15, (spec.gunPost ?? [-0.9, 0, 0.3])[2]]} color="#2A2C30" />
            <LewisGun pos={[(spec.gunPost ?? [-0.9, 0, 0.3])[0], 1.5, (spec.gunPost ?? [-0.9, 0, 0.3])[2]]} rot={[0, 0.0, 0.05]} s={1.1} bipod={false} wobble={spec.bumpy ?? 0} />
          </>
        )}
        {(spec.guns ?? 0) > 1 && <LewisGun pos={[-1.8, 0.92, -0.4]} rot={[0, 0.35, 0]} s={1.0} />}
        {spec.heldGuns?.map((g, i) => <LewisGun key={`h${i}`} pos={g.pos} rot={[0, g.rotY ?? 0, 0.08]} s={1.05} bipod={false} />)}
        {spec.crates && (
          <>
            <Box size={[0.6, 0.45, 0.5]} pos={[-1.7, 1.05, 0.4]} color="#9A7A50" />
            <Box size={[0.55, 0.4, 0.5]} pos={[-1.1, 1.03, -0.45]} color="#8E6E46" />
            <Box size={[0.5, 0.35, 0.45]} pos={[-1.75, 1.45, 0.35]} color="#A6865A" />
          </>
        )}
      </group>
      {spec.dust && (speed > 0.2 || (spec.bumpy ?? 0) > 0) && <Motes count={70} box={[2.6, 1.4, 2.4]} center={[-3.4, 0.6, 0]} color="#D2A27A" size={0.22} rise={0.25} seed={9} opacity={0.5} />}
    </group>
  );
};

/* =================================================================== */
/* FARM set                                                             */
/* =================================================================== */
export type FarmFx = {
  flocks?: FlockSpec[];
  emus?: EmuProps[];
  truck?: TruckSpec;
  hatPost?: V3 | null; // Vik's fedora sitting on top of a fence post
  hatPostAt?: number; // ...from this time on
  guns?: {pos: V3; rot?: V3; jamAt?: number}[];
  puffs?: {center: [number, number]; r: number; times: number[]};
  scroll?: number; // treadmill: the world slides past at this speed (m/s along -x)
  wheatRect?: [number, number, number, number];
  haze?: number;
};

export const FARM = {gate: [0, 0, 1.2] as V3, fenceZ: 1.2};

export const FarmHD: React.FC<{fx: FarmFx}> = ({fx}) => {
  const {t} = useScene();
  const dirt = useMemo(() => {
    const d = dirtTex().clone();
    d.needsUpdate = true;
    d.repeat.set(30, 30);
    return d;
  }, []);
  const far = useMemo(() => {
    const d = wheatFarTex().clone();
    d.needsUpdate = true;
    d.repeat.set(14, 6);
    return d;
  }, []);
  const sx = (fx.scroll ?? 0) * t;
  dirt.offset.set(sx / 10, 0);
  far.offset.set(sx / 12, 0);
  // emu positions that push the wheat aside (drifting flocks only)
  const bases = useMemo(() => (fx.flocks ?? []).filter((f) => !f.split && !f.line).map((f) => ({f, b: flockBase(f).out})), [fx.flocks]);
  const push: [number, number][] = bases.flatMap(({f, b}) => b.map((o) => [o.x + (f.vel?.[0] ?? 0) * t, o.z + (f.vel?.[1] ?? 0) * t] as [number, number]));
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial map={dirt} roughness={0.95} color="#E8C8B0" />
      </mesh>
      {/* the wheat beyond the fence: instanced near band + golden carpet beyond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, -60]} receiveShadow>
        <planeGeometry args={[300, 116]} />
        <meshStandardMaterial map={far} roughness={1} color="#FFFFFF" />
      </mesh>
      <group position={[-sx, 0, 0]}>
        <Wheat rect={fx.wheatRect ?? [-14, 14, -9, -1.0]} spacing={fx.scroll ? 0.3 : 0.24} push={push} />
      </group>
      <group position={[-sx, 0, 0]}>
        <Fence from={[-40, FARM.fenceZ]} to={[40, FARM.fenceZ]} gateAt={0.5} />
        <GumTree pos={[-9, 0, -12]} s={1.1} seed={3} />
        <GumTree pos={[11, 0, -16]} s={1.3} seed={7} />
        <GumTree pos={[24, 0, -6]} s={1.0} seed={11} />
        <GumTree pos={[-26, 0, -9]} s={1.2} seed={5} />
        {!fx.scroll && <Shed pos={[-14, 0, 6]} rotY={0.4} />}
        {!fx.scroll && <Farmhouse pos={[17, 0, 9]} rotY={-0.5} />}
        {!fx.scroll && <GumTree pos={[4.5, 0, 11.5]} s={0.9} seed={17} />}
        <Windmill pos={[-6, 0, -20]} />
        <WaterTank pos={[-4, 0, -18]} />
        {(fx.scroll ? [[-20, -3], [28, -2.5], [-32, -4.5], [9, -3]] : [[6, 3.4], [9, 5.5], [-20, 3], [28, 2.5], [-32, 4.5]]).map(([x, z], i) => (
          <Scrub key={i} pos={[x, 0, z]} s={1 + (i % 3) * 0.3} seed={i + 2} />
        ))}
        {[[-11, -3], [-8.5, -4], [13, -2.5]].map(([x, z], i) => (
          <HayBale key={i} pos={[x, 0, z]} rotY={i * 0.7} />
        ))}
        {fx.hatPost && t >= (fx.hatPostAt ?? 0) && (
          <group position={[fx.hatPost[0], fx.hatPost[1], fx.hatPost[2]]}>
            <HatOnPost />
          </group>
        )}
      </group>
      {fx.flocks?.map((f, i) => <Flock key={i} f={f} />)}
      {fx.emus?.map((e, i) => <Emu key={`e${i}`} {...e} />)}
      {fx.truck && <Truck spec={fx.truck} />}
      {fx.guns?.map((g, i) => <LewisGun key={i} pos={g.pos} rot={g.rot} jamAt={g.jamAt} />)}
      {fx.puffs && <DustPuffs {...fx.puffs} />}
      <Motes count={160} box={[24, 5, 16]} center={[0, 2.2, -4]} color="#FFDDA0" size={0.05} rise={0.03} seed={21} opacity={0.55 * (fx.haze ?? 1)} />
    </group>
  );
};

// Vik's fedora resting on a fence post: a small real 3D hat (felt crown, saffron band, brim)
export const HatOnPost: React.FC = () => (
  <group>
    <Cyl r={0.15} r2={0.17} h={0.012} pos={[0, 0.006, 0]} color="#3E271C" seg={24} />
    <mesh position={[0, 0.0, 0]} scale={[1, 0.12, 1]}>
      <cylinderGeometry args={[0.24, 0.24, 0.1, 28]} />
      <Toon color="#3E271C" />
    </mesh>
    <Cyl r={0.125} r2={0.14} h={0.13} pos={[0, 0.08, 0]} color="#4A3022" seg={24} />
    <Cyl r={0.142} h={0.035} pos={[0, 0.035, 0]} color="#F2A33A" seg={24} />
    <Box size={[0.03, 0.02, 0.18]} pos={[0, 0.15, 0]} color="#3A2418" />
  </group>
);

/* =================================================================== */
/* WATER HOLE (earth dam)                                               */
/* =================================================================== */
export type WaterHoleFx = {flocks?: FlockSpec[]; emus?: EmuProps[]; gun?: {pos: V3; rot?: V3; jamAt?: number}; ripple?: boolean};
export const WH = {water: [0, 0, -9] as V3, bank: [0, 0, 1.4] as V3};

export const WaterHoleHD: React.FC<{fx: WaterHoleFx}> = ({fx}) => {
  const {t} = useScene();
  const dirt = useMemo(() => {
    const d = dirtTex().clone();
    d.needsUpdate = true;
    d.repeat.set(30, 30);
    return d;
  }, []);
  const mud = useMemo(() => {
    const d = hoofMudTex().clone();
    d.needsUpdate = true;
    d.repeat.set(3, 3);
    return d;
  }, []);
  const water = useMemo(() => {
    const d = muddyWaterTex().clone();
    d.needsUpdate = true;
    d.repeat.set(4, 4);
    return d;
  }, []);
  water.offset.set(Math.sin(t * 0.3) * 0.02, t * 0.004);
  const reeds = useMemo(() => {
    const r = mulberry(51);
    return Array.from({length: 120}, () => {
      const a = r() * Math.PI * 2;
      const rr = 6.6 + r() * 1.6;
      return {x: WH.water[0] + Math.cos(a) * rr * 1.25, z: WH.water[2] + Math.sin(a) * rr * 0.75, h: 0.6 + r() * 0.9, ph: r() * 6, c: r() < 0.5 ? '#6E7E46' : '#9A9050'};
    }).filter((p) => p.z < -3.5);
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial map={dirt} roughness={0.95} color="#E8C8B0" />
      </mesh>
      {/* hoof-churned mud ring and the still brown water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WH.water[0], 0.01, WH.water[2]]} scale={[1.25, 0.75, 1]} receiveShadow>
        <circleGeometry args={[8.4, 48]} />
        <meshStandardMaterial map={mud} roughness={0.7} color="#D8B8A0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WH.water[0], 0.03, WH.water[2]]} scale={[1.25, 0.75, 1]}>
        <circleGeometry args={[6.4, 48]} />
        <meshStandardMaterial map={water} roughness={0.12} metalness={0.25} color="#A08870" envMapIntensity={0.9} />
      </mesh>
      {reeds.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, p.z]} rotation={[Math.sin(t * 1.2 + p.ph) * 0.06, 0, Math.cos(t + p.ph) * 0.05]}>
          <coneGeometry args={[0.025, p.h, 4]} />
          <Toon color={p.c} />
        </mesh>
      ))}
      {/* the dirt bank the soldiers hide behind (foreground) */}
      <mesh position={[WH.bank[0], 0, WH.bank[2]]} scale={[7, 0.85, 1.3]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={dirt} roughness={1} color="#D8A888" />
      </mesh>
      {[-3, -1.2, 1.4, 3.2].map((x, i) => (
        <Scrub key={i} pos={[x, 0.5, WH.bank[2] + 0.2]} s={0.6} seed={i + 30} />
      ))}
      <GumTree pos={[-9, 0, -12]} s={1.2} seed={9} />
      <GumTree pos={[8, 0, -15]} s={1.0} seed={13} />
      <Scrub pos={[10, 0, -6]} s={1.2} seed={41} />
      <Scrub pos={[-12, 0, -5]} s={1.4} seed={43} />
      <Fence from={[-40, -22]} to={[40, -22]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, -50]}>
        <planeGeometry args={[300, 56]} />
        <meshStandardMaterial map={wheatFarTex()} roughness={1} color="#FFFFFF" />
      </mesh>
      {fx.flocks?.map((f, i) => <Flock key={i} f={f} />)}
      {fx.emus?.map((e, i) => <Emu key={`e${i}`} {...e} />)}
      {fx.gun && <LewisGun pos={fx.gun.pos} rot={fx.gun.rot} jamAt={fx.gun.jamAt} />}
      <Motes count={90} box={[16, 4, 12]} center={[0, 2, -6]} color="#FFDDA0" size={0.05} rise={0.03} seed={23} opacity={0.5} />
    </group>
  );
};

/* =================================================================== */
/* Gus's demo: bowling ball + glass marbles on the workshop floorboards  */
/* =================================================================== */
export type MarbleFx = {
  mode: 'rack' | 'scatter';
  origin?: V3; // centre of the play area on the floor
  rollAt?: number; // ball starts rolling (seconds)
  rollFrom?: [number, number]; // ball start (x, z) relative to origin
  speed?: number; // ball m/s
  throwAt?: number; // scatter mode: Gus throws the marbles out across the floor
  struck?: boolean; // scatter mode: the ball clips one marble
  noBall?: boolean;
  rotY?: number; // the ball rolls along local +z
  throwFrom?: [number, number]; // scatter mode: where the handful leaves Gus's hand (local x, z)
};

const MR = 0.04; // cartoon-size marble radius
const BR = 0.11; // bowling ball radius
const SWIRL = ['#E0463A', '#2E7CD8', '#2EA85A', '#F2B230', '#9A4AD0', '#E86AA8'];

const rackPts = (): [number, number][] => {
  // tight triangle, apex towards the ball (-z), 8 rows = 36 marbles + 4 strays
  const out: [number, number][] = [];
  const dz = MR * 2 * 0.87 + 0.002;
  for (let row = 0; row < 8; row++)
    for (let k = 0; k <= row; k++) out.push([(k - row / 2) * (MR * 2 + 0.002), row * dz]);
  return out;
};

const scatterPts = (): [number, number][] => {
  const r = mulberry(77);
  const out: [number, number][] = [];
  let tries = 0;
  while (out.length < 39 && tries < 5000) {
    tries++;
    const x = (r() - 0.5) * 2.6, z = -0.4 + r() * 2.4;
    if (Math.abs(x) < BR + MR + 0.06) continue; // the ball's lane stays clear...
    if (out.some(([a, b]) => Math.hypot(a - x, b - z) < 0.26)) continue;
    out.push([x, z]);
  }
  out.push([BR + MR - 0.05, 0.9]); // ...except this one: the ball clips it
  return out;
};

const glassMat = new Map<string, THREE.MeshStandardMaterial>();
const glass = () => {
  const k = 'glass';
  if (!glassMat.has(k)) glassMat.set(k, new THREE.MeshStandardMaterial({color: '#BFE4EE', roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.38, envMapIntensity: 2.0}));
  return glassMat.get(k)!;
};

export const Marbles: React.FC<{fx: MarbleFx}> = ({fx}) => {
  const {t} = useScene();
  const o = fx.origin ?? [0, 0, 0];
  const start = useMemo(() => (fx.mode === 'rack' ? rackPts() : scatterPts()), [fx.mode]);
  const rnd = useMemo(() => {
    const r = mulberry(91);
    return start.map(() => ({a: r() * 6.28, b: r() * 6.28, c: Math.floor(r() * SWIRL.length), sp: 0.7 + r() * 0.6, ang: (r() - 0.5) * 0.9}));
  }, [start]);
  const speed = fx.speed ?? 2.2;
  const from = fx.rollFrom ?? [0, -2.2];
  const t0 = fx.rollAt ?? 0;
  // ball along +z
  const bz = from[1] + Math.max(0, t - t0) * speed;
  const bx = from[0];
  // rack: impact when the ball reaches the apex
  const apexZ = start.reduce((m, p) => Math.min(m, p[1]), 9);
  const hitT = t0 + (apexZ - from[1] - BR - MR) / speed;
  let ballZ = bz;
  if (fx.mode === 'rack' && t > hitT) ballZ = from[1] + (hitT - t0) * speed + (t - hitT) * speed * 0.45;
  const marbles = start.map(([x, z], i) => {
    let px = x, pz = z, py = MR, roll = 0, rx = 0, rz = 0;
    if (fx.mode === 'rack' && t > hitT) {
      // burst: away from the impact point, nearer marbles first
      const dx = x - bx, dz = z - (apexZ - BR);
      const d = Math.hypot(dx, dz) || 1;
      const k = Math.max(0, t - hitT - d * 0.05);
      const v0 = (2.6 - d * 2.2) * rnd[i].sp + 0.5;
      const dist = (v0 * (1 - Math.exp(-2.4 * k))) / 2.4;
      const a = Math.atan2(dx, dz) + rnd[i].ang * 0.5;
      px = x + Math.sin(a) * dist;
      pz = z + Math.cos(a) * dist;
      py = MR + Math.max(0, Math.sin(Math.min(1, k * 3) * Math.PI)) * 0.04 * rnd[i].sp;
      roll = dist / MR;
      rx = Math.cos(a);
      rz = -Math.sin(a);
    }
    if (fx.mode === 'scatter' && fx.throwAt !== undefined) {
      // thrown from Gus's hand (left side) out to the scattered spots, two little hops
      const k = clamp01((t - fx.throwAt - i * 0.012) / 0.9);
      const e = 1 - Math.pow(1 - k, 3);
      const [sx, sz] = fx.throwFrom ?? [-1.1, 0.2];
      px = sx + (x - sx) * e;
      pz = sz + (z - sz) * e;
      py = MR + Math.abs(Math.sin(k * Math.PI * 2)) * 0.12 * (1 - k);
      roll = Math.hypot(x - sx, z - sz) * e / MR;
      rx = 1;
    }
    if (fx.mode === 'scatter' && fx.struck && i === start.length - 1) {
      const hz = z - BR - MR + 0.03;
      const ht = t0 + (hz - from[1]) / speed;
      if (t > ht) {
        const k = t - ht;
        const dist = (1.8 * (1 - Math.exp(-2.2 * k))) / 2.2;
        px = x + dist * 0.85;
        pz = z + dist * 0.5;
        roll = dist / MR;
        rz = 1;
      }
    }
    return {px, py, pz, roll, rx, rz, c: SWIRL[rnd[i].c], a: rnd[i].a};
  });
  const ballOn = !fx.noBall && t >= t0 - 0.001;
  return (
    <group position={o} rotation={[0, fx.rotY ?? 0, 0]}>
      {marbles.map((m, i) => (
        <group key={i} position={[m.px, m.py, m.pz]} rotation={[m.rx * m.roll, m.a, m.rz * m.roll]}>
          <mesh castShadow material={glass()}>
            <sphereGeometry args={[MR, 18, 14]} />
          </mesh>
          <mesh scale={[0.82, 0.34, 0.86]} rotation={[0.4, m.a, 0.7]}>
            <sphereGeometry args={[MR, 10, 8]} />
            <meshStandardMaterial color={m.c} roughness={0.3} emissive={m.c} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[MR * 0.35, MR * 0.45, MR * 0.45]}>
            <sphereGeometry args={[MR * 0.16, 8, 6]} />
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {ballOn && (
        <group position={[bx, BR, ballZ]} rotation={[(ballZ - from[1]) / BR, 0, 0]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[BR, 32, 24]} />
            <meshStandardMaterial color="#14151C" roughness={0.12} metalness={0.3} envMapIntensity={1.6} />
          </mesh>
          {[[0.25, 0.9], [-0.25, 0.9], [0, 0.55]].map(([a, b], i) => (
            <mesh key={i} position={[Math.sin(a) * Math.sin(b) * BR * 0.99, Math.cos(b) * BR * 0.99, Math.cos(a) * Math.sin(b) * BR * 0.99]}>
              <sphereGeometry args={[BR * 0.11, 10, 8]} />
              <meshBasicMaterial color="#020204" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// the floorboard patch in Gus's workshop (the forge set has a brick floor)
export const Floorboards: React.FC<{pos: V3; size: [number, number]}> = ({pos, size}) => {
  const tex = useMemo(() => {
    const d = plankTex().clone();
    d.needsUpdate = true;
    d.repeat.set(size[0] / 2.4, size[1] / 2.4);
    return d;
  }, [size[0], size[1]]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], pos[1] + 0.02, pos[2]]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.8} color="#FFFFFF" />
    </mesh>
  );
};

