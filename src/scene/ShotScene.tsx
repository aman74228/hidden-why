import {DepthOfField, EffectComposer} from '@react-three/postprocessing';
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
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
  const raw = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const frame = Math.min(raw, frames - 1);
  const t = frame / fps;
  const p = frames > 1 ? frame / (frames - 1) : 0;
  const cast = shot.cast ?? [];
  const camMove = useMemo(() => effectiveCamera(shot), [shot]);
  const move = useMemo(() => resolveMove(camMove, cast), [camMove, cast]);
  const {pos, look} = move(p);
  const fov = camMove.fov ?? DEFAULT_FOV;
  // lighting / sky, optionally blending to another preset (e.g. sun breaks through)
  const base = resolveSet(shot);
  const mixK = shot.mixAt ? Math.min(1, Math.max(0, (t - shot.mixAt[0]) / Math.max(0.01, shot.mixAt[1] - shot.mixAt[0]))) : 0;
  const mk = mixK * mixK * (3 - 2 * mixK);
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
  const cardMaxBottom = useMemo(() => {
    if (!shot.titleCard) return 1;
    const d = shot.duration;
    const a = (shot.titleCard.at ?? 0) / d;
    const b = ((shot.titleCard.at ?? 0) + (shot.titleCard.duration ?? 2)) / d;
    return faceFreeBottom(rawShot, a, b);
  }, [shot]);

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
          <CameraRig pos={pos} look={look} fov={fov} />
          <ToonSet set={shot.set} props={shot.props} fx={shot.fx} p={p} dur={shot.duration} resolved={resolved} />
          {cast.map((c, i) => (
            <Character key={`${c.who}-${i}`} {...c} />
          ))}
          <FrameCheck samples={samples} fov={fov} shotId={shot.id} />
          <EffectComposer multisampling={2}>
            <DepthOfField worldFocusDistance={focus.dist} worldFocusRange={focus.range} bokehScale={2.2} />
          </EffectComposer>
        </SceneCtx.Provider>
      </ThreeCanvas>
      {shot.grade === 'flashback' ? (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255,200,120,0.10) 40%, rgba(60,28,20,0.55) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      ) : null}
      {shot.labels?.map((l, i) => (
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
      {shot.titleCard ? <TitleCard {...shot.titleCard} frame={frame} maxBottom={cardMaxBottom} /> : null}
    </AbsoluteFill>
  );
};
