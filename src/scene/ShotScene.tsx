import {Bloom, DepthOfField, EffectComposer, Vignette} from '@react-three/postprocessing';
import {Grain} from '../overlays/Grain';
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, getInputProps} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../camera/CameraRig';
import {DEFAULT_FOV, resolveMove} from '../camera/moves';
import {CAST} from '../characters/cast';
import {Character} from '../characters/Character';
import {TitleCard} from '../overlays/TitleCard';
import {GROUNDS, LIGHTS, SKIES, mixLight, mixSky} from '../sets/presets';
import {ToonSet, resolveSet} from '../sets/ToonSet';
import {C, FONT} from '../theme';
import {SceneCtx} from './ctx';
import {FrameCheck} from './FrameCheck';
import {effectiveCamera, faceFreeBottom, resolveShot} from './framing';
import type {Shot} from './types';

// One shot = one toon set + cast + camera move (+ optional title card).
// `frames` is the shot's own length; extra frames (payoff hold) freeze on the
// final frame.
export const ShotScene: React.FC<{shot: Shot; frames: number}> = ({shot: rawShot, frames}) => {
  const shot = useMemo(() => resolveShot(rawShot), [rawShot]);
  // QA hand-count pass (render with --props='{"qaHands":true}'): cast only, hands/arms in ID colours on black
  const qaHands = Boolean((getInputProps() as {qaHands?: boolean}).qaHands);
  const raw = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const frame = Math.min(raw, frames - 1);
  const t = frame / fps;
  const p = frames > 1 ? frame / (frames - 1) : 0;
  const cast = shot.cast ?? [];
  const camMove = useMemo(() => effectiveCamera(shot), [shot]);
  const move = useMemo(() => resolveMove(camMove, cast), [camMove, cast]);
  const {pos: pos0, look: look0} = move(p);
  // hand-held / bumpy-ride shake (deterministic): `shake` = amplitude in metres
  const sh = shot.shake ?? 0;
  const pos = sh ? pos0.clone().add(new THREE.Vector3(Math.sin(t * 17.3) * 0.6 + Math.sin(t * 7.1) * 0.4, Math.abs(Math.sin(t * 7.3)) * 1.2 + Math.sin(t * 23.0) * 0.3, Math.sin(t * 11.9) * 0.4).multiplyScalar(sh)) : pos0;
  const look = sh ? look0.clone().add(new THREE.Vector3(Math.sin(t * 9.7) * 0.8, Math.sin(t * 13.3) * 0.8 + Math.abs(Math.sin(t * 7.3)), 0).multiplyScalar(sh)) : look0;
  const fov = camMove.fov ?? DEFAULT_FOV;
  // lighting / sky, optionally blending to another preset (e.g. sun breaks through)
  const base = resolveSet(shot);
  const mixK = shot.mixAt ? Math.min(1, Math.max(0, (t - shot.mixAt[0]) / Math.max(0.01, shot.mixAt[1] - shot.mixAt[0]))) : 0;
  // wet/dry cycles: 0 = rain (base preset), 1 = sun (lightTo preset)
  const cyc = shot.fx?.cycles;
  const mk = cyc ? Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * cyc * p), 1.5) : mixK * mixK * (3 - 2 * mixK);
  const fxNow = useMemo(() => (cyc ? {...shot.fx, rainNow: Math.max(0, 1 - mk * 1.6)} : shot.fx), [shot.fx, cyc, mk]);
  const light = shot.lightTo ? mixLight(base.light, LIGHTS[shot.lightTo], mk) : base.light;
  const sky = shot.skyTo ? mixSky(base.sky, SKIES[shot.skyTo], mk) : base.sky;
  const resolved = {sky, ground: base.ground ?? GROUNDS.stone, light};
  const samples = useMemo(() => Array.from({length: 9}, (_, i) => move(i / 8)), [move]);

  // rim light comes from the key light's side, in screen space
  const rimDir = useMemo<[number, number]>(() => {
    const k = new THREE.Vector3(...light.keyDir).normalize();
    const fwd = look.clone().sub(pos).normalize();
    const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const up = right.clone().cross(fwd).normalize();
    const v = new THREE.Vector2(k.dot(right), k.dot(up) * 0.6 + 0.25);
    if (v.length() < 1e-3) v.set(0, 1);
    v.normalize();
    return [v.x, v.y];
  }, [light.keyDir, pos.x, pos.z, look.x, look.z]);

  // depth of field: focus on the cast
  const focus = useMemo(() => {
    if (!cast.length) return {dist: pos.distanceTo(look), range: 3};
    const ds = cast.map((c) => {
      const h = CAST[c.who].height * (c.scale ?? 1);
      return pos.distanceTo(new THREE.Vector3(c.pos?.[0] ?? 0, h * 0.6, c.pos?.[1] ?? 0));
    });
    const mid = (Math.min(...ds) + Math.max(...ds)) / 2;
    return {dist: mid, range: Math.max(1.6, Math.max(...ds) - Math.min(...ds) + 1.4)};
  }, [cast, pos.x, pos.y, pos.z]);

  const ctx = useMemo(
    () => ({t, frame, camPos: pos, fov, heightPx: height, charTint: light.charTint, rimDir, rimColor: light.rim}),
    [t, frame, pos.x, pos.y, pos.z, fov, height, light.charTint, rimDir, light.rim],
  );

  // title card: top-anchored, shrinks if it would reach a face
  const cards = useMemo(() => shot.titleCards ?? (shot.titleCard ? [shot.titleCard] : []), [shot]);
  const cardMaxBottoms = useMemo(
    () =>
      cards.map((c) => {
        const d = shot.duration;
        return faceFreeBottom(rawShot, (c.at ?? 0) / d, ((c.at ?? 0) + (c.duration ?? 2)) / d);
      }),
    [cards, shot],
  );

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        flat
        frameloop="demand"
        dpr={1}
        gl={{antialias: true, preserveDrawingBuffer: true}}
        camera={{fov, near: 0.1, far: 400, position: [pos.x, pos.y, pos.z]}}
        onCreated={({gl}) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <SceneCtx.Provider value={ctx}>
          <CameraRig pos={pos} look={look} fov={fov} roll={shot.roll ? shot.roll[0] + (shot.roll[1] - shot.roll[0]) * p : 0} />
          {qaHands ? <color attach="background" args={['#000000']} /> : <ToonSet set={shot.set} props={shot.props} fx={fxNow} p={p} dur={shot.duration} resolved={resolved} />}
          {cast.map((c, i) => (
            <Character key={`${c.who}-${i}`} {...c} qaId={i} />
          ))}
          <FrameCheck samples={samples} fov={fov} shotId={shot.id} />
          {!qaHands && (
          <EffectComposer multisampling={2}>
            <DepthOfField worldFocusDistance={Array.isArray(shot.focusDist) ? shot.focusDist[0] + (shot.focusDist[1] - shot.focusDist[0]) * (p * p * (3 - 2 * p)) : shot.focusDist ?? focus.dist} worldFocusRange={shot.focusDist ? 1.2 : focus.range} bokehScale={shot.dof ?? 2.2} />
            <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.85} mipmapBlur radius={0.7} />
            <Vignette offset={0.32} darkness={0.5} />
          </EffectComposer>
          )}
        </SceneCtx.Provider>
      </ThreeCanvas>
      {shot.grade === 'flashback' && !qaHands ? (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255,200,120,0.10) 40%, rgba(60,28,20,0.55) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      ) : null}
      {!qaHands && shot.labels?.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${l.x * 100}%`,
            top: `${l.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            background: C.indigo,
            border: `6px solid ${C.accent}`,
            borderRadius: 22,
            padding: '10px 24px 6px',
            color: C.white,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 54,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            boxShadow: `0 8px 0 ${C.ink}`,
          }}
        >
          {l.text}
        </div>
      ))}
      {!qaHands && <Grain frame={raw} />}
      {!qaHands &&
        cards.map((c, i) => <TitleCard key={i} {...c} frame={frame} maxBottom={cardMaxBottoms[i]} />)}
    </AbsoluteFill>
  );
};
