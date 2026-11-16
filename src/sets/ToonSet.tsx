import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C} from '../theme';
import {GROUNDS, GroundPreset, LIGHTS, LightPreset, SKIES, SkyPreset} from './presets';
import {Bicycle, Forge, Gate, IronPillar, NightSky, PhosphorusMacro, Rain, ScratchMacro, SkinMacro, SplitMacro, TapRipple} from './story';
import {Ball, Box, Cone, Cyl, TileFloor, Toon, mulberry} from './toon';

export type SetName = 'courtyard' | 'desert' | 'workshop' | 'plain' | 'forge' | 'street' | 'void';

export type PropSpec = {
  type: 'pot' | 'rock' | 'block' | 'pillar' | 'lamp' | 'crate';
  pos: [number, number, number];
  scale?: number;
  rotY?: number;
  color?: string;
};

export type SetSpec = {
  set: SetName;
  sky?: string;
  ground?: string;
  light?: string;
  props?: PropSpec[];
};

// Story effects / hero props for a shot. Two-number arrays are [start, end]
// values interpolated over the shot.
export type FxSpec = {
  rain?: [number, number];
  night?: boolean; // stars wheel + moon crosses (time-lapse)
  pillar?: {pos: [number, number]; sheen?: number};
  bicycle?: {pos: [number, number, number]; rotY?: number};
  merge?: [number, number]; // forge: lumps merging 0..1
  forgeClose?: boolean;
  spot?: number; // street: gate's orange spot size (0 hides)
  macro?: 'scratch' | 'phosphorus' | 'skin' | 'split';
  skinStory?: number;
  skinMode?: 'cycles' | 'seal';
  skinRust?: boolean;
  ripple?: {pos: [number, number, number]; times: number[]};
};

export const SET_DEFAULTS: Record<SetName, {sky: string; ground: string; light: string}> = {
  courtyard: {sky: 'golden', ground: 'stone', light: 'golden'},
  desert: {sky: 'golden', ground: 'sand', light: 'golden'},
  workshop: {sky: 'interior', ground: 'wood', light: 'interior'},
  plain: {sky: 'dusk', ground: 'grass', light: 'dusk'},
  forge: {sky: 'forge', ground: 'earth', light: 'forge'},
  street: {sky: 'golden', ground: 'stone', light: 'golden'},
  void: {sky: 'macro', ground: 'obsidian', light: 'macro'},
};

export const resolveSet = (s: SetSpec) => {
  const d = SET_DEFAULTS[s.set];
  return {
    sky: SKIES[s.sky ?? d.sky],
    ground: GROUNDS[s.ground ?? d.ground],
    light: LIGHTS[s.light ?? d.light],
  };
};

export const ToonSet: React.FC<
  SetSpec & {fx?: FxSpec; p?: number; dur?: number; resolved?: {sky: SkyPreset; ground: GroundPreset; light: LightPreset}}
> = ({fx = {}, p = 0, dur = 5, resolved, ...spec}) => {
  const {sky, ground, light} = resolved ?? resolveSet(spec);
  const lerp = (r?: [number, number]) => (r ? r[0] + (r[1] - r[0]) * p : 0);
  return (
    <>
      <fog attach="fog" args={[light.fog, light.fogNear, light.fogFar]} />
      <ambientLight color={light.ambient} intensity={light.ambientIntensity} />
      <hemisphereLight args={[light.sky, light.shade, light.hemi]} />
      <directionalLight
        color={light.key}
        intensity={light.keyIntensity}
        position={light.keyDir}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={60}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
      />
      <SkyDome {...sky} />
      {spec.set !== 'void' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[300, 300]} />
          <Toon color={ground.base} />
        </mesh>
      )}
      {spec.set === 'courtyard' && <Courtyard g={ground} />}
      {spec.set === 'forge' && <Forge merge={lerp(fx.merge)} closeup={fx.forgeClose} />}
      {spec.set === 'street' && <Gate spot={fx.spot ?? 1} />}
      {fx.night && <NightSky dur={dur} />}
      {fx.rain && <Rain intensity={lerp(fx.rain)} />}
      {fx.pillar && <IronPillar pos={[fx.pillar.pos[0], 0, fx.pillar.pos[1]]} sheen={fx.pillar.sheen} />}
      {fx.bicycle && <Bicycle pos={fx.bicycle.pos} rotY={fx.bicycle.rotY} />}
      {fx.macro === 'scratch' && <ScratchMacro dur={dur} />}
      {fx.macro === 'phosphorus' && <PhosphorusMacro />}
      {fx.macro === 'skin' && <SkinMacro story={fx.skinStory} mode={fx.skinMode} rust={fx.skinRust} />}
      {fx.macro === 'split' && <SplitMacro />}
      {fx.ripple && <TapRipple pos={fx.ripple.pos} times={fx.ripple.times} />}
      {spec.set === 'desert' && <Desert />}
      {spec.set === 'workshop' && <Workshop g={ground} />}
      {spec.set === 'plain' && <Plain />}
      {spec.props?.map((p, i) => <Prop key={i} {...p} />)}
    </>
  );
};

/* ---------------- sky ---------------- */
const SkyDome: React.FC<{top: string; horizon: string; bottom: string; sun?: string; sunDir?: [number, number, number]}> = ({
  top,
  horizon,
  bottom,
  sun,
  sunDir,
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: {value: new THREE.Color(top)},
          hor: {value: new THREE.Color(horizon)},
          bot: {value: new THREE.Color(bottom)},
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(hor, top, pow(smoothstep(0.0,0.6,h),0.8)) : mix(hor, bot, smoothstep(0.0,0.15,-h));
          gl_FragColor = vec4(c,1.0);
          #include <colorspace_fragment>
          }`,
      }),
    [top, horizon, bottom],
  );
  const sunPos = useMemo(() => (sunDir ? new THREE.Vector3(...sunDir).normalize().multiplyScalar(140) : null), [sunDir]);
  return (
    <>
      <mesh material={mat} renderOrder={-10}>
        <sphereGeometry args={[150, 32, 16]} />
      </mesh>
      {sun && sunPos && (
        <mesh position={sunPos} renderOrder={-9}>
          <sphereGeometry args={[7, 24, 12]} />
          <meshBasicMaterial color={sun} fog={false} toneMapped={false} />
        </mesh>
      )}
    </>
  );
};

/* ---------------- courtyard ---------------- */
const SANDSTONE = '#E8BC8E';
const SANDSTONE_D = '#C99068';

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
  return new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: false, curveSegments: 16});
};

const Courtyard: React.FC<{g: (typeof GROUNDS)[string]}> = ({g}) => {
  const wall = useMemo(() => archWallGeo(18, 4.6, 5, 2.0, 3.4, 0.6), []);
  const side = useMemo(() => archWallGeo(10, 4.2, 3, 1.8, 3.0, 0.5), []);
  const tiles = useMemo(() => [g.tileA, g.tileB, g.base], [g]);
  return (
    <group>
      <TileFloor size={18} tile={1.1} gap={0.06} colors={tiles} origin={[0, -1]} />
      {/* back wall with arches + a warm lit hall behind (no flat voids) */}
      <mesh geometry={wall} position={[0, 0, -7]} castShadow receiveShadow>
        <Toon color={SANDSTONE} />
      </mesh>
      <InnerHall />
      <Box size={[18.6, 0.35, 0.9]} pos={[0, 4.75, -6.7]} color={SANDSTONE_D} />
      <Box size={[18.6, 0.18, 0.7]} pos={[0, 4.45, -6.6]} color={C.accent} />
      {/* side walls */}
      <mesh geometry={side} position={[-8.5, 0, -2]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <Toon color={SANDSTONE} />
      </mesh>
      <mesh geometry={side} position={[8.5, 0, -2.5]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <Toon color={SANDSTONE} />
      </mesh>
      {/* pillars between arches */}
      {[-5.4, -1.8, 1.8, 5.4].map((x) => (
        <group key={x} position={[x, 0, -6.2]}>
          <Cyl r={0.3} h={4.2} pos={[0, 2.1, 0]} color={SANDSTONE} />
          <Box size={[0.85, 0.25, 0.85]} pos={[0, 0.12, 0]} color={SANDSTONE_D} />
          <Box size={[0.85, 0.25, 0.85]} pos={[0, 4.2, 0]} color={SANDSTONE_D} />
        </group>
      ))}
      {/* bunting between pillars */}
      <Bunting from={[-5.4, 3.7, -6.0]} to={[5.4, 3.7, -6.0]} sag={0.6} />
      {/* the well */}
      <group position={[4.2, 0, -3.6]} userData={{prop: 'well'}}>
        <Cyl r={0.95} h={0.8} pos={[0, 0.4, 0]} color="#B87F4D" seg={20} />
        <Cyl r={0.72} h={0.82} pos={[0, 0.42, 0]} color="#2B2B5E" seg={20} />
        <Box size={[0.14, 2.0, 0.14]} pos={[-0.8, 1.2, 0]} color="#7A4A2E" />
        <Box size={[0.14, 2.0, 0.14]} pos={[0.8, 1.2, 0]} color="#7A4A2E" />
        <Cyl r={0.05} h={1.7} pos={[0, 1.8, 0]} rot={[0, 0, Math.PI / 2]} color="#7A4A2E" />
        <Box size={[2.2, 0.12, 1.2]} pos={[0, 2.25, 0]} rot={[0, 0, 0]} color="#A3492E" />
      </group>
      {/* pots + plants */}
      <Plant pos={[-4.2, 0, -4.5]} />
      <Plant pos={[-6.2, 0, -1.2]} scale={1.2} />
      <Plant pos={[6.6, 0, 0.6]} scale={0.9} />
      {/* hanging lamps */}
      <Lamp pos={[-3.6, 3.2, -5.8]} />
      <Lamp pos={[0, 3.0, -5.8]} />
      <Lamp pos={[3.6, 3.2, -5.8]} />
    </group>
  );
};

// Warm interior seen through the arches: lit back wall, ceiling, glowing lamps.
const InnerHall: React.FC = () => (
  <group>
    <Box size={[18.4, 4.8, 0.3]} pos={[0, 2.4, -10.2]} color="#E9A866" emissive="#FF9A45" />
    <Box size={[18.4, 0.3, 3.4]} pos={[0, 4.65, -8.6]} color="#B9763F" />
    <Box size={[0.3, 4.8, 3.4]} pos={[-9.1, 2.4, -8.6]} color="#D99050" />
    <Box size={[0.3, 4.8, 3.4]} pos={[9.1, 2.4, -8.6]} color="#D99050" />
    {/* lattice windows glowing on the back wall */}
    {[-7.2, -3.6, 0, 3.6, 7.2].map((x) => (
      <Box key={x} size={[0.9, 1.3, 0.05]} pos={[x, 2.3, -10.03]} color="#FFE2A8" emissive="#FFC46B" />
    ))}
    {[-7.2, -3.6, 0, 3.6, 7.2].map((x) => (
      <group key={`l${x}`}>
        <pointLight position={[x, 2.8, -8.7]} color="#FFB35A" intensity={9} distance={6} decay={2} />
        <Lamp pos={[x, 3.4, -8.4]} />
      </group>
    ))}
  </group>
);

const Bunting: React.FC<{from: [number, number, number]; to: [number, number, number]; sag: number}> = ({from, to, sag}) => {
  const flags = 16;
  const cols = [C.accent, '#E5533D', '#2BA39A', '#F6E9CC', '#7A4FB0'];
  return (
    <group>
      {Array.from({length: flags}).map((_, i) => {
        const t = (i + 0.5) / flags;
        const x = from[0] + (to[0] - from[0]) * t;
        const y = from[1] + (to[1] - from[1]) * t - sag * 4 * t * (1 - t);
        const z = from[2] + (to[2] - from[2]) * t;
        return (
          <mesh key={i} position={[x, y - 0.2, z]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshToonMaterial color={cols[i % cols.length]} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

const Plant: React.FC<{pos: [number, number, number]; scale?: number}> = ({pos, scale = 1}) => (
  <group position={pos} scale={scale} userData={{prop: 'plant'}}>
    <Cyl r={0.32} r2={0.42} h={0.6} pos={[0, 0.3, 0]} color="#C0583A" />
    <Box size={[0.9, 0.08, 0.9]} pos={[0, 0.62, 0]} rot={[0, 0.78, 0]} color="#A84A30" />
    <Ball r={0.45} pos={[0, 1.05, 0]} color="#4E8F4A" />
    <Ball r={0.32} pos={[0.32, 1.3, 0.1]} color="#5FA357" />
    <Ball r={0.3} pos={[-0.3, 1.25, -0.1]} color="#467F44" />
  </group>
);

const Lamp: React.FC<{pos: [number, number, number]}> = ({pos}) => (
  <group position={pos}>
    <Cyl r={0.01} h={1} pos={[0, 0.6, 0]} color="#3A2A2A" />
    <Ball r={0.18} scale={[1, 1.3, 1]} color={C.gold} emissive="#FFB547" />
  </group>
);

/* ---------------- desert ---------------- */
const Desert: React.FC = () => (
  <group>
    <Ball r={8} pos={[-14, -5.5, -22]} scale={[1.6, 1, 1]} color="#E8B470" />
    <Ball r={10} pos={[12, -7.5, -26]} scale={[1.8, 1, 1]} color="#DCA25E" />
    <Ball r={6} pos={[2, -4.6, -16]} scale={[2, 1, 1]} color="#EBBB78" />
    <Cone r={9} h={9} seg={4} pos={[-4, 4.5, -38]} rot={[0, Math.PI / 4, 0]} color="#E2A85E" />
    <Cone r={5.5} h={5.5} seg={4} pos={[9, 2.75, -34]} rot={[0, Math.PI / 4, 0]} color="#D99A55" />
    <Palm pos={[-9, 0, -15]} scale={1.3} />
    <Palm pos={[6.5, 0, -11]} scale={1.2} />
    <Rocks seed={3} spread={12} count={10} color="#B98A5A" />
  </group>
);

const Palm: React.FC<{pos: [number, number, number]; scale?: number}> = ({pos, scale = 1}) => (
  <group position={pos} scale={scale} userData={{prop: 'palm'}}>
    <Cyl r={0.14} r2={0.1} h={4} pos={[0.2, 2, 0]} rot={[0, 0, -0.1]} color="#8A5A36" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Cone key={i} r={0.35} h={2.2} seg={3} pos={[0.4, 4, 0]} rot={[0, (i * Math.PI) / 3, 1.9]} color={i % 2 ? '#4E8F4A' : '#5FA357'} />
    ))}
  </group>
);

const Rocks: React.FC<{seed: number; spread: number; count: number; color: string}> = ({seed, spread, count, color}) => {
  const r = useMemo(() => {
    const rnd = mulberry(seed);
    return Array.from({length: count}).map(() => ({
      x: (rnd() - 0.5) * spread * 2,
      z: -2 - rnd() * spread,
      s: 0.2 + rnd() * 0.5,
      ry: rnd() * 3,
    }));
  }, [seed, spread, count]);
  return (
    <>
      {r.map((k, i) =>
        Math.abs(k.x) < 2.5 && k.z > -5 ? null : (
          <mesh key={i} position={[k.x, k.s * 0.4, k.z]} rotation={[0.3, k.ry, 0.2]} castShadow receiveShadow userData={{prop: 'rock'}}>
            <dodecahedronGeometry args={[k.s, 0]} />
            <Toon color={color} />
          </mesh>
        ),
      )}
    </>
  );
};

/* ---------------- workshop ---------------- */
const Workshop: React.FC<{g: (typeof GROUNDS)[string]}> = ({g}) => {
  const tiles = useMemo(() => [g.tileA, g.tileB, g.base], [g]);
  return (
    <group>
      <TileFloor size={16} tile={0.8} gap={0.04} colors={tiles} plank />
      <Box size={[16, 6, 0.3]} pos={[0, 3, -5]} color="#B5734A" />
      <Box size={[0.3, 6, 12]} pos={[-7, 3, 0]} color="#A86A44" />
      {/* window + light shaft */}
      <Box size={[2.2, 1.6, 0.32]} pos={[3.2, 3.4, -4.95]} color="#FFE1A0" emissive="#FFC46B" />
      <Box size={[0.12, 1.6, 0.36]} pos={[3.2, 3.4, -4.9]} color="#6A4030" />
      <mesh position={[2.4, 1.8, -2.6]} rotation={[0.55, 0, 0.3]}>
        <boxGeometry args={[2, 0.02, 5]} />
        <meshBasicMaterial color="#FFD48A" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* bench + tools */}
      <Box size={[3.2, 0.18, 1.2]} pos={[-2.5, 1.0, -3.6]} color="#8A5432" />
      {[-3.9, -1.1].map((x) => (
        <Box key={x} size={[0.15, 1.0, 1.0]} pos={[x, 0.5, -3.6]} color="#6A4030" />
      ))}
      <Cyl r={0.08} h={0.9} pos={[-3, 1.2, -3.4]} rot={[0, 0, Math.PI / 2]} color="#C0C4D8" />
      <Box size={[0.4, 0.25, 0.3]} pos={[-2.1, 1.22, -3.5]} color="#7A7FA8" />
      {/* shelf with pots */}
      <Box size={[3, 0.12, 0.6]} pos={[-3.5, 3.0, -4.6]} color="#6A4030" />
      {[-4.5, -3.6, -2.7].map((x, i) => (
        <Cyl key={x} r={0.22} r2={0.15} h={0.45} pos={[x, 3.28, -4.6]} color={['#C0583A', C.accent, '#2BA39A'][i]} />
      ))}
      <Lamp pos={[0.5, 4.2, -2]} />
    </group>
  );
};

/* ---------------- plain ---------------- */
const Plain: React.FC = () => (
  <group>
    <Ball r={14} pos={[-16, -10, -40]} scale={[2, 1, 1]} color="#5C4C8A" />
    <Ball r={12} pos={[18, -8.5, -36]} scale={[2, 1, 1]} color="#4A3E7A" />
    <Rocks seed={11} spread={12} count={14} color="#6E6098" />
  </group>
);

/* ---------------- reusable props ---------------- */
const Prop: React.FC<PropSpec> = ({type, pos, scale = 1, rotY = 0, color}) => {
  const g = (child: React.ReactNode) => (
    <group position={pos} scale={scale} rotation={[0, rotY, 0]} userData={{prop: type}}>
      {child}
    </group>
  );
  switch (type) {
    case 'pot':
      return g(<Cyl r={0.3} r2={0.22} h={0.6} pos={[0, 0.3, 0]} color={color ?? '#C0583A'} />);
    case 'rock':
      return g(
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <Toon color={color ?? '#8A7A9A'} />
        </mesh>,
      );
    case 'block':
      return g(<Box size={[1.2, 0.8, 0.8]} pos={[0, 0.4, 0]} color={color ?? SANDSTONE} />);
    case 'pillar':
      return g(<Cyl r={0.3} h={3} pos={[0, 1.5, 0]} color={color ?? SANDSTONE} />);
    case 'crate':
      return g(<Box size={[0.8, 0.8, 0.8]} pos={[0, 0.4, 0]} color={color ?? '#9A6440'} />);
    case 'lamp':
      return g(<Lamp pos={[0, 0, 0]} />);
  }
};
