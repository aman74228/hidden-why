import React, {createContext, useContext, useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../theme';
import {ShapeSpec, V2, growPoints, shapePoints, toGeometry} from './shapes';

// Per-character drawing context:
//  ow       outline width in world units (≈4px on screen)
//  tint     light tint from the set's lighting preset
//  rim      rim-light strength (0..1, strongest on Gus)
//  rimDir   2D direction towards the key light, in the character's (mirrored) space
//  rimColor warm rim colour from the lighting preset
export type CharDraw = {ow: number; tint: string; rim: number; rimDir: V2; rimColor: string; qa?: {hand: string; arm: string} | null};
export const CharCtx = createContext<CharDraw>({ow: 0.02, tint: '#ffffff', rim: 0, rimDir: [1, 0.5], rimColor: '#FFD27A'});

// Accumulated z-offset + rotation of the enclosing rig groups, so rims can all
// sit on one layer behind the character and always face the light.
export const FrameCtx = createContext<{z: number; rot: number}>({z: 0, rot: 0});

export const G: React.FC<{pos?: [number, number, number]; rot?: number; children: React.ReactNode}> = ({pos = [0, 0, 0], rot = 0, children}) => {
  const f = useContext(FrameCtx);
  const v = useMemo(() => ({z: f.z + pos[2], rot: f.rot + rot}), [f.z, f.rot, pos[2], rot]);
  return (
    <group position={pos} rotation={[0, 0, rot]}>
      <FrameCtx.Provider value={v}>{children}</FrameCtx.Provider>
    </group>
  );
};

const OUTLINE_Z = -0.004;
const GLOW_Z = 0.001; // just above the part's own fill
const GLOW_PX = 3; // inner edge glow width (max 3px)
const GLOW_MAX = 0.4; // max opacity

// Inner rim glow: a band just inside the outline, opaque-ish at the edge and
// fading to nothing inward; its opacity follows how much each edge faces the
// key light, so only the lit side glows.
const glowGeometry = (pts: V2[], width: number, dir: V2, strength: number) => {
  const inner = growPoints(pts, -width);
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const ccw = area > 0 ? 1 : -1;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    let nx = (b[1] - a[1]) * ccw;
    let ny = -(b[0] - a[0]) * ccw;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const lit = Math.max(0, nx * dir[0] + ny * dir[1]);
    const alpha = GLOW_MAX * strength * Math.pow(lit, 1.5);
    pos.push(pts[i][0], pts[i][1], 0, inner[i][0], inner[i][1], 0);
    col.push(1, 1, 1, alpha, 1, 1, 1, 0);
  }
  for (let i = 0; i < n; i++) {
    const o0 = 2 * i, i0 = 2 * i + 1, o1 = 2 * ((i + 1) % n), i1 = 2 * ((i + 1) % n) + 1;
    idx.push(o0, o1, i0, i0, o1, i1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
};

const tinted = (hex: string, tint: string) => new THREE.Color(hex).multiply(new THREE.Color(tint));

const q = (v: number) => Math.round(v * 2000) / 2000; // quantise so geometry rarely rebuilds

export const Part: React.FC<{
  s: ShapeSpec;
  color: string;
  z: number;
  pos?: V2;
  rot?: number;
  scale?: V2;
  outline?: boolean;
  sil?: boolean; // part of the outer silhouette → receives rim light
  opacity?: number;
  role?: 'hand' | 'arm'; // for the QA hand-count pass
}> = ({s, color: color0, z, pos = [0, 0], rot = 0, scale = [1, 1], outline: outline0 = true, sil: sil0 = false, opacity = 1, role}) => {
  const {ow, tint: tint0, rim, rimDir, rimColor, qa} = useContext(CharCtx);
  // QA hand-count pass: flat ID colours, no outline / rim, untinted
  const color = qa ? (role === 'hand' ? qa.hand : role === 'arm' ? qa.arm : '#000000') : color0;
  const outline = qa ? false : outline0;
  const sil = qa ? false : sil0;
  const tint = qa ? '#ffffff' : tint0;
  const frame = useContext(FrameCtx);
  const key = JSON.stringify(s);
  const owQ = q(ow);
  const sc = Math.max(scale[0], scale[1]);
  const pts = useMemo(() => shapePoints(s), [key]);
  const fill = useMemo(() => toGeometry(pts), [pts]);
  const line = useMemo(() => (outline ? toGeometry(growPoints(pts, owQ / sc)) : null), [pts, owQ, outline, sc]);
  // light direction in this part's local frame (quantised to limit rebuilds)
  const a = -(frame.rot + rot);
  const ldx = Math.round((rimDir[0] * Math.cos(a) - rimDir[1] * Math.sin(a)) * 20) / 20;
  const ldy = Math.round((rimDir[0] * Math.sin(a) + rimDir[1] * Math.cos(a)) * 20) / 20;
  const glowW = (owQ * GLOW_PX) / 4 / sc; // ow is 4px → 3px
  const rimGeo = useMemo(
    () => (sil && rim > 0 ? glowGeometry(pts, glowW, [ldx, ldy], rim) : null),
    [pts, glowW, ldx, ldy, rim, sil],
  );
  useEffect(() => () => fill.dispose(), [fill]);
  useEffect(() => () => line?.dispose(), [line]);
  useEffect(() => () => rimGeo?.dispose(), [rimGeo]);
  const col = useMemo(() => tinted(color, tint), [color, tint]);
  const ink = useMemo(() => tinted(C.ink, tint), [tint]);


  return (
    <group position={[pos[0], pos[1], z]} rotation={[0, 0, rot]} scale={[scale[0], scale[1], 1]}>
      <mesh geometry={fill}>
        <meshBasicMaterial color={col} toneMapped={false} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {line ? (
        <mesh geometry={line} position={[0, 0, OUTLINE_Z]}>
          <meshBasicMaterial color={ink} toneMapped={false} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ) : null}
      {rimGeo ? (
        <mesh geometry={rimGeo} position={[0, 0, GLOW_Z]}>
          <meshBasicMaterial color={rimColor} vertexColors transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
};

// Thick arc (for mouths, brows, closed eyes) — no outline, drawn in ink.
export const arcPts = (r: number, th: number, a0: number, a1: number, n = 16): V2[] => {
  const outer: V2[] = [];
  const inner: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    outer.push([Math.cos(a) * (r + th / 2), Math.sin(a) * (r + th / 2)]);
    inner.push([Math.cos(a) * (r - th / 2), Math.sin(a) * (r - th / 2)]);
  }
  return [...outer, ...inner.reverse()];
};

export const Ink: React.FC<{pts: V2[]; z: number; pos?: V2; rot?: number; color?: string}> = ({pts, z, pos, rot, color = C.ink}) => (
  <Part s={{kind: 'poly', pts}} color={color} z={z} pos={pos} rot={rot} outline={false} />
);
