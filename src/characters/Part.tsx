import React, {createContext, useContext, useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../theme';
import {ShapeSpec, V2, growPoints, shapePoints, toGeometry} from './shapes';

// Per-character drawing context: outline width in world units (≈4px on screen)
// and a light tint from the set's lighting preset.
export const CharCtx = createContext<{ow: number; tint: string}>({ow: 0.02, tint: '#ffffff'});

const OUTLINE_Z = -0.004;

const tinted = (hex: string, tint: string) =>
  new THREE.Color(hex).multiply(new THREE.Color(tint));

export const Part: React.FC<{
  s: ShapeSpec;
  color: string;
  z: number;
  pos?: V2;
  rot?: number;
  scale?: V2;
  outline?: boolean;
  opacity?: number;
}> = ({s, color, z, pos = [0, 0], rot = 0, scale = [1, 1], outline = true, opacity = 1}) => {
  const {ow, tint} = useContext(CharCtx);
  const key = JSON.stringify(s);
  const owQ = Math.round(ow * 2000) / 2000; // quantise so outline geo rarely rebuilds
  const pts = useMemo(() => shapePoints(s), [key]);
  const fill = useMemo(() => toGeometry(pts), [pts]);
  const line = useMemo(
    () => (outline ? toGeometry(growPoints(pts, owQ / Math.max(scale[0], scale[1]))) : null),
    [pts, owQ, outline, scale[0], scale[1]],
  );
  useEffect(() => () => fill.dispose(), [fill]);
  useEffect(() => () => line?.dispose(), [line]);
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

export const Ink: React.FC<{pts: V2[]; z: number; pos?: V2; rot?: number; color?: string}> = ({
  pts,
  z,
  pos,
  rot,
  color = C.ink,
}) => <Part s={{kind: 'poly', pts}} color={color} z={z} pos={pos} rot={rot} outline={false} />;
