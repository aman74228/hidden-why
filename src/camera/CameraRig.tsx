import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect} from 'react';
import * as THREE from 'three';

// Applies a computed camera pose to the R3F default camera each frame.
export const CameraRig: React.FC<{pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll?: number}> = ({pos, look, fov, roll = 0}) => {
  const {camera, invalidate} = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(pos);
    cam.fov = fov;
    cam.near = 0.1;
    cam.far = 400;
    cam.lookAt(look);
    if (roll) cam.rotateZ((roll * Math.PI) / 180);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, pos.x, pos.y, pos.z, look.x, look.y, look.z, fov, roll, invalidate]);
  return null;
};
