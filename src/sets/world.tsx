import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {LightBeam, Motes, RainFX, Sparks, Steam} from './fx';
import {TexName, TexPBR, TexToon} from './materials';
import {Ball, Box, Cyl, Toon, mulberry} from './toon';

// Textured, prop-dense sets (CC0 Poly Haven textures). Every set has 8+ props.

type V3 = [number, number, number];

/* ---------------- textured primitives ---------------- */
export const TBox: React.FC<{size: V3; pos?: V3; rot?: V3; tex: TexName; color?: string; rep?: number; normal?: number; emissive?: string}> = ({
  size,
  pos,
  rot,
  tex,
  color,
  rep = 1,
  normal,
  emissive,
}) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow>
    <boxGeometry args={size} />
    <TexToon tex={tex} color={color} repeat={[Math.max(size[0], size[2]) * rep, size[1] * rep]} normal={normal} emissive={emissive} />
  </mesh>
);

export const TCyl: React.FC<{r: number; r2?: number; h: number; pos?: V3; rot?: V3; tex: TexName; color?: string; rep?: number; seg?: number}> = ({
  r,
  r2,
  h,
  pos,
  rot,
  tex,
  color,
  rep = 1,
  seg = 28,
}) => (
  <mesh position={pos} rotation={rot} castShadow receiveShadow>
    <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
    <TexToon tex={tex} color={color} repeat={[Math.PI * 2 * r * rep, h * rep]} />
  </mesh>
);

export const Ground: React.FC<{tex: TexName; color?: string; rep?: number; size?: number}> = ({tex, color, rep = 0.4, size = 80}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <TexToon tex={tex} color={color} repeat={[size * rep, size * rep]} normal={1} />
  </mesh>
);

// Reflective rain puddle: catches the HDRI + lamps.
export const Puddle: React.FC<{pos: [number, number]; r?: number; sx?: number; rot?: number}> = ({pos, r = 0.6, sx = 1.5, rot = 0}) => (
  <mesh position={[pos[0], 0.008, pos[1]]} rotation={[-Math.PI / 2, 0, rot]} scale={[sx, 1, 1]} receiveShadow>
    <circleGeometry args={[r, 40]} />
    <meshPhysicalMaterial color="#2A2C58" metalness={0.3} roughness={0.08} clearcoat={1} envMapIntensity={0.7} transparent opacity={0.75} />
  </mesh>
);

const archWallGeo = (w: number, h: number, arches: number, archW: number, archH: number, depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const step = w / arches;
  for (let i = 0; i < arches; i++) {
    const cx = -w / 2 + step * (i + 0.5);
    const hole = new THREE.Path();
    const r = archW / 2;
    hole.moveTo(cx - r, 0.001);
    hole.lineTo(cx + r, 0.001);
    hole.lineTo(cx + r, archH - r);
    hole.absarc(cx, archH - r, r, 0, Math.PI, false);
    hole.lineTo(cx - r, 0.001);
    s.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false, curveSegments: 16});
  // UVs in metres so the stone texture keeps its scale
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  return g;
};

/* ---------------- props ---------------- */
export const Lantern: React.FC<{pos: V3; glow?: number}> = ({pos, glow = 1}) => (
  <group position={pos}>
    <Cyl r={0.008} h={0.8} pos={[0, 0.55, 0]} color="#3A2A2A" />
    <Box size={[0.2, 0.04, 0.2]} pos={[0, 0.15, 0]} color="#5A3A2A" />
    <mesh>
      <cylinderGeometry args={[0.09, 0.11, 0.24, 6]} />
      <meshBasicMaterial color={new THREE.Color('#FFC46B').multiplyScalar(1 + glow * 1.6)} toneMapped={false} />
    </mesh>
    <Box size={[0.24, 0.04, 0.24]} pos={[0, -0.13, 0]} color="#5A3A2A" />
    {glow > 0 && <pointLight color="#FFB35A" intensity={3.5 * glow} distance={4} decay={2} />}
  </group>
);

export const PlantPot: React.FC<{pos: V3; s?: number; flowers?: boolean}> = ({pos, s = 1, flowers = true}) => (
  <group position={pos} scale={s}>
    <Cyl r={0.26} r2={0.34} h={0.55} pos={[0, 0.28, 0]} color="#C0583A" />
    <Cyl r={0.36} h={0.06} pos={[0, 0.56, 0]} color="#A84A30" />
    <Ball r={0.36} pos={[0, 0.9, 0]} color="#4E8F4A" />
    <Ball r={0.27} pos={[0.26, 1.1, 0.08]} color="#5FA357" />
    <Ball r={0.25} pos={[-0.25, 1.05, -0.08]} color="#467F44" />
    {flowers && (
      <>
        <Ball r={0.06} pos={[0.12, 1.22, 0.24]} color="#E5533D" />
        <Ball r={0.05} pos={[-0.2, 1.12, 0.22]} color={C.accent} />
        <Ball r={0.05} pos={[0.3, 0.95, 0.22]} color="#F6E9CC" />
      </>
    )}
  </group>
);

export const NeemTree: React.FC<{pos: V3; s?: number}> = ({pos, s = 1}) => (
  <group position={pos} scale={s}>
    <Cyl r={0.16} r2={0.11} h={3.2} pos={[0, 1.6, 0]} color="#6A4632" />
    <Cyl r={0.06} h={1.2} pos={[0.35, 2.7, 0]} rot={[0, 0, -0.7]} color="#6A4632" />
    {[
      [0, 3.6, 0, 1.2, '#4E8F4A'],
      [0.9, 3.2, 0.2, 0.9, '#5FA357'],
      [-0.8, 3.3, -0.1, 0.95, '#467F44'],
      [0.2, 4.3, -0.2, 0.85, '#5FA357'],
      [-0.3, 3.0, 0.6, 0.7, '#3F7A40'],
    ].map(([x, y, z, r, c], i) => (
      <Ball key={i} r={r as number} pos={[x as number, y as number, z as number]} color={c as string} />
    ))}
  </group>
);

export const Bench: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <TBox size={[1.8, 0.1, 0.5]} pos={[0, 0.48, 0]} tex="sandstone-blocks" color="#E8C7A0" />
    <TBox size={[0.3, 0.45, 0.45]} pos={[-0.7, 0.22, 0]} tex="sandstone-blocks" color="#D9A97C" />
    <TBox size={[0.3, 0.45, 0.45]} pos={[0.7, 0.22, 0]} tex="sandstone-blocks" color="#D9A97C" />
  </group>
);

// Broken temple column drums (the real complex is full of ruins).
export const ColumnRuin: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <TBox size={[1.0, 0.3, 1.0]} pos={[0, 0.15, 0]} tex="sandstone-wall" color="#F0C49A" />
    <TCyl r={0.36} h={1.1} pos={[0, 0.85, 0]} tex="sandstone-wall" color="#F2C9A0" seg={12} />
    <TCyl r={0.4} r2={0.3} h={0.25} pos={[0, 1.5, 0]} tex="sandstone-wall" color="#E6B486" seg={12} />
    <TCyl r={0.34} h={0.5} pos={[0.8, 0.34, 0.4]} rot={[Math.PI / 2, 0, 0.4]} tex="sandstone-wall" color="#E2AE80" seg={12} />
  </group>
);

export const CarvedBlock: React.FC<{pos: V3; rotY?: number; s?: number}> = ({pos, rotY = 0, s = 1}) => (
  <group position={pos} rotation={[0, rotY, 0]} scale={s}>
    <TBox size={[1.1, 0.6, 0.7]} pos={[0, 0.3, 0]} tex="sandstone-blocks" color="#EFC092" />
    {[-0.3, 0, 0.3].map((x) => (
      <mesh key={x} position={[x, 0.32, 0.351]}>
        <circleGeometry args={[0.1, 8]} />
        <Toon color="#B9805A" />
      </mesh>
    ))}
  </group>
);

export const Plaque: React.FC<{pos: V3; rotY?: number}> = ({pos, rotY = 0}) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Cyl r={0.03} h={1.0} pos={[-0.3, 0.5, 0]} color="#3A3550" />
    <Cyl r={0.03} h={1.0} pos={[0.3, 0.5, 0]} color="#3A3550" />
    <Box size={[0.8, 0.5, 0.04]} pos={[0, 1.05, 0]} color="#272463" />
    <mesh position={[0, 1.05, 0.022]}>
      <planeGeometry args={[0.7, 0.4]} />
      <meshBasicMaterial color="#F2A33A" transparent opacity={0.25} toneMapped={false} />
    </mesh>
    {[0.12, 0.02, -0.08].map((y, i) => (
      <mesh key={y} position={[i === 0 ? 0 : -0.05, 1.05 + y, 0.024]}>
        <planeGeometry args={[i === 0 ? 0.5 : 0.56, 0.035]} />
        <meshBasicMaterial color="#F6E9CC" toneMapped={false} />
      </mesh>
    ))}
  </group>
);

export const BucketBroom: React.FC<{pos: V3}> = ({pos}) => (
  <group position={pos}>
    <Cyl r={0.17} r2={0.21} h={0.34} pos={[0, 0.17, 0]} color="#2BA39A" />
    <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.19, 20]} />
      <meshPhysicalMaterial color="#334070" roughness={0.05} clearcoat={1} />
    </mesh>
    <Cyl r={0.018} h={1.3} pos={[0.32, 0.65, -0.1]} rot={[0, 0, 0.25]} color="#B8875A" />
    <Cone2 pos={[0.47, 0.08, -0.1]} />
  </group>
);
const Cone2: React.FC<{pos: V3}> = ({pos}) => (
  <mesh position={pos} rotation={[0, 0, 0.25]} castShadow>
    <coneGeometry args={[0.12, 0.3, 10]} />
    <Toon color="#D9B26A" />
  </mesh>
);

export const Pigeon: React.FC<{pos: V3; rotY?: number; ph?: number}> = ({pos, rotY = 0, ph = 0}) => {
  const {t} = useScene();
  const peck = Math.max(0, Math.sin(t * 3 + ph)) ** 6 * 0.5;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Ball r={0.09} pos={[0, 0.1, 0]} scale={[1.4, 0.9, 0.9]} color="#8C90B0" />
      <group position={[0.11, 0.17, 0]} rotation={[0, 0, -peck]}>
        <Ball r={0.05} pos={[0.02, 0, 0]} color="#7A7EA0" />
        <mesh position={[0.07, -0.005, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.012, 0.04, 6]} />
          <Toon color={C.accent} />
        </mesh>
      </group>
      <Ball r={0.05} pos={[-0.13, 0.12, 0]} scale={[1.4, 0.4, 1]} color="#5E6286" />
    </group>
  );
};

/* ---------------- bicycle (rust amount 0..1, textured) ---------------- */
export const Bicycle: React.FC<{pos?: V3; rotY?: number; rust?: number}> = ({pos = [0, 0, 0], rotY = 0, rust = 1}) => {
  const tube = (a: [number, number], b: [number, number], r = 0.025) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    return (
      <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, len, 10]} />
        <TexToon tex="rust" color={rust > 0.5 ? '#FFB08A' : '#4FA0C0'} repeat={[0.3, len * 2]} />
      </mesh>
    );
  };
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[-0.52, 0.52].map((x) => (
        <group key={x} position={[x, 0.34, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.31, 0.03, 8, 36]} />
            <Toon color="#2E2A3E" />
          </mesh>
          <mesh>
            <torusGeometry args={[0.27, 0.012, 6, 36]} />
            <TexToon tex="rust-coarse" color="#FFA070" repeat={[4, 0.2]} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
              <boxGeometry args={[0.006, 0.54, 0.006]} />
              <Toon color="#9A6A50" />
            </mesh>
          ))}
        </group>
      ))}
      {tube([-0.52, 0.34], [-0.08, 0.34])}
      {tube([-0.08, 0.34], [-0.2, 0.78])}
      {tube([-0.52, 0.34], [-0.2, 0.78])}
      {tube([-0.2, 0.78], [0.36, 0.78])}
      {tube([-0.08, 0.34], [0.36, 0.78])}
      {tube([0.36, 0.78], [0.52, 0.34])}
      {tube([0.36, 0.78], [0.32, 0.98])}
      <Box size={[0.1, 0.04, 0.5]} pos={[0.32, 1.0, 0]} color="#5A3A30" />
      <Box size={[0.24, 0.05, 0.1]} pos={[-0.22, 0.84, 0]} color="#3A2A2A" />
      {/* chainring + chain loop */}
      <mesh position={[-0.08, 0.34, 0.05]}>
        <torusGeometry args={[0.08, 0.015, 6, 20]} />
        <TexToon tex="rust-coarse" color="#FFA070" repeat={[2, 0.2]} />
      </mesh>
      <mesh position={[-0.3, 0.34, 0.05]} scale={[1.8, 0.5, 1]}>
        <torusGeometry args={[0.13, 0.012, 6, 24]} />
        <TexToon tex="rust-coarse" color="#FF9A60" repeat={[4, 0.2]} />
      </mesh>
    </group>
  );
};

/* ---------------- COURTYARD (the pillar's home) ---------------- */
export const PILLAR_POS: V3 = [0, 0, -2.5];
export const BARS_POS: V3 = [-3.4, 0, 1.2];

export const CourtyardHD: React.FC<{lampGlow?: number; beams?: boolean; beamColor?: string; night?: boolean}> = ({lampGlow = 1, beams = true, beamColor = '#FFC873', night}) => {
  const wall = useMemo(() => archWallGeo(20, 5.2, 5, 2.2, 3.8, 0.7), []);
  const side = useMemo(() => archWallGeo(12, 4.8, 3, 2.0, 3.4, 0.6), []);
  return (
    <group>
      <Ground tex="sandstone-paving" color="#F2C6A0" rep={0.45} />
      {/* back colonnade with a lit hall behind */}
      <mesh geometry={wall} position={[0, 0, -8]} castShadow receiveShadow>
        <TexToon tex="sandstone-wall" color="#FFD2AE" normal={1} />
      </mesh>
      <TBox size={[20.6, 0.4, 1.0]} pos={[0, 5.4, -7.7]} tex="sandstone-blocks" color="#E8B48A" />
      <Box size={[20.6, 0.16, 0.8]} pos={[0, 5.1, -7.55]} color={C.accent} />
      <TBox size={[20, 5, 0.3]} pos={[0, 2.5, -11.5]} tex="plaster" color="#FFB070" emissive="#FF8A3A" />
      {[-8, -4, 0, 4, 8].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.4, -11.33]}>
            <planeGeometry args={[1.0, 1.5]} />
            <meshBasicMaterial color={new THREE.Color('#FFD08A').multiplyScalar(1.4)} toneMapped={false} />
          </mesh>
          <pointLight position={[x, 2.8, -9.8]} color="#FFB35A" intensity={8 * lampGlow} distance={6} decay={2} />
        </group>
      ))}
      {/* side colonnades */}
      <mesh geometry={side} position={[-9.5, 0, -2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <TexToon tex="sandstone-wall" color="#FFC9A2" />
      </mesh>
      <mesh geometry={side} position={[9.5, 0, -2.6]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <TexToon tex="sandstone-wall" color="#FFC9A2" />
      </mesh>
      {/* columns in front of the arches */}
      {[-6, -2, 2, 6].map((x) => (
        <group key={x} position={[x, 0, -7.2]}>
          <TCyl r={0.32} h={4.6} pos={[0, 2.3, 0]} tex="sandstone-wall" color="#FFD0A8" seg={16} />
          <TBox size={[0.9, 0.3, 0.9]} pos={[0, 0.15, 0]} tex="sandstone-blocks" color="#D9A97C" />
          <TBox size={[0.9, 0.3, 0.9]} pos={[0, 4.65, 0]} tex="sandstone-blocks" color="#D9A97C" />
        </group>
      ))}
      {/* stone kerb around the pillar */}
      <mesh position={[PILLAR_POS[0], 0.06, PILLAR_POS[2]]} receiveShadow castShadow>
        <cylinderGeometry args={[1.25, 1.3, 0.12, 8]} />
        <TexToon tex="sandstone-blocks" color="#E7B78E" repeat={[4, 0.3]} />
      </mesh>
      {/* 1 bicycle, 2 bench, 3 ruins, 4 carved blocks, 5 tree, 6 plants, 7 lanterns, 8 puddles, 9 plaque, 10 bucket, 11 pigeons */}
      <Bicycle pos={[-5.2, 0, -6.3]} rotY={0.12} />
      <Bench pos={[3.6, 0, -6.2]} />
      <ColumnRuin pos={[-6.4, 0, -3.6]} rotY={0.5} />
      <CarvedBlock pos={[6.2, 0, -2.6]} rotY={-0.6} />
      <CarvedBlock pos={[-6.8, 0, 1.2]} rotY={0.3} s={0.9} />
      <NeemTree pos={[7.4, 0, -5.6]} s={1.15} />
      <PlantPot pos={[-3.2, 0, -6.6]} />
      <PlantPot pos={[5.6, 0, -6.2]} s={0.9} />
      <PlantPot pos={[7.6, 0, 1.4]} s={1.1} />
      {[-6, -2, 2, 6].map((x) => (
        <Lantern key={x} pos={[x + 1.0, 3.6, -7.0]} glow={lampGlow} />
      ))}
      <Puddle pos={[1.4, -0.9]} r={0.55} sx={1.7} rot={0.3} />
      <Puddle pos={[-1.8, -0.2]} r={0.5} sx={1.4} rot={-0.2} />
      <Puddle pos={[0.6, 1.4]} r={0.7} sx={1.6} />
      <Puddle pos={[3.2, -3.8]} r={0.45} sx={1.8} />
      <Puddle pos={[-3.0, 2.6]} r={0.6} sx={1.5} rot={0.5} />
      <Plaque pos={[-2.4, 0, -4.6]} rotY={0.4} />
      <BucketBroom pos={[4.7, 0, -5.0]} />
      {!night && (
        <>
          <Pigeon pos={[2.6, 0, -4.4]} rotY={2.4} />
          <Pigeon pos={[3.0, 0, -4.1]} rotY={-0.4} ph={1.3} />
          <Pigeon pos={[-1.2, 5.6, -7.6]} rotY={0.2} ph={2.1} />
        </>
      )}
      {/* the bar stand for Dada's demonstration (two bars added by the story layer) */}
      <TBox size={[1.3, 0.55, 0.55]} pos={[BARS_POS[0], 0.275, BARS_POS[2]]} tex="sandstone-blocks" color="#E4B488" />
      {beams && (
        <>
          <LightBeam from={[-4, 5.0, -7.4]} to={[-1.2, 0, -1.0]} r0={0.5} r1={1.6} color={beamColor} strength={0.22} />
          <LightBeam from={[4, 5.0, -7.4]} to={[2.2, 0, -0.4]} r0={0.5} r1={1.4} color={beamColor} strength={0.16} dust={false} />
        </>
      )}
    </group>
  );
};

/* ---------------- FORGE (flashback) ---------------- */
export const ANVIL: V3 = [0.72, 0, 0.12];
export const ForgeHD: React.FC<{merge?: number; closeup?: boolean}> = ({merge = 0, closeup}) => {
  const {t} = useScene();
  const flick = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3);
  const lumpX = 0.11 * (1 - merge);
  const impacts = useMemo(() => Array.from({length: 12}, (_, i) => 0.9 * (i + 1) - 0.02), []);
  const specks = useMemo(() => {
    const r = mulberry(17);
    return Array.from({length: 22}, () => ({x: (r() - 0.5) * 0.36, y: r() * 0.07, z: (r() - 0.5) * 0.14, s: 0.008 + r() * 0.01}));
  }, []);
  return (
    <group>
      <Ground tex="brick-floor" color="#C89070" rep={0.7} size={30} />
      <TBox size={[14, 5.5, 0.4]} pos={[0, 2.75, -3.4]} tex="plaster" color="#C07050" />
      <TBox size={[0.4, 5.5, 9]} pos={[-5, 2.75, 0]} tex="plaster" color="#B06848" />
      {/* roof beams */}
      {[-2.5, 0, 2.5].map((x) => (
        <TBox key={x} size={[0.25, 0.3, 9]} pos={[x, 5.2, 0]} tex="planks" color="#C08A60" />
      ))}
      <TBox size={[0.3, 5.2, 0.3]} pos={[3.2, 2.6, -1.6]} tex="planks" color="#C08A60" />
      {/* 1 hearth with fire */}
      <group position={[-1.8, 0, -2.6]}>
        <TBox size={[2.1, 1.1, 1.1]} pos={[0, 0.55, 0]} tex="brick-floor" color="#D09070" />
        <mesh position={[0, 0.85, 0.56]}>
          <planeGeometry args={[1.5, 0.5]} />
          <meshBasicMaterial color={new THREE.Color('#FF8A2A').multiplyScalar(2.2 * flick)} toneMapped={false} />
        </mesh>
        {[-0.45, 0, 0.45].map((x, i) => (
          <mesh key={x} position={[x, 1.25 + 0.05 * Math.sin(t * 9 + i), 0.1]} scale={[1, flick + i * 0.05, 1]}>
            <coneGeometry args={[0.22, 0.75, 6]} />
            <meshBasicMaterial color={new THREE.Color(i === 1 ? '#FFD36A' : '#FF8A2A').multiplyScalar(2)} toneMapped={false} />
          </mesh>
        ))}
        <TBox size={[2.3, 0.3, 1.3]} pos={[0, 2.7, 0]} tex="brick-floor" color="#8A5A48" />
        <TBox size={[0.8, 2.6, 0.8]} pos={[0, 4.1, -0.1]} tex="brick-floor" color="#8A5A48" />
        <pointLight position={[0, 1.4, 1.0]} color="#FF8A3A" intensity={26 * flick} distance={10} decay={2} />
        <Motes count={60} box={[1.6, 2.5, 0.8]} center={[0, 2.3, 0.4]} color="#FFA040" size={0.04} rise={0.6} seed={31} />
      </group>
      {/* 2 bellows */}
      <group position={[-3.4, 0, -2.2]} rotation={[0, 0.5, 0]}>
        <TBox size={[0.9, 0.18, 0.6]} pos={[0, 0.45, 0]} tex="planks" color="#C08A60" />
        <mesh position={[0, 0.62 + 0.04 * Math.sin(t * 3), 0]} scale={[1, 0.6 + 0.2 * Math.sin(t * 3), 1]}>
          <sphereGeometry args={[0.38, 16, 10]} />
          <Toon color="#7A4A30" />
        </mesh>
        <Cyl r={0.04} h={0.6} pos={[0.6, 0.55, 0]} rot={[0, 0, Math.PI / 2]} color="#4A3A30" />
      </group>
      {/* 3 water trough */}
      <group position={[2.2, 0, -2.4]}>
        <TBox size={[1.4, 0.55, 0.6]} pos={[0, 0.27, 0]} tex="planks" color="#A87050" />
        <mesh position={[0, 0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.25, 0.45]} />
          <meshPhysicalMaterial color="#2A3A6A" roughness={0.05} clearcoat={1} />
        </mesh>
        <Steam center={[0, 0.55, 0]} spread={0.9} amount={0.6} />
      </group>
      {/* 4 tool rack with tongs + hammers */}
      <group position={[0.4, 0, -3.15]}>
        <TBox size={[1.8, 0.12, 0.12]} pos={[0, 2.0, 0]} tex="planks" color="#C08A60" />
        {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
          <group key={x} position={[x, 1.6, 0.08]}>
            <Cyl r={0.018} h={0.8} pos={[0, 0, 0]} color="#3A3550" />
            {i % 2 ? <Box size={[0.16, 0.08, 0.08]} pos={[0, -0.4, 0]} color="#4A4A60" /> : <Cyl r={0.012} h={0.5} pos={[0.04, -0.35, 0]} rot={[0, 0, 0.15]} color="#3A3550" />}
          </group>
        ))}
      </group>
      {/* 5 charcoal pile */}
      {useMemo(() => {
        const r = mulberry(71);
        return Array.from({length: 26}, (_, i) => (
          <mesh key={i} position={[-3.6 + (r() - 0.5) * 0.9, 0.08 + r() * 0.12, 0.2 + (r() - 0.5) * 0.7]} rotation={[r() * 3, r() * 3, 0]}>
            <dodecahedronGeometry args={[0.08 + r() * 0.06, 0]} />
            <Toon color={i % 4 ? '#2E2A3C' : '#4A3040'} />
          </mesh>
        ));
      }, [])}
      {/* 6 basket of iron lumps */}
      <group position={[-2.0, 0, 0.8]}>
        <Cyl r={0.3} r2={0.36} h={0.36} pos={[0, 0.18, 0]} color="#B8875A" />
        {[0, 1, 2, 3].map((i) => (
          <Ball key={i} r={0.1} pos={[Math.cos(i * 1.6) * 0.14, 0.38, Math.sin(i * 1.6) * 0.14]} color="#5A5468" />
        ))}
      </group>
      {/* 7 stool, 8 quench bucket, 9 sacks */}
      <group position={[1.9, 0, 1.0]}>
        <TCyl r={0.22} h={0.08} pos={[0, 0.45, 0]} tex="planks" color="#C08A60" />
        {[0, 1, 2].map((i) => (
          <Cyl key={i} r={0.025} h={0.45} pos={[Math.cos(i * 2.1) * 0.15, 0.22, Math.sin(i * 2.1) * 0.15]} color="#7A4A30" />
        ))}
      </group>
      <Cyl r={0.2} r2={0.24} h={0.42} pos={[1.6, 0.21, -1.0]} color="#5A5C76" />
      <Ball r={0.32} pos={[-4.2, 0.28, -1.0]} scale={[1, 0.9, 0.8]} color="#C8A070" />
      <Ball r={0.28} pos={[-4.4, 0.24, -0.4]} scale={[1, 0.9, 0.8]} color="#B89060" />
      {/* light shaft from the smoke hole */}
      <LightBeam from={[1.2, 5.4, -1.4]} to={[0.8, 0, 0.4]} r0={0.35} r1={1.0} color="#FFB060" strength={0.28} />
      {/* anvil + glowing lumps */}
      <group position={ANVIL}>
        <TCyl r={0.2} h={0.32} pos={[0, 0.16, 0]} tex="planks" color="#8A6040" />
        <Box size={[0.2, 0.14, 0.18]} pos={[0, 0.39, 0]} color="#4A4A60" />
        <mesh position={[0, 0.51, 0]} castShadow>
          <boxGeometry args={[0.56, 0.1, 0.22]} />
          <TexToon tex="steel" color="#8A8CB0" repeat={[1, 0.3]} />
        </mesh>
        <mesh position={[0.32, 0.51, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <Toon color="#5A5C76" />
        </mesh>
        <group position={[0, 0.6, 0]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * lumpX, 0, 0]} scale={[1.2 - merge * 0.1 + merge * 0.5, 0.65 - merge * 0.15, 0.9]}>
              <sphereGeometry args={[0.1, 18, 12]} />
              <meshBasicMaterial color={new THREE.Color(sd > 0 ? '#FF8A2A' : '#FFA040').multiplyScalar(1.8)} toneMapped={false} />
            </mesh>
          ))}
          {specks.map((s, i) => (
            <mesh key={i} position={[s.x * (0.6 + merge * 0.5), s.y, s.z + 0.06]}>
              <sphereGeometry args={[s.s, 6, 4]} />
              <meshBasicMaterial color="#6E6A78" toneMapped={false} />
            </mesh>
          ))}
          <pointLight color="#FF7A2A" intensity={closeup ? 3 : 5} distance={2.5} decay={2} />
        </group>
        <Sparks pos={[0, 0.62, 0.05]} times={impacts} />
      </group>
    </group>
  );
};

/* ---------------- STREET (Vik's house) ---------------- */
export const StreetHD: React.FC<{wet?: boolean}> = ({wet = true}) => {
  const {t} = useScene();
  return (
    <group>
      <Ground tex="cobbles" color="#C8B0A0" rep={0.5} />
      {/* house */}
      <TBox size={[9, 3.4, 0.3]} pos={[0, 1.7, -5.5]} tex="plaster" color="#FFD8B0" />
      <TBox size={[9.4, 0.22, 0.6]} pos={[0, 3.45, -5.4]} tex="sandstone-blocks" color="#D49870" />
      <TBox size={[9, 2.2, 0.3]} pos={[0, 4.6, -6.4]} tex="plaster" color="#FFE0C0" />
      {/* 1 door, 2 window, 3 roof water tank */}
      <TBox size={[1.1, 2.0, 0.08]} pos={[-1.6, 1.0, -5.32]} tex="planks" color="#C07A9A" />
      <mesh position={[1.9, 1.7, -5.33]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshBasicMaterial color={new THREE.Color('#FFD08A').multiplyScalar(1.5)} toneMapped={false} />
      </mesh>
      <Box size={[1.3, 0.1, 0.25]} pos={[1.9, 1.25, -5.25]} color="#C98F68" />
      <Cyl r={0.5} h={0.9} pos={[3.2, 4.1, -5.6]} color="#3A3A50" />
      {/* boundary wall + gate posts with lamp finials */}
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <TBox size={[0.44, 1.95, 0.44]} pos={[sd * 1.22, 0.97, 0]} tex="plaster" color="#FFE6CC" />
          <Box size={[0.54, 0.14, 0.54]} pos={[sd * 1.22, 2.0, 0]} color="#C98F68" />
          <mesh position={[sd * 1.22, 2.17, 0]}>
            <sphereGeometry args={[0.11, 16, 12]} />
            <meshBasicMaterial color={new THREE.Color('#FFCF7A').multiplyScalar(1.8)} toneMapped={false} />
          </mesh>
          <TBox size={[3.3, 1.25, 0.3]} pos={[sd * 3.05, 0.62, 0]} tex="plaster" color="#FFE6CC" />
          <Box size={[3.4, 0.1, 0.4]} pos={[sd * 3.05, 1.28, 0]} color="#C98F68" />
        </group>
      ))}
      {/* 4 name plate (unlit so it stays readable) */}
      <mesh position={[1.22, 1.5, 0.225]}>
        <planeGeometry args={[0.34, 0.16]} />
        <meshBasicMaterial color="#272463" toneMapped={false} />
      </mesh>
      <mesh position={[1.22, 1.5, 0.226]}>
        <planeGeometry args={[0.24, 0.04]} />
        <meshBasicMaterial color={C.accent} toneMapped={false} />
      </mesh>
      {/* 5 plants */}
      <PlantPot pos={[-1.8, 1.33, 0]} s={0.7} />
      <PlantPot pos={[2.5, 0, 0.7]} s={1.05} />
      <PlantPot pos={[-2.7, 0, 0.8]} s={0.9} />
      {/* 6 scooter */}
      <group position={[-4.0, 0, 1.4]} rotation={[0, 0.5, 0]}>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.17, 0.06, 8, 24]} />
            <Toon color="#2A2838" />
          </mesh>
        ))}
        <Box size={[1.0, 0.18, 0.36]} pos={[0, 0.35, 0]} color="#E5533D" />
        <Box size={[0.5, 0.25, 0.4]} pos={[-0.25, 0.6, 0]} color="#E5533D" />
        <Box size={[0.1, 0.7, 0.1]} pos={[0.48, 0.65, 0]} rot={[0, 0, -0.25]} color="#E5533D" />
        <Box size={[0.08, 0.06, 0.6]} pos={[0.58, 1.0, 0]} color="#2A2838" />
      </group>
      {/* 7 lamp post */}
      <group position={[4.5, 0, 1.2]}>
        <Cyl r={0.06} h={3.6} pos={[0, 1.8, 0]} color="#2E3A64" />
        <Box size={[0.7, 0.06, 0.06]} pos={[-0.3, 3.55, 0]} color="#2E3A64" />
        <Lantern pos={[-0.6, 3.25, 0]} />
      </group>
      {/* 8 clothesline with drying clothes (sways) */}
      <group position={[0, 2.8, -4.4]}>
        <Cyl r={0.006} h={6} pos={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#3A3550" />
        {['#2BA39A', '#F2A33A', '#E5533D', '#F6E9CC', '#7A4FB0'].map((c, i) => (
          <mesh key={c} position={[-2 + i * 1.0, -0.3, 0]} rotation={[0.08 * Math.sin(t * 1.4 + i), 0, 0]}>
            <boxGeometry args={[0.55, 0.6, 0.02]} />
            <Toon color={c} />
          </mesh>
        ))}
      </group>
      {/* 9 bin, 10 steps */}
      <Cyl r={0.25} r2={0.28} h={0.7} pos={[3.6, 0.35, -0.5]} color="#2E7F6A" />
      <TBox size={[1.6, 0.18, 0.5]} pos={[-1.6, 0.09, -5.0]} tex="sandstone-blocks" color="#D9A97C" />
      {wet && (
        <>
          <Puddle pos={[0.4, 1.2]} r={0.7} sx={1.6} />
          <Puddle pos={[-2.2, 2.4]} r={0.5} sx={1.4} rot={0.4} />
          <Puddle pos={[2.6, 2.2]} r={0.45} sx={1.7} />
        </>
      )}
      <LightBeam from={[-3.5, 6, -2]} to={[-0.2, 0, 0.6]} r0={0.4} r1={1.5} color="#FFD08A" strength={0.18} />
    </group>
  );
};

export {RainFX};
