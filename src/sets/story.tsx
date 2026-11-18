import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {CharCtx, Part} from '../characters/Part';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {Ball, Box, Cyl, TileFloor, Toon, mulberry, toonRamp} from './toon';
import {RainFX} from './fx';
import {IronMat, TexPBR, TexToon, hammeredIron, inscription, useTex} from './materials';

// Reusable story props + macro scenes. Hero props are never hidden by the
// frame-edge check (they're meant to run off-frame, e.g. a 7 m pillar).

const IRON = '#5A4F46';
const IRON_D = '#463D36';

/* ---------------- the iron pillar ---------------- */
export const IronPillar: React.FC<{pos?: [number, number, number]; scale?: number; sheen?: number}> = ({pos = [0, 0, 0], scale = 1, sheen = 0}) => {
  // smooth stacked capital: collar → inverted-lotus bell → ring → round
  // cushion (amalaka) → neck → square abacus. Profiles are sampled finely so
  // the toon shading reads as clean bands, not a lumpy rock.
  const bell = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      pts.push(new THREE.Vector2(0.155 + 0.2 * Math.pow(u, 2.2) + 0.01 * Math.sin(u * Math.PI), u * 0.62));
    }
    pts.push(new THREE.Vector2(0.37, 0.64), new THREE.Vector2(0.0, 0.64));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  return (
    <group position={pos} scale={scale}>
      {/* shaft: 0.42 m at the base tapering to 0.3 m; ~6.1 m to the capital */}
      <mesh position={[0, 3.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.21, 6.1, 36]} />
        <IronMat repeat={[1, 8]} />
      </mesh>
      {/* inscription band */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.1975, 0.1985, 0.5, 48]} />
        <meshStandardMaterial color="#4a423c" map={hammeredIron().map} bumpMap={inscription()} bumpScale={2.5} metalness={0.6} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
      <mesh position={[0, 6.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.035, 12, 40]} />
        <Toon color={IRON_D} />
      </mesh>
      <mesh geometry={bell} position={[0, 6.12, 0]} castShadow>
        <Toon color={IRON_D} />
      </mesh>
      <Cyl r={0.24} h={0.06} pos={[0, 6.79, 0]} color={IRON} seg={40} />
      <mesh position={[0, 6.97, 0]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[0.3, 40, 20]} />
        <Toon color={IRON_D} />
      </mesh>
      <Cyl r={0.16} h={0.1} pos={[0, 7.15, 0]} color={IRON} seg={32} />
      <Box size={[0.46, 0.14, 0.46]} pos={[0, 7.27, 0]} color={IRON_D} />
      {sheen > 0 && (
        <mesh position={[0, 3.05, 0]}>
          <cylinderGeometry args={[0.16, 0.222, 6.1, 28]} />
          <meshBasicMaterial color="#6FB8F0" transparent opacity={0.18 * sheen} depthWrite={false} />
        </mesh>
      )}
      <PillarBeads />
      {/* stone plinth */}
      <Cyl r={0.9} h={0.18} pos={[0, 0.09, 0]} color="#B78A63" seg={8} />
    </group>
  );
};

// Raindrops beading and rolling down the shaft (only readable up close).
const PillarBeads: React.FC = () => {
  const {t} = useScene();
  const beads = useMemo(() => {
    const r = mulberry(121);
    return Array.from({length: 18}, () => ({a: (r() - 0.5) * 2.4, y0: 1.4 + r() * 1.4, ph: r(), v: 0.08 + r() * 0.2, s: 0.006 + r() * 0.008}));
  }, []);
  const rivs = useMemo(() => {
    const r = mulberry(127);
    return Array.from({length: 10}, () => ({a: (r() - 0.5) * 2.2, ph: r(), v: 0.5 + r() * 0.5, len: 0.25 + r() * 0.5}));
  }, []);
  return (
    <>
      {rivs.map((v, i) => {
        const head = 3.0 - ((t * v.v + v.ph) % 1) * 2.4;
        const y = head + v.len / 2;
        const rr = 0.212 - (0.06 * y) / 6.1;
        return (
          <mesh key={`r${i}`} position={[Math.sin(v.a) * rr, y, Math.cos(v.a) * rr]} rotation={[0, v.a, 0]}>
            <planeGeometry args={[0.005, v.len]} />
            <meshPhysicalMaterial color="#9aa8c0" transparent opacity={0.35} roughness={0.02} clearcoat={1} envMapIntensity={1.2} depthWrite={false} />
          </mesh>
        );
      })}
      {beads.map((b, i) => {
        const y = b.y0 - ((t * b.v + b.ph) % 1) * 0.6;
        const rr = 0.21 - (0.06 * y) / 6.1 + b.s * 0.5;
        return (
          <mesh key={i} position={[Math.sin(b.a) * rr, y, Math.cos(b.a) * rr]} scale={[1, 1.3, 0.7]}>
            <sphereGeometry args={[b.s, 10, 8]} />
            <meshPhysicalMaterial color="#6E7C96" roughness={0.12} clearcoat={0.5} envMapIntensity={0.35} />
          </mesh>
        );
      })}
    </>
  );
};

/* ---------------- weather ---------------- */
export const Rain: React.FC<{intensity: number; center?: [number, number, number]; area?: number}> = ({intensity, center = [0, 0, 0], area = 9}) => {
  const {t} = useScene();
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 1400;
  const drops = useMemo(() => {
    const r = mulberry(21);
    return Array.from({length: N}, () => ({x: (r() - 0.5) * area * 2, z: (r() - 0.6) * area * 2, y: r() * 11, v: 9 + r() * 4}));
  }, [area]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    drops.forEach((d, i) => {
      const y = (((d.y - d.v * t) % 11) + 11) % 11;
      o.position.set(center[0] + d.x + y * 0.06, y, center[2] + d.z);
      o.rotation.set(0, 0, 0.06);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.count = Math.round(N * Math.max(0, Math.min(1, intensity)));
    m.instanceMatrix.needsUpdate = true;
  }, [t, intensity, drops, center]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.42, 0.012]} />
      <meshBasicMaterial color="#D6E2FF" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
};

export const NightSky: React.FC<{dur: number}> = ({dur}) => {
  const {t} = useScene();
  const stars = useMemo(() => {
    const r = mulberry(5);
    const pos: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = r() * Math.PI * 2;
      const e = Math.asin(0.08 + r() * 0.92);
      pos.push(Math.cos(e) * Math.cos(a) * 130, Math.sin(e) * 130, Math.cos(e) * Math.sin(a) * 130);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, []);
  // time-lapse: the sky wheels round, the moon crosses
  const k = Math.min(1, t / Math.max(dur, 0.1));
  const ma = THREE.MathUtils.lerp(-1.1, 1.1, k);
  return (
    <>
      <points geometry={stars} rotation={[0.35, 0, t * 0.12]} renderOrder={-8}>
        <pointsMaterial color="#F4F0FF" size={2.4} sizeAttenuation={false} fog={false} transparent opacity={0.9} />
      </points>
      <mesh position={[Math.sin(ma) * 100, 40 + Math.cos(ma) * 45, -100]} renderOrder={-7}>
        <sphereGeometry args={[6, 24, 12]} />
        <meshBasicMaterial color="#FFF4D6" fog={false} toneMapped={false} />
      </mesh>
    </>
  );
};

/* ---------------- rusty bicycle ---------------- */
export const Bicycle: React.FC<{pos?: [number, number, number]; rotY?: number; rust?: number}> = ({pos = [0, 0, 0], rotY = 0, rust = 1}) => {
  const frame = rust > 0.5 ? '#B9572A' : '#2E7FA0';
  const spots = useMemo(() => {
    const r = mulberry(9);
    return Array.from({length: 26}, () => ({x: (r() - 0.5) * 1.1, y: 0.3 + r() * 0.5, s: 0.02 + r() * 0.04}));
  }, []);
  const tube = (a: [number, number], b: [number, number], r = 0.025) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    return (
      <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, len, 10]} />
        <Toon color={frame} />
      </mesh>
    );
  };
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[-0.52, 0.52].map((x) => (
        <group key={x} position={[x, 0.34, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.31, 0.03, 8, 36]} />
            <Toon color="#3A2A2A" />
          </mesh>
          <mesh>
            <torusGeometry args={[0.27, 0.012, 6, 36]} />
            <Toon color="#A0552C" />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
              <boxGeometry args={[0.006, 0.54, 0.006]} />
              <Toon color="#8A6A5A" />
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
      <Box size={[0.1, 0.04, 0.5]} pos={[0.32, 1.0, 0]} color={frame} />
      <Box size={[0.24, 0.05, 0.1]} pos={[-0.22, 0.84, 0]} color="#3A2A2A" />
      {/* chain: rust orange loop */}
      <mesh position={[-0.3, 0.34, 0.05]} scale={[1.8, 0.5, 1]}>
        <torusGeometry args={[0.13, 0.012, 6, 24]} />
        <Toon color="#D2692E" emissive="#7A2A0A" />
      </mesh>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0.04]}>
          <circleGeometry args={[s.s, 8]} />
          <meshToonMaterial color={i % 3 ? '#C9622C' : '#7A3418'} gradientMap={toonRamp()} />
        </mesh>
      ))}
    </group>
  );
};

/* ---------------- Vik's brand-new gate ---------------- */
const BAR_X = Array.from({length: 9}, (_, i) => -0.9 + i * 0.225);
export const GATE_SPOT: [number, number, number] = [0.225, 1.18, 0.024]; // on bar 5, world (gate at origin)
const GATE_IRON = '#262A46';

const Scroll: React.FC<{pos: [number, number, number]; flip?: boolean; r?: number}> = ({pos, flip, r = 0.07}) => (
  <group position={pos} scale={[flip ? -1 : 1, 1, 1]}>
    <mesh>
      <torusGeometry args={[r, 0.011, 6, 28, Math.PI * 1.6]} />
      <Toon color={GATE_IRON} />
    </mesh>
    <mesh position={[r * 0.45, -r * 0.1, 0]}>
      <torusGeometry args={[r * 0.45, 0.009, 6, 20, Math.PI * 1.5]} />
      <Toon color={GATE_IRON} />
    </mesh>
  </group>
);

const PotPlant: React.FC<{pos: [number, number, number]; s?: number}> = ({pos, s = 1}) => (
  <group position={pos} scale={s}>
    <Cyl r={0.2} r2={0.27} h={0.42} pos={[0, 0.21, 0]} color="#C0583A" />
    <Box size={[0.6, 0.06, 0.6]} pos={[0, 0.44, 0]} rot={[0, 0.78, 0]} color="#A84A30" />
    <Ball r={0.3} pos={[0, 0.72, 0]} color="#4E8F4A" />
    <Ball r={0.22} pos={[0.2, 0.9, 0.05]} color="#5FA357" />
    <Ball r={0.2} pos={[-0.2, 0.86, -0.05]} color="#467F44" />
    <Ball r={0.06} pos={[0.12, 1.02, 0.18]} color="#E5533D" />
    <Ball r={0.05} pos={[-0.16, 0.95, 0.16]} color={C.accent} />
  </group>
);

// Organic rust blob (smooth noisy outline) with a darker core and a tiny drip.
const blobShape = (r: number, seed: number, wob: number) => {
  const rnd = mulberry(seed);
  const harm = [2, 3, 5, 7].map((k) => ({k, a: (rnd() - 0.5) * wob * (3 / k), p: rnd() * Math.PI * 2}));
  const sh = new THREE.Shape();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + harm.reduce((s, h) => s + h.a * Math.sin(h.k * a + h.p), 0));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 1.1;
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(sh);
};
const dripShape = () => {
  const sh = new THREE.Shape();
  sh.moveTo(-0.006, 0);
  sh.bezierCurveTo(-0.006, -0.02, -0.004, -0.032, -0.007, -0.04);
  sh.bezierCurveTo(-0.011, -0.05, 0.008, -0.053, 0.006, -0.041);
  sh.bezierCurveTo(0.004, -0.032, 0.006, -0.02, 0.006, 0);
  sh.lineTo(-0.006, 0);
  return new THREE.ShapeGeometry(sh);
};
// Small irregular stain with a thin orange streak running down the bar.
const streakShape = () => {
  const sh = new THREE.Shape();
  // short, faint run-off: a soft tapering stain about 1.5x the spot's height
  sh.moveTo(-0.0009, 0.001);
  sh.bezierCurveTo(-0.0012, -0.005, 0.0002, -0.01, -0.0006, -0.016);
  sh.quadraticCurveTo(-0.0002, -0.0185, 0.0003, -0.016);
  sh.bezierCurveTo(0.0011, -0.01, 0.0004, -0.005, 0.0009, 0.001);
  sh.lineTo(-0.0009, 0.001);
  return new THREE.ShapeGeometry(sh);
};
const RustSpot: React.FC<{scale?: number}> = ({scale = 1}) => {
  const outer = useMemo(() => blobShape(0.0065, 7, 0.35), []);
  const core = useMemo(() => blobShape(0.003, 11, 0.5), []);
  const speck = useMemo(() => blobShape(0.0016, 13, 0.5), []);
  const streak = useMemo(() => streakShape(), []);
  return (
    <group position={GATE_SPOT} scale={scale}>
      <mesh geometry={streak} position={[-0.0015, -0.005, -0.0002]}>
        <meshBasicMaterial color="#B85C2C" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh geometry={outer}>
        <meshBasicMaterial color="#C95A26" toneMapped={false} />
      </mesh>
      <mesh geometry={core} position={[0.002, -0.002, 0.0005]}>
        <meshBasicMaterial color="#7E3214" toneMapped={false} />
      </mesh>
      <mesh geometry={speck} position={[-0.006, 0.005, 0.0003]}>
        <meshBasicMaterial color="#B85224" toneMapped={false} />
      </mesh>
    </group>
  );
};

export const Gate: React.FC<{spot?: number}> = ({spot = 1}) => (
  <group>
    {/* house set back so sky shows above the boundary wall */}
    <Box size={[7, 2.6, 0.3]} pos={[0, 1.3, -5.5]} color="#E7B98E" />
    <Box size={[7.4, 0.18, 0.5]} pos={[0, 2.66, -5.4]} color="#C98F68" />
    <Box size={[0.9, 0.7, 0.06]} pos={[1.8, 1.5, -5.33]} color="#FFE1A8" emissive="#FFC46B" />
    <Box size={[1.0, 1.8, 0.06]} pos={[-1.4, 0.9, -5.33]} color="#7A4A6E" />
    {/* boundary wall + gate posts with lamp finials */}
    {[-1, 1].map((sd) => (
      <group key={sd}>
        <Box size={[0.42, 1.9, 0.42]} pos={[sd * 1.21, 0.95, 0]} color="#F0D2B0" />
        <Box size={[0.52, 0.14, 0.52]} pos={[sd * 1.21, 1.97, 0]} color="#C98F68" />
        <Ball r={0.11} pos={[sd * 1.21, 2.15, 0]} color={C.gold} emissive="#FFB547" />
        <Box size={[3.2, 1.25, 0.3]} pos={[sd * 3.0, 0.62, 0]} color="#F0D2B0" />
        <Box size={[3.3, 0.1, 0.4]} pos={[sd * 3.0, 1.28, 0]} color="#C98F68" />
      </group>
    ))}
    <PotPlant pos={[-1.75, 1.33, 0]} s={0.75} />
    <PotPlant pos={[2.4, 0, 0.6]} s={1.1} />
    <PotPlant pos={[-2.6, 0, 0.7]} s={0.95} />
    {/* ornate new gate: bars, finials, rails, scrolls, top arch */}
    {BAR_X.map((x, i) => {
      const h = 1.55 + 0.18 * Math.cos(((x / 0.9) * Math.PI) / 2); // arched top line
      return (
        <group key={x} position={[x, 0, 0]}>
          <Cyl r={0.02} h={h} pos={[0, h / 2 + 0.06, 0]} color={GATE_IRON} seg={10} />
          <mesh position={[0.007, h / 2 + 0.06, 0.018]}>
            <boxGeometry args={[0.007, h * 0.9, 0.003]} />
            <meshBasicMaterial color="#C8D0F0" toneMapped={false} />
          </mesh>
          <mesh position={[0, h + 0.13, 0]}>
            <coneGeometry args={[0.035, 0.13, 4]} />
            <Toon color={C.accent} />
          </mesh>
          <Ball r={0.028} pos={[0, h + 0.06, 0]} color={C.accent} />
          {i < BAR_X.length - 1 && <Scroll pos={[0.1125, 0.28, 0]} flip={i % 2 === 1} />}
          {i < BAR_X.length - 1 && <Scroll pos={[0.1125, 1.4 + 0.1 * Math.cos(((x / 0.9) * Math.PI) / 2), 0]} flip={i % 2 === 0} r={0.06} />}
        </group>
      );
    })}
    {[0.16, 1.24].map((y) => (
      <Box key={y} size={[1.95, 0.045, 0.045]} pos={[0, y, 0]} color={GATE_IRON} />
    ))}
    <mesh position={[0, 1.3, 0]}>
      <torusGeometry args={[0.98, 0.02, 6, 48, Math.PI]} />
      <Toon color={GATE_IRON} />
    </mesh>
    {/* the one little orange spot */}
    {spot > 0 && <RustSpot scale={spot} />}
  </group>
);

/* ---------------- forge ---------------- */
export const ANVIL: [number, number, number] = [0.72, 0, 0.12];
export const Forge: React.FC<{merge?: number; closeup?: boolean}> = ({merge = 0, closeup}) => {
  const {t} = useScene();
  const flick = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3);
  // hammer impacts every 0.9 s (matches the 'hammer' pose)
  const since = t % 0.9;
  const sparks = useMemo(() => {
    const r = mulberry(13);
    return Array.from({length: 24}, () => ({a: r() * Math.PI, v: 1.2 + r() * 2.2, s: 0.012 + r() * 0.015}));
  }, []);
  const lumpX = 0.11 * (1 - merge);
  const specks = useMemo(() => {
    const r = mulberry(17);
    return Array.from({length: 22}, () => ({x: (r() - 0.5) * 0.36, y: r() * 0.07, z: (r() - 0.5) * 0.14, s: 0.008 + r() * 0.01}));
  }, []);
  return (
    <group>
      <TileFloor size={14} tile={0.9} gap={0.05} colors={['#6A4C3C', '#5E4436', '#73523F']} />
      <Box size={[12, 5, 0.4]} pos={[0, 2.5, -3.2]} color="#7A3E2C" />
      <Box size={[0.4, 5, 8]} pos={[-4.5, 2.5, 0]} color="#6E3828" />
      {/* hearth */}
      <group position={[-1.8, 0, -2.5]}>
        <Box size={[2.0, 1.1, 1.0]} pos={[0, 0.55, 0]} color="#8A6A5A" />
        <Box size={[1.5, 0.5, 0.1]} pos={[0, 0.85, 0.48]} color="#FF8A2A" emissive="#FF6A1A" />
        {[-0.4, 0, 0.4].map((x, i) => (
          <mesh key={x} position={[x, 1.25 + 0.05 * Math.sin(t * 9 + i), 0.1]} scale={[1, flick + i * 0.05, 1]}>
            <coneGeometry args={[0.22, 0.7, 6]} />
            <meshBasicMaterial color={i === 1 ? '#FFD36A' : '#FF8A2A'} toneMapped={false} />
          </mesh>
        ))}
        <Box size={[2.2, 0.3, 1.2]} pos={[0, 2.6, 0]} color="#5A3A30" />
        <Box size={[0.8, 2.5, 0.8]} pos={[0, 4.0, -0.1]} color="#5A3A30" />
        <pointLight position={[0, 1.4, 0.9]} color="#FF8A3A" intensity={22 * flick} distance={9} decay={2} />
      </group>
      {/* anvil + glowing lumps */}
      <group position={ANVIL}>
        <Box size={[0.3, 0.32, 0.3]} pos={[0, 0.16, 0]} color="#4A3A30" />
        <Box size={[0.2, 0.14, 0.18]} pos={[0, 0.39, 0]} color="#4A4A60" />
        <Box size={[0.56, 0.1, 0.22]} pos={[0, 0.51, 0]} color="#5A5C76" />
        <mesh position={[0.32, 0.51, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <Toon color="#5A5C76" />
        </mesh>
        <group position={[0, 0.6, 0]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * lumpX, 0, 0]} scale={[1.2 - merge * 0.1 + merge * 0.5, 0.65 - merge * 0.15, 0.9]}>
              <sphereGeometry args={[0.1, 18, 12]} />
              <meshBasicMaterial color={sd > 0 ? '#FF8A2A' : '#FFA040'} toneMapped={false} />
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
        {/* sparks on impact */}
        {since < 0.35 &&
          sparks.map((sp, i) => {
            const k = since / 0.35;
            return (
              <mesh key={i} position={[Math.cos(sp.a) * sp.v * since, 0.62 + Math.sin(sp.a) * sp.v * since - 4 * since * since, 0.1]}>
                <sphereGeometry args={[sp.s * (1 - k), 4, 3]} />
                <meshBasicMaterial color="#FFD76A" toneMapped={false} />
              </mesh>
            );
          })}
      </group>
    </group>
  );
};

/* ---------------- macro: coin scratch ---------------- */
export const ScratchMacro: React.FC<{dur: number}> = ({dur}) => {
  const {t} = useScene();
  const k = Math.min(1, Math.max(0, (t - 0.25) / Math.min(1.6, dur * 0.7)));
  const e = k * k * (3 - 2 * k);
  // stays below the title card (top ~23% of frame)
  const from = new THREE.Vector2(-0.3, 0.2);
  const to = new THREE.Vector2(0.1, -0.22);
  const cur = from.clone().lerp(to, e);
  const len = from.distanceTo(cur);
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  // hammered texture: shallow dents with a lit rim and a shadowed rim
  const dents = useMemo(() => {
    const r = mulberry(31);
    return Array.from({length: 150}, () => ({x: (r() - 0.5) * 1.3, y: (r() - 0.5) * 2.0, s: 0.025 + r() * 0.07, a: r() * Math.PI}));
  }, []);
  return (
    <group>
      {/* the pillar's surface fills the frame */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[3, 4]} />
        <IronMat repeat={[1.6, 2.1]} sheen={0.5} />
      </mesh>
      {/* bright silver streak: soft glow + bright core */}
      {len > 0.001 && (
        <group position={[(from.x + cur.x) / 2, (from.y + cur.y) / 2, 0.005]} rotation={[0, 0, ang]}>
          <mesh>
            <planeGeometry args={[len, 0.06]} />
            <meshBasicMaterial color="#9FB0D8" transparent opacity={0.55} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[len, 0.024]} />
            <meshBasicMaterial color="#F4F8FF" toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* Vik's hand enters from the bottom-right edge; coin in front, clearly visible */}
      <CharCtx.Provider value={{ow: 0.008, tint: '#FFF3DE', rim: 0, rimDir: [1, 0.5], rimColor: '#FFD58A'}}>
        <group position={[cur.x, cur.y, 0.05]}>
          <Part s={{kind: 'capsule', len: 1.2, r: 0.06}} color="#1F9E95" z={0.0} pos={[0.17, -0.14]} rot={2.3} />
          <Part s={{kind: 'ellipse', rx: 0.075, ry: 0.06}} color="#B9774E" z={0.01} pos={[0.1, -0.08]} rot={0.6} />
          <Part s={{kind: 'capsule', len: 0.07, r: 0.022}} color="#B9774E" z={0.012} pos={[0.07, -0.03]} rot={-2.4} />
          <Part s={{kind: 'circle', r: 0.075}} color="#D8C690" z={0.03} />
          <Part s={{kind: 'circle', r: 0.056}} color="#F0E2A8" z={0.032} outline={false} />
          <Part s={{kind: 'circle', r: 0.02}} color="#D8C690" z={0.034} pos={[-0.015, 0.015]} outline={false} />
        </group>
      </CharCtx.Provider>
    </group>
  );
};

/* ---------------- macro: phosphorus inside the iron ---------------- */
const pTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,170,1)');
    grd.addColorStop(0.45, 'rgba(255,190,70,0.95)');
    grd.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    g.font = "800 64px 'Baloo 2', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#1C1838';
    g.strokeText('P', 64, 68);
    g.fillStyle = '#FFFFFF';
    g.fillText('P', 64, 68);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
})();

export const PhosphorusMacro: React.FC = () => {
  const {t} = useScene();
  const grains = useMemo(() => {
    const r = mulberry(41);
    return Array.from({length: 260}, () => ({
      p: [(r() - 0.5) * 7, (r() - 0.5) * 9, -r() * 7] as [number, number, number],
      s: 0.18 + r() * 0.35,
      c: ['#3C3F58', '#46465E', '#34364C', '#4E4C66'][Math.floor(r() * 4)],
      rot: [r() * 3, r() * 3, r() * 3] as [number, number, number],
    }));
  }, []);
  const ps = useMemo(() => {
    const r = mulberry(43);
    return Array.from({length: 34}, () => ({p: [(r() - 0.5) * 5, (r() - 0.5) * 7, -0.5 - r() * 5] as [number, number, number], ph: r() * 6}));
  }, []);
  return (
    <group>
      {grains.map((g, i) => (
        <mesh key={i} position={g.p} rotation={g.rot}>
          <dodecahedronGeometry args={[g.s, 0]} />
          <Toon color={g.c} />
        </mesh>
      ))}
      {ps.map((p, i) => (
        <sprite key={i} position={[p.p[0], p.p[1] + Math.sin(t * 1.5 + p.ph) * 0.06, p.p[2]]} scale={0.55 + 0.06 * Math.sin(t * 4 + p.ph)}>
          <spriteMaterial map={pTexture()} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
};

/* ---------------- macro: wet/dry cycles grow a protective skin ---------------- */
// `story` = seconds of the wet/dry story already elapsed before this shot
// (so the skin keeps growing across consecutive shots). mode 'seal' makes
// raindrops bead up and roll off the finished coat.
export const SKIN_CYCLE = 2.2;
export const SkinMacro: React.FC<{story?: number; mode?: 'cycles' | 'seal'}> = ({story = 0, mode = 'cycles'}) => {
  const {t} = useScene();
  const T = story + t;
  const cyc = Math.floor(T / SKIN_CYCLE);
  const u = (T % SKIN_CYCLE) / SKIN_CYCLE;
  // coat thickness steps up at the end of each dry phase
  const skin = mode === 'seal' ? 1 : Math.min(1, (cyc + Math.min(1, Math.max(0, (u - 0.55) / 0.4))) / 3);
  const coat = 0.006 + skin * 0.03; // stays a thin skin (~5% of frame at most)
  const drops = useMemo(() => {
    const r = mulberry(51);
    return Array.from({length: 7}, () => ({x: (r() - 0.5) * 0.7, z: 0.18 + r() * 0.24, s: 0.04 + r() * 0.035, d: r() * 0.15}));
  }, []);
  const grain = useMemo(() => {
    const r = mulberry(55);
    return Array.from({length: 160}, () => ({x: (r() - 0.5) * 2.6, y: -0.03 - r() * 1.6, s: 0.008 + r() * 0.022}));
  }, []);
  const sun = mode === 'seal' ? 0.3 : u > 0.5 ? Math.sin(((u - 0.5) / 0.5) * Math.PI) : 0;
  return (
    <group>
      {/* cross-section: dark iron block filling the lower frame */}
      <mesh position={[0, -1.5, 0.3]}>
        <boxGeometry args={[3, 3, 0.4]} />
        <meshBasicMaterial color="#302D3C" toneMapped={false} />
      </mesh>
      {grain.map((g, i) => (
        <mesh key={i} position={[g.x, g.y, 0.501]}>
          <circleGeometry args={[g.s, 7]} />
          <meshBasicMaterial color={i % 2 ? '#2A2835' : '#3A3748'} toneMapped={false} />
        </mesh>
      ))}
      {/* glossy blue coat on top, thickening each wet/dry cycle */}
      <mesh position={[0, coat / 2, 0.3]}>
        <boxGeometry args={[3, coat, 0.4]} />
        <meshBasicMaterial color="#2F86D6" toneMapped={false} />
      </mesh>
      <mesh position={[0, coat - 0.003, 0.502]}>
        <planeGeometry args={[3, Math.max(0.002, coat * 0.12)]} />
        <meshBasicMaterial color="#BFE4FF" toneMapped={false} />
      </mesh>
      {/* glossy specular glint sliding along the coat */}
      {[0, 0.5].map((off, i) => {
        const x = -0.6 + (((T * 0.22 + off) % 1) * 1.2);
        return (
          <mesh key={i} position={[x, coat * 0.62, 0.503]} scale={[1, Math.max(0.15, coat / 0.036), 1]}>
            <circleGeometry args={[0.012, 20]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        );
      })}
      {[0, 0.5].map((off, i) => {
        const x = -0.6 + (((T * 0.22 + off) % 1) * 1.2);
        return (
          <mesh key={`s${i}`} position={[x, coat * 0.62, 0.5025]} scale={[6, Math.max(0.12, (coat / 0.036) * 0.6), 1]}>
            <circleGeometry args={[0.012, 20]} />
            <meshBasicMaterial color="#E8F6FF" transparent opacity={0.45} toneMapped={false} />
          </mesh>
        );
      })}
      {/* raindrops: fall, sit, then dry in the sun (or bead and roll off the finished coat) */}
      {drops.map((d, i) => {
        let y: number;
        let sc: number;
        let x = d.x;
        if (mode === 'seal') {
          const k = (T * 0.5 + d.d * 6) % 1;
          y = k < 0.3 ? coat + d.s * 0.7 + (1 - k / 0.3) * 2.2 : coat + d.s * 0.7;
          x = d.x + (k > 0.3 ? (k - 0.3) * 2.4 : 0);
          sc = 1;
        } else {
          const fall = Math.min(1, Math.max(0, (u - d.d) / 0.15));
          y = coat + d.s * 0.7 + (1 - fall) * 2.2;
          sc = u < 0.5 ? 1 : Math.max(0, 1 - (u - 0.5) / 0.4);
        }
        if (sc <= 0.01) return null;
        return (
          <mesh key={i} position={[x, y, d.z]} scale={[sc, sc * 0.75, sc]}>
            <sphereGeometry args={[d.s, 16, 12]} />
            <meshToonMaterial color="#9AD6FF" gradientMap={toonRamp()} />
          </mesh>
        );
      })}
      {/* the sun: glows during each dry phase */}
      <mesh position={[0.55, 1.0, -3]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#FFD27A" transparent opacity={0.15 + sun * 0.85} toneMapped={false} />
      </mesh>
      <directionalLight position={[2, 6, 3]} color="#FFC46B" intensity={sun * 3} />
    </group>
  );
};

/* ---------------- split: modern steel vs the pillar ---------------- */
export const SplitMacro: React.FC = () => {
  const {t} = useScene();
  const flakes = useMemo(() => {
    const r = mulberry(61);
    return Array.from({length: 26}, () => ({x: (r() - 0.5) * 1.2, y: 0.4 + r() * 1.6, ph: r(), s: 0.05 + r() * 0.06}));
  }, []);
  const patches = useMemo(() => {
    const r = mulberry(63);
    return Array.from({length: 22}, () => ({x: (r() - 0.5) * 1.3, y: 0.2 + r() * 1.9, s: 0.06 + r() * 0.16}));
  }, []);
  return (
    <group>
      {/* left: modern steel plate, rusting and flaking */}
      <group position={[-0.6, 0, 0]}>
        <Box size={[0.9, 2.4, 0.12]} pos={[0, 1.2, 0]} color="#A3ABC0" />
        {patches.map((p, i) => (
          <mesh key={i} position={[p.x * 0.6, p.y, 0.065]}>
            <circleGeometry args={[p.s * (0.8 + 0.2 * Math.sin(t + i)), 9]} />
            <meshBasicMaterial color={i % 2 ? '#D2692E' : '#A9481E'} toneMapped={false} />
          </mesh>
        ))}
        {flakes.map((f, i) => {
          const k = ((t * 0.45 + f.ph) % 1);
          return (
            <mesh key={i} position={[f.x * 0.6 + Math.sin(k * 8 + i) * 0.08, f.y - k * 2.2, 0.25 + k * 0.4]} rotation={[k * 6, k * 4 + i, 0]}>
              <planeGeometry args={[f.s, f.s * 0.7]} />
              <meshBasicMaterial color="#C8642D" side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {/* right: the pillar's iron, sealed under its blue skin; drops bead off */}
      <group position={[0.6, 0, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 2.4, 40]} />
          <Toon color="#4A4658" />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.44, 0.44, 2.42, 40]} />
          <meshBasicMaterial color="#5FB6F0" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const k = ((t * 0.5 + i * 0.21) % 1);
          return (
            <mesh key={i} position={[-0.24 + i * 0.12, 2.2 - k * 2.0, 0.45]}>
              <sphereGeometry args={[0.05, 12, 8]} />
              <meshToonMaterial color="#8FD0FF" gradientMap={toonRamp()} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/* ---------------- tap ripple ---------------- */
export const TapRipple: React.FC<{pos: [number, number, number]; times: number[]}> = ({pos, times}) => {
  const {t} = useScene();
  return (
    <group position={pos}>
      {times.map((t0, i) => {
        const k = (t - t0) / 0.9;
        if (k < 0 || k > 1) return null;
        return (
          <mesh key={i} scale={0.1 + k * 0.9}>
            <torusGeometry args={[0.35, 0.012, 6, 40]} />
            <meshBasicMaterial color="#FFE2A0" transparent opacity={(1 - k) * 0.8} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ================= rebuild additions ================= */

/* ---------------- Dada's two iron bars (in the courtyard, in the rain) ---------------- */
// Left  (x -BAR_DX) = modern clean steel: rain hits it and it flakes orange (rust 0..1).
// Right (x +BAR_DX) = pillar-style wrought iron: stays dark; a thin glassy sheen spreads
// up it from the base with a moving highlight (skin 0..1).
export const BAR_DX = 0.4;
export const IronBars: React.FC<{pos: [number, number, number]; skin?: number; rust?: number; drops?: number}> = ({pos, skin = 0, rust = 0, drops = 1}) => {
  const {t} = useScene();
  const H = 1.35;
  const R = 0.065;
  const y0 = 0.55;
  const flakes = useMemo(() => {
    const r = mulberry(91);
    return Array.from({length: 18}, () => ({a: r() * 6.28, y: 0.15 + r() * 1.1, ph: r(), s: 0.02 + r() * 0.03}));
  }, []);
  const beads = useMemo(() => {
    const r = mulberry(93);
    return Array.from({length: 9}, () => ({a: -0.7 + r() * 1.4, ph: r(), s: 0.006 + r() * 0.005}));
  }, []);
  const hits = useMemo(() => {
    const r = mulberry(95);
    return Array.from({length: 6}, () => ({a: -1 + r() * 2, y: 0.1 + r() * 0.8, ph: r()}));
  }, []);
  const cover = Math.min(1, skin * 1.1); // fraction of the bar's height the sheen has reached
  const hlA = t * 1.3; // highlight sweeps around the bar
  return (
    <group position={pos}>
      {/* LEFT: modern steel, rusting */}
      <group position={[-BAR_DX, y0 + H / 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[R, R, H, 32]} />
          <TexPBR color="#8A90A4" metalness={0.8} roughness={0.32} envMapIntensity={0.5} />
        </mesh>
        {rust > 0.01 && (
          <mesh>
            <cylinderGeometry args={[R + 0.003, R + 0.003, H, 32]} />
            <RustSkin amount={rust} />
          </mesh>
        )}
        {/* raindrops landing on it: tiny splashes */}
        {drops > 0 &&
          hits.map((h, i) => {
            const k = (t * 1.6 + h.ph) % 1;
            return (
              <mesh key={i} position={[Math.sin(h.a) * (R + 0.01), H / 2 - h.y, Math.cos(h.a) * (R + 0.01)]} scale={0.3 + k * 1.4}>
                <ringGeometry args={[0.012, 0.016, 12]} />
                <meshBasicMaterial color="#DDEBFF" transparent opacity={(1 - k) * 0.7} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
        {rust > 0.3 &&
          flakes.map((f, i) => {
            const k = (t * 0.45 + f.ph) % 1;
            if (f.ph > rust) return null;
            return (
              <mesh key={i} position={[Math.sin(f.a) * (R + 0.02 + k * 0.18), f.y - H / 2 - k * 1.1, Math.cos(f.a) * (R + 0.02 + k * 0.18)]} rotation={[k * 7, k * 5 + i, 0]}>
                <planeGeometry args={[f.s, f.s * 0.7]} />
                <meshBasicMaterial color={i % 2 ? '#D8702E' : '#A9481E'} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
        <mesh position={[0, H / 2 + 0.02, 0]}>
          <cylinderGeometry args={[R, R, 0.04, 32]} />
          <meshStandardMaterial color={rust > 0.5 ? '#A9481E' : '#9098AC'} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
      {/* RIGHT: pillar-style wrought iron + spreading glassy sheen */}
      <group position={[BAR_DX, y0 + H / 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[R, R, H, 32]} />
          <IronMat repeat={[0.5, 2.2]} sheen={0.45} />
        </mesh>
        {cover > 0.02 && (
          <group position={[0, -H / 2 + (H * cover) / 2, 0]}>
            <mesh>
              <cylinderGeometry args={[R + 0.003, R + 0.003, H * cover, 40, 1, true]} />
              <meshPhysicalMaterial color="#5FB8D8" transparent opacity={0.08} roughness={0.04} clearcoat={1} iridescence={1} iridescenceIOR={1.7} envMapIntensity={0.9} depthWrite={false} />
            </mesh>
            {/* moving highlight: a thin bright streak sliding round the bar */}
            <mesh position={[Math.sin(hlA) * (R + 0.005), 0, Math.cos(hlA) * (R + 0.005)]} rotation={[0, hlA, 0]}>
              <planeGeometry args={[0.004, H * cover * 0.92]} />
              <meshBasicMaterial color={new THREE.Color('#E8FAFF').multiplyScalar(1.2)} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            {/* the growing front edge glints */}
            <mesh position={[0, (H * cover) / 2, 0]}>
              <cylinderGeometry args={[R + 0.005, R + 0.005, 0.008, 40, 1, true]} />
              <meshBasicMaterial color={new THREE.Color('#BFF0FF').multiplyScalar(1.3)} transparent opacity={cover < 0.99 ? 0.6 : 0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            {[0, 1, 2].map((i) => {
              const k = (t * 0.8 + i * 0.37) % 1;
              return (
                <sprite key={i} position={[Math.sin(i * 2.3) * R * 1.1, ((i * 0.31 + t * 0.15) % 1 - 0.5) * H * cover, R * 1.2]} scale={0.07 * Math.sin(k * Math.PI)}>
                  <spriteMaterial map={sparkTex()} color="#DFF6FF" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
                </sprite>
              );
            })}
          </group>
        )}
        {/* raindrops beading and rolling off */}
        {drops > 0 &&
          beads.map((b, i) => {
            const k = (t * 0.5 + b.ph) % 1;
            return (
              <mesh key={i} position={[Math.sin(b.a) * (R + 0.006), H / 2 - k * H, Math.cos(b.a) * (R + 0.006)]}>
                <sphereGeometry args={[b.s, 10, 8]} />
                <meshPhysicalMaterial color="#7A8AA0" roughness={0.1} clearcoat={0.6} envMapIntensity={0.4} />
              </mesh>
            );
          })}
        <mesh position={[0, H / 2 + 0.02, 0]}>
          <cylinderGeometry args={[R, R, 0.04, 32]} />
          <meshStandardMaterial color="#4a4038" metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// Rust that spreads from blotches as `amount` grows (alpha-masked rust texture).
const RustSkin: React.FC<{amount: number}> = ({amount}) => {
  const map = useTex('rust-coarse', 'diff', [0.6, 2]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        lights: false,
        uniforms: {uMap: {value: null}, uAmt: {value: 0}},
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D uMap; uniform float uAmt; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){ vec2 uv = vUv*vec2(0.6,2.0);
            float m = n(vUv*vec2(6.0,18.0))*0.6 + n(vUv*vec2(14.0,40.0))*0.4;
            float a = smoothstep(1.0-uAmt, 1.0-uAmt+0.12, m);
            vec3 c = texture2D(uMap, uv).rgb * vec3(1.35,1.0,0.8);
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  mat.uniforms.uMap.value = map;
  mat.uniforms.uAmt.value = map ? Math.min(1, amount * 1.35) : 0;
  return <primitive object={mat} attach="material" />;
};

let spark: THREE.CanvasTexture | null = null;
export const sparkTex = () => {
  if (spark) return spark;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.2, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(30, 4, 4, 56);
  g.fillRect(4, 30, 56, 4);
  spark = new THREE.CanvasTexture(c);
  return spark;
};

/* ---------------- insert: rain on the pillar's surface (no rust) ---------------- */
// A big curved patch of the pillar's hammered iron, lit by its own soft key and
// a cool rim so it reads clearly; water rivulets run down it, beads catch light.
const SurfaceIron: React.FC = () => {
  const nor = useTex('rust', 'nor', [3, 8]);
  const {map} = hammeredIron();
  const m = useMemo(() => {
    const c = map.clone();
    c.repeat.set(3, 8);
    c.needsUpdate = true;
    return c;
  }, [map]);
  const ns = useMemo(() => new THREE.Vector2(1.6, 1.6), []);
  return <meshStandardMaterial key={nor ? 'n' : 'x'} color="#7a7068" map={m} normalMap={nor} normalScale={ns} metalness={0.55} roughness={0.4} envMapIntensity={0.6} />;
};

export const PillarSurfaceMacro: React.FC = () => {
  const {t} = useScene();
  const R = 1.6;
  const rivs = useMemo(() => {
    const r = mulberry(141);
    return Array.from({length: 14}, () => ({a: (r() - 0.5) * 1.1, ph: r(), v: 0.25 + r() * 0.35, len: 0.5 + r() * 1.2, w: 0.004 + r() * 0.005}));
  }, []);
  const beads = useMemo(() => {
    const r = mulberry(143);
    return Array.from({length: 30}, () => ({a: (r() - 0.5) * 1.1, y: (r() - 0.5) * 3.2, s: 0.012 + r() * 0.022, ph: r()}));
  }, []);
  const on = (a: number, y: number, lift = 0): [number, number, number] => [Math.sin(a) * (R + lift), y, Math.cos(a) * (R + lift) - R];
  return (
    <group>
      <mesh position={[0, 0, -R]}>
        <cylinderGeometry args={[R, R, 5, 96, 1, true, -0.8, 1.6]} />
        <SurfaceIron />
      </mesh>
      {rivs.map((v, i) => {
        const head = 2.3 - ((t * v.v + v.ph) % 1) * 4.6;
        const mid = head + v.len / 2;
        const [x, , z] = on(v.a, 0, 0.004);
        return (
          <mesh key={i} position={[x, mid, z]} rotation={[0, v.a, 0]}>
            <planeGeometry args={[v.w, v.len]} />
            <meshPhysicalMaterial color="#8a9ab4" transparent opacity={0.22} roughness={0.02} clearcoat={1} envMapIntensity={0.9} depthWrite={false} />
          </mesh>
        );
      })}
      {beads.map((b, i) => {
        const y = b.y - ((t * 0.05 + b.ph) % 1) * 0.15;
        return (
          <mesh key={i} position={on(b.a, y, b.s * 0.4)} scale={[1, 1.25, 0.6]}>
            <sphereGeometry args={[b.s, 14, 10]} />
            <meshPhysicalMaterial color="#dbe8f5" roughness={0.02} clearcoat={1} envMapIntensity={1.4} />
          </mesh>
        );
      })}
      {/* grazing key from the side reveals the hammer facets and pits; cool fill */}
      <directionalLight position={[-4, 1.2, 0.6]} color="#FFD6A0" intensity={2.6} />
      <directionalLight position={[3, 2, 2]} color="#8FB4FF" intensity={0.8} />
    </group>
  );
};

/* ---------------- insert: rusty bike chain on its sprocket ---------------- */
// Chain links wrap the top of the sprocket and run off to the right; the
// sprocket turns slowly and the chain creeps with it. Wet, orange rust.
const SPROCKET_R = 0.62;
const PITCH = 0.127;
const TEETH = Math.round((2 * Math.PI * SPROCKET_R) / PITCH);
const chainPath = (s: number): [number, number, number] => {
  // s = distance along the chain from the left side of the sprocket, over the top, then straight right
  // over the top-left of the sprocket, then straight off to the right (towards the rear wheel)
  const a0 = Math.PI * 0.95;
  const arc = (a0 - Math.PI / 2) * SPROCKET_R;
  if (s < arc) {
    const a = a0 - s / SPROCKET_R;
    return [Math.cos(a) * SPROCKET_R, Math.sin(a) * SPROCKET_R, a - Math.PI / 2];
  }
  return [s - arc, SPROCKET_R, 0];
};
const plateShape = (pitch: number, r: number) => {
  const sh = new THREE.Shape();
  const w = r * 0.62; // waist
  sh.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  sh.quadraticCurveTo(pitch / 2, -w, pitch, -r);
  sh.absarc(pitch, 0, r, -Math.PI / 2, Math.PI / 2, false);
  sh.quadraticCurveTo(pitch / 2, w, 0, r);
  const g = new THREE.ExtrudeGeometry(sh, {depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 16});
  g.translate(-pitch / 2, 0, -0.006);
  return g;
};
const sprocketRing = () => {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, SPROCKET_R - 0.02, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, SPROCKET_R - 0.12, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, {depth: 0.03, bevelEnabled: false, curveSegments: 64});
  g.translate(0, 0, -0.015);
  return g;
};
export const ChainMacro: React.FC = () => {
  const {t} = useScene();
  const ringGeo = useMemo(() => sprocketRing(), []);
  const plateO = useMemo(() => plateShape(PITCH, 0.048), []);
  const plateI = useMemo(() => plateShape(PITCH, 0.04), []);
  const spin = t * 0.25;
  const shift = (spin * SPROCKET_R) % (2 * PITCH);
  const links = 30;
  const drips = useMemo(() => {
    const r = mulberry(131);
    return Array.from({length: 4}, () => ({s: 0.3 + r() * 2.2, ph: r()}));
  }, []);
  return (
    <group position={[-0.35, -0.5, 0]} rotation={[0, -0.3, 0.05]}>
      {/* sprocket: toothed ring on five spider arms around a hub */}
      <group rotation={[0, 0, -spin]}>
        <mesh geometry={ringGeo}>
          <TexToon tex="rust-coarse" color="#E8946A" repeat={[1.2, 1.2]} normal={1.4} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * 6.283;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.46, 0.075, 0.03]} />
              <TexToon tex="rust-coarse" color="#D88458" repeat={[0.6, 0.2]} normal={1.2} />
            </mesh>
          );
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
          <TexToon tex="rust" color="#A86A48" />
        </mesh>
        <mesh position={[0, 0, 0.032]}>
          <circleGeometry args={[0.035, 16]} />
          <meshStandardMaterial color="#3a3030" />
        </mesh>
        {Array.from({length: TEETH}).map((_, i) => {
          const a = (i / TEETH) * 6.283;
          return (
            <mesh key={i} position={[Math.cos(a) * (SPROCKET_R - 0.005), Math.sin(a) * (SPROCKET_R - 0.005), 0]} rotation={[0, 0, a - Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.03, 0.06, 4, 1]} />
              <TexToon tex="rust-coarse" color="#E08A5A" />
            </mesh>
          );
        })}
      </group>
      {/* chain: alternating outer/inner plates with pins */}
      {Array.from({length: links}).map((_, i) => {
        const [x, y, rot] = chainPath(i * PITCH + shift);
        const outer = i % 2 === 0;
        return (
          <group key={i} position={[x, y, 0]} rotation={[0, 0, rot]}>
            {[-1, 1].map((sd) => (
              <mesh key={sd} geometry={outer ? plateO : plateI} position={[0, 0, sd * (outer ? 0.042 : 0.028)]}>
                <TexToon tex="rust-coarse" color={outer ? '#F2A06A' : '#C8683A'} repeat={[3, 3]} normal={1.2} />
              </mesh>
            ))}
            {/* roller between the inner plates */}
            <mesh position={[PITCH / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.05, 14]} />
              <TexToon tex="rust" color="#8A4A2E" />
            </mesh>
            <mesh position={[PITCH / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.1, 10]} />
              <TexToon tex="rust" color="#9A5A3A" />
            </mesh>
          </group>
        );
      })}
      {/* wet drips falling off the chain */}
      {drips.map((d, i) => {
        const [x, y] = chainPath(d.s);
        const k = (t * 0.8 + d.ph) % 1;
        return (
          <mesh key={i} position={[x, y - 0.04 - k * 1.2, 0.05]} scale={[1, 1.4, 1]}>
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshPhysicalMaterial color="#F0C0A0" roughness={0.05} clearcoat={1} transparent opacity={1 - k * 0.6} />
          </mesh>
        );
      })}
      {/* soft background: wet courtyard wall */}
      <mesh position={[0.4, 0, -1.6]}>
        <planeGeometry args={[10, 10]} />
        <TexToon tex="sandstone-wall" color="#8A6A80" repeat={[4, 4]} />
      </mesh>
    </group>
  );
};

/* ---------------- insert: hot iron with grey specks ---------------- */
export const SpecksMacro: React.FC = () => {
  const {t} = useScene();
  const specks = useMemo(() => {
    const r = mulberry(111);
    return Array.from({length: 40}, () => ({x: (r() - 0.5) * 2.4, y: (r() - 0.5) * 3, s: 0.03 + r() * 0.05, ph: r() * 6}));
  }, []);
  const glow = 0.7 + 0.3 * Math.sin(t * 2);
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[4, 5]} />
        <TexToon tex="rust" color="#FFA070" emissive="#FF5A10" emissiveIntensity={0.5 * glow} repeat={[1.5, 2]} normal={1.4} />
      </mesh>
      {specks.map((s, i) => (
        <group key={i} position={[s.x, s.y, 0.01]}>
          <mesh>
            <circleGeometry args={[s.s, 10]} />
            <meshBasicMaterial color="#7C7890" toneMapped={false} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0, 0, 0.002]} scale={1 + 0.25 * Math.sin(t * 4 + s.ph)}>
              <ringGeometry args={[s.s * 1.6, s.s * 1.9, 20]} />
              <meshBasicMaterial color={new THREE.Color('#FFE6A0').multiplyScalar(1.5)} transparent opacity={0.8} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      <pointLight position={[0, 0, 1]} color="#FF8A3A" intensity={3} distance={4} />
    </group>
  );
};
