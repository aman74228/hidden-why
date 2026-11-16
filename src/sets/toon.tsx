import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';

// 3-step toon ramp shared by every set material.
let ramp: THREE.DataTexture | null = null;
export const toonRamp = () => {
  if (ramp) return ramp;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
};

export const Toon: React.FC<{color: string; emissive?: string; transparent?: boolean; opacity?: number}> = ({
  color,
  emissive,
  transparent,
  opacity,
}) => (
  <meshToonMaterial
    color={color}
    gradientMap={toonRamp()}
    emissive={emissive ?? '#000000'}
    emissiveIntensity={emissive ? 0.6 : 0}
    transparent={transparent}
    opacity={opacity}
  />
);

type MeshProps = {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number] | number;
  color: string;
  emissive?: string;
};

export const Box: React.FC<MeshProps & {size: [number, number, number]}> = ({size, pos, rot, scale, color, emissive}) => (
  <mesh position={pos} rotation={rot} scale={scale} castShadow receiveShadow>
    <boxGeometry args={size} />
    <Toon color={color} emissive={emissive} />
  </mesh>
);

export const Cyl: React.FC<MeshProps & {r: number; r2?: number; h: number; seg?: number}> = ({r, r2, h, seg = 24, pos, rot, scale, color, emissive}) => (
  <mesh position={pos} rotation={rot} scale={scale} castShadow receiveShadow>
    <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
    <Toon color={color} emissive={emissive} />
  </mesh>
);

export const Ball: React.FC<MeshProps & {r: number}> = ({r, pos, rot, scale, color, emissive}) => (
  <mesh position={pos} rotation={rot} scale={scale} castShadow receiveShadow>
    <sphereGeometry args={[r, 20, 14]} />
    <Toon color={color} emissive={emissive} />
  </mesh>
);

export const Cone: React.FC<MeshProps & {r: number; h: number; seg?: number}> = ({r, h, seg = 4, pos, rot, scale, color}) => (
  <mesh position={pos} rotation={rot} scale={scale} castShadow receiveShadow>
    <coneGeometry args={[r, h, seg]} />
    <Toon color={color} />
  </mesh>
);

// Instanced tile floor with per-tile colour variation.
export const TileFloor: React.FC<{
  size: number;
  tile: number;
  gap: number;
  colors: string[];
  origin?: [number, number];
  plank?: boolean;
}> = ({size, tile, gap, colors, origin = [0, 0], plank}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = Math.ceil(size / tile);
  const count = n * n;
  const rnd = useMemo(() => mulberry(7), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let i = 0;
    for (let ix = 0; ix < n; ix++) {
      for (let iz = 0; iz < n; iz++) {
        const off = plank && ix % 2 ? tile / 2 : 0;
        o.position.set(origin[0] - size / 2 + ix * tile + tile / 2, 0.01, origin[1] - size / 2 + iz * tile + off);
        o.scale.set(tile - gap, 1, (plank ? tile * 1 : tile) - gap);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        c.set(colors[Math.floor(rnd() * colors.length)]);
        c.offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
        m.setColorAt(i, c);
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [n, tile, gap, size, colors, origin, plank, rnd]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[1, 0.02, 1]} />
      <meshToonMaterial gradientMap={toonRamp()} />
    </instancedMesh>
  );
};

export const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
