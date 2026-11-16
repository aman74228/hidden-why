import React, {createContext, useContext, useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../theme';
import {ShapeSpec, V2, growPoints, shapePoints, toGeometry} from './shapes';

// Per-character drawing context:
//  ow       outline width in world units (≈4px on screen)
//  tint     light tint from the set's lighting preset
//  rim      rim-light strength (0..1, strongest on Dada)
//  rimDir   2D direction towards the key light, in the character's (mirrored) space
//  rimColor warm rim colour from the lighting preset
export type CharDraw = {ow: number; tint: string; rim: number; rimDir: V2; rimColor: string};
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
const RIM_Z = -0.03; // absolute, behind every part of the character

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
}> = ({s, color, z, pos = [0, 0], rot = 0, scale = [1, 1], outline = true, sil = false, opacity = 1}) => {
  const {ow, tint, rim, rimDir, rimColor} = useContext(CharCtx);
  const frame = useContext(FrameCtx);
  const key = JSON.stringify(s);
  const owQ = q(ow);
  const sc = Math.max(scale[0], scale[1]);
  const pts = useMemo(() => shapePoints(s), [key]);
  const fill = useMemo(() => toGeometry(pts), [pts]);
  const line = useMemo(() => (outline ? toGeometry(growPoints(pts, owQ / sc)) : null), [pts, owQ, outline, sc]);
  const rimW = sil && rim > 0 ? q(owQ * 1.6 * rim) : 0;
  const rimGeo = useMemo(() => (rimW > 0 ? toGeometry(growPoints(pts, (owQ + rimW) / sc)) : null), [pts, owQ, rimW, sc]);
  useEffect(() => () => fill.dispose(), [fill]);
  useEffect(() => () => line?.dispose(), [line]);
  useEffect(() => () => rimGeo?.dispose(), [rimGeo]);
  const col = useMemo(() => tinted(color, tint), [color, tint]);
  const ink = useMemo(() => tinted(C.ink, tint), [tint]);

  // light direction in this part's local frame
  const a = -(frame.rot + rot);
  const lx = (rimDir[0] * Math.cos(a) - rimDir[1] * Math.sin(a)) * rimW * 0.8;
  const ly = (rimDir[0] * Math.sin(a) + rimDir[1] * Math.cos(a)) * rimW * 0.8;

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
        <mesh geometry={rimGeo} position={[lx / scale[0], ly / scale[1], RIM_Z - frame.z - z]}>
          <meshBasicMaterial color={rimColor} toneMapped={false} side={THREE.DoubleSide} />
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
