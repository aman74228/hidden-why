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
import {ToonSet, resolveSet} from '../sets/ToonSet';
import {SceneCtx} from './ctx';
import {FrameCheck} from './FrameCheck';
import {effectiveCamera, faceFreeBottom} from './framing';
import type {Shot} from './types';

// One shot = one toon set + cast + camera move (+ optional title card).
// `frames` is the shot's own length; extra frames (payoff hold) freeze on the
// final frame.
export const ShotScene: React.FC<{shot: Shot; frames: number}> = ({shot, frames}) => {
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
  const {light} = resolveSet(shot);
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
    return faceFreeBottom(shot, a, b);
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
          <ToonSet set={shot.set} sky={shot.sky} ground={shot.ground} light={shot.light} props={shot.props} />
          {cast.map((c, i) => (
            <Character key={`${c.who}-${i}`} {...c} />
          ))}
          <FrameCheck samples={samples} fov={fov} shotId={shot.id} />
          <EffectComposer multisampling={2}>
            <DepthOfField worldFocusDistance={focus.dist} worldFocusRange={focus.range} bokehScale={2.2} />
          </EffectComposer>
        </SceneCtx.Provider>
      </ThreeCanvas>
      {shot.titleCard ? <TitleCard {...shot.titleCard} frame={frame} maxBottom={cardMaxBottom} /> : null}
    </AbsoluteFill>
  );
};
