import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {CAST, CastName, CastSpec, Outfit} from './cast';
import {CharCtx, G, Ink, Part, arcPts} from './Part';
import {EyeStyle, MouthStyle, PoseName, PoseState, poseAt} from './poses';
import {V2} from './shapes';
import {breath} from '../sets/breath';

const D = Math.PI / 180;
const OUTLINE_PX = 4;
// Inner rim-glow strength per character (× 40% max opacity; Gus strongest)
const RIM: Record<CastName, number> = {milo: 0.65, vik: 0.65, gus: 1};

export type CharacterProps = {
  who: CastName;
  pose?: PoseName;
  pos?: [number, number]; // world x, z (feet on ground)
  facing?: 1 | -1; // 1 = points/looks towards screen-right
  scale?: number;
  outfit?: Partial<Outfit>;
  delay?: number; // seconds offset for animation phase
  poses?: {at: number; pose: PoseName}[]; // pose timeline (seconds into the shot); overrides `pose` from `at`
  enter?: {from: [number, number]; at?: number; dur?: number}; // walk in from `from` to `pos`
  appearAt?: number; // hidden before this time (seconds into the shot)
  holding?: Holdable; // tool in the leading hand
  props?: CharProp[]; // costume pieces / carried props for this story
};

// umbrella/leaf/stick go in the off hand; satchel/apron/headwrap are worn
export type CharProp = 'umbrella' | 'leaf' | 'stick' | 'satchel' | 'apron' | 'headwrap' | 'goggles';
export type Holdable = 'hammer' | 'coin' | 'sabre' | 'trophy' | 'parchment' | 'balloon' | 'brownie';

// Natural blinks: random 1.5–4 s gaps, each 4 frames, deterministic per character.
const blinkTimes = (seed: number) => {
  let a = seed * 9301 + 49297;
  const rnd = () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
  const out: number[] = [];
  let t = 0.4 + rnd() * 1.2;
  while (t < 120) {
    out.push(t);
    t += 1.5 + rnd() * 2.5;
  }
  return out;
};
const BLINKS = [blinkTimes(1), blinkTimes(2), blinkTimes(3)];
const isBlink = (t: number, seed: number) => BLINKS[seed].some((b) => t >= b && t < b + 4 / 30);

export const Character: React.FC<CharacterProps> = ({
  who,
  pose = 'idle',
  pos = [0, 0],
  facing = 1,
  scale = 1,
  outfit,
  delay = 0,
  poses,
  enter,
  appearAt,
  holding,
  props = [],
}) => {
  const scene = useScene();
  const spec = CAST[who];
  const fit: Outfit = {...spec.outfit, ...outfit};
  const t = Math.max(0, scene.t - delay);
  const seed = who === 'milo' ? 0 : who === 'vik' ? 1 : 2;
  // pose timeline
  let curPose = pose;
  let poseT = t;
  for (const k of poses ?? []) {
    if (t >= k.at) {
      curPose = k.pose;
      poseT = t - k.at;
    }
  }
  const p = poseAt(curPose, poseT, seed);
  // off-hand props fix the off arm: umbrella/leaf held up, stick held down
  if (props.includes('umbrella') || props.includes('leaf')) p.armB = [22, -202];
  if (props.includes('stick')) p.armB = [14, -10];
  // visible breathing: chest swells, shoulders rise a touch
  const breath = Math.sin((t + seed * 0.9) * (who === 'gus' ? 1.6 : 2.1)) * 0.5 + 0.5;
  // entrance walk
  let walk = 0;
  if (enter) {
    const a0 = enter.at ?? 0;
    const d = enter.dur ?? 1.2;
    const u = Math.min(1, Math.max(0, (t - a0) / d));
    const e = 1 - Math.pow(1 - u, 2);
    pos = [enter.from[0] + (pos[0] - enter.from[0]) * e, enter.from[1] + (pos[1] - enter.from[1]) * e];
    if (u > 0 && u < 1) walk = Math.abs(Math.sin(t * 11)) * 0.025;
  }
  p.bodyDY += walk;

  // Billboard towards the camera (yaw only) and keep outlines ≈4px on screen.
  const centre = new THREE.Vector3(pos[0], (spec.height * scale) / 2, pos[1]);
  const dist = scene.camPos.distanceTo(centre);
  const worldPerPx = (2 * dist * Math.tan((scene.fov * D) / 2)) / scene.heightPx;
  const ow = (OUTLINE_PX * worldPerPx) / scale;
  const yaw = Math.atan2(scene.camPos.x - pos[0], scene.camPos.z - pos[1]);
  const rimDir: V2 = [scene.rimDir[0] * facing, scene.rimDir[1]];
  const ctx = useMemo(
    () => ({ow, tint: scene.charTint, rim: RIM[who], rimDir, rimColor: scene.rimColor}),
    [ow, scene.charTint, who, rimDir[0], rimDir[1], scene.rimColor],
  );

  if (appearAt !== undefined && t < appearAt) return null;
  const bodyLift = p.bodyDY * spec.height;

  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} scale={[scale, scale * 0.45, 1]}>
        <circleGeometry args={[spec.body.w * 0.75 + 0.1, 32]} />
        <meshBasicMaterial color={C.indigoDeep} transparent opacity={0.38} toneMapped={false} depthWrite={false} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <group scale={[facing * scale, scale, scale]}>
          <CharCtx.Provider value={ctx}>
            <Legs spec={spec} fit={fit} />
            <G pos={[0, spec.hipY + bodyLift, 0]} rot={-p.bodyRot * D}>
              <G pos={[0, -spec.hipY, 0]}>
                <group scale={[1 + breath * 0.012, 1 + breath * 0.022, 1]} position={[0, -spec.hipY * breath * 0.022, 0]}>
                  <Body spec={spec} fit={fit} props={props} />
                </group>
                <group position={[0, breath * spec.height * 0.008, 0]}>
                  <Arms spec={spec} fit={fit} p={p} holding={holding} props={props} />
                  <Head spec={spec} fit={fit} p={p} t={t} seed={seed} props={props} />
                </group>
              </G>
            </G>
          </CharCtx.Provider>
        </group>
      </group>
    </group>
  );
};

/* ---------------- legs ---------------- */
const Legs: React.FC<{spec: CastSpec; fit: Outfit}> = ({spec, fit}) => (
  <>
    {[-1, 1].map((side) => (
      <group key={side}>
        <Part
          s={{kind: 'capsule', len: spec.legLen - spec.legR, r: spec.legR}}
          color={fit.legs}
          z={0.0}
          sil
          pos={[side * spec.legGap, spec.hipY]}
        />
        <Part
          s={{kind: 'ellipse', rx: spec.legR * 1.9, ry: spec.legR * 1.05}}
          color={fit.shoes}
          z={0.01}
          sil
          pos={[side * spec.legGap + spec.legR * 0.7, spec.legR * 0.9]}
        />
      </group>
    ))}
  </>
);

/* ---------------- body ---------------- */
const Body: React.FC<{spec: CastSpec; fit: Outfit; props: CharProp[]}> = ({spec, fit, props}) => {
  const b = spec.body;
  const top = b.y + b.h / 2;
  return (
    <group>
      {props.includes('satchel') && (
        <>
          {/* strap across the chest + bag at the hip */}
          <Part s={{kind: 'poly', pts: [[-b.w * 0.42, b.h * 0.42], [-b.w * 0.3, b.h * 0.48], [b.w * 0.45, -b.h * 0.28], [b.w * 0.33, -b.h * 0.34]]}} color="#6A3E8A" z={0.2} pos={[0, b.y]} />
          <Part s={{kind: 'rrect', w: b.w * 0.42, h: b.h * 0.34, r: 0.03}} color="#2BA39A" z={0.21} pos={[b.w * 0.42, b.y - b.h * 0.3]} sil />
          <Part s={{kind: 'rrect', w: b.w * 0.42, h: b.h * 0.12, r: 0.02}} color="#1F7F78" z={0.22} pos={[b.w * 0.42, b.y - b.h * 0.18]} />
        </>
      )}
      {props.includes('apron') && (
        <>
          <Part s={{kind: 'poly', pts: [[-b.w * 0.34, b.h * 0.3], [b.w * 0.34, b.h * 0.3], [b.w * 0.42, -b.h * 0.5], [-b.w * 0.42, -b.h * 0.5]]}} color="#7A4A2E" z={0.2} pos={[0, b.y]} sil />
          <Part s={{kind: 'rrect', w: b.w * 0.3, h: b.h * 0.14, r: 0.02}} color="#5E3822" z={0.21} pos={[0, b.y - b.h * 0.12]} />
        </>
      )}
      {/* neck */}
      <Part s={{kind: 'rrect', w: spec.headR * 0.45, h: 0.16, r: 0.04}} color={spec.skin} z={0.08} pos={[0, spec.neckY]} sil />
      <Part s={{kind: 'bean', w: b.w, h: b.h, flare: b.flare}} color={fit.body} z={0.1} pos={[0, b.y]} sil />
      {spec.name === 'milo' && (
        <>
          {/* kurta placket + buttons + hem trim */}
          <Part s={{kind: 'rrect', w: 0.06, h: 0.22, r: 0.02}} color={fit.trim} z={0.15} pos={[0, top - 0.13]} />
          {[0, 1].map((i) => (
            <Part key={i} s={{kind: 'circle', r: 0.014}} color={C.cream} z={0.16} pos={[0, top - 0.08 - i * 0.08]} outline={false} />
          ))}
          <Part s={{kind: 'rrect', w: b.w * 0.92, h: 0.035, r: 0.015}} color={fit.trim} z={0.15} pos={[0, b.y - b.h / 2 + 0.05]} outline={false} />
        </>
      )}
      {spec.name === 'vik' && (
        <>
          {/* shirt V + lapels + buttons */}
          <Part s={{kind: 'poly', pts: [[-0.1, 0], [0.1, 0], [0, -0.3]]}} color={C.cream} z={0.14} pos={[0, top - 0.01]} />
          <Part s={{kind: 'poly', pts: [[-0.13, 0], [-0.04, -0.02], [0, -0.33], [-0.1, -0.2]]}} color={fit.trim} z={0.15} pos={[0, top - 0.01]} />
          <Part s={{kind: 'poly', pts: [[0.04, -0.02], [0.13, 0], [0.1, -0.2], [0, -0.33]]}} color={fit.trim} z={0.15} pos={[0, top - 0.01]} />
          {[0, 1].map((i) => (
            <Part key={i} s={{kind: 'circle', r: 0.015}} color={fit.trim} z={0.16} pos={[0, top - 0.45 - i * 0.13]} outline={false} />
          ))}
        </>
      )}
      {spec.name === 'gus' && (
        <>
          {/* cream shawl draped over shoulders, saffron border */}
          <Part
            s={{
              kind: 'poly',
              pts: [
                [-0.4, 0.0],
                [-0.2, 0.08],
                [0.2, 0.08],
                [0.4, 0.0],
                [0.42, -0.22],
                [0.18, -0.46],
                [0.0, -0.18],
                [-0.18, -0.46],
                [-0.42, -0.22],
              ],
            }}
            color={fit.trim}
            z={0.15}
            pos={[0, top - 0.06]}
            sil
          />
          <Ink pts={[[0.18, -0.4], [0.32, -0.24], [0.3, -0.21], [0.16, -0.37]]} z={0.16} pos={[0, top - 0.06]} color={C.accent} />
          <Ink pts={[[-0.18, -0.4], [-0.16, -0.37], [-0.3, -0.21], [-0.32, -0.24]]} z={0.16} pos={[0, top - 0.06]} color={C.accent} />
        </>
      )}
    </group>
  );
};

/* ---------------- arms ---------------- */
type P2 = [number, number];
// capsule from a to b (capsules are modelled hanging down -y from their origin)
const seg = (a: P2, b: P2) => {
  const v: P2 = [b[0] - a[0], b[1] - a[1]];
  return {len: Math.hypot(v[0], v[1]), rot: Math.atan2(v[0], -v[1])};
};

// Milo's balloon (Short #3): string out of the fist, balloon swells with the cabin (breath())
const Balloon: React.FC<{at: number}> = ({at}) => {
  const {t} = useScene();
  const k = breath(t);
  const r = 0.12 * (0.8 + 0.45 * k);
  return (
    <>
      <Part s={{kind: 'rrect', w: 0.008, h: 0.32, r: 0.004}} color="#F6F0E0" z={0.001} pos={[0, at - 0.16]} outline={false} />
      <Part s={{kind: 'circle', r}} color="#E5533D" z={0.004} pos={[0, at - 0.32 - r]} />
      <Part s={{kind: 'circle', r: r * 0.28}} color="#FF9A8A" z={0.005} pos={[-r * 0.35, at - 0.32 - r * 1.35]} outline={false} />
    </>
  );
};

const Tool: React.FC<{kind: Holdable; spec: CastSpec; at: number}> = ({kind, spec, at}) => {
  const r = spec.armR;
  if (kind === 'sabre') {
    // grip in the fist, a short crossguard, then a curved watered-steel blade continuing the forearm
    const L = 0.62, w0 = 0.032;
    const c = (u: number): V2 => [0.11 * u * u, at - 0.05 - u * L];
    const edge: V2[] = [], back: V2[] = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const [x, y] = c(u);
      const w = w0 * (1 - Math.pow(u, 3) * 0.85);
      edge.push([x + w * 0.55, y]);
      back.push([x - w * 0.45, y]);
    }
    const wave = (k: number): V2[] => {
      const a: V2[] = [], b: V2[] = [];
      for (let i = 1; i <= 12; i++) {
        const u = 0.06 + (i / 12) * 0.8;
        const [x, y] = c(u);
        const off = Math.sin(u * 22 + k * 2.1) * 0.008 + (k - 1) * 0.009;
        a.push([x + off, y]);
        b.push([x + off + 0.0035, y]);
      }
      return [...a, ...b.reverse()];
    };
    return (
      <>
        <Part s={{kind: 'capsule', len: 0.12, r: r * 0.55}} color="#4A2E22" z={0.001} pos={[0, at + 0.05]} />
        <Part s={{kind: 'rrect', w: 0.14, h: 0.024, r: 0.01}} color="#9A9EB0" z={0.003} pos={[0, at - 0.05]} />
        <Part s={{kind: 'poly', pts: [...edge, ...back.reverse()]}} color="#B4BAC8" z={0.002} />
        {[0, 1, 2].map((k) => (
          <Ink key={k} pts={wave(k)} z={0.0025} color={k === 1 ? '#E4E8F0' : '#6C7286'} />
        ))}
      </>
    );
  }
  if (kind === 'trophy')
    return (
      <>
        <Part s={{kind: 'rrect', w: 0.13, h: 0.05, r: 0.01}} color="#2A2838" z={0.002} pos={[0, at - 0.02]} />
        <Part s={{kind: 'rrect', w: 0.03, h: 0.07, r: 0.01}} color="#E8B030" z={0.003} pos={[0, at - 0.075]} />
        <Part s={{kind: 'poly', pts: [[-0.08, at - 0.1], [0.08, at - 0.1], [0.05, at - 0.22], [-0.05, at - 0.22]]}} color="#F2C043" z={0.004} />
      </>
    );
  if (kind === 'parchment')
    return (
      <>
        <Part s={{kind: 'rrect', w: 0.22, h: 0.28, r: 0.015}} color="#EBD9A8" z={0.002} pos={[0.04, at - 0.12]} />
        {[0, 1, 2, 3].map((i) => (
          <Ink key={i} pts={[[-0.05, 0], [0.11 - (i % 2) * 0.04, 0], [0.11 - (i % 2) * 0.04, 0.01], [-0.05, 0.01]]} z={0.003} pos={[0.02, at - 0.05 - i * 0.045]} color="#7A5A3A" />
        ))}
        <Part s={{kind: 'circle', r: 0.025}} color="#C0583A" z={0.003} pos={[0.1, at - 0.23]} outline={false} />
      </>
    );
  if (kind === 'balloon') return <Balloon at={at} />;
  if (kind === 'brownie')
    return (
      <>
        <Part s={{kind: 'rrect', w: 0.13, h: 0.11, r: 0.012}} color="#5A3424" z={0.003} pos={[0.02, at - 0.05]} />
        <Part s={{kind: 'rrect', w: 0.12, h: 0.025, r: 0.008}} color="#7A4A32" z={0.004} pos={[0.02, at - 0.005]} outline={false} />
      </>
    );
  if (kind === 'coin')
    return <Part s={{kind: 'circle', r: r * 1.2}} color="#D9D2C0" z={0.006} pos={[r * 0.9, at - r * 0.6]} />;
  // hammer: handle continues the forearm, head across it
  return (
    <>
      <Part s={{kind: 'capsule', len: spec.lower * 0.9, r: r * 0.5}} color="#8A5A36" z={0.001} pos={[0, at + r]} />
      <Part s={{kind: 'rrect', w: r * 5.2, h: r * 2.6, r: r * 0.5}} color="#6E7290" z={0.002} pos={[0, at - spec.lower * 0.75]} />
    </>
  );
};

// Umbrella / banana-leaf canopy held straight up from the off hand (the
// forearm points straight up, so the local -y axis is world-up).
const Canopy: React.FC<{kind: 'umbrella' | 'leaf'; spec: CastSpec}> = ({kind, spec}) => {
  const pole = spec.height * 0.45;
  const R = spec.height * (kind === 'leaf' ? 0.34 : 0.36);
  const dome: V2[] = [];
  const n = 7;
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * (i / 24);
    dome.push([Math.cos(a) * R, Math.sin(a) * R * 0.55]);
  }
  for (let i = n; i >= 0; i--) {
    const x0 = -R + (2 * R * i) / n;
    dome.push([x0, 0]);
    if (i > 0) dome.push([x0 - R / n, R * 0.07]);
  }
  return (
    <group position={[0, -spec.lower, 0]} rotation={[0, 0, Math.PI + 0.32]}>
      <Part s={{kind: 'capsule', len: pole, r: spec.armR * 0.35}} color={kind === 'leaf' ? '#3F7A40' : '#3A3550'} z={-0.06} rot={Math.PI} pos={[0, -spec.armR]} />
      {kind === 'umbrella' ? (
        <group position={[0, pole, 0]}>
          <Part s={{kind: 'poly', pts: dome}} color="#2A2E5E" z={0.5} sil />
          {[-0.5, 0, 0.5].map((x) => (
            <Ink key={x} pts={[[x * R * 0.9, 0.01], [x * R * 0.35, R * 0.5], [x * R * 0.35 + 0.012, R * 0.5], [x * R * 0.9 + 0.012, 0.01]]} z={0.51} />
          ))}
          <Part s={{kind: 'circle', r: spec.armR * 0.8}} color={C.accent} z={0.52} pos={[0, R * 0.56]} />
        </group>
      ) : (
        <group position={[0, pole, 0]}>
          <Part s={{kind: 'ellipse', rx: R, ry: R * 0.32}} color="#4E9F4A" z={0.5} pos={[0, R * 0.12]} rot={0.12} sil />
          <Ink pts={[[-R * 0.95, R * 0.02], [R * 0.95, R * 0.24], [R * 0.95, R * 0.26], [-R * 0.95, R * 0.04]]} z={0.51} color="#2E6A30" />
        </group>
      )}
    </group>
  );
};

const Arms: React.FC<{spec: CastSpec; fit: Outfit; p: PoseState; holding?: Holdable; props: CharProp[]}> = ({spec, fit, p, holding, props}) => {
  const umbrella = props.includes('umbrella') ? 'umbrella' : props.includes('leaf') ? 'leaf' : null;
  if (p.armsCrossed && !umbrella) return <CrossedArms spec={spec} fit={fit} />;
  const arm = (side: 1 | -1, [a1, a2]: [number, number], z: number, finger: boolean) => (
    <G pos={[side * spec.shoulderX, spec.shoulderY, 0]} rot={side * a1 * D}>
      <Part s={{kind: 'capsule', len: spec.upper, r: spec.armR * 1.15}} color={fit.sleeve} z={z} sil />
      <G pos={[0, -spec.upper, 0]} rot={side * a2 * D}>
        <Part s={{kind: 'capsule', len: spec.lower, r: spec.armR}} color={fit.sleeve} z={z + 0.002} sil />
        <Part s={{kind: 'circle', r: spec.armR * 1.7}} color={spec.skin} z={z + 0.004} pos={[0, -spec.lower]} sil />
        {finger && (
          <Part s={{kind: 'capsule', len: spec.armR * 1.8, r: spec.armR * 0.55}} color={spec.skin} z={z + 0.003} pos={[0, -spec.lower - spec.armR * 0.8]} sil />
        )}
        {side === 1 && holding ? (
          <group position={[0, 0, z + 0.004]}>
            <Tool kind={holding} spec={spec} at={-spec.lower} />
          </group>
        ) : null}
        {side === -1 && umbrella ? <Canopy kind={umbrella} spec={spec} /> : null}
        {side === -1 && props.includes('stick') ? (
          <Part s={{kind: 'capsule', len: spec.hipY + spec.legLen * 0.2, r: spec.armR * 0.7}} color="#8A5A36" z={-0.05} pos={[0, -spec.lower]} />
        ) : null}
      </G>
    </G>
  );
  return (
    <>
      {arm(-1, p.armB, 0.3, false)}
      {arm(1, p.armA, 0.31, p.finger)}
    </>
  );
};

// Folded arms: upper arms hang (foreshortened) at the sides of the torso,
// forearms lie across the front of the chest, each hand gripping the
// opposite bicep. Nothing crosses through the body silhouette.
const CrossedArms: React.FC<{spec: CastSpec; fit: Outfit}> = ({spec, fit}) => {
  const r = spec.armR;
  const ex = Math.max(spec.shoulderX + r * 0.6, spec.body.w * 0.42);
  const sh = (side: number): P2 => [side * spec.shoulderX, spec.shoulderY];
  const elA: P2 = [ex, spec.shoulderY - spec.upper * 0.55];
  const elB: P2 = [-ex, elA[1] - r * 1.7];
  const handA: P2 = [-ex * 0.86, elA[1] + r * 0.5];
  const handB: P2 = [ex * 0.86, elB[1] + r * 0.4];
  const upper = (from: P2, to: P2, z: number) => {
    const g = seg(from, to);
    return <Part s={{kind: 'capsule', len: g.len, r: r * 1.3}} color={fit.sleeve} z={z} pos={from} rot={g.rot} sil />;
  };
  const fore = (from: P2, to: P2, z: number) => {
    const g = seg(from, to);
    return <Part s={{kind: 'capsule', len: g.len, r: r * 1.15}} color={fit.sleeve} z={z} pos={from} rot={g.rot} sil />;
  };
  return (
    <>
      {upper(sh(-1), elB, 0.3)}
      {upper(sh(1), elA, 0.3)}
      {fore(elB, handB, 0.32)}
      {/* hand B tucks under A's bicep */}
      <Part s={{kind: 'circle', r: r * 1.6}} color={spec.skin} z={0.295} pos={handB} />
      {fore(elA, handA, 0.34)}
      <Part s={{kind: 'circle', r: r * 1.6}} color={spec.skin} z={0.345} pos={handA} />
    </>
  );
};

/* ---------------- head + face ---------------- */
const Head: React.FC<{spec: CastSpec; fit: Outfit; p: PoseState; t: number; seed: number; props: CharProp[]}> = ({spec, p, t, seed, props}) => {
  const R = spec.headR;
  const blink = isBlink(t, seed);
  let eyes: EyeStyle = p.eyes ?? (spec.eyes === 'calm' ? 'calm' : spec.eyes);
  if (blink && eyes !== 'happy') eyes = 'closed';
  const mouth: MouthStyle = p.mouth ?? spec.mouth;
  const fy = p.faceDY;
  const hy = spec.neckY + spec.headDY + p.headDY;

  return (
    <G pos={[0, hy, 0.4]} rot={p.headRot * D}>
      {/* ears */}
      {[-1, 1].map((s) => (
        <Part key={s} s={{kind: 'ellipse', rx: R * 0.16, ry: R * 0.22}} color={spec.skin} z={-0.02} pos={[s * R * spec.headSX * 0.98, -R * 0.05 + fy * 0.4]} sil />
      ))}
      <Part s={{kind: 'ellipse', rx: R * spec.headSX, ry: R * spec.headSY}} color={spec.skin} z={0} sil />
      <HeadDecor spec={spec} p={p} fy={fy} />
      {props.includes('goggles') && (
        <>
          <Part s={{kind: 'rrect', w: R * 2.05, h: R * 0.14, r: R * 0.06}} color="#1F3A4A" z={0.12} pos={[0, R * 0.58]} sil />
          {[-1, 1].map((sd) => (
            <group key={sd}>
              <Part s={{kind: 'circle', r: R * 0.24}} color="#2E5A6A" z={0.13} pos={[sd * R * 0.3, R * 0.6]} sil />
              <Part s={{kind: 'circle', r: R * 0.15}} color="#9FE0E8" z={0.14} pos={[sd * R * 0.3, R * 0.6]} outline={false} />
              <Part s={{kind: 'circle', r: R * 0.05}} color="#FFFFFF" z={0.145} pos={[sd * R * 0.3 + R * 0.05, R * 0.66]} outline={false} />
            </group>
          ))}
        </>
      )}
      {props.includes('headwrap') && (
        <>
          <Part s={{kind: 'rrect', w: R * 2.05, h: R * 0.32, r: R * 0.12}} color="#C8462E" z={0.13} pos={[0, R * 0.55]} sil />
          <Part s={{kind: 'ellipse', rx: R * 0.16, ry: R * 0.22}} color="#C8462E" z={0.135} pos={[R * 0.95, R * 0.4]} rot={-0.5} sil />
        </>
      )}
      {p.sweat && (
        // nervous sweat drop at the back temple
        <group position={[-R * spec.headSX * 0.82, R * 0.42, 0.12]}>
          <Part s={{kind: 'ellipse', rx: R * 0.09, ry: R * 0.14}} color="#9FD8F0" z={0} sil />
          <Part s={{kind: 'circle', r: R * 0.03}} color="#FFFFFF" z={0.01} pos={[R * 0.02, R * 0.03]} outline={false} />
        </group>
      )}
      <group position={[0, fy, 0]}>
        <Eyes spec={spec} style={eyes} brow={p.brow} browIn={p.browIn ?? 0} gaze={p.gaze} />
        <Mouth spec={spec} style={mouth} open={p.mouthOpen} />
      </group>
    </G>
  );
};

const Eyes: React.FC<{spec: CastSpec; style: EyeStyle; brow: number; browIn?: number; gaze?: [number, number]}> = ({spec, style, brow, browIn = 0, gaze}) => {
  const r = spec.eyeR;
  const R = spec.headR;
  const one = (side: number) => {
    const x = side * spec.eyeDX;
    const y = spec.eyeY;
    const pos: V2 = gaze ? [x + gaze[0] * r, y + gaze[1] * r] : [x, y];
    switch (style) {
      case 'closed':
        return <Ink pts={rect(r * 2.2, r * 0.45)} z={0.05} pos={pos} />;
      case 'happy':
        return <Ink pts={arcPts(r * 1.1, r * 0.55, 0.15, Math.PI - 0.15)} z={0.05} pos={[x, y - r * 0.5]} />;
      case 'wide':
        return (
          <>
            <Part s={{kind: 'circle', r: r * 1.3}} color={C.ink} z={0.05} pos={pos} outline={false} />
            <Part s={{kind: 'circle', r: r * 0.42}} color="#ffffff" z={0.06} pos={[x + r * 0.4, y + r * 0.45]} outline={false} />
          </>
        );
      case 'smug':
        return (
          <>
            <Part s={{kind: 'circle', r}} color={C.ink} z={0.05} pos={[x, y - r * 0.25]} outline={false} />
            {/* heavy lid covers the top half */}
            <Part s={{kind: 'halfdisc', r: r * 1.45, up: true}} color={spec.skin} z={0.06} pos={[x, y - r * 0.15]} outline={false} />
            <Ink pts={rect(r * 3, r * 0.42)} z={0.07} pos={[x, y - r * 0.15]} />
          </>
        );
      case 'calm':
      case 'dot':
      default:
        return <Part s={{kind: 'circle', r}} color={C.ink} z={0.05} pos={pos} outline={false} />;
    }
  };

  // Brows
  const brows = (() => {
    if (browIn > 0) {
      // worried / defeated: both brows tilt, inner ends up (sad-angle), same for every rig
      return [-1, 1].map((s) => (
        <Ink key={s} pts={rect(R * 0.3, R * 0.065)} z={0.08} pos={[s * spec.eyeDX, spec.eyeY + R * 0.24 + brow * 0.03 + browIn * R * 0.03]} rot={-s * 0.38 * browIn} />
      ));
    }
    if (spec.name === 'vik') {
      // one brow cocked high, the other flat — the smug raise
      return (
        <>
          <Ink pts={rect(R * 0.32, R * 0.06)} z={0.08} pos={[spec.eyeDX, spec.eyeY + R * 0.22 + brow * 0.02]} rot={-0.08} />
          <Ink pts={arcPts(R * 0.2, R * 0.065, 0.5, Math.PI - 0.6)} z={0.08} pos={[-spec.eyeDX, spec.eyeY + R * 0.18 + brow * 0.03]} />
        </>
      );
    }
    if (spec.name === 'gus') {
      return [-1, 1].map((s) => (
        <Part key={s} s={{kind: 'ellipse', rx: R * 0.17, ry: R * 0.07}} color={spec.hair} z={0.09} pos={[s * spec.eyeDX, spec.eyeY + R * 0.3 + brow * 0.02]} rot={s * 0.15} />
      ));
    }
    return [-1, 1].map((s) => (
      <Ink key={s} pts={arcPts(R * 0.14, R * 0.05, 0.4, Math.PI - 0.4)} z={0.08} pos={[s * spec.eyeDX, spec.eyeY + R * 0.22 + brow * 0.04]} />
    ));
  })();

  return (
    <>
      {one(-1)}
      {one(1)}
      {brows}
      {spec.name === 'milo' &&
        [-1, 1].map((s) => (
          <Part key={s} s={{kind: 'ellipse', rx: R * 0.13, ry: R * 0.08}} color="#E9806A" z={0.03} pos={[s * R * 0.55, -R * 0.2]} outline={false} opacity={0.7} />
        ))}
    </>
  );
};

const Mouth: React.FC<{spec: CastSpec; style: MouthStyle; open: number}> = ({spec, style, open}) => {
  const w = spec.mouthW;
  const y = spec.mouthY;
  const z = 0.1;
  switch (style) {
    case 'smirk':
      return <Ink pts={arcPts(w, w * 0.32, Math.PI * 1.25, Math.PI * 1.85)} z={z} pos={[w * 0.35, y + w * 0.75]} rot={0.28} />;
    case 'smile':
      return <Ink pts={arcPts(w, w * 0.3, Math.PI * 1.2, Math.PI * 1.8)} z={z} pos={[0, y + w * 0.8]} />;
    case 'flat':
      return <Ink pts={rect(w * 1.3, w * 0.3)} z={z} pos={[0, y]} />;
    case 'frown':
      // corners turned down
      return <Ink pts={arcPts(w * 0.8, w * 0.3, 0.5, Math.PI - 0.5)} z={z} pos={[0, y - w * 0.75]} />;
    case 'wobble': {
      // tight nervous smile: a thin zig-zag line, corners up a touch
      const pts: [number, number][] = [];
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const u = i / n - 0.5;
        pts.push([u * w * 2.1, (i % 2 ? -1 : 1) * w * 0.1 + u * u * w * 0.9]);
      }
      const top = pts.map(([a, b]) => [a, b + w * 0.13] as [number, number]);
      return <Ink pts={[...pts, ...top.reverse()]} z={z} pos={[0, y]} />;
    }
    case 'open':
      if (open < 0.12) return <Ink pts={arcPts(w, w * 0.3, Math.PI * 1.2, Math.PI * 1.8)} z={z} pos={[0, y + w * 0.8]} />;
      return (
        <>
          <Part s={{kind: 'ellipse', rx: w * 0.75, ry: w * (0.2 + 0.55 * open)}} color={C.ink} z={z} pos={[0, y]} outline={false} />
          <Part s={{kind: 'ellipse', rx: w * 0.4, ry: w * 0.18 * open}} color="#E06A6A" z={z + 0.005} pos={[0, y - w * 0.3 * open]} outline={false} />
        </>
      );
    case 'O':
      return <Part s={{kind: 'ellipse', rx: w * 0.5, ry: w * 0.7}} color={C.ink} z={z} pos={[0, y - w * 0.1]} outline={false} />;
    case 'laugh':
    case 'grin':
      return (
        <>
          <Part s={{kind: 'halfdisc', r: w * 1.05}} color={C.ink} z={z} pos={[0, y + w * 0.35]} scale={[1, 0.6 + 0.5 * open]} outline={false} />
          <Part s={{kind: 'ellipse', rx: w * 0.5, ry: w * 0.2}} color="#E06A6A" z={z + 0.005} pos={[0, y + w * 0.35 - w * (0.45 + 0.35 * open)]} outline={false} />
        </>
      );
  }
};

/* ---- character-specific head decor ---- */
const HeadDecor: React.FC<{spec: CastSpec; p: PoseState; fy: number}> = ({spec, fy}) => {
  const R = spec.headR;
  if (spec.name === 'milo') {
    return (
      <>
        {/* hair cap */}
        <Part
          s={{kind: 'poly', pts: hairCap(R, 0.12, 0.5)}}
          color={spec.hair}
          z={0.02}
          sil
        />
        {/* cowlick */}
        <Part
          s={{kind: 'poly', pts: [[-0.03, 0], [0.03, 0], [0.07, 0.08], [0.1, 0.17], [0.06, 0.14], [0.02, 0.08]]}}
          color={spec.hair}
          z={0.015}
          pos={[0.02, R * 0.92]}
          sil
        />
      </>
    );
  }
  if (spec.name === 'vik') {
    return (
      <>
        {/* swept quiff, leaning to the facing side */}
        <Part
          s={{
            kind: 'poly',
            pts: [
              [-R * 0.95, R * 0.25],
              [-R * 0.85, R * 0.75],
              [-R * 0.35, R * 1.12],
              [R * 0.4, R * 1.25],
              [R * 1.05, R * 1.05],
              [R * 0.75, R * 0.85],
              [R * 0.85, R * 0.45],
              [R * 0.2, R * 0.62],
              [-R * 0.5, R * 0.55],
            ],
          }}
          color={spec.hair}
          z={0.02}
          sil
        />
      </>
    );
  }
  // gus: bald crown, white side tufts, beard, moustache, round spectacles
  return (
    <>
      {[-1, 1].map((s) => (
        <Part key={s} s={{kind: 'ellipse', rx: R * 0.22, ry: R * 0.3}} color={spec.hair} z={0.02} pos={[s * R * 0.88, R * 0.1]} sil />
      ))}
      <group position={[0, fy * 0.6, 0]}>
        <Part
          s={{
            kind: 'poly',
            pts: [
              [-R * 0.92, R * 0.0],
              [-R * 0.55, -R * 0.28],
              [R * 0.55, -R * 0.28],
              [R * 0.92, R * 0.0],
              [R * 0.85, -R * 0.55],
              [R * 0.45, -R * 1.15],
              [0, -R * 1.42],
              [-R * 0.45, -R * 1.15],
              [-R * 0.85, -R * 0.55],
            ],
          }}
          color={spec.hair}
          z={0.04}
          sil
        />
        {/* moustache */}
        {[-1, 1].map((s) => (
          <Part key={s} s={{kind: 'ellipse', rx: R * 0.24, ry: R * 0.09}} color={spec.hair} z={0.12} pos={[s * R * 0.18, -R * 0.2]} rot={s * -0.25} />
        ))}
        {/* spectacles */}
        {[-1, 1].map((s) => (
          <Ink key={s} pts={arcPts(R * 0.215, R * 0.08, 0, Math.PI * 2, 28)} z={0.11} pos={[s * spec.eyeDX, spec.eyeY]} color={SPECS} />
        ))}
        <Ink pts={rect(R * 0.14, R * 0.065)} z={0.11} pos={[0, spec.eyeY + R * 0.02]} color={SPECS} />
      </group>
    </>
  );
};

const SPECS = '#E2B66E'; // light gold frames

const rect = (w: number, h: number): V2[] => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];

// Hair cap: top arc of the head down to a fringe line.
const hairCap = (R: number, fringe: number, side: number): V2[] => {
  const pts: V2[] = [];
  const a0 = -0.15;
  const a1 = Math.PI + 0.15;
  for (let i = 0; i <= 24; i++) {
    const a = a0 + ((a1 - a0) * i) / 24;
    pts.push([Math.cos(a) * R * 1.03, Math.sin(a) * R * 1.03]);
  }
  // fringe: wavy line back across the forehead
  pts.push([-R * 0.8, R * fringe]);
  pts.push([-R * 0.45, R * (fringe + 0.22)]);
  pts.push([-R * 0.15, R * (fringe + 0.08)]);
  pts.push([R * 0.2, R * (fringe + 0.25)]);
  pts.push([R * side, R * (fringe + 0.1)]);
  pts.push([R * 0.85, R * fringe]);
  return pts;
};
