import {createContext, useContext} from 'react';
import * as THREE from 'three';

// Shared per-shot state, provided inside the ThreeCanvas.
export type SceneState = {
  t: number; // seconds into the shot (frozen during payoff hold)
  frame: number;
  camPos: THREE.Vector3;
  fov: number;
  heightPx: number;
  charTint: string;
  rimDir: [number, number]; // screen-space direction towards the key light
  rimColor: string;
};

export const SceneCtx = createContext<SceneState>({
  t: 0,
  frame: 0,
  camPos: new THREE.Vector3(0, 1, 6),
  fov: 40,
  heightPx: 1920,
  charTint: '#ffffff',
  rimDir: [1, 0.5],
  rimColor: '#FFD27A',
});

export const useScene = () => useContext(SceneCtx);
