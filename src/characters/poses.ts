// Pose library shared by every rig. Angles in degrees, "outward" convention:
// a positive shoulder angle lifts the arm away from the body; a negative elbow
// angle folds the forearm in towards the chest. Arm A is on the side the
// character faces (the pointing arm).

export const POSES = ['idle', 'talk', 'point', 'laugh', 'cross-arms', 'shock', 'nod'] as const;
export type PoseName = (typeof POSES)[number];

export type EyeStyle = 'dot' | 'wide' | 'smug' | 'calm' | 'happy' | 'closed';
export type MouthStyle = 'smile' | 'smirk' | 'open' | 'O' | 'laugh' | 'flat' | 'grin';

export type PoseState = {
  armA: [number, number];
  armB: [number, number];
  armsCrossed: boolean;
  finger: boolean;
  bodyDY: number; // fraction of height
  bodyRot: number; // deg
  headRot: number; // deg
  headDY: number; // world units
  faceDY: number; // nod: features slide down
  eyes?: EyeStyle;
  mouth?: MouthStyle;
  mouthOpen: number; // 0..1
  brow: number; // extra brow lift 0..1
};

const s = Math.sin;

export const poseAt = (pose: PoseName, t: number, seed = 0): PoseState => {
  const ph = t + seed * 1.7;
  const breathe = s(ph * 2.2) * 0.006;
  const base: PoseState = {
    armA: [10 + s(ph * 1.6) * 2, -6],
    armB: [10 + s(ph * 1.6 + 1) * 2, -6],
    armsCrossed: false,
    finger: false,
    bodyDY: breathe,
    bodyRot: s(ph * 0.9) * 1.2,
    headRot: s(ph * 1.1) * 2,
    headDY: 0,
    faceDY: 0,
    mouthOpen: 0,
    brow: 0,
  };
  switch (pose) {
    case 'idle':
      return base;
    case 'talk': {
      const open = Math.max(0, s(ph * 15) * 0.5 + s(ph * 9.3) * 0.5);
      return {
        ...base,
        armA: [38 + s(ph * 3) * 12, -35 + s(ph * 3.4) * 15],
        mouth: 'open',
        mouthOpen: open,
        headRot: s(ph * 2.3) * 4,
        brow: 0.3,
      };
    }
    case 'point':
      return {
        ...base,
        armA: [100 + s(ph * 2) * 2, 0],
        finger: true,
        bodyRot: -4,
        headRot: -6,
        mouth: 'open',
        mouthOpen: 0.45 + s(ph * 6) * 0.1,
        brow: 0.4,
      };
    case 'laugh': {
      const shake = s(ph * 22);
      return {
        ...base,
        armA: [28, -115],
        armB: [28, -115],
        bodyDY: Math.abs(shake) * 0.012,
        bodyRot: shake * 1.5,
        headRot: 9 + shake * 3,
        eyes: 'happy',
        mouth: 'laugh',
        mouthOpen: 0.75 + shake * 0.2,
        brow: 0.5,
      };
    }
    case 'cross-arms':
      return {
        ...base,
        armA: [12, -88],
        armB: [18, -100],
        armsCrossed: true,
        headRot: 5 + s(ph * 1.1) * 1.5,
        brow: 0.2,
      };
    case 'shock': {
      const jump = Math.max(0, s(Math.min(t, 0.5) * Math.PI * 2)) * 0.04;
      return {
        ...base,
        armA: [150 + s(ph * 18) * 3, 25],
        armB: [150 + s(ph * 18 + 1) * 3, 25],
        bodyDY: jump,
        headRot: s(ph * 18) * 2,
        eyes: 'wide',
        mouth: 'O',
        mouthOpen: 1,
        brow: 1,
      };
    }
    case 'nod': {
      const n = Math.max(0, s(ph * 5));
      return {
        ...base,
        headDY: -n * 0.035,
        faceDY: -n * 0.05,
        headRot: 0,
        eyes: 'calm',
        mouth: 'smile',
      };
    }
  }
};
