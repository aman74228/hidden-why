// Pose library shared by every rig. Angles in degrees, "outward" convention:
// a positive shoulder angle lifts the arm away from the body; a negative elbow
// angle folds the forearm in towards the chest. Arm A is on the side the
// character faces (the pointing arm).

// Core poses (CLAUDE.md) + story extras.
export const POSES = ['idle', 'talk', 'point', 'laugh', 'cross-arms', 'shock', 'nod', 'cross-laugh', 'cross-talk', 'sleep', 'hammer', 'tap', 'proud', 'look-up', 'coin-tap', 'stomp', 'smile-nod'] as const;
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
  const breathe = s(ph * 2.1) * 0.01;
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
    case 'cross-laugh': {
      // arms folded, smug laugh
      const shake = s(ph * 20);
      return {
        ...base,
        armA: [14, -112],
        armB: [14, -112],
        armsCrossed: true,
        bodyDY: Math.abs(shake) * 0.008,
        bodyRot: shake * 1.2,
        headRot: 8 + shake * 3,
        eyes: 'happy',
        mouth: 'laugh',
        mouthOpen: 0.7 + shake * 0.2,
        brow: 0.4,
      };
    }
    case 'cross-talk': {
      const open = Math.max(0, s(ph * 13) * 0.5 + s(ph * 8.1) * 0.5);
      return {...base, armsCrossed: true, headRot: 6 + s(ph * 2) * 3, mouth: 'open', mouthOpen: open, brow: 0.5};
    }
    case 'proud':
      return {...base, armA: [28, -115], armB: [28, -115], headRot: 7 + s(ph * 1.2) * 1.5, mouth: 'smirk', brow: 0.5};
    case 'sleep': {
      const br = s(ph * 1.6);
      return {
        ...base,
        armsCrossed: true,
        bodyDY: br * 0.004,
        bodyRot: 7,
        headRot: 22 + br * 2,
        headDY: -0.03,
        eyes: 'closed',
        mouth: 'O',
        mouthOpen: 0.3,
      };
    }
    case 'hammer': {
      // raise slowly, strike fast: period 0.9 s, impact at phase 0
      const per = 0.9;
      const u = (t % per) / per;
      const lift = u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3;
      const e = lift * lift * (3 - 2 * lift);
      return {
        ...base,
        armA: [55 + 110 * e, -25 - 30 * e],
        armB: [30, -60],
        bodyRot: -3 + e * 4,
        headRot: -4,
        eyes: 'calm',
        mouth: 'flat',
        brow: 0.2,
      };
    }
    case 'tap': {
      // reach out to the side; two small taps at ~0.4 s and ~0.8 s
      const tapA = Math.exp(-Math.pow((t - 0.45) / 0.07, 2)) + Math.exp(-Math.pow((t - 0.85) / 0.07, 2));
      return {
        ...base,
        armA: [86 - tapA * 6, -8 + tapA * 4],
        bodyRot: -2,
        headRot: -3,
        eyes: t > 1.0 ? 'happy' : 'calm',
        mouth: 'smile',
      };
    }
    case 'look-up':
      // head tipped back, wide eyes, gazing up the pillar
      return {...base, headRot: 4 + s(ph * 0.8) * 1.5, headDY: 0.01, faceDY: 0.05, eyes: 'wide', mouth: 'O', mouthOpen: 0.4, brow: 0.8, armA: [20, -40]};
    case 'coin-tap': {
      // arm out at chest height, little wrist taps every 0.5 s, smug face
      const k = (t % 0.5) / 0.5;
      const tap = Math.exp(-Math.pow((k - 0.15) / 0.08, 2));
      return {...base, armA: [78 + tap * 6, -18 - tap * 10], bodyRot: -3, headRot: 6, eyes: 'smug', mouth: 'smirk', brow: 0.7};
    }
    case 'stomp': {
      const k = s(ph * 9);
      return {
        ...base,
        armA: [18 + k * 18, -20],
        armB: [18 - k * 18, -20],
        bodyDY: Math.abs(k) * 0.02,
        bodyRot: -6,
        headRot: -4,
        mouth: 'flat',
        brow: -0.4,
      };
    }
    case 'smile-nod': {
      const n = Math.max(0, s(ph * 3));
      return {...base, headDY: -n * 0.02, faceDY: -n * 0.03, eyes: 'happy', mouth: 'smile'};
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
