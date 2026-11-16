import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect} from 'react';
import * as THREE from 'three';
import {ASPECT, CamPose} from '../camera/moves';

// Frame-edge check: any object tagged userData.prop that is partly inside and
// partly outside the frame at any point of the shot is hidden for the whole
// shot (so nothing pops), and a warning is logged with the shot + prop name.
export const FrameCheck: React.FC<{samples: CamPose[]; fov: number; shotId: string}> = ({samples, fov, shotId}) => {
  const {scene} = useThree();
  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(fov, ASPECT, 0.1, 400);
    const props: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.userData?.prop) props.push(o);
    });
    for (const o of props) {
      const box = new THREE.Box3().setFromObject(o);
      const corners: THREE.Vector3[] = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
      let clips = false;
      for (const s of samples) {
        cam.position.copy(s.pos);
        cam.lookAt(s.look);
        cam.updateMatrixWorld();
        cam.updateProjectionMatrix();
        const ps = corners.map((c) => c.clone().project(cam));
        const behind = ps.filter((p) => p.z > 1 || p.z < -1).length;
        if (behind === ps.length) continue;
        const xs = ps.map((p) => p.x);
        const ys = ps.map((p) => p.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const outside = x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1;
        const inside = x0 >= -1 && x1 <= 1 && y0 >= -1 && y1 <= 1 && behind === 0;
        if (!outside && !inside) {
          clips = true;
          break;
        }
      }
      if (clips) {
        o.visible = false;
        console.warn(`[frame-check] shot "${shotId}": hid prop "${o.userData.prop}" (clips the frame edge)`);
      }
    }
  }, [scene, samples, fov, shotId]);
  return null;
};
