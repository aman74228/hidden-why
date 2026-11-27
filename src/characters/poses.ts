// Pose library shared by every rig. Angles in degrees, "outward" convention:
// a positive shoulder angle lifts the arm away from the body; a negative elbow
// angle folds the forearm in towards the chest. Arm A is on the side the
// character faces (the pointing arm).

// Core poses (CLAUDE.md) + story extras.
export const POSES = ['idle', 'talk', 'point', 'laugh', 'cross-arms', 'shock', 'nod', 'cross-laugh', 'cross-talk', 'sleep', 'hammer', 'tap', 'proud', 'look-up', 'coin-tap', 'stomp', 'smile-nod', 'peek', 'gasp', 'present', 'slam', 'lean', 'deadpan', 'lift', 'frown', 'sad', 'nervous', 'defeated', 'binoculars', 'hat-tap', 'wave', 'aim', 'jaw-drop', 'bowl', 'aim-sweat', 'nervous-up', 'yank', 'shoulder-gun', 'curious', 'hold-out'] as const;
export type PoseName = (typeof POSES)[number];

export type EyeStyle = 'dot' | 'wide' | 'smug' | 'calm' | 'happy' | 'closed';
export type MouthStyle = 'smile' | 'smirk' | 'open' | 'O' | 'laugh' | 'flat' | 'grin' | 'frown' | 'wobble';

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
  browIn?: number; // worried brows: inner ends raised 0..1
  gaze?: [number, number]; // pupil shift in eye radii (+x = the facing side)
  sweat?: boolean; // nervous sweat drop at the temple
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
      // two clear taps of the coin on the pillar (contact at 0.55 s and 1.45 s):
      // wind up (forearm lifts away), snap in, small rebound, then rest on the iron
      const TAPS = [0.55, 1.45];
      let away = 0;
      for (const c of TAPS) {
        const d = t - c;
        if (d > -0.38 && d < 0) away = Math.max(away, Math.sin(((d + 0.38) / 0.32) * (Math.PI / 2)) * (d > -0.06 ? -d / 0.06 : 1));
        if (d >= 0 && d < 0.22) away = Math.max(away, Math.sin((d / 0.22) * Math.PI) * 0.25);
      }
      const settled = t > 1.8 ? Math.min(1, (t - 1.8) / 0.4) : 0;
      return {
        ...base,
        armA: [76 + away * 14, -16 - away * 62],
        bodyRot: -3 - away * 2,
        headRot: 6 + settled * 3 * Math.sin(ph * 2),
        eyes: 'smug',
        mouth: 'smirk',
        brow: 0.7 + away * 0.2,
      };
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
    case 'peek': {
      // both hands over the face, fingers parted: peeking at something awful
      const tr = s(ph * 14) * 1.5;
      return {...base, armA: [62 + tr, -150], armB: [62 - tr, -150], bodyRot: -3, headRot: -6 + tr, headDY: -0.02, eyes: 'wide', mouth: 'O', mouthOpen: 0.5, brow: 1};
    }
    case 'gasp': {
      // hands fly to the cheeks, mouth O
      const k = Math.min(1, t / 0.25);
      return {...base, armA: [20 + 40 * k, -40 - 100 * k], armB: [20 + 40 * k, -40 - 100 * k], bodyDY: 0.012 * k, eyes: 'wide', mouth: 'O', mouthOpen: 0.9, brow: 1};
    }
    case 'present':
      // both arms forward, holding something out proudly
      return {...base, armA: [70 + s(ph * 2) * 3, -20], armB: [55, -35], bodyRot: -2, headRot: 6, eyes: 'smug', mouth: 'grin', mouthOpen: 0.3, brow: 0.6};
    case 'slam': {
      // arm high, then slams down at 0.35 s; smug after
      const u = Math.min(1, t / 0.35);
      const down = u < 1 ? 160 - 120 * u * u : 40 + Math.max(0, 0.3 - (t - 0.35)) * 40;
      return {...base, armA: [down, -10], bodyRot: u < 1 ? 4 - 10 * u : -4, headRot: 6, eyes: 'smug', mouth: t > 0.4 ? 'smirk' : 'open', mouthOpen: 0.5, brow: 0.8};
    }
    case 'lean':
      // leaning in to watch closely
      return {...base, armA: [30, -70], armB: [24, -60], bodyRot: -9 + s(ph * 1.2) * 1.5, headRot: -10 + s(ph * 1.4) * 2, eyes: 'smug', mouth: 'smirk', brow: 0.6};
    case 'deadpan':
      return {...base, bodyRot: s(ph * 0.9) * 0.6, headRot: s(ph * 0.7) * 0.8, eyes: 'dot', mouth: 'flat', brow: -0.2};
    case 'sad':
      // face falls: head drops, eyes down, small open mouth, arms hang
      return {...base, armA: [6, -4], armB: [6, -4], bodyDY: -0.01, headRot: -3, headDY: -0.03, faceDY: -0.05, eyes: 'calm', mouth: 'flat', mouthOpen: 0, brow: 0.6};
    case 'nervous': {
      // losing and knows it: shoulders hunched up (head sinks), hands fidget at the chest,
      // tight wobbly smile, worried brows, eyes sliding back towards the desserts
      const fid = s(ph * 11);
      const look = Math.min(1, Math.max(0, (t - 0.15) / 0.2));
      return {...base, armA: [26 + fid * 4, -96], armB: [24 - fid * 4, -100], bodyDY: 0.006, bodyRot: 2 + s(ph * 7) * 0.8, headRot: -3 + s(ph * 9) * 1.2, headDY: -0.1, faceDY: -0.01,
        eyes: 'dot', gaze: [-0.6 * look, -0.25 * look], mouth: 'wobble', mouthOpen: 0, brow: 0.3, browIn: 0.9, sweat: true};
    }
    case 'defeated':
      // brows up and in, mouth turned down, slumped: head and shoulders drop, arms hang
      return {...base, armA: [4, -2], armB: [4, -2], bodyDY: -0.018, bodyRot: -3, headRot: -6, headDY: -0.045, faceDY: -0.03, eyes: 'dot', gaze: [0, -0.35], mouth: 'frown', mouthOpen: 0, brow: 0.2, browIn: 1};
    case 'binoculars': {
      // both hands up at the eyes holding binoculars (drawn with the 'binoculars' prop)
      const sw = s(ph * 1.3) * 1.5;
      return {...base, armA: [62 + sw, -150], armB: [62 - sw, -150], headRot: 3 + sw * 0.5, mouth: 'O', mouthOpen: 0.35, brow: 0.7};
    }
    case 'hat-tap': {
      // hand up to the hat brim, two smug taps (~0.3 s and ~0.7 s)
      const tap = Math.exp(-Math.pow((t - 0.3) / 0.06, 2)) + Math.exp(-Math.pow((t - 0.7) / 0.06, 2));
      return {...base, armA: [138 - tap * 6, -118 + tap * 6], headRot: 6 - tap * 2, eyes: 'smug', mouth: 'smirk', brow: 0.8};
    }
    case 'wave': {
      // waving a hat overhead to herd the birds
      const w = s(ph * 9);
      return {...base, armA: [150 + w * 16, 15 + w * 10], armB: [40 + w * 6, -30], bodyRot: w * 2, headRot: -4, mouth: 'open', mouthOpen: 0.5 + w * 0.2, brow: 0.6};
    }
    case 'aim':
      // both arms forward at chest height on a gun, squinting
      return {...base, armA: [78, -14], armB: [64, -42], bodyRot: -4, headRot: -3, eyes: 'smug', mouth: 'flat', brow: -0.3};
    case 'aim-sweat': {
      // waiting for the birds to come close: aiming, sweating, tiny tremble
      const tr = s(ph * 31) * 1.2;
      return {...base, armA: [78 + tr, -14], armB: [64, -42], bodyRot: -4, headRot: -3 + tr * 0.3, eyes: 'wide', mouth: 'flat', brow: 0.5, browIn: 0.7, sweat: true};
    }
    case 'curious':
      // head tilted, one brow up, eyes wide, small 'o' — the question face
      return {...base, headRot: 9 + s(ph * 1.2) * 1.5, eyes: 'wide', mouth: 'O', mouthOpen: 0.3, brow: 0.9, armA: [24, -50]};
    case 'hold-out':
      // one arm held straight out, offering something (handing it over)
      return {...base, armA: [82 + s(ph * 2) * 2, -6], bodyRot: -3, headRot: 4, mouth: 'smile', brow: 0.4};
    case 'shoulder-gun':
      // gun shouldered and pointing away from the lens: both hands in at the chest, cheek down to the sights
      return {...base, armA: [34, -118], armB: [22, -104], bodyRot: -3, headRot: -7, headDY: -0.02, eyes: 'smug', mouth: 'flat', brow: -0.3};
    case 'yank': {
      // yanking the jammed gun's cocking handle back, again and again, sweating
      const y = Math.max(0, s(t * 9));
      return {...base, armA: [70 - y * 22, -30 - y * 30], armB: [58, -50], bodyRot: -6 + y * 5, headRot: -4 + y * 3, eyes: 'wide', mouth: 'open', mouthOpen: 0.35 + y * 0.3, brow: 0.6, browIn: 0.8, sweat: true};
    }
    case 'nervous-up': {
      // losing and knows it: glancing up at his own hat
      const fid = s(ph * 11);
      return {...base, armA: [26 + fid * 4, -96], armB: [24 - fid * 4, -100], bodyDY: 0.006, headRot: 4 + s(ph * 9) * 1.2, headDY: -0.08, eyes: 'dot', gaze: [-0.1, 0.75], mouth: 'wobble', mouthOpen: 0, brow: 0.5, browIn: 0.9, sweat: true};
    }
    case 'jaw-drop':
      // the payoff face: jaw dropped, brows up and in, slumped
      return {...base, armA: [8, -2], armB: [8, -2], bodyDY: -0.015, bodyRot: -2, headRot: -4, headDY: -0.03, eyes: 'wide', mouth: 'O', mouthOpen: 1, brow: 0.4, browIn: 1};
    case 'bowl': {
      // underarm bowling swing: back (t<0.35), forward release at ~0.5 s, follow-through
      const u = Math.min(1, t / 0.6);
      const a = u < 0.55 ? -40 - 30 * (u / 0.55) : -70 + 190 * ((u - 0.55) / 0.45);
      return {...base, armA: [a, -10], bodyRot: -6 + u * 10, headRot: -6, eyes: 'calm', mouth: 'smile', brow: 0.3};
    }
    case 'frown':
      return {...base, armA: [12, -88], armB: [18, -100], armsCrossed: true, headRot: -4 + s(ph * 1.3) * 1.5, eyes: 'smug', mouth: 'flat', brow: -0.5};
    case 'lift':
      // arm raised high, holding something up into the light, awed
      return {...base, armA: [150 + s(ph * 1.5) * 3, -12], armB: [25, -30], headRot: 10, headDY: 0.01, faceDY: 0.04, eyes: 'wide', mouth: 'O', mouthOpen: 0.5, brow: 0.9};
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
