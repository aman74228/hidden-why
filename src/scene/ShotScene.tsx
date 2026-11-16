import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../camera/CameraRig';
import {DEFAULT_FOV, resolveMove} from '../camera/moves';
import {Character} from '../characters/Character';
import {TitleCard} from '../overlays/TitleCard';
import {ToonSet, resolveSet} from '../sets/ToonSet';
import {SceneCtx} from './ctx';
import type {Shot} from './types';

// One shot = one toon set + cast + camera move (+ optional title card).
// `frames` is the shot's own length; any extra frames (payoff hold) freeze
// on the final frame.
export const ShotScene: React.FC<{shot: Shot; frames: number}> = ({shot, frames}) => {
  const raw = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const frame = Math.min(raw, frames - 1);
  const t = frame / fps;
  const p = frames > 1 ? frame / (frames - 1) : 0;
  const move = useMemo(() => resolveMove(shot.camera), [shot.camera]);
  const {pos, look} = move(p);
  const fov = shot.camera.fov ?? DEFAULT_FOV;
  const {light} = resolveSet(shot);

  const ctx = useMemo(
    () => ({t, frame, camPos: pos, fov, heightPx: height, charTint: light.charTint}),
    [t, frame, pos.x, pos.y, pos.z, fov, height, light.charTint],
  );

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        flat
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
          {shot.cast?.map((c, i) => <Character key={`${c.who}-${i}`} {...c} />)}
        </SceneCtx.Provider>
      </ThreeCanvas>
      {shot.titleCard ? <TitleCard {...shot.titleCard} frame={frame} /> : null}
    </AbsoluteFill>
  );
};
