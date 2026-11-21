import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {LightBeam, Motes} from './fx';
import {TexToon} from './materials';
import {Ball, Box, Cyl, Toon, mulberry} from './toon';
import {Bench, TBox} from './world';
import {Hand} from './damascus';
import {breath} from './breath';

// Short #3 (03-plane-windows): 1950s departure lounge + silver jet, 1950s and
// modern cabins, sky above the clouds, test hangar with the water tank, the
// underwater crack macro, Gus's paper test, Vik's brownies, modern runway.
// Everything animates as a pure function of scene time.

type V3 = [number, number, number];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/* =================================================================== */
/* canvas textures (deterministic, cached)                              */
/* =================================================================== */
const texCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
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
  texCache.set(key, t);
  return t;
};
const FONT = (px: number) => `bold ${px}px 'Baloo 2', 'DejaVu Sans', Arial, sans-serif`;

// view through a cabin window: sky gradient + cloud tops (day) or farmland (50s)
const outsideTex = (kind: 'clouds' | 'fields' | 'apron') =>
  canvasTex(`outside-${kind}`, 1024, 512, (g, w, h) => {
    const r = mulberry(kind.length * 31);
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (kind === 'fields') {
      grad.addColorStop(0, '#7FB2E0');
      grad.addColorStop(0.42, '#FFE2B0');
      grad.addColorStop(0.45, '#C9A46A');
      grad.addColorStop(1, '#8EA65A');
    } else {
      grad.addColorStop(0, '#3E78C8');
      grad.addColorStop(0.55, '#BFE0F5');
      grad.addColorStop(1, '#FFF2DC');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    if (kind === 'fields') {
      for (let i = 0; i < 160; i++) {
        const x = r() * w, y = h * 0.46 + Math.pow(r(), 0.7) * h * 0.54;
        const s = 20 + (y / h) * 90;
        g.fillStyle = ['#A8B860', '#C9B060', '#7E9A4A', '#D8C27A', '#93A85A'][Math.floor(r() * 5)];
        g.fillRect(x, y, s * (1 + r()), s * 0.35);
      }
    }
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = kind === 'fields' ? h * (0.1 + r() * 0.3) : h * (0.55 + r() * 0.45);
      const s = 30 + r() * 70;
      for (let k = 0; k < 5; k++) {
        g.fillStyle = k < 2 ? 'rgba(220,226,246,0.9)' : 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(x + (k - 2) * s * 0.45, y - (k % 2) * s * 0.25 - (k < 2 ? -s * 0.08 : 0), s * (0.6 + 0.2 * (k % 3)), 0, Math.PI * 2);
        g.fill();
      }
    }
  });

const textTex = (key: string, w: number, h: number, bg: string, lines: {text: string; px: number; color: string; y: number}[]) =>
  canvasTex(key, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const l of lines) {
      g.font = FONT(l.px);
      g.fillStyle = l.color;
      g.fillText(l.text, w / 2, l.y * h);
    }
  });

const digitTex = (d: string) =>
  canvasTex(`digit-${d}`, 96, 160, (g, w, h) => {
    g.fillStyle = '#141A3A';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1E264E';
    g.fillRect(4, h / 2 - 2, w - 8, 4);
    g.font = FONT(130);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#FFC46B';
    g.fillText(d, w / 2, h / 2 + 8);
  });

const boardTex = () =>
  canvasTex('departures', 512, 384, (g, w, h) => {
    g.fillStyle = '#1C2250';
    g.fillRect(0, 0, w, h);
    g.font = FONT(40);
    g.fillStyle = C.accent;
    g.textAlign = 'left';
    g.fillText('DEPARTURES', 24, 52);
    const rows = [
      ['ROME', '09:40'],
      ['CAIRO', '11:15'],
      ['BOMBAY', '13:30'],
      ['SINGAPORE', '16:05'],
      ['JOHANNESBURG', '18:50'],
    ];
    g.font = FONT(30);
    rows.forEach(([a, b], i) => {
      g.fillStyle = '#2A3270';
      g.fillRect(16, 78 + i * 58, w - 32, 48);
      g.fillStyle = '#F6E9CC';
      g.fillText(a, 32, 112 + i * 58);
      g.fillText(b, w - 120, 112 + i * 58);
    });
  });

const posterTex = () =>
  canvasTex('poster-jet', 256, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2A3C8A');
    gr.addColorStop(1, '#F29D5C');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#E8ECF4';
    g.beginPath();
    g.ellipse(w / 2, h * 0.45, 90, 14, -0.35, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2 - 10, h * 0.45);
    g.lineTo(w / 2 + 50, h * 0.36);
    g.lineTo(w / 2 + 30, h * 0.47);
    g.fill();
    g.font = FONT(38);
    g.textAlign = 'center';
    g.fillStyle = '#FFF2D8';
    g.fillText('FLY THE', w / 2, h * 0.74);
    g.fillText('JET AGE', w / 2, h * 0.86);
  });

const causticTex = () =>
  canvasTex('caustic', 512, 512, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    const r = mulberry(91);
    const pts = Array.from({length: 46}, () => [r() * w, r() * h]);
    const img = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let d1 = 1e9, d2 = 1e9;
        for (const [px, py] of pts) {
          for (const ox of [-w, 0, w])
            for (const oy of [-h, 0, h]) {
              const d = (x - px - ox) ** 2 + (y - py - oy) ** 2;
              if (d < d1) {
                d2 = d1;
                d1 = d;
              } else if (d < d2) d2 = d;
            }
        }
        const e = Math.sqrt(d2) - Math.sqrt(d1);
        const v = Math.max(0, 1 - e / 7) * 255;
        const i = (y * w + x) * 4;
        img.data[i] = v * 0.75;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });

/* =================================================================== */
/* geometry helpers                                                     */
/* =================================================================== */
const rrectPath = (p: THREE.Path | THREE.Shape, cx: number, cy: number, w: number, h: number, r: number) => {
  const x0 = cx - w / 2, y0 = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x0 + r, y0);
  p.lineTo(x0 + w - r, y0);
  p.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x0 + w, y0 + h - r);
  p.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  p.lineTo(x0 + r, y0 + h);
  p.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + r);
  p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
};

const frameGeo = (w: number, h: number, r: number, border: number, depth: number) => {
  const s = rrectPath(new THREE.Shape(), 0, 0, w + border * 2, h + border * 2, r + border) as THREE.Shape;
  s.holes.push(rrectPath(new THREE.Path(), 0, 0, w, h, r) as THREE.Path);
  return new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false, curveSegments: 20});
};

/* =================================================================== */
/* JET (fuselage along +x, nose at +x). kind: 'comet' (1950s, polished   */
/* silver, engines buried in the wing roots, near-square windows) or    */
/* 'modern' (white, podded engines, small rounded windows)              */
/* =================================================================== */
const wingGeo = (root: number, tipLE: number, tipC: number, span: number, th: number) => {
  // planform in (x, y=span); extruded thickness along z, then laid flat by the caller
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(-root, 0);
  s.lineTo(-tipLE - tipC, span);
  s.lineTo(-tipLE, span);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, {depth: th, bevelEnabled: false});
};

const silver = <meshStandardMaterial color="#C9CED8" metalness={0.6} roughness={0.34} envMapIntensity={0.75} />;
const dullSilver = <meshStandardMaterial color="#8E96A6" metalness={0.35} roughness={0.6} envMapIntensity={0.3} />;

export type JetKind = 'comet' | 'modern';
export const Jet: React.FC<{
  kind: JetKind;
  pos?: V3;
  rot?: V3;
  s?: number;
  wings?: boolean;
  gear?: boolean;
  breakup?: number; // 0..1: the fuselage parts and drifts apart (distant, no people)
  hatch?: boolean; // square escape-hatch outline on the roof (tank fuselage)
  dull?: boolean; // matte grey (under water: no glowing metal)
  prop?: string;
}> = ({kind, pos = [0, 0, 0], rot = [0, 0, 0], s = 1, wings = true, gear = false, breakup = 0, hatch = false, dull = false, prop}) => {
  const comet = kind === 'comet';
  const R = comet ? 0.42 : 0.5;
  const L = 8;
  const body = comet ? (dull ? dullSilver : silver) : <Toon color="#F2F4F8" />;
  const wg = useMemo(() => wingGeo(comet ? 2.3 : 2.0, comet ? 2.0 : 2.3, comet ? 0.75 : 0.6, comet ? 4.3 : 4.6, comet ? 0.14 : 0.1), [comet]);
  const fin = useMemo(() => wingGeo(1.5, 1.25, 0.55, 1.6, 0.07), []);
  const tail = useMemo(() => wingGeo(0.9, 0.8, 0.35, 1.5, 0.05), []);
  const nWin = comet ? 11 : 24;
  const winW = comet ? 0.34 : 0.12, winH = comet ? 0.3 : 0.17, winR = comet ? 0.04 : 0.06;
  const rimGeo = useMemo(() => new THREE.ShapeGeometry(rrectPath(new THREE.Shape(), 0, 0, winW + 0.06, winH + 0.06, winR + 0.03) as THREE.Shape, 12), [winW, winH, winR]);
  const winGeo = useMemo(() => new THREE.ShapeGeometry(rrectPath(new THREE.Shape(), 0, 0, winW, winH, winR) as THREE.Shape, 12), [winW, winH, winR]);
  const b = smooth(breakup);
  const split = 0.7; // x of the break
  // front section drifts forward + noses down; rear section tumbles back
  const front = {p: [b * 0.9, -b * 0.6, b * 0.15] as V3, r: [b * 0.2, 0, -b * 0.55] as V3};
  const rear = {p: [-b * 0.7, -b * 0.9, -b * 0.1] as V3, r: [-b * 0.15, 0, b * 0.35] as V3};
  const winRow = (from: number, to: number) =>
    Array.from({length: nWin}, (_, i) => -L * 0.28 + (i * L * 0.6) / (nWin - 1)).filter((x) => x >= from && x < to);
  const windows = (from: number, to: number) =>
    [1, -1].map((sd) =>
      winRow(from, to).map((x) => (
        <group key={`${sd}${x}`} position={[x, R * 0.18, sd * (R + 0.006)]} rotation={[0, sd > 0 ? 0 : Math.PI, 0]}>
          {comet && (
            <mesh geometry={rimGeo} position={[0, 0, -0.001]}>
              <meshBasicMaterial color={dull ? '#6A7080' : '#E8ECF2'} />
            </mesh>
          )}
          <mesh geometry={winGeo} position={[0, 0, 0.002]}>
            <meshStandardMaterial color="#1E2652" metalness={0.2} roughness={0.2} envMapIntensity={dull ? 0.2 : 0.9} />
          </mesh>
        </group>
      )),
    );
  const stripe = (from: number, to: number) =>
    [1, -1].map((sd) => (
      <mesh key={sd} position={[(from + to) / 2, -R * 0.12, sd * R * 0.975]} rotation={[0, sd > 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[to - from, 0.07]} />
        <meshBasicMaterial color={C.accent} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    ));
  const frontLen = L * 0.36 - split;
  const rearLen = split + L * 0.36;
  return (
    <group position={pos} rotation={rot} scale={s} userData={prop ? {prop} : undefined}>
      {/* FRONT: nose + forward fuselage */}
      <group position={front.p} rotation={front.r}>
        <mesh position={[split + frontLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, frontLen, 36]} />
          {body}
        </mesh>
        <mesh position={[L * 0.36, 0, 0]} scale={[comet ? 2.1 : 1.7, 1, 1]} castShadow>
          <sphereGeometry args={[R, 36, 20, 0, Math.PI * 2, 0, Math.PI]} />
          {body}
        </mesh>
        {/* cockpit glazing */}
        <mesh position={[L * 0.36 + R * (comet ? 1.25 : 1.0), R * 0.48, 0]} rotation={[0, 0, -0.55]} scale={[1, 0.55, 1.6]}>
          <sphereGeometry args={[R * 0.33, 16, 10]} />
          <meshStandardMaterial color="#1E2A5A" metalness={0.4} roughness={0.1} envMapIntensity={1.5} />
        </mesh>
        {windows(split, 99)}
        {stripe(split, L * 0.36)}
      </group>
      {/* REAR: aft fuselage, tail, wings */}
      <group position={rear.p} rotation={rear.r}>
        <mesh position={[split - rearLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, rearLen, 36]} />
          {body}
        </mesh>
        <mesh position={[-L * 0.36 - 0.9, R * 0.12, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]} scale={[1, 1, 0.95]} castShadow>
          <cylinderGeometry args={[R * 0.2, R, 1.8, 30]} />
          {body}
        </mesh>
        {windows(-99, split)}
        {stripe(-L * 0.36, split)}
        {hatch && (
          <group position={[0.4, R * 0.995, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <planeGeometry args={[0.46, 0.46]} />
              <meshBasicMaterial color="#2A2C50" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[0.4, 0.4]} />
              <meshStandardMaterial color="#B8BECB" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
        {wings && (
          <>
            {[1, -1].map((sd) => (
              <group key={sd}>
                <mesh geometry={wg} position={[comet ? 0.9 : 0.8, -R * (comet ? 0.35 : 0.55), sd * R * 0.7]} rotation={[sd * Math.PI / 2, 0, 0]} scale={[1, 1, 1]} castShadow>
                  {body}
                </mesh>
                {comet ? (
                  /* engines buried in the wing root: two oval intakes in the leading edge */
                  [0.55, 0.95].map((z) => (
                    <mesh key={z} position={[comet ? 0.87 : 0.8, -R * 0.33, sd * z]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.55, 1]}>
                      <circleGeometry args={[0.13, 20]} />
                      <meshBasicMaterial color="#1A2048" side={THREE.DoubleSide} />
                    </mesh>
                  ))
                ) : (
                  <group position={[0.65, -R * 1.25, sd * 1.65]}>
                    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                      <cylinderGeometry args={[0.27, 0.24, 1.0, 28]} />
                      <Toon color="#DDE2EA" />
                    </mesh>
                    <mesh position={[0.505, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <circleGeometry args={[0.24, 24]} />
                      <meshBasicMaterial color="#20264A" />
                    </mesh>
                    <Box size={[0.5, 0.25, 0.05]} pos={[0.1, 0.28, 0]} color="#C8CED8" />
                  </group>
                )}
              </group>
            ))}
            {/* tail fin + stabilisers */}
            <mesh geometry={fin} position={[-L * 0.36 + 0.2, R * 0.75, -0.035]} rotation={[0, 0, 0]} castShadow>
              {body}
            </mesh>
            {comet ? null : (
              <mesh position={[-L * 0.36 - 0.35, R * 1.55, 0.0]} scale={[0.9, 0.5, 0.06]}>
                <sphereGeometry args={[0.35, 12, 8]} />
                <meshBasicMaterial color={C.accent} />
              </mesh>
            )}
            {[1, -1].map((sd) => (
              <mesh key={`t${sd}`} geometry={tail} position={[-L * 0.36 - 0.2, R * 0.25, sd * R * 0.3]} rotation={[sd * Math.PI / 2, 0, 0]} castShadow>
                {body}
              </mesh>
            ))}
          </>
        )}
        {gear && (
          <>
            {[1, -1].map((sd) => (
              <group key={sd} position={[-0.6, -R, sd * 1.1]}>
                <Cyl r={0.04} h={0.6} pos={[0, -0.2, 0]} color="#5A5C76" />
                <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.2, 0.2, 0.16, 20]} />
                  <Toon color="#2A2C44" />
                </mesh>
              </group>
            ))}
          </>
        )}
      </group>
      {gear && (
        <group position={[L * 0.3, -R, 0]}>
          <Cyl r={0.035} h={0.6} pos={[0, -0.2, 0]} color="#5A5C76" />
          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 18]} />
            <Toon color="#2A2C44" />
          </mesh>
        </group>
      )}
      {/* small debris drifting out of the break */}
      {b > 0.05 &&
        [0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[split + (i - 2) * 0.12 * b, -b * (0.6 + i * 0.25), (i - 2) * 0.25 * b]} rotation={[i, i * 2, b * 3]}>
            <boxGeometry args={[0.12, 0.03, 0.08]} />
            <meshStandardMaterial color="#AEB4C2" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
    </group>
  );
};

/* =================================================================== */
/* clouds                                                               */
/* =================================================================== */
export const CloudSea: React.FC<{y?: number; spread?: number; depth?: [number, number]; n?: number; seed?: number; drift?: number; scale?: number; tint?: string; shade?: string}> = ({
  y = -3,
  spread = 60,
  depth = [-80, 10],
  n = 70,
  seed = 7,
  drift = 0,
  scale = 1,
  tint = '#FFFFFF',
  shade = '#C9CFF0',
}) => {
  const {t} = useScene();
  const puffs = useMemo(() => {
    const r = mulberry(seed);
    return Array.from({length: n}, () => ({
      x: (r() - 0.5) * spread * 2,
      z: depth[0] + r() * (depth[1] - depth[0]),
      s: (1.6 + r() * 2.8) * scale,
      k: r(),
    }));
  }, [n, seed, spread, depth[0], depth[1], scale]);
  const W = spread * 2;
  return (
    <group position={[0, y, 0]}>
      {puffs.map((p, i) => {
        const x = ((((p.x - drift * t + W / 2) % W) + W) % W) - W / 2;
        return (
          <group key={i} position={[x, 0, p.z]}>
            <Ball r={p.s} scale={[1.5, 0.55, 1.1]} color={p.k < 0.35 ? shade : tint} />
            <Ball r={p.s * 0.7} pos={[p.s * 0.8, p.s * 0.22, 0.2]} scale={[1.3, 0.7, 1]} color={tint} />
            <Ball r={p.s * 0.6} pos={[-p.s * 0.9, p.s * 0.1, -0.3]} scale={[1.3, 0.6, 1]} color={tint} />
          </group>
        );
      })}
    </group>
  );
};

/* =================================================================== */
/* CABIN (1950s or modern). Cabin runs along x; window wall at z = -1   */
/* =================================================================== */
export const CABIN_WALL_Z = -1.0;
export const WIN_Y = 1.14;
export type CabinFx = {era: '50s' | 'modern'; breathe?: boolean; outside?: 'clouds' | 'fields'; scroll?: number; beams?: boolean};

const cabinWallGeo = (era: '50s' | 'modern', xs: number[]) => {
  const s = new THREE.Shape();
  s.moveTo(-7, 0);
  s.lineTo(7, 0);
  s.lineTo(7, 2.2);
  s.lineTo(-7, 2.2);
  s.lineTo(-7, 0);
  for (const x of xs) {
    if (era === 'modern') s.holes.push(rrectPath(new THREE.Path(), x, WIN_Y, 0.32, 0.44, 0.155) as THREE.Path);
    else s.holes.push(rrectPath(new THREE.Path(), x, WIN_Y, 0.58, 0.5, 0.045) as THREE.Path);
  }
  return new THREE.ExtrudeGeometry(s, {depth: 0.08, bevelEnabled: false, curveSegments: 16});
};

const Seat: React.FC<{pos: V3; era: '50s' | 'modern'; rotY?: number}> = ({pos, era, rotY = 0}) => {
  const c = era === '50s' ? '#B8784A' : '#2F4A7A';
  const head = era === '50s' ? '#F1E7D2' : '#E8EEF4';
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box size={[0.5, 0.14, 0.5]} pos={[0, 0.45, 0]} color={c} />
      <mesh position={[-0.22, 0.95, 0]} rotation={[0, 0, 0.12]} castShadow receiveShadow>
        <capsuleGeometry args={[0.07, 0.75, 4, 12]} />
        <Toon color={c} />
      </mesh>
      <Box size={[0.13, 0.9, 0.48]} pos={[-0.22, 0.92, 0]} rot={[0, 0, 0.12]} color={c} />
      <Box size={[0.14, 0.18, 0.4]} pos={[-0.28, 1.32, 0]} rot={[0, 0, 0.12]} color={head} />
      <Box size={[0.3, 0.06, 0.06]} pos={[0.02, 0.66, 0.24]} color={era === '50s' ? '#8A5432' : '#C8D2DC'} />
      <Box size={[0.05, 0.42, 0.05]} pos={[0.02, 0.22, 0.2]} color="#7A8090" />
    </group>
  );
};

export const CabinHD: React.FC<{fx: CabinFx}> = ({fx}) => {
  const {t} = useScene();
  const era = fx.era;
  const xs = useMemo(() => Array.from({length: era === 'modern' ? 15 : 11}, (_, i) => (i - (era === 'modern' ? 7 : 5)) * (era === 'modern' ? 0.82 : 1.15)), [era]);
  const wall = useMemo(() => cabinWallGeo(era, xs), [era, xs]);
  const frame = useMemo(() => (era === 'modern' ? frameGeo(0.32, 0.44, 0.155, 0.075, 0.1) : frameGeo(0.58, 0.5, 0.045, 0.04, 0.06)), [era]);
  const tex = outsideTex(fx.outside ?? (era === 'modern' ? 'clouds' : 'fields'));
  const view = useMemo(() => {
    const c = tex.clone();
    c.needsUpdate = true;
    c.repeat.set(1.6, 1);
    return c;
  }, [tex]);
  view.offset.x = (fx.scroll ?? 0.02) * t;
  const k = fx.breathe ? breath(t) : 0;
  const wallC = era === '50s' ? '#E9D7B4' : '#D9DEE6';
  return (
    <group>
      {/* floor + aisle carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 12]} />
        <Toon color={era === '50s' ? '#8A5A44' : '#5A6488'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.55]} receiveShadow>
        <planeGeometry args={[30, 0.9]} />
        <TexToon tex="planks" color={era === '50s' ? '#B0453A' : '#3A4A7A'} repeat={[20, 1]} normal={0.3} reliefOnly />
      </mesh>
      {/* window wall: swells outward (z) and a little taller when the cabin is "pumped up" */}
      <group position={[0, 0, CABIN_WALL_Z - k * 0.09]} scale={[1, 1 + k * 0.035, 1]}>
        <mesh geometry={wall} position={[0, 0, -0.08]} castShadow receiveShadow>
          <Toon color={wallC} />
        </mesh>
        {/* sloped upper wall (the fuselage curve) + overhead bins */}
        <Box size={[14, 0.9, 0.08]} pos={[0, 2.55, 0.25]} rot={[0.55, 0, 0]} color={wallC} />
        <Box size={[14, 0.42, 0.55]} pos={[0, 2.2, 0.45]} color={era === '50s' ? '#C9A06A' : '#BCC6D2'} />
        <Box size={[14, 0.03, 0.02]} pos={[0, 2.0, 0.73]} color={era === '50s' ? C.accent : '#9AA8B8'} />
        {/* dado rail / armrest ledge */}
        <Box size={[14, 0.08, 0.14]} pos={[0, 0.72, 0.06]} color={era === '50s' ? '#8A5432' : '#C8D2DC'} />
        {xs.map((x) => (
          <group key={x} position={[x, WIN_Y, 0]}>
            <mesh geometry={frame} position={[0, 0, -0.02]}>
              <Toon color={era === '50s' ? '#C9A06A' : '#F7F8FA'} />
            </mesh>
            {era === 'modern' ? (
              <>
                {/* shade half up + the inner pane's tiny breather hole */}
                <Box size={[0.3, 0.1, 0.012]} pos={[0, 0.17, 0.035]} color="#DADDE4" />
                <Ball r={0.007} pos={[0, -0.15, 0.03]} color="#3A3A50" />
              </>
            ) : (
              <>
                {/* little curtains */}
                <Box size={[0.08, 0.56, 0.03]} pos={[-0.33, 0, 0.04]} color="#C0583A" />
                <Box size={[0.08, 0.56, 0.03]} pos={[0.33, 0, 0.04]} color="#C0583A" />
              </>
            )}
            {/* the pane: bright view outside */}
            <mesh position={[0, 0, -0.06]}>
              <planeGeometry args={era === 'modern' ? [0.36, 0.48] : [0.62, 0.54]} />
              <meshBasicMaterial map={view} color={new THREE.Color('#ffffff').multiplyScalar(era === 'modern' ? 0.95 : 1.12)} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {fx.breathe && k > 0.05 && (
          // faint ribs of stress: the frames between windows glint as the skin stretches
          <mesh position={[0, WIN_Y, 0.05]}>
            <planeGeometry args={[14, 0.02]} />
            <meshBasicMaterial color={new THREE.Color('#FFD08A').multiplyScalar(0.5 + k)} transparent opacity={0.35 * k} toneMapped={false} />
          </mesh>
        )}
      </group>
      {/* sky glow behind the wall (lights the windows' surroundings) */}
      <mesh position={[0, 1.2, -2.4]}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={era === '50s' ? '#FFE2B0' : '#CFE6F5'} toneMapped={false} />
      </mesh>
      {/* ceiling + light strip */}
      <Box size={[30, 0.1, 4]} pos={[0, 2.85, 0.8]} color={era === '50s' ? '#E2CDA4' : '#AEB8C6'} />
      <mesh position={[0, 2.79, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 0.12]} />
        <meshBasicMaterial color={new THREE.Color(era === '50s' ? '#FFD28A' : '#C8D8EC').multiplyScalar(era === '50s' ? 1.4 : 0.75)} toneMapped={false} />
      </mesh>
      {/* seats: one row against the window wall, one across the aisle */}
      {xs.map((x, i) => {
        const gap = era === 'modern' ? 0.82 : 1.15;
        return (
          <group key={`s${i}`}>
            <Seat pos={[x + gap / 2 + 0.22, 0, -0.55]} era={era} />
          </group>
        );
      })}
      {era === '50s' && fx.beams !== false &&
        xs.filter((_, i) => i % 2 === 0).map((x) => <LightBeam key={x} from={[x, WIN_Y, CABIN_WALL_Z]} to={[x + 0.9, 0, 0.9]} r0={0.22} r1={0.5} color="#FFC873" strength={0.22} dust={false} />)}
      <Motes count={50} box={[6, 2, 2]} center={[0, 1.2, 0]} color="#FFE2A8" size={0.025} rise={0.02} seed={77} />
      <pointLight position={[0, 1.6, 0.4]} color={era === '50s' ? '#FFC873' : '#E8F4FF'} intensity={era === '50s' ? 6 : 2.5} distance={7} decay={2} />
    </group>
  );
};

/* =================================================================== */
/* LOUNGE (1950s departure lounge with the silver jet outside)           */
/* =================================================================== */
export const TABLE: V3 = [0.9, 0, 0.7];
export const TABLE_TOP = 0.72;
export const LOUNGE_JET: V3 = [1.6, 1.68, -9.5];
export type LoungeFx = {plate?: 'stack' | 'slam' | 'none'; slamAt?: number; dim?: number; beams?: boolean; plateScale?: number};

const PalmPot: React.FC<{pos: V3; s?: number}> = ({pos, s = 1}) => (
  <group position={pos} scale={s} userData={{prop: 'palm'}}>
    <Cyl r={0.26} r2={0.32} h={0.55} pos={[0, 0.27, 0]} color="#C0583A" />
    <Cyl r={0.04} h={1.2} pos={[0, 1.1, 0]} color="#7A5A36" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} position={[Math.cos(i) * 0.3, 1.7, Math.sin(i) * 0.3]} rotation={[Math.sin(i) * 0.9, i, Math.cos(i) * 0.9]} scale={[1, 0.18, 0.35]} castShadow>
        <sphereGeometry args={[0.45, 10, 6]} />
        <Toon color={i % 2 ? '#4E8F4A' : '#5FA357'} />
      </mesh>
    ))}
  </group>
);

const Suitcase: React.FC<{pos: V3; size: V3; color: string; rotY?: number}> = ({pos, size, color, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Box size={size} pos={[0, size[1] / 2, 0]} color={color} />
    <Box size={[size[0] * 1.01, 0.03, size[2] * 1.02]} pos={[0, size[1] * 0.5, 0]} color="#5A3A2A" />
    <Box size={[0.12, 0.04, 0.03]} pos={[0, size[1] + 0.02, 0]} color="#3A2A22" />
  </group>
);

export const LoungeHD: React.FC<{fx: LoungeFx}> = ({fx}) => {
  const {t} = useScene();
  const mullions = useMemo(() => Array.from({length: 11}, (_, i) => -8 + i * 1.6), []);
  return (
    <group>
      {/* terrazzo floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 2]}>
        <planeGeometry args={[18, 12]} />
        <TexToon tex="sandstone-paving" color="#EAD8BC" repeat={[8, 5]} normal={0.4} />
      </mesh>
      {/* apron outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -40]} receiveShadow>
        <planeGeometry args={[200, 72]} />
        <Toon color="#9C93A6" />
      </mesh>
      {[-6, -2, 2, 6, 10].map((x) => (
        <Box key={x} size={[0.12, 0.01, 18]} pos={[x * 1.6, 0.0, -20]} color="#E8C25A" />
      ))}
      {/* glass curtain wall */}
      {mullions.map((x) => (
        <Box key={x} size={[0.1, 4.2, 0.12]} pos={[x, 2.1, -4]} color="#6A4A3A" />
      ))}
      {[0.05, 0.95, 3.0, 4.2].map((y) => (
        <Box key={y} size={[16.2, 0.1, 0.14]} pos={[0, y, -4]} color="#6A4A3A" />
      ))}
      <mesh position={[0, 2.1, -4.02]}>
        <planeGeometry args={[16, 4.2]} />
        <meshPhysicalMaterial color="#CFE8EE" transparent opacity={0.05} roughness={0.1} metalness={0} clearcoat={0.2} envMapIntensity={0.2} depthWrite={false} />
      </mesh>
      {/* side walls + ceiling */}
      <TBox size={[0.3, 4.4, 12]} pos={[-8.1, 2.2, 2]} tex="plaster" color="#E9C79A" />
      <TBox size={[0.3, 4.4, 12]} pos={[8.1, 2.2, 2]} tex="plaster" color="#E9C79A" />
      <Box size={[16.4, 0.2, 12]} pos={[0, 4.45, 2]} color="#D9B888" />
      {/* 1 pendant lamps */}
      {[-4.8, -1.6, 1.6, 4.8].map((x) => (
        <group key={x} position={[x, 3.5, 0.2]}>
          <Cyl r={0.01} h={0.9} pos={[0, 0.5, 0]} color="#3A2A2A" />
          <mesh>
            <sphereGeometry args={[0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Toon color={C.accent} />
          </mesh>
          <Ball r={0.1} pos={[0, -0.04, 0]} color="#FFE2A8" emissive="#FFC46B" />
          <pointLight position={[0, -0.3, 0]} color="#FFC46B" intensity={3 * (1 - (fx.dim ?? 0) * 0.5)} distance={5} decay={2} />
        </group>
      ))}
      {/* 2 departures board on the left wall */}
      <group position={[-7.9, 2.6, 0.2]} rotation={[0, Math.PI / 2, 0]} userData={{prop: 'board'}}>
        <Box size={[2.3, 1.75, 0.08]} pos={[0, 0, -0.05]} color="#6A4A3A" />
        <mesh>
          <planeGeometry args={[2.1, 1.58]} />
          <meshBasicMaterial map={boardTex()} toneMapped={false} />
        </mesh>
      </group>
      {/* 3 wall clock */}
      <group position={[7.93, 3.2, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Cyl r={0.36} h={0.06} rot={[Math.PI / 2, 0, 0]} color="#F6E9CC" />
        <Box size={[0.03, 0.26, 0.02]} pos={[0, 0.1, 0.04]} rot={[0, 0, -t * 0.1]} color="#2A2838" />
        <Box size={[0.03, 0.18, 0.02]} pos={[0.05, 0.03, 0.045]} rot={[0, 0, -1.2]} color="#2A2838" />
      </group>
      {/* 4 poster */}
      <mesh position={[7.93, 2.0, 3.0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 1.2]} />
        <meshBasicMaterial map={posterTex()} />
      </mesh>
      {/* 5 benches */}
      <Bench pos={[-3.6, 0, -2.6]} />
      <Bench pos={[-1.2, 0, -2.6]} />
      <Bench pos={[4.6, 0, -2.6]} />
      {/* 6 palms */}
      <PalmPot pos={[-6.6, 0, -2.9]} s={1.2} />
      <PalmPot pos={[6.9, 0, -2.6]} s={1.1} />
      <PalmPot pos={[-6.8, 0, 3.4]} s={1.0} />
      {/* 7 luggage trolley with suitcases */}
      <group position={[-4.6, 0, 1.4]} rotation={[0, 0.4, 0]} userData={{prop: 'trolley'}}>
        <Box size={[1.1, 0.06, 0.6]} pos={[0, 0.3, 0]} color="#6E7290" />
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 0.12, 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.1, 0.03, 8, 16]} />
            <Toon color="#2A2C44" />
          </mesh>
        ))}
        <Cyl r={0.025} h={0.9} pos={[-0.55, 0.75, 0]} color="#6E7290" />
        <Suitcase pos={[0.1, 0.33, 0]} size={[0.75, 0.24, 0.48]} color="#C0583A" />
        <Suitcase pos={[0.05, 0.57, 0.02]} size={[0.6, 0.2, 0.4]} color="#2BA39A" rotY={0.1} />
        <Suitcase pos={[0.1, 0.77, 0]} size={[0.4, 0.18, 0.3]} color="#E8C25A" rotY={-0.15} />
      </group>
      {/* 8 globe on a stand */}
      <group position={[5.8, 0, 2.2]}>
        <Cyl r={0.2} h={0.05} pos={[0, 0.03, 0]} color="#6A4A3A" />
        <Cyl r={0.03} h={0.95} pos={[0, 0.5, 0]} color="#6A4A3A" />
        <Ball r={0.3} pos={[0, 1.2, 0]} color="#2BA39A" />
        <Ball r={0.31} pos={[0.04, 1.24, 0.05]} scale={[0.6, 0.5, 0.6]} color="#E8C25A" />
      </group>
      {/* 9 rope barrier posts */}
      {[2.6, 3.8].map((x) => (
        <group key={x} position={[x, 0, -1.6]}>
          <Cyl r={0.12} h={0.04} pos={[0, 0.02, 0]} color="#C9A04A" />
          <Cyl r={0.03} h={0.95} pos={[0, 0.48, 0]} color="#C9A04A" />
          <Ball r={0.05} pos={[0, 0.97, 0]} color="#C9A04A" />
        </group>
      ))}
      <mesh position={[3.2, 0.82, -1.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
        <Toon color="#B0453A" />
      </mesh>
      {/* 10 the brownie table */}
      <group position={TABLE}>
        <Cyl r={0.48} h={0.05} pos={[0, TABLE_TOP - 0.025, 0]} color="#7A4A30" />
        <Cyl r={0.05} h={TABLE_TOP - 0.05} pos={[0, (TABLE_TOP - 0.05) / 2, 0]} color="#3A2A22" />
        <Cyl r={0.26} h={0.04} pos={[0, 0.02, 0]} color="#3A2A22" />
        {(fx.plate ?? 'stack') !== 'none' && <BrowniePlate pos={[0, TABLE_TOP, 0]} s={fx.plateScale ?? 1} slam={fx.plate === 'slam' ? smooth((t - (fx.slamAt ?? 0.3) + 0.2) / 0.2) : 1} />}
      </group>
      {/* sun pouring through the glass */}
      {fx.beams !== false &&
        [-5.6, -0.8, 4.0].map((x) => <LightBeam key={x} from={[x, 3.8, -4]} to={[x + 1.4, 0, 0.8]} r0={0.5} r1={1.3} color="#FFC873" strength={0.12} />)}
      {/* OUTSIDE: the silver jet, tower, hangar, hills */}
      <Jet kind="comet" pos={LOUNGE_JET} rot={[0, Math.PI + 0.32, 0]} s={1.5} gear />
      <group position={[-16, 0, -30]}>
        <Box size={[1.6, 6, 1.6]} pos={[0, 3, 0]} color="#E2D6C4" />
        <Box size={[2.6, 1.2, 2.6]} pos={[0, 6.6, 0]} color="#3E5A8A" />
        <Box size={[2.8, 0.2, 2.8]} pos={[0, 7.3, 0]} color="#E2D6C4" />
      </group>
      <group position={[18, 0, -34]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
          <cylinderGeometry args={[6, 6, 14, 24, 1, false, 0, Math.PI]} />
          <Toon color="#B8C0CC" />
        </mesh>
      </group>
      <Ball r={20} pos={[-30, -14, -80]} scale={[2.2, 1, 1]} color="#B87A80" />
      <Ball r={18} pos={[26, -13, -75]} scale={[2.4, 1, 1]} color="#A87080" />
    </group>
  );
};

/* =================================================================== */
/* brownies                                                             */
/* =================================================================== */
const BROWN = '#5A3424';
const BROWN_TOP = '#7A4A32';

export const Brownie: React.FC<{pos?: V3; rot?: V3; s?: number}> = ({pos = [0, 0, 0], rot = [0, 0, 0], s = 1}) => (
  <group position={pos} rotation={rot} scale={s}>
    <Box size={[0.1, 0.04, 0.1]} pos={[0, 0.02, 0]} color={BROWN} />
    <Box size={[0.098, 0.006, 0.098]} pos={[0, 0.042, 0]} color={BROWN_TOP} />
  </group>
);

const tentTex = () =>
  canvasTex('vik-week', 256, 128, (g, w, h) => {
    g.fillStyle = '#F6E9CC';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = C.accent;
    g.lineWidth = 8;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.font = FONT(46);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#2A2050';
    g.fillText("VIK'S WEEK", w / 2, h / 2 + 4);
  });

export const BrowniePlate: React.FC<{pos: V3; slam?: number; s?: number}> = ({pos, slam = 1, s = 1}) => {
  const {t} = useScene();
  const bounce = slam < 1 ? (1 - slam) * 0.25 : 0;
  return (
    <group position={[pos[0], pos[1] + bounce, pos[2]]} scale={s}>
      <Cyl r={0.26} r2={0.3} h={0.025} pos={[0, 0.012, 0]} color="#F6F6F2" />
      <Cyl r={0.2} h={0.026} pos={[0, 0.014, 0]} color="#E8ECF0" />
      {[
        [-0.06, 0, -0.06],
        [0.06, 0, -0.06],
        [-0.06, 0, 0.06],
        [0.06, 0, 0.06],
        [0, 0.045, 0],
        [-0.002, 0.045, -0.002],
      ].map((p, i) => (
        <Brownie key={i} pos={[p[0], 0.026 + p[1] + (i === 5 ? 0.045 : 0), p[2]]} rot={[0, i * 0.3 + (i === 5 ? 0.4 : 0), 0]} s={1} />
      ))}
      {/* tent card */}
      <group position={[0.0, 0.03, -0.27]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0.06, 0]} rotation={[-0.25, 0, 0]}>
          <planeGeometry args={[0.24, 0.12]} />
          <meshBasicMaterial map={tentTex()} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {slam < 1 && t > 0 && <Motes count={14} box={[0.4, 0.15, 0.4]} center={[0, 0.08, 0]} color="#7A4A32" size={0.02} rise={-0.2} seed={9} />}
    </group>
  );
};

// hero brownie: glossy crackled top, crumbly edges; a crack runs from one corner
// and a corner piece breaks off (brownie units: a 1 x 1 square, scaled by `s`)
const jag = (a: [number, number], b: [number, number], n: number, amp: number, seed: number) => {
  const r = mulberry(seed);
  const out: [number, number][] = [];
  const nx = -(b[1] - a[1]), ny = b[0] - a[0];
  const nl = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const d = (r() - 0.5) * 2 * amp;
    out.push([a[0] + (b[0] - a[0]) * u + (nx / nl) * d, a[1] + (b[1] - a[1]) * u + (ny / nl) * d]);
  }
  return out;
};
const CRACK: [number, number][] = (() => {
  const r = mulberry(23);
  const pts: [number, number][] = [[-0.5, -0.5]];
  const n = 8;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    pts.push([-0.5 + u * 1.0 + (r() - 0.5) * 0.05, -0.5 + u * 0.42 + (r() - 0.5) * 0.07]);
  }
  pts.push([0.5, -0.06]);
  return pts;
})();
const browniePieces = () => {
  const BL: [number, number] = [-0.5, -0.5], BR: [number, number] = [0.5, -0.5], TR: [number, number] = [0.5, 0.5], TL: [number, number] = [-0.5, 0.5];
  const end = CRACK[CRACK.length - 1];
  // main: corner -> crack -> right edge up -> top -> left edge down
  const main: [number, number][] = [...CRACK, ...jag(end, TR, 6, 0.018, 3), TR, ...jag(TR, TL, 10, 0.018, 4), TL, ...jag(TL, BL, 10, 0.018, 5)];
  // piece: corner -> bottom edge -> right edge up to the crack end -> back along the crack
  const piece: [number, number][] = [BL, ...jag(BL, BR, 10, 0.018, 6), BR, ...jag(BR, end, 4, 0.018, 7), ...[...CRACK].reverse().slice(1, -1)];
  const shape = (pts: [number, number][]) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {depth: 0.36, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 2});
  };
  return {main: shape(main), piece: shape(piece)};
};

const crackleTex = () =>
  canvasTex('brownie-top', 512, 512, (g, w, h) => {
    const r = mulberry(44);
    g.fillStyle = '#3E2216';
    g.fillRect(0, 0, w, h);
    // glossy flaky crust: lighter shiny plates
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rr = 18 + r() * 50;
      g.fillStyle = `rgba(${128 + r() * 30}, ${82 + r() * 20}, ${44 + r() * 12}, 0.55)`;
      g.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const d = rr * (0.6 + r() * 0.5);
        if (k === 0) g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        else g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      g.fill();
    }
    // fine crackle lines on the crust
    g.strokeStyle = 'rgba(30,14,10,0.75)';
    for (let i = 0; i < 46; i++) {
      let x = r() * w, y = r() * h;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 60;
        y += (r() - 0.5) * 60;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // a few glints
    for (let i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(255,230,200,0.35)';
      g.fillRect(r() * w, r() * h, 3 + r() * 6, 1.5);
    }
  });

export const HeroBrownie: React.FC<{pos: V3; rot?: V3; s?: number; crackAt?: number; snapAt?: number}> = ({pos, rot = [0, 0, 0], s = 0.12, crackAt = 0.5, snapAt = 1.0}) => {
  const {t} = useScene();
  const geo = useMemo(browniePieces, []);
  const top = useMemo(() => {
    const c = crackleTex().clone();
    c.needsUpdate = true;
    c.offset.set(0.5, 0.5);
    return c;
  }, []);
  const crumbs = useMemo(() => {
    const r = mulberry(31);
    return Array.from({length: 40}, () => {
      const side = Math.floor(r() * 4), u = r() - 0.5;
      const e = 0.52 + r() * 0.08;
      const [x, y] = side === 0 ? [u, -e] : side === 1 ? [e, u] : side === 2 ? [u, e] : [-e, u];
      return {x, y, s: 0.018 + r() * 0.03, rot: [r() * 3, r() * 3, r() * 3] as V3};
    });
  }, []);
  const grow = smooth((t - crackAt) / Math.max(0.05, snapAt - crackAt));
  const snap = smooth((t - snapAt) / 0.4);
  const fall = Math.max(0, t - snapAt);
  const mats = [
    <meshStandardMaterial key="top" attach="material-0" map={top} color="#E8D0B8" roughness={0.22} metalness={0.05} envMapIntensity={1.2} />,
    <meshStandardMaterial key="side" attach="material-1" color="#3E2418" roughness={0.9} metalness={0} />,
  ];
  const segs = CRACK.length - 1;
  const shown = grow * segs;
  return (
    <group position={pos} rotation={rot} scale={s}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={geo.main} position={[-snap * 0.02, snap * 0.03, 0]} castShadow receiveShadow>
          {mats}
        </mesh>
        {/* the corner piece hinges down off the crack and slides away */}
        <group position={[snap * 0.18, -snap * 0.12 - Math.min(0.2, fall * fall * 0.6), -snap * 0.18]} rotation={[snap * 0.35, -snap * 0.25, -snap * 0.4]}>
          <mesh geometry={geo.piece} castShadow receiveShadow>
            {mats}
          </mesh>
        </group>
        {/* the crack line growing from the corner across the crust */}
        {snap < 0.02 &&
          CRACK.slice(0, -1).map(([x0, y0], i) => {
            const [x1, y1] = CRACK[i + 1];
            const f = clamp01(shown - i);
            if (f <= 0) return null;
            const xe = x0 + (x1 - x0) * f, ye = y0 + (y1 - y0) * f;
            const len = Math.hypot(xe - x0, ye - y0);
            return (
              <mesh key={i} position={[(x0 + xe) / 2, (y0 + ye) / 2, 0.42]} rotation={[0, 0, Math.atan2(ye - y0, xe - x0)]}>
                <planeGeometry args={[len + 0.01, 0.03 + 0.02 * (1 - i / segs)]} />
                <meshBasicMaterial color="#160A08" />
              </mesh>
            );
          })}
        {/* crumbly edges: crumbs along the sides */}
        {crumbs.map((c, i) => (
          <mesh key={i} position={[c.x, c.y, 0.02 + (i % 3) * 0.02]} rotation={c.rot}>
            <dodecahedronGeometry args={[c.s, 0]} />
            <meshStandardMaterial color={i % 2 ? '#4A2A1C' : '#5E3624'} roughness={0.9} />
          </mesh>
        ))}
      </group>
      {snap > 0 && <Motes count={22} box={[1.0, 0.5, 1.0]} center={[0.2, 0.25, 0.2]} color="#5A3020" size={0.05} rise={-0.8} seed={13} />}
    </group>
  );
};

/* =================================================================== */
/* SKY (above the clouds)                                               */
/* =================================================================== */
export type SkyFx = {jet?: 'climb' | 'breakup' | 'none'; breakAt?: number; drift?: number; stormy?: boolean};
export const SKY_JET: V3 = [0, 1.4, 0];
export const SkyHD: React.FC<{fx: SkyFx; p: number}> = ({fx, p}) => {
  const {t} = useScene();
  const climb = fx.jet === 'climb';
  return (
    <group>
      <CloudSea y={-3.2} drift={fx.drift ?? (climb ? 6 : 0.4)} n={80} spread={70} depth={[-90, 14]} seed={5} tint={fx.stormy ? '#E4E2F0' : '#FFFFFF'} shade={fx.stormy ? '#9A9AC0' : '#C9CFF0'} />
      <CloudSea y={9} drift={(fx.drift ?? (climb ? 6 : 0.4)) * 0.6} n={14} spread={70} depth={[-90, -30]} seed={8} scale={0.7} tint={fx.stormy ? '#C8C6DC' : '#FFFFFF'} shade="#B8C0E8" />
      {climb && <Jet kind="comet" pos={[SKY_JET[0], SKY_JET[1] + p * 0.6, SKY_JET[2]]} rot={[0, 0, 0.13 + 0.02 * Math.sin(t * 1.3)]} s={1} />}
      {fx.jet === 'breakup' && (
        <Jet kind="comet" pos={[-1.5 + p * 2.4, 4.0 - p * 0.6, -60]} rot={[0, 0.35, -0.04]} s={1.0} breakup={smooth((t - (fx.breakAt ?? 0.8)) / 1.6)} />
      )}
    </group>
  );
};

/* =================================================================== */
/* HANGAR with the water tank                                            */
/* =================================================================== */
export const TANK: V3 = [0, 0, -2.2];
export const TANK_TOP = 2.0;
export const WATER_Y = 1.82;
export const COUNTER: V3 = [6.4, 0, 1.4];
export type HangarFx = {lower?: [number, number]; lowerAt?: [number, number]; counter?: [number, number]; pumps?: number[]; cables?: boolean};

const Gauge: React.FC<{pos: V3; value: number; rotY?: number}> = ({pos, value, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Cyl r={0.2} h={0.06} rot={[Math.PI / 2, 0, 0]} color="#3A4258" />
    <mesh position={[0, 0, 0.032]}>
      <circleGeometry args={[0.17, 28]} />
      <meshBasicMaterial color="#F6F0E0" />
    </mesh>
    <mesh position={[0, 0, 0.034]}>
      <ringGeometry args={[0.12, 0.155, 24, 1, -0.5, 1.0]} />
      <meshBasicMaterial color="#E5533D" />
    </mesh>
    <group position={[0, 0, 0.038]} rotation={[0, 0, 2.2 - value * 4.4]}>
      <Box size={[0.012, 0.14, 0.006]} pos={[0, 0.06, 0]} color="#1E1A2E" />
    </group>
    <Ball r={0.02} pos={[0, 0, 0.04]} color="#1E1A2E" />
  </group>
);

export const HangarHD: React.FC<{fx: HangarFx; dur: number}> = ({fx, dur}) => {
  const {t} = useScene();
  const pumps = fx.pumps ?? [];
  const lastHit = pumps.filter((h) => h <= t).pop();
  const pulse = pumps.reduce((m, h) => Math.max(m, t >= h ? Math.exp(-(t - h) / 0.18) : 0), 0);
  const la = fx.lowerAt ?? [0, dur];
  const lowerK = smooth((t - la[0]) / Math.max(0.1, la[1] - la[0]));
  const fy = fx.lower ? fx.lower[0] + (fx.lower[1] - fx.lower[0]) * lowerK : 1.05;
  const count = Math.round(fx.counter ? fx.counter[0] + (fx.counter[1] - fx.counter[0]) * Math.pow(clamp01(t / dur), 1.4) : 1);
  const digits = String(count).padStart(5, '0').split('');
  const caus = useMemo(() => {
    const c = causticTex().clone();
    c.needsUpdate = true;
    c.repeat.set(3, 1.4);
    return c;
  }, []);
  caus.offset.set(t * 0.05, t * 0.03);
  const submerged = fy < WATER_Y;
  const hitWater = fx.lower ? clamp01((t - la[0] - (la[1] - la[0]) * 0.55) / 0.8) : 0;
  return (
    <group>
      {/* floor + walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <TexToon tex="plaster" color="#9AA6B8" repeat={[14, 10]} normal={0.6} />
      </mesh>
      {Array.from({length: 26}, (_, i) => -13 + i).map((x) => (
        <Box key={x} size={[0.5, 9, 0.12]} pos={[x, 4.5, -8.6]} color={x % 2 ? '#56607E' : '#4E5878'} />
      ))}
      <Box size={[0.3, 9, 18]} pos={[-12, 4.5, 0]} color="#4E5878" />
      <Box size={[0.3, 9, 18]} pos={[12, 4.5, 0]} color="#4E5878" />
      {/* roof trusses */}
      {[-6, -2, 2, 6].map((z) => (
        <group key={z} position={[0, 8.6, z - 2]}>
          <Box size={[24, 0.25, 0.2]} pos={[0, 0, 0]} color="#3A4466" />
          {Array.from({length: 8}, (_, i) => -10.5 + i * 3).map((x) => (
            <Box key={x} size={[0.12, 1.6, 0.12]} pos={[x, 0.6, 0]} rot={[0, 0, (x / 3) % 2 ? 0.7 : -0.7]} color="#3A4466" />
          ))}
        </group>
      ))}
      {/* high windows: cool daylight */}
      {[-8, -3, 2, 7].map((x) => (
        <mesh key={x} position={[x, 7.2, -8.5]}>
          <planeGeometry args={[3.2, 1.2]} />
          <meshBasicMaterial color={new THREE.Color('#5A6A8A')} />
        </mesh>
      ))}

      {/* THE TANK: concrete walls, steel rim with hazard stripes, water inside */}
      <group position={TANK}>
        <TBox size={[10, TANK_TOP, 0.3]} pos={[0, TANK_TOP / 2, 2.0]} tex="plaster" color="#B4BCC8" />
        <TBox size={[10, TANK_TOP, 0.3]} pos={[0, TANK_TOP / 2, -2.0]} tex="plaster" color="#B4BCC8" />
        <TBox size={[0.3, TANK_TOP, 4.3]} pos={[-5, TANK_TOP / 2, 0]} tex="plaster" color="#A8B0BC" />
        <TBox size={[0.3, TANK_TOP, 4.3]} pos={[5, TANK_TOP / 2, 0]} tex="plaster" color="#A8B0BC" />
        {Array.from({length: 20}, (_, i) => -4.75 + i * 0.5).map((x, i) => (
          <Box key={x} size={[0.5, 0.1, 0.32]} pos={[x, TANK_TOP + 0.05, 2.0]} color={i % 2 ? '#2A2838' : '#F2C043'} />
        ))}
        {/* inside: tiled teal so the water reads blue */}
        <Box size={[9.6, 0.05, 3.6]} pos={[0, 0.05, 0]} color="#1C3446" />
        <mesh position={[0, WATER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[9.7, 3.7]} />
          <meshPhysicalMaterial color="#173A52" transparent opacity={0.55} roughness={0.12} clearcoat={0.6} envMapIntensity={0.25} depthWrite={false} />
        </mesh>
        <mesh position={[0, WATER_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[9.7, 3.7]} />
          <meshBasicMaterial map={caus} color="#FFC46B" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* ripples where the fuselage breaks the surface */}
        {hitWater > 0 &&
          [0, 1, 2].map((i) => {
            const k = clamp01(hitWater * 1.2 - i * 0.25);
            return (
              <mesh key={i} position={[0, WATER_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + k * 0.5, 1 + k * 1.5, 1]}>
                <ringGeometry args={[3.9, 4.0, 48]} />
                <meshBasicMaterial color="#E8F8FF" transparent opacity={(1 - k) * 0.6} depthWrite={false} />
              </mesh>
            );
          })}
        {/* the fuselage (wingless), lowered on two cables from the gantry */}
        <Jet kind="comet" pos={[0, fy, 0]} s={0.95} wings={false} hatch dull />
        {fx.cables !== false && (
          <>
            {[-2.2, 2.2].map((x) => {
              const top = 7.2, bot = fy + 0.42;
              return <Box key={x} size={[0.03, top - bot, 0.03]} pos={[x, (top + bot) / 2, 0]} color="#2A2C44" />;
            })}
            <Box size={[11, 0.4, 0.5]} pos={[0, 7.4, 0]} color={C.accent} />
            {[-5.4, 5.4].map((x) => (
              <Box key={x} size={[0.4, 7.4, 0.4]} pos={[x, 3.7, 0]} color="#E09A32" />
            ))}
          </>
        )}
        {submerged && <Motes count={30} box={[9, 1.2, 3.5]} center={[0, 1.0, 0]} color="#9AB8C8" size={0.025} rise={0.25} seed={33} />}
        {/* pipes along the rim + valve wheels */}
        <Cyl r={0.09} h={10} pos={[0, TANK_TOP + 0.28, 2.3]} rot={[0, 0, Math.PI / 2]} color="#8A4A3A" />
        <Cyl r={0.07} h={10} pos={[0, TANK_TOP + 0.5, 2.35]} rot={[0, 0, Math.PI / 2]} color="#3E6A8A" />
        {[-3.5, -1, 1.5, 4].map((x) => (
          <group key={x}>
            <Cyl r={0.08} h={TANK_TOP + 0.3} pos={[x, (TANK_TOP + 0.3) / 2, 2.3]} color="#8A4A3A" />
            <mesh position={[x, TANK_TOP + 0.28, 2.42]}>
              <torusGeometry args={[0.13, 0.025, 8, 20]} />
              <Toon color="#E5533D" />
            </mesh>
          </group>
        ))}
        {/* pressure gauges, needles kick on every pump stroke */}
        {[-2.6, 0.4, 3.0].map((x, i) => (
          <group key={x}>
            <Cyl r={0.03} h={0.6} pos={[x, TANK_TOP + 0.3, 2.35]} color="#3A4258" />
            <Gauge pos={[x, TANK_TOP + 0.75, 2.38]} value={0.3 + 0.5 * pulse + 0.05 * Math.sin(t * 6 + i)} />
          </group>
        ))}
      </group>
      {/* pump machine (piston thumps) */}
      <group position={[-5.6, 0, 1.2]}>
        <Box size={[1.4, 1.2, 1.0]} pos={[0, 0.6, 0]} color="#3E6A8A" />
        <Box size={[1.44, 0.12, 1.04]} pos={[0, 1.15, 0]} color={C.accent} />
        <Cyl r={0.16} h={0.8} pos={[0, 1.55 - pulse * 0.28, 0]} color="#D8E2E8" />
        <Box size={[0.5, 0.15, 0.5]} pos={[0, 2.0 - pulse * 0.28, 0]} color="#2A2C44" />
        <Cyl r={0.08} h={2.2} pos={[1.2, 0.5, -0.4]} rot={[0, 0, Math.PI / 2]} color="#3E6A8A" />
        {lastHit !== undefined && <pointLight position={[0, 1.6, 0.8]} color="#FFD08A" intensity={2 * pulse} distance={3} decay={2} />}
      </group>
      {/* cycle counter on a stand */}
      <group position={COUNTER} rotation={[0, -0.35, 0]}>
        <Box size={[0.12, 1.3, 0.12]} pos={[0, 0.65, 0]} color="#3A4258" />
        <Box size={[1.5, 0.75, 0.2]} pos={[0, 1.65, 0]} color="#2A2E54" />
        <Box size={[1.56, 0.06, 0.22]} pos={[0, 2.04, 0]} color={C.accent} />
        <mesh position={[0, 1.9, 0.105]}>
          <planeGeometry args={[1.3, 0.16]} />
          <meshBasicMaterial map={textTex('cycles-label', 512, 64, '#2A2E54', [{text: 'FLIGHT CYCLES', px: 44, color: '#F6E9CC', y: 0.55}])} toneMapped={false} />
        </mesh>
        {digits.map((d, i) => (
          <mesh key={i} position={[-0.52 + i * 0.26, 1.58, 0.105]}>
            <planeGeometry args={[0.22, 0.36]} />
            <meshBasicMaterial map={digitTex(d)} color={new THREE.Color('#ffffff').multiplyScalar(1.3)} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* engineers' desk: clipboards, hard hats, lamp */}
      <group position={[-3.2, 0, 3.0]}>
        <TBox size={[1.6, 0.06, 0.7]} pos={[0, 0.8, 0]} tex="planks" color="#C8A070" />
        {[-0.7, 0.7].map((x) => (
          <Box key={x} size={[0.06, 0.8, 0.6]} pos={[x, 0.4, 0]} color="#5A6478" />
        ))}
        <Box size={[0.25, 0.01, 0.33]} pos={[-0.4, 0.84, 0]} rot={[0, 0.3, 0]} color="#F6F0E0" />
        <Box size={[0.25, 0.01, 0.33]} pos={[0.1, 0.84, 0.05]} rot={[0, -0.2, 0]} color="#F6F0E0" />
        <mesh position={[0.5, 0.9, -0.1]}>
          <sphereGeometry args={[0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Toon color="#F2C043" />
        </mesh>
      </group>
      {/* warm work lamps on stands */}
      {[
        [-6.5, -4.5],
        [6.5, -4.5],
        [8.6, 4.2],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl r={0.04} h={3.4} pos={[0, 1.7, 0]} color="#2A2C44" />
          <mesh position={[0, 3.45, 0]} rotation={[0.6, x > 0 ? -0.8 : 0.8, 0]}>
            <coneGeometry args={[0.3, 0.4, 16, 1, true]} />
            <Toon color="#3A4258" />
          </mesh>
          <Ball r={0.12} pos={[0, 3.35, 0]} color="#FFE2A8" emissive="#FFC46B" />
          <pointLight position={[x > 0 ? -0.6 : 0.6, 3.0, 0.6]} color="#FFC46B" intensity={30} distance={12} decay={2} />
          <LightBeam from={[0, 3.35, 0]} to={[-x * 0.55, 0, -z * 0.3 + (i === 2 ? -2 : 1)]} r0={0.15} r1={1.2} color="#FFC46B" strength={0.2} dust={false} />
        </group>
      ))}
      <Motes count={110} box={[18, 7, 10]} center={[0, 3.5, -2]} color="#D8E4FF" size={0.035} rise={0.03} seed={57} />
    </group>
  );
};

/* =================================================================== */
/* UNDERWATER macro: riveted aluminium skin, sharp square cut-out, the   */
/* crack starting at a rivet hole by the corner                         */
/* =================================================================== */
export type TankMacroFx = {crackAt?: number; crackDur?: number; burstAt?: number};
const HOLE_C: [number, number] = [0.4, 0.6]; // the cut-out's top-right corner
const RIVET_HOLE: [number, number] = [0.47, 0.67]; // corner rivet of the doubler row: the crack starts here
const crackTree = (() => {
  const r = mulberry(61);
  const walk = (x: number, y: number, ang: number, n: number, step: number, jit: number) => {
    const pts: [number, number][] = [[x, y]];
    for (let i = 0; i < n; i++) {
      ang += (r() - 0.5) * jit;
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      pts.push([x, y]);
    }
    return pts;
  };
  const main = walk(RIVET_HOLE[0], RIVET_HOLE[1], Math.PI / 4, 14, 0.085, 0.6);
  const b1 = walk(main[5][0], main[5][1], Math.PI / 2 + 0.3, 6, 0.07, 0.8);
  const b2 = walk(main[9][0], main[9][1], -0.2, 5, 0.07, 0.8);
  return [
    {pts: [RIVET_HOLE, HOLE_C] as [number, number][], start: 0, w: 0.016}, // rivet hole -> corner
    {pts: main, start: 0.04, w: 0.024},
    {pts: b1, start: 5 / 14, w: 0.015},
    {pts: b2, start: 9 / 14, w: 0.013},
  ];
})();

const panelGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(-2.2, -1.6);
  s.lineTo(2.2, -1.6);
  s.lineTo(2.2, 2.2);
  s.lineTo(-2.2, 2.2);
  s.lineTo(-2.2, -1.6);
  const h = new THREE.Path();
  h.moveTo(-0.4, -0.2);
  h.lineTo(0.4, -0.2);
  h.lineTo(0.4, 0.6);
  h.lineTo(-0.4, 0.6);
  h.lineTo(-0.4, -0.2);
  s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, {depth: 0.05, bevelEnabled: false});
};

// brushed aluminium (1 m tile): fine horizontal streaks + mottling + faint stencil marks
const aluTex = () =>
  canvasTex('alu-skin', 1024, 1024, (g, w, h) => {
    const r = mulberry(19);
    g.fillStyle = '#B8C0CC';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const y = r() * h;
      g.fillStyle = r() < 0.5 ? `rgba(230,236,244,${0.08 + r() * 0.12})` : `rgba(90,100,118,${0.05 + r() * 0.1})`;
      g.fillRect(r() * w - 200, y, 200 + r() * 700, 1 + r() * 2);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(120,132,150,${0.05 + r() * 0.08})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 30 + r() * 90, 0, Math.PI * 2);
      g.fill();
    }
  });

const Rivets: React.FC<{pts: [number, number][]; z: number; r?: number}> = ({pts, z, r = 0.016}) => {
  const geo = useMemo(() => new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [r]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#8E98AC', metalness: 0.7, roughness: 0.25, envMapIntensity: 1.1}), []);
  return (
    <group>
      {pts.map(([x, y], i) => (
        <mesh key={i} geometry={geo} material={mat} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]} />
      ))}
    </group>
  );
};

const rowPts = (a: [number, number], b: [number, number], step: number, skip?: (p: [number, number]) => boolean) => {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p: [number, number] = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n];
    if (!skip || !skip(p)) out.push(p);
  }
  return out;
};

export const TankMacroHD: React.FC<{fx: TankMacroFx}> = ({fx}) => {
  const {t} = useScene();
  const geo = useMemo(panelGeo, []);
  const g = smooth((t - (fx.crackAt ?? 0.6)) / (fx.crackDur ?? 1.2));
  const alu = useMemo(() => {
    const c = aluTex().clone();
    c.needsUpdate = true;
    c.repeat.set(1, 1);
    return c;
  }, []);
  const SEAMS_H = [-1.0, 1.45];
  const SEAMS_V = [-1.3, 1.35];
  const nearHole = (p: [number, number]) => p[0] > -0.62 && p[0] < 0.62 && p[1] > -0.42 && p[1] < 0.82;
  const rivets = useMemo(() => {
    const out: [number, number][] = [];
    for (const y of SEAMS_H) for (const dy of [-0.045, 0.045]) out.push(...rowPts([-2.15, y + dy], [2.15, y + dy], 0.065, nearHole));
    for (const x of SEAMS_V) for (const dx of [-0.045, 0.045]) out.push(...rowPts([x + dx, -1.55], [x + dx, 2.15], 0.065, nearHole));
    // doubler ring round the cut-out: two rows (inner row offset 0.07, outer 0.13)
    for (const off of [0.07, 0.13]) {
      const x0 = -0.4 - off, x1 = 0.4 + off, y0 = -0.2 - off, y1 = 0.6 + off;
      for (const [a, b] of [
        [[x0, y0], [x1, y0]],
        [[x1, y0], [x1, y1]],
        [[x1, y1], [x0, y1]],
        [[x0, y1], [x0, y0]],
      ] as [[number, number], [number, number]][])
        out.push(...rowPts(a, b, 0.055, (p) => Math.hypot(p[0] - RIVET_HOLE[0], p[1] - RIVET_HOLE[1]) < 0.02));
    }
    return out;
  }, []);
  const bubbles = useMemo(() => {
    const r = mulberry(17);
    return Array.from({length: 46}, (_, i) => ({x: (r() - 0.5) * 3.6, z: 0.2 + r() * 0.4, s: 0.012 + r() * 0.025, sp: 0.25 + r() * 0.4, ph: r() * 8, burst: i < 18}));
  }, []);
  const burstAt = fx.burstAt ?? (fx.crackAt ?? 0.6) + (fx.crackDur ?? 1.2) * 0.5;
  return (
    <group>
      {/* skin panel: brushed aluminium */}
      <mesh geometry={geo} receiveShadow castShadow>
        <meshStandardMaterial map={alu} color="#E4E8EE" metalness={0.55} roughness={0.42} envMapIntensity={0.7} />
      </mesh>
      {/* lap-joint seams: a dark gap with a lit edge */}
      {SEAMS_H.map((y) => (
        <group key={`h${y}`}>
          <Box size={[4.4, 0.012, 0.02]} pos={[0, y, 0.055]} color="#3A4258" />
          <Box size={[4.4, 0.008, 0.02]} pos={[0, y + 0.012, 0.056]} color="#E8EEF6" />
        </group>
      ))}
      {SEAMS_V.map((x) => (
        <group key={`v${x}`}>
          <Box size={[0.012, 3.8, 0.02]} pos={[x, 0.3, 0.055]} color="#3A4258" />
          <Box size={[0.008, 3.8, 0.02]} pos={[x + 0.012, 0.3, 0.056]} color="#E8EEF6" />
        </group>
      ))}
      {/* doubler plate round the cut-out (sharp inner corners) */}
      {[
        [0, 0.68, 1.12, 0.16],
        [0, -0.28, 1.12, 0.16],
        [-0.48, 0.2, 0.16, 0.8],
        [0.48, 0.2, 0.16, 0.8],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.062]} receiveShadow castShadow>
          <boxGeometry args={[w, h, 0.02]} />
          <meshStandardMaterial map={alu} color="#A8B2C2" metalness={0.55} roughness={0.38} envMapIntensity={0.7} />
        </mesh>
      ))}
      <Rivets pts={rivets} z={0.073} />
      {/* the empty rivet hole by the corner, where the crack starts */}
      <mesh position={[RIVET_HOLE[0], RIVET_HOLE[1], 0.074]}>
        <circleGeometry args={[0.014, 16]} />
        <meshBasicMaterial color="#141230" />
      </mesh>
      {/* behind the cut-out: fuselage frames, stringers, insulation (no flat void) */}
      <group position={[0, 0.2, -0.05]}>
        <Box size={[1.6, 1.6, 0.04]} pos={[0, 0, -0.55]} color="#4A5A7A" />
        <Box size={[0.09, 1.6, 0.35]} pos={[0.05, 0, -0.3]} color="#8A94A8" />
        {[-0.28, 0.0, 0.28].map((y) => (
          <Box key={y} size={[1.6, 0.05, 0.08]} pos={[0, y, -0.12]} color="#9AA4B8" />
        ))}
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 0, -0.45]} scale={[1, 1.4, 0.5]}>
            <sphereGeometry args={[0.25, 14, 10]} />
            <Toon color="#B8A878" />
          </mesh>
        ))}
        <pointLight position={[0.2, 0.3, -0.2]} color="#7AA0D0" intensity={0.7} distance={1.6} decay={2} />
      </group>
      {/* the crack: from the rivet hole to the corner, then outward with two branches */}
      {crackTree.map((br, bi) => {
        const n = br.pts.length - 1;
        const local = clamp01((g - br.start) / (1 - br.start)) * n;
        return br.pts.slice(0, -1).map(([x0, y0], i) => {
          const [x1, y1] = br.pts[i + 1];
          const f = clamp01(local - i);
          if (f <= 0) return null;
          const xe = x0 + (x1 - x0) * f, ye = y0 + (y1 - y0) * f;
          const len = Math.hypot(xe - x0, ye - y0);
          const ang = Math.atan2(ye - y0, xe - x0);
          return (
            <group key={`${bi}-${i}`} position={[(x0 + xe) / 2, (y0 + ye) / 2, 0.076]} rotation={[0, 0, ang]}>
              <mesh>
                <planeGeometry args={[len + 0.012, br.w * (1 - (i / Math.max(1, n)) * 0.5)]} />
                <meshBasicMaterial color="#141230" />
              </mesh>
              <mesh position={[0, br.w * 0.9, 0.001]}>
                <planeGeometry args={[len + 0.012, br.w * 0.3]} />
                <meshBasicMaterial color="#F2F6FF" />
              </mesh>
            </group>
          );
        });
      })}
      {/* bubbles: a slow trickle, then a burst out of the crack */}
      {bubbles.map((b, i) => {
        const fromCrack = b.burst;
        const tt = fromCrack ? t - burstAt - i * 0.03 : t + b.ph;
        if (fromCrack && tt < 0) return null;
        const y = fromCrack ? 0.95 + tt * (0.9 + b.sp) : ((tt * b.sp) % 4) - 1.6;
        const bx = Math.abs(b.x - 0.5) < 0.45 ? b.x + Math.sign(b.x - 0.5 || 1) * 0.6 : b.x;
        const x = fromCrack ? 0.75 + b.x * 0.12 + Math.sin(tt * 6 + i) * 0.04 : bx + Math.sin(tt * 2 + i) * 0.05;
        return (
          <mesh key={i} position={[x, y, fromCrack ? 0.14 + b.z * 0.2 : b.z]}>
            <sphereGeometry args={[b.s * (fromCrack ? 0.6 : 1), 12, 8]} />
            <meshPhysicalMaterial color="#E8FCFF" transparent opacity={0.45} roughness={0.05} clearcoat={1} envMapIntensity={1.4} />
          </mesh>
        );
      })}
      <Motes count={90} box={[5, 4, 3]} center={[0, 0.3, 0.8]} color="#BFF0FF" size={0.02} rise={0.05} seed={71} />
      {/* blue water all round, a soft moving light from above */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="#1E5A7A" />
      </mesh>
      <pointLight position={[1.5, 3, 2.5]} color="#CFF4FF" intensity={9 + 2.5 * Math.sin(t * 3)} distance={8} decay={2} />
      <pointLight position={[-1.5, 1.0, 2.0]} color="#FFE2B0" intensity={3} distance={5} decay={2} />
    </group>
  );
};

/* =================================================================== */
/* PAPER test (square hole vs round hole), held by Gus's hands          */
/* =================================================================== */
const PW = 0.56, PH = 0.36;
const SQ = {cx: -0.13, cy: 0, s: 0.11};
const RD = {cx: 0.13, cy: 0, r: 0.055};
// tear: from the square's top-left corner up towards the top edge (perpendicular to the pull)
const TEAR = (() => {
  const r = mulberry(5);
  const x0 = SQ.cx - SQ.s / 2, y0 = SQ.cy + SQ.s / 2;
  const pts: [number, number][] = [[x0, y0]];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    pts.push([x0 - 0.012 * u + (r() - 0.5) * 0.012, y0 + u * (PH / 2 - y0 - 0.006)]);
  }
  return pts;
})();

const paperGeo = (pull: number, tear: number) => {
  const s = new THREE.Shape();
  const w = PW * (1 + pull * 0.05);
  s.moveTo(-w / 2, -PH / 2);
  s.lineTo(w / 2, -PH / 2);
  s.lineTo(w / 2, PH / 2);
  s.lineTo(-w / 2, PH / 2);
  s.lineTo(-w / 2, -PH / 2);
  // square hole (+ the tear as a thin wedge opening from its corner)
  const sx = SQ.cx * (1 + pull * 0.05), half = SQ.s / 2;
  const sq = new THREE.Path();
  const n = TEAR.length - 1;
  const reach = tear * n;
  const gap = 0.002 + 0.01 * tear * pull;
  sq.moveTo(sx - half, SQ.cy - half);
  sq.lineTo(sx + half, SQ.cy - half);
  sq.lineTo(sx + half, SQ.cy + half);
  if (reach > 0.01) {
    // up the right lip of the tear, back down the left lip
    const lip: [number, number][] = [];
    for (let i = 1; i <= Math.ceil(reach); i++) {
      const f = Math.min(1, reach - (i - 1));
      const [ax, ay] = TEAR[i - 1], [bx, by] = TEAR[i];
      lip.push([ax + (bx - ax) * f + (sx - SQ.cx), ay + (by - ay) * f]);
    }
    const k = gap / 2;
    sq.lineTo(sx - half + k * 2, SQ.cy + half);
    lip.forEach(([x, y], i) => sq.lineTo(x + k * (1 - i / lip.length), y));
    [...lip].reverse().forEach(([x, y], i) => sq.lineTo(x - k * ((i + 1) / lip.length), y));
  }
  sq.lineTo(sx - half, SQ.cy + half);
  sq.lineTo(sx - half, SQ.cy - half);
  s.holes.push(sq);
  // round hole: stretches into an oval along the pull
  const rd = new THREE.Path();
  rd.absellipse(RD.cx * (1 + pull * 0.05), RD.cy, RD.r * (1 + pull * 0.22), RD.r * (1 - pull * 0.1), 0, Math.PI * 2, false, 0);
  s.holes.push(rd);
  return new THREE.ShapeGeometry(s, 32);
};

// stress lines (line 10): 'corner' = lines crowd into the square's corner (hot spot);
// 'curve' = lines flow smoothly round the circle
const stressLines = (mode: 'corner' | 'curve') => {
  const lines: THREE.Vector3[][] = [];
  const ys = [-0.15, -0.1, -0.06, -0.03, 0.03, 0.06, 0.1, 0.15];
  for (const y0 of ys) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -PW / 2 + (i / 40) * PW;
      let y = y0;
      if (mode === 'corner') {
        const dx = x - SQ.cx;
        const bend = Math.exp(-(dx * dx) / 0.004);
        const target = Math.sign(y0) * (SQ.s / 2 + 0.006);
        if (Math.abs(y0) < 0.12) y = y0 + (target - y0) * bend;
      } else {
        const dx = x - RD.cx;
        const bend = Math.exp(-(dx * dx) / 0.008);
        const target = Math.sign(y0) * (RD.r + 0.012 + Math.abs(y0) * 0.6);
        if (Math.abs(y0) < 0.12) y = y0 + (target - y0) * bend * 0.85;
      }
      pts.push(new THREE.Vector3(x, y, 0.002));
    }
    lines.push(pts);
  }
  return lines;
};

export type PaperFx = {pos: V3; rot?: V3; s?: number; pull?: [number, number]; pullAt?: [number, number]; tear?: [number, number]; tearAt?: [number, number]; hands?: boolean; stress?: 'corner' | 'curve'; stressAt?: number; trace?: boolean};

export const Paper: React.FC<{fx: PaperFx}> = ({fx}) => {
  const {t} = useScene();
  const pa = fx.pullAt ?? [0, 1];
  const pk = smooth((t - pa[0]) / Math.max(0.05, pa[1] - pa[0]));
  const pull = fx.pull ? fx.pull[0] + (fx.pull[1] - fx.pull[0]) * pk : 0;
  const ta = fx.tearAt ?? [0, 1];
  const tk = smooth((t - ta[0]) / Math.max(0.05, ta[1] - ta[0]));
  const tear = fx.tear ? fx.tear[0] + (fx.tear[1] - fx.tear[0]) * tk : 0;
  const q = (x: number) => Math.round(x * 60) / 60;
  const geo = useMemo(() => paperGeo(q(pull), q(tear)), [q(pull), q(tear)]);
  const lines = useMemo(() => (fx.stress ? stressLines(fx.stress) : []), [fx.stress]);
  const sk = fx.stress ? smooth((t - (fx.stressAt ?? 0.2)) / 0.8) : 0;
  const tubes = useMemo(() => lines.map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0022, 5, false)), [lines]);
  const w = PW * (1 + pull * 0.05);
  const hot = fx.stress === 'corner' ? 0.7 + 0.3 * Math.sin(t * 10) : 0;
  // tracing finger (line 10b): circles the round hole
  const ang = (t - (fx.stressAt ?? 0.2)) * 2.4;
  return (
    <group position={fx.pos} rotation={fx.rot ?? [0, 0, 0]} scale={fx.s ?? 1} >
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color="#FFFFFF" emissive="#EFE6D6" emissiveIntensity={0.45} side={THREE.DoubleSide} />
      </mesh>
      {/* faint ruled lines so it reads as paper */}
      {[-0.12, -0.08, -0.04, 0.04, 0.08, 0.12].map((y) => (
        <mesh key={y} position={[0, y, -0.001]}>
          <planeGeometry args={[w * 0.96, 0.002]} />
          <meshBasicMaterial color="#B8C8E0" />
        </mesh>
      ))}
      {/* pencil outlines around each hole (the "cut" marks) */}
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g} scale={[1 + pull * 0.05, 1, 1]}>
          <meshBasicMaterial color={new THREE.Color(fx.stress === 'corner' ? '#FF6A3A' : '#F2A33A').multiplyScalar(1.3)} transparent opacity={sk} toneMapped={false} />
        </mesh>
      ))}
      {fx.stress === 'corner' &&
        [
          [-1, 1],
          [1, 1],
          [-1, -1],
          [1, -1],
        ].map(([sx, sy], i) => (
          <mesh key={i} position={[SQ.cx + (sx * SQ.s) / 2, SQ.cy + (sy * SQ.s) / 2, 0.004]}>
            <circleGeometry args={[0.012 + 0.008 * hot, 16]} />
            <meshBasicMaterial color={new THREE.Color('#FF4A2A').multiplyScalar(1.6)} transparent opacity={sk} toneMapped={false} />
          </mesh>
        ))}
      {fx.stress === 'curve' && (
        <mesh position={[RD.cx, RD.cy, 0.003]}>
          <ringGeometry args={[RD.r + 0.004, RD.r + 0.016, 48]} />
          <meshBasicMaterial color={new THREE.Color('#F2A33A').multiplyScalar(1.3)} transparent opacity={sk * 0.8} toneMapped={false} />
        </mesh>
      )}
      {fx.hands !== false && (
        <>
          {/* Gus's hands (cream shawl cuffs) pinch the left and right edges */}
          <Hand pos={[-w / 2 + 0.02, 0.0, 0.025]} rot={[0, -Math.PI / 2, Math.PI / 2]} s={0.7} open={0.25} skin="#C8875E" sleeve="#F1E7D2" />
          <Hand pos={[w / 2 - 0.02, 0.0, 0.025]} rot={[0, Math.PI / 2, -Math.PI / 2]} s={0.7} open={0.25} skin="#C8875E" sleeve="#F1E7D2" />
        </>
      )}
      {fx.trace && (
        <Hand pos={[RD.cx + Math.cos(ang) * (RD.r + 0.02), RD.cy + Math.sin(ang) * (RD.r + 0.02) - 0.02, 0.06]} rot={[-0.3, 0, Math.PI]} s={0.55} point skin="#C8875E" sleeve="#F1E7D2" />
      )}
    </group>
  );
};

/* =================================================================== */
/* PHOTOELASTIC demo: a clear plastic sheet with a square hole and a     */
/* round hole, between two crossed polarising films, held up to the      */
/* forge light. Isochromatic (rainbow) fringes from the stress field:     */
/* Kirsch solution round each hole + the concentration at the square's    */
/* sharp corners. Load rises as Gus flexes it -> fringes multiply.        */
/* =================================================================== */
const photoMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {uLoad: {value: 0.5}, uSq: {value: new THREE.Vector3(SQ.cx, SQ.cy, SQ.s / 2)}, uRd: {value: new THREE.Vector3(RD.cx, RD.cy, RD.r)}},
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uLoad; uniform vec3 uSq; uniform vec3 uRd; varying vec2 vP;
      // principal stress difference (per unit far-field tension along x) round a circular hole of radius a (Kirsch)
      float kirsch(vec2 p, vec2 c, float a){
        vec2 d = p - c; float r = max(length(d), a); float th = atan(d.y, d.x);
        float q = a*a/(r*r);
        float c2 = cos(2.0*th), s2 = sin(2.0*th);
        float srr = 0.5*(1.0-q) + 0.5*(1.0-4.0*q+3.0*q*q)*c2;
        float stt = 0.5*(1.0+q) - 0.5*(1.0+3.0*q*q)*c2;
        float trt = -0.5*(1.0+2.0*q-3.0*q*q)*s2;
        return sqrt((srr-stt)*(srr-stt) + 4.0*trt*trt);
      }
      void main(){
        vec2 p = vP;
        float h = uSq.z;
        // square: Kirsch of the circumscribed circle + sharp singular-ish peaks at the four corners
        float fs = kirsch(p, uSq.xy, h*1.2);
        float corner = 0.0;
        for (int i = 0; i < 4; i++){
          vec2 cc = uSq.xy + vec2(i==0||i==3 ? -h : h, i<2 ? -h : h);
          float d = length(p - cc);
          corner += 0.0008 / (d * d + 0.00004);
        }
        float fr = kirsch(p, uRd.xy, uRd.z);
        float S = 0.35 * (fs - 1.0) + 0.7 * (fr - 1.0);
        // far field ~0.45 (dark grey first order); round hole peaks ~1.4 (one smooth fringe);
        // the square's sharp corners pile up many tight fringes
        float N = max(0.0, uLoad * (0.02 + S + corner)); // fringe order (far field ~0.1 = dark)
        float sn = sin(3.14159*N);
        float I = sn * sn;                              // crossed polarisers (dark field)
        vec3 hue = 0.55 + 0.45*cos(6.28318*(N*0.62 + vec3(0.0, 0.33, 0.67)));
        // first order (N < 1): black -> grey -> white -> straw yellow; colours only above it
        vec3 first = mix(vec3(0.035, 0.04, 0.09), vec3(0.92, 0.88, 0.74), I);
        vec3 col = mix(first, hue * (0.3 + 0.9*I), smoothstep(0.85, 1.25, N));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);   // col is a display colour
        #include <colorspace_fragment>
      }`,
  });

export type PhotoFx = {pos: V3; rot?: V3; s?: number; load?: [number, number]; loadAt?: [number, number]; hands?: boolean; trace?: boolean; traceAt?: number};

export const PhotoSheet: React.FC<{fx: PhotoFx}> = ({fx}) => {
  const {t} = useScene();
  const geo = useMemo(() => paperGeo(0, 0), []);
  const mat = useMemo(photoMat, []);
  const la = fx.loadAt ?? [0, 1];
  const lk = smooth((t - la[0]) / Math.max(0.05, la[1] - la[0]));
  mat.uniforms.uLoad.value = fx.load ? fx.load[0] + (fx.load[1] - fx.load[0]) * lk : 1;
  const ang = (t - (fx.traceAt ?? 0.2)) * 2.4;
  return (
    <group position={fx.pos} rotation={fx.rot ?? [0, 0, 0]} scale={fx.s ?? 1}>
      {/* back polariser film (dark smoky; seen through the holes) */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[PW + 0.05, PH + 0.05]} />
        <meshBasicMaterial color="#0E1022" />
      </mesh>
      {/* the stressed clear plastic with its fringes */}
      <mesh geometry={geo} material={mat} />
      {/* clear acrylic edge */}
      {[
        [0, PH / 2, PW, 0.006],
        [0, -PH / 2, PW, 0.006],
        [-PW / 2, 0, 0.006, PH],
        [PW / 2, 0, 0.006, PH],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.003]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={new THREE.Color('#CFF0FF').multiplyScalar(1.3)} toneMapped={false} />
        </mesh>
      ))}
      {/* front polariser film: a smoky frame border + faint sheen across */}
      {[
        [0, PH / 2 + 0.018, PW + 0.07, 0.036],
        [0, -PH / 2 - 0.018, PW + 0.07, 0.036],
        [-PW / 2 - 0.018, 0, 0.036, PH],
        [PW / 2 + 0.018, 0, 0.036, PH],
      ].map(([x, y, w, h], i) => (
        <mesh key={`f${i}`} position={[x, y, 0.012]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color="#2A2C3A" metalness={0.2} roughness={0.3} envMapIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.012]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[0.03, PH * 1.4]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      {/* the forge light behind it (warm halo) */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[PW * 1.9, PH * 2.0]} />
        <meshBasicMaterial color="#FF9A40" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {fx.hands !== false && (
        <>
          <Hand pos={[-PW / 2 - 0.01, 0.0, 0.03]} rot={[0, -Math.PI / 2, Math.PI / 2]} s={0.7} open={0.25} skin="#C8875E" sleeve="#F1E7D2" />
          <Hand pos={[PW / 2 + 0.01, 0.0, 0.03]} rot={[0, Math.PI / 2, -Math.PI / 2]} s={0.7} open={0.25} skin="#C8875E" sleeve="#F1E7D2" />
        </>
      )}
      {fx.trace && (
        <Hand pos={[RD.cx + Math.cos(ang) * (RD.r + 0.03), RD.cy + Math.sin(ang) * (RD.r + 0.03) - 0.02, 0.06]} rot={[-0.3, 0, Math.PI]} s={0.55} point skin="#C8875E" sleeve="#F1E7D2" />
      )}
    </group>
  );
};

/* =================================================================== */
/* RUNWAY (modern airliner takes off)                                    */
/* =================================================================== */
export type RunwayFx = {takeoff?: [number, number]};
export const takeoffPose = (k: number): {pos: V3; pitch: number} => {
  // roll along -> rotate -> climb (k 0..1)
  const x = -9 + k * 14;
  const lift = Math.max(0, k - 0.35) / 0.65;
  return {pos: [x, 1.2 + lift * lift * 3.2, -4], pitch: Math.min(0.2, lift * 0.5)};
};
export const RunwayHD: React.FC<{fx: RunwayFx; p: number}> = ({fx, p}) => {
  const tk = fx.takeoff ? fx.takeoff[0] + (fx.takeoff[1] - fx.takeoff[0]) * p : 0.6;
  const pose = takeoffPose(tk);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, -20]}>
        <planeGeometry args={[240, 120]} />
        <Toon color="#9AAA5E" />
      </mesh>
      {/* runway strip + centreline + edge lights */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} receiveShadow>
        <planeGeometry args={[160, 5]} />
        <Toon color="#4A4E6A" />
      </mesh>
      {Array.from({length: 30}, (_, i) => -60 + i * 4).map((x) => (
        <Box key={x} size={[1.6, 0.01, 0.12]} pos={[x, 0.005, -4]} color="#F6F0E0" />
      ))}
      {Array.from({length: 40}, (_, i) => -60 + i * 3).map((x) =>
        [-2.6, 2.6].map((dz) => <Ball key={`${x}${dz}`} r={0.06} pos={[x, 0.08, -4 + dz]} color="#FFE2A8" emissive="#FFC46B" />),
      )}
      {/* windsock, terminal, tower, hills */}
      <group position={[6, 0, 0.5]}>
        <Cyl r={0.04} h={2.6} pos={[0, 1.3, 0]} color="#E8E8F0" />
        <mesh position={[0.45, 2.45, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]}>
          <coneGeometry args={[0.18, 0.9, 12, 1, true]} />
          <meshToonMaterial color={C.accent} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Box size={[30, 3, 4]} pos={[-6, 1.5, -26]} color="#E2D6C4" />
      <Box size={[30, 0.8, 0.1]} pos={[-6, 2.2, -23.95]} color="#7FB2E0" />
      <group position={[14, 0, -30]}>
        <Box size={[1.6, 7, 1.6]} pos={[0, 3.5, 0]} color="#E2D6C4" />
        <Box size={[2.8, 1.3, 2.8]} pos={[0, 7.6, 0]} color="#3E5A8A" />
      </group>
      <Ball r={22} pos={[-30, -15, -90]} scale={[2.4, 1, 1]} color="#8A7AA8" />
      <Ball r={18} pos={[30, -12, -85]} scale={[2.4, 1, 1]} color="#7A6A9A" />
      <Jet kind="modern" pos={pose.pos} rot={[0, 0, pose.pitch]} s={1} gear={tk < 0.55} />
    </group>
  );
};
