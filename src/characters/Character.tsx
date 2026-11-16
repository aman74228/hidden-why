import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useScene} from '../scene/ctx';
import {C} from '../theme';
import {CAST, CastName, CastSpec, Outfit} from './cast';
import {CharCtx, Ink, Part, arcPts} from './Part';
import {EyeStyle, MouthStyle, PoseName, PoseState, poseAt} from './poses';
import {V2} from './shapes';

const D = Math.PI / 180;
const OUTLINE_PX = 4;

export type CharacterProps = {
  who: CastName;
  pose?: PoseName;
  pos?: [number, number]; // world x, z (feet on ground)
  facing?: 1 | -1; // 1 = points/looks towards screen-right
  scale?: number;
  outfit?: Partial<Outfit>;
  delay?: number; // seconds offset for animation phase
};

export const Character: React.FC<CharacterProps> = ({
  who,
  pose = 'idle',
  pos = [0, 0],
  facing = 1,
  scale = 1,
  outfit,
  delay = 0,
}) => {
  const scene = useScene();
  const spec = CAST[who];
  const fit: Outfit = {...spec.outfit, ...outfit};
  const t = Math.max(0, scene.t - delay);
  const seed = who === 'chotu' ? 0 : who === 'vik' ? 1 : 2;
  const p = poseAt(pose, t, seed);

  // Billboard towards the camera (yaw only) and keep outlines ≈4px on screen.
  const centre = new THREE.Vector3(pos[0], (spec.height * scale) / 2, pos[1]);
  const dist = scene.camPos.distanceTo(centre);
  const worldPerPx = (2 * dist * Math.tan((scene.fov * D) / 2)) / scene.heightPx;
  const ow = (OUTLINE_PX * worldPerPx) / scale;
  const yaw = Math.atan2(scene.camPos.x - pos[0], scene.camPos.z - pos[1]);
  const ctx = useMemo(() => ({ow, tint: scene.charTint}), [ow, scene.charTint]);

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
            <group position={[0, spec.hipY + bodyLift, 0]} rotation={[0, 0, -p.bodyRot * D]}>
              <group position={[0, -spec.hipY, 0]}>
                <Body spec={spec} fit={fit} />
                <Arms spec={spec} fit={fit} p={p} />
                <Head spec={spec} fit={fit} p={p} t={t} seed={seed} />
              </group>
            </group>
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
          pos={[side * spec.legGap, spec.hipY]}
        />
        <Part
          s={{kind: 'ellipse', rx: spec.legR * 1.9, ry: spec.legR * 1.05}}
          color={fit.shoes}
          z={0.01}
          pos={[side * spec.legGap + spec.legR * 0.7, spec.legR * 0.9]}
        />
      </group>
    ))}
  </>
);

/* ---------------- body ---------------- */
const Body: React.FC<{spec: CastSpec; fit: Outfit}> = ({spec, fit}) => {
  const b = spec.body;
  const top = b.y + b.h / 2;
  return (
    <group>
      {/* neck */}
      <Part s={{kind: 'rrect', w: spec.headR * 0.45, h: 0.16, r: 0.04}} color={spec.skin} z={0.08} pos={[0, spec.neckY]} />
      <Part s={{kind: 'bean', w: b.w, h: b.h, flare: b.flare}} color={fit.body} z={0.1} pos={[0, b.y]} />
      {spec.name === 'chotu' && (
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
      {spec.name === 'dada' && (
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
          />
          <Ink pts={[[0.18, -0.4], [0.32, -0.24], [0.3, -0.21], [0.16, -0.37]]} z={0.16} pos={[0, top - 0.06]} color={C.accent} />
          <Ink pts={[[-0.18, -0.4], [-0.16, -0.37], [-0.3, -0.21], [-0.32, -0.24]]} z={0.16} pos={[0, top - 0.06]} color={C.accent} />
        </>
      )}
    </group>
  );
};

/* ---------------- arms ---------------- */
const Arms: React.FC<{spec: CastSpec; fit: Outfit; p: PoseState}> = ({spec, fit, p}) => {
  // crossed forearms must reach past the far shoulder so the cross reads
  const lower = p.armsCrossed ? Math.max(spec.lower, spec.shoulderX * 2.3) : spec.lower;
  const arm = (side: 1 | -1, [a1, a2]: [number, number], z: number, finger: boolean) => (
    <group position={[side * spec.shoulderX, spec.shoulderY, 0]} rotation={[0, 0, side * a1 * D]}>
      <Part s={{kind: 'capsule', len: spec.upper, r: spec.armR * 1.15}} color={fit.sleeve} z={z} />
      <group position={[0, -spec.upper, 0]} rotation={[0, 0, side * a2 * D]}>
        <Part s={{kind: 'capsule', len: lower, r: spec.armR}} color={fit.sleeve} z={z + 0.002} />
        <Part s={{kind: 'circle', r: spec.armR * 1.7}} color={spec.skin} z={z + 0.004} pos={[0, -lower]} />
        {finger && (
          <Part s={{kind: 'capsule', len: spec.armR * 1.8, r: spec.armR * 0.55}} color={spec.skin} z={z + 0.003} pos={[0, -lower - spec.armR * 0.8]} />
        )}
      </group>
    </group>
  );
  return (
    <>
      {arm(-1, p.armB, p.armsCrossed ? 0.31 : 0.3, false)}
      {arm(1, p.armA, p.armsCrossed ? 0.33 : 0.31, p.finger)}
    </>
  );
};

/* ---------------- head + face ---------------- */
const Head: React.FC<{spec: CastSpec; fit: Outfit; p: PoseState; t: number; seed: number}> = ({spec, p, t, seed}) => {
  const R = spec.headR;
  const blink = (t + seed * 1.13) % 3.4 < 0.12;
  let eyes: EyeStyle = p.eyes ?? (spec.eyes === 'calm' ? 'calm' : spec.eyes);
  if (blink && eyes !== 'happy') eyes = 'closed';
  const mouth: MouthStyle = p.mouth ?? spec.mouth;
  const fy = p.faceDY;
  const hy = spec.neckY + spec.headDY + p.headDY;

  return (
    <group position={[0, hy, 0.4]} rotation={[0, 0, p.headRot * D]}>
      {/* ears */}
      {[-1, 1].map((s) => (
        <Part key={s} s={{kind: 'ellipse', rx: R * 0.16, ry: R * 0.22}} color={spec.skin} z={-0.02} pos={[s * R * spec.headSX * 0.98, -R * 0.05 + fy * 0.4]} />
      ))}
      <Part s={{kind: 'ellipse', rx: R * spec.headSX, ry: R * spec.headSY}} color={spec.skin} z={0} />
      <HeadDecor spec={spec} p={p} fy={fy} />
      <group position={[0, fy, 0]}>
        <Eyes spec={spec} style={eyes} brow={p.brow} />
        <Mouth spec={spec} style={mouth} open={p.mouthOpen} />
      </group>
    </group>
  );
};

const Eyes: React.FC<{spec: CastSpec; style: EyeStyle; brow: number}> = ({spec, style, brow}) => {
  const r = spec.eyeR;
  const R = spec.headR;
  const one = (side: number) => {
    const x = side * spec.eyeDX;
    const y = spec.eyeY;
    const pos: V2 = [x, y];
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
    if (spec.name === 'vik') {
      // one brow cocked high, the other flat — the smug raise
      return (
        <>
          <Ink pts={rect(R * 0.32, R * 0.06)} z={0.08} pos={[spec.eyeDX, spec.eyeY + R * 0.22 + brow * 0.02]} rot={-0.08} />
          <Ink pts={arcPts(R * 0.2, R * 0.065, 0.5, Math.PI - 0.6)} z={0.08} pos={[-spec.eyeDX, spec.eyeY + R * 0.18 + brow * 0.03]} />
        </>
      );
    }
    if (spec.name === 'dada') {
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
      {spec.name === 'chotu' &&
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
  if (spec.name === 'chotu') {
    return (
      <>
        {/* hair cap */}
        <Part
          s={{kind: 'poly', pts: hairCap(R, 0.12, 0.5)}}
          color={spec.hair}
          z={0.02}
        />
        {/* cowlick */}
        <Part
          s={{kind: 'poly', pts: [[-0.03, 0], [0.03, 0], [0.07, 0.08], [0.1, 0.17], [0.06, 0.14], [0.02, 0.08]]}}
          color={spec.hair}
          z={0.015}
          pos={[0.02, R * 0.92]}
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
        />
      </>
    );
  }
  // dada: bald crown, white side tufts, beard, moustache, round spectacles
  return (
    <>
      {[-1, 1].map((s) => (
        <Part key={s} s={{kind: 'ellipse', rx: R * 0.22, ry: R * 0.3}} color={spec.hair} z={0.02} pos={[s * R * 0.88, R * 0.1]} />
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
        />
        {/* moustache */}
        {[-1, 1].map((s) => (
          <Part key={s} s={{kind: 'ellipse', rx: R * 0.24, ry: R * 0.09}} color={spec.hair} z={0.12} pos={[s * R * 0.18, -R * 0.2]} rot={s * -0.25} />
        ))}
        {/* spectacles */}
        {[-1, 1].map((s) => (
          <Ink key={s} pts={arcPts(R * 0.21, R * 0.045, 0, Math.PI * 2, 28)} z={0.11} pos={[s * spec.eyeDX, spec.eyeY]} color="#7A5226" />
        ))}
        <Ink pts={rect(R * 0.12, R * 0.04)} z={0.11} pos={[0, spec.eyeY + R * 0.02]} color="#7A5226" />
      </group>
    </>
  );
};

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
