// Sky / ground / lighting presets. Mix and match per shot in the shot list.

export type SkyPreset = {top: string; horizon: string; bottom: string; sun?: string; sunDir?: [number, number, number]};
export type GroundPreset = {base: string; tileA: string; tileB: string; line: string};
export type LightPreset = {
  key: string;
  keyIntensity: number;
  keyDir: [number, number, number];
  sky: string; // hemisphere sky
  shade: string; // hemisphere ground — indigo/teal, never black
  hemi: number;
  ambient: string;
  ambientIntensity: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  charTint: string; // multiplies flat character colours
  rim: string; // warm rim light on characters
};

export const SKIES: Record<string, SkyPreset> = {
  golden: {top: '#3E4A9A', horizon: '#FFC27A', bottom: '#F29D5C', sun: '#FFE3A3', sunDir: [-0.6, 0.18, -1]},
  noon: {top: '#3C7BD0', horizon: '#BFE3F2', bottom: '#E6D2A6', sun: '#FFF6D8', sunDir: [0.3, 0.7, -1]},
  dusk: {top: '#231E5C', horizon: '#E8735A', bottom: '#6B3C6E', sun: '#FFB27A', sunDir: [0.7, 0.06, -1]},
  night: {top: '#0F1238', horizon: '#2C3A78', bottom: '#1A2050', sun: '#E8ECFF', sunDir: [-0.4, 0.5, -1]},
  interior: {top: '#3A2A3E', horizon: '#6E4A3A', bottom: '#3A2A3E'},
  storm: {top: '#2C3266', horizon: '#7E86A8', bottom: '#4A4E70'},
  forge: {top: '#241C30', horizon: '#3E2A2E', bottom: '#241C30'},
  macro: {top: '#1E2048', horizon: '#3A3466', bottom: '#1E2048'},
  lounge: {top: '#3E4A9A', horizon: '#FFC890', bottom: '#F29D5C', sun: '#FFE3A3', sunDir: [0.9, 0.3, 0.5]},
  highsky: {top: '#2E5FB8', horizon: '#CFE6F5', bottom: '#F4EEE0', sun: '#FFF6D8', sunDir: [0.5, 0.32, -1]},
  cabin: {top: '#6A5A7A', horizon: '#FFE2B0', bottom: '#6A5A7A'},
  hangar: {top: '#3A4466', horizon: '#5A6688', bottom: '#3A4466'},
  underwater: {top: '#2A8AAA', horizon: '#1E6A8A', bottom: '#123A5A'},
};

export const GROUNDS: Record<string, GroundPreset> = {
  stone: {base: '#C99A6B', tileA: '#D7AC7C', tileB: '#BE8E62', line: '#8A6650'},
  sand: {base: '#E2B472', tileA: '#E8BE80', tileB: '#D9A862', line: '#C29358'},
  grass: {base: '#7FA65A', tileA: '#8DB466', tileB: '#739A50', line: '#5D8048'},
  wood: {base: '#9A6440', tileA: '#A86F48', tileB: '#8E5A3A', line: '#6A4030'},
  obsidian: {base: '#3A3560', tileA: '#45407A', tileB: '#302C55', line: '#221F44'},
  wet: {base: '#8C7A72', tileA: '#9A8578', tileB: '#7E6E6A', line: '#5E5258'},
  earth: {base: '#5E4436', tileA: '#6A4C3C', tileB: '#543C30', line: '#3E2C26'},
};

export const LIGHTS: Record<string, LightPreset> = {
  // ---- 03-plane-windows ----
  lounge: {
    key: '#FFC27A', keyIntensity: 2.6, keyDir: [-4, 6, 5],
    sky: '#FFE0B8', shade: '#22306A', hemi: 0.85,
    ambient: '#3A3C8A', ambientIntensity: 0.7,
    fog: '#E8B88E', fogNear: 14, fogFar: 90, charTint: '#FFF0DC', rim: '#FFC877',
  },
  cabin: {
    key: '#FFE0B0', keyIntensity: 2.2, keyDir: [3, 6, 6],
    sky: '#FFF0D8', shade: '#2A3470', hemi: 0.95,
    ambient: '#3A3C8A', ambientIntensity: 0.6,
    fog: '#E8D0B0', fogNear: 9, fogFar: 30, charTint: '#FFF6E8', rim: '#FFD58A',
  },
  highsky: {
    key: '#FFF2D6', keyIntensity: 2.8, keyDir: [5, 7, 3],
    sky: '#DDF0FF', shade: '#3A4E8A', hemi: 1.1,
    ambient: '#4A5CA0', ambientIntensity: 0.5,
    fog: '#CFE6F5', fogNear: 40, fogFar: 170, charTint: '#FFFFFF', rim: '#FFEFC2',
  },
  hangar: {
    key: '#B8C4E0', keyIntensity: 0.55, keyDir: [-3, 9, 4],
    sky: '#8A98C0', shade: '#1E2A5A', hemi: 0.55,
    ambient: '#2C3A78', ambientIntensity: 0.65,
    fog: '#4A5878', fogNear: 9, fogFar: 40, charTint: '#E8EEFF', rim: '#FFC877',
  },
  underwater: {
    key: '#BFF0FF', keyIntensity: 1.8, keyDir: [1, 8, 3],
    sky: '#8FE0F0', shade: '#123A6A', hemi: 1.0,
    ambient: '#1E5080', ambientIntensity: 0.9,
    fog: '#1E5A7A', fogNear: 2.5, fogFar: 11, charTint: '#DFF6FF', rim: '#BFF0FF',
  },
  cabinModern: {
    key: '#F2F4FF', keyIntensity: 1.5, keyDir: [3, 6, 6],
    sky: '#DDE6F4', shade: '#2A3470', hemi: 0.75,
    ambient: '#3A3C8A', ambientIntensity: 0.55,
    fog: '#B8C4D8', fogNear: 9, fogFar: 30, charTint: '#FFF6EE', rim: '#FFD58A',
  },
  runway: {
    key: '#FFC86E', keyIntensity: 2.6, keyDir: [6, 5, 5],
    sky: '#FFE4BC', shade: '#1E3A6E', hemi: 0.9,
    ambient: '#3346A0', ambientIntensity: 0.6,
    fog: '#F4C79C', fogNear: 20, fogFar: 110, charTint: '#FFF3DE', rim: '#FFD58A',
  },
  storm: {
    key: '#B9C4E8', keyIntensity: 1.1, keyDir: [-3, 9, 3],
    sky: '#8E98C4', shade: '#1E2A5A', hemi: 1.0,
    ambient: '#2E3A80', ambientIntensity: 0.9,
    fog: '#6E7698', fogNear: 5, fogFar: 38, charTint: '#D6DCF2', rim: '#FFD3A0',
  },
  forge: {
    key: '#FF9A4A', keyIntensity: 3.2, keyDir: [-4, 3, 2],
    sky: '#FFB066', shade: '#1E2460', hemi: 0.7,
    ambient: '#30307A', ambientIntensity: 0.8,
    fog: '#3A2430', fogNear: 6, fogFar: 26, charTint: '#FFE0C4', rim: '#FFB25A',
  },
  macro: {
    key: '#FFD08A', keyIntensity: 2.6, keyDir: [-3, 5, 4],
    sky: '#B8C6FF', shade: '#1E2A66', hemi: 0.9,
    ambient: '#3442A0', ambientIntensity: 0.8,
    fog: '#1E2048', fogNear: 30, fogFar: 90, charTint: '#FFF3DE', rim: '#FFD58A',
  },
  golden: {
    key: '#FFC86E', keyIntensity: 2.7, keyDir: [-5, 6, 4],
    sky: '#FFE4BC', shade: '#1E3A6E', hemi: 0.75,
    ambient: '#3346A0', ambientIntensity: 0.95,
    fog: '#F4C79C', fogNear: 9, fogFar: 62, charTint: '#FFF3DE', rim: '#FFD58A',
  },
  noon: {
    key: '#FFF0C8', keyIntensity: 3.0, keyDir: [2, 10, 4],
    sky: '#DDF0FF', shade: '#36507A', hemi: 1.2,
    ambient: '#4A5C90', ambientIntensity: 0.4,
    fog: '#D8E8EE', fogNear: 14, fogFar: 85, charTint: '#FFFFFF', rim: '#FFEFC2',
  },
  dusk: {
    key: '#FF9A5C', keyIntensity: 2.6, keyDir: [6, 3, 3],
    sky: '#E28A7A', shade: '#232A66', hemi: 1.0,
    ambient: '#2E2A70', ambientIntensity: 0.5,
    fog: '#9A5A78', fogNear: 8, fogFar: 52, charTint: '#FFE2CF', rim: '#FFB878',
  },
  night: {
    key: '#9FB4FF', keyIntensity: 1.6, keyDir: [-3, 8, 2],
    sky: '#4A5AA8', shade: '#141A44', hemi: 0.9,
    ambient: '#26306E', ambientIntensity: 0.6,
    fog: '#2A3170', fogNear: 7, fogFar: 42, charTint: '#C9D2FF', rim: '#FFD3A0',
  },
  lab: {
    key: '#F2F8FF', keyIntensity: 2.3, keyDir: [-3, 8, 5],
    sky: '#DFF2F2', shade: '#1F4A5A', hemi: 1.0,
    ambient: '#2E5A7A', ambientIntensity: 0.65,
    fog: '#CFE2E6', fogNear: 10, fogFar: 40, charTint: '#F6FBFF', rim: '#FFC877',
  },
  museum: {
    key: '#FFD8A0', keyIntensity: 1.8, keyDir: [-2, 6, 4],
    sky: '#B8A8E8', shade: '#1E2460', hemi: 0.8,
    ambient: '#3A2E7A', ambientIntensity: 0.75,
    fog: '#3A2E5A', fogNear: 8, fogFar: 30, charTint: '#FFEBD0', rim: '#FFC877',
  },
  'forge-dark': {
    key: '#8A5A7A', keyIntensity: 0.9, keyDir: [-4, 3, 2],
    sky: '#5A4A7A', shade: '#18204E', hemi: 0.6,
    ambient: '#2A2E6A', ambientIntensity: 0.7,
    fog: '#241E3E', fogNear: 5, fogFar: 22, charTint: '#C8B8D8', rim: '#FF8A4A',
  },
  interior: {
    key: '#FFB85A', keyIntensity: 3.4, keyDir: [-4, 5, 3],
    sky: '#FFD49A', shade: '#2A2C66', hemi: 0.9,
    ambient: '#3A2E6A', ambientIntensity: 0.5,
    fog: '#6A4650', fogNear: 7, fogFar: 34, charTint: '#FFEBD0', rim: '#FFC877',
  },
};

// Blend two presets (k: 0 → a, 1 → b). Used for "sun breaks through" etc.
const mixHex = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, sh: number) => (p >> sh) & 255;
  const m = (sh: number) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * k);
  return '#' + ((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0');
};
const mixNum = (a: number, b: number, k: number) => a + (b - a) * k;

export const mixLight = (a: LightPreset, b: LightPreset, k: number): LightPreset => ({
  key: mixHex(a.key, b.key, k),
  keyIntensity: mixNum(a.keyIntensity, b.keyIntensity, k),
  keyDir: [0, 1, 2].map((i) => mixNum(a.keyDir[i], b.keyDir[i], k)) as [number, number, number],
  sky: mixHex(a.sky, b.sky, k),
  shade: mixHex(a.shade, b.shade, k),
  hemi: mixNum(a.hemi, b.hemi, k),
  ambient: mixHex(a.ambient, b.ambient, k),
  ambientIntensity: mixNum(a.ambientIntensity, b.ambientIntensity, k),
  fog: mixHex(a.fog, b.fog, k),
  fogNear: mixNum(a.fogNear, b.fogNear, k),
  fogFar: mixNum(a.fogFar, b.fogFar, k),
  charTint: mixHex(a.charTint, b.charTint, k),
  rim: mixHex(a.rim, b.rim, k),
});

export const mixSky = (a: SkyPreset, b: SkyPreset, k: number): SkyPreset => ({
  top: mixHex(a.top, b.top, k),
  horizon: mixHex(a.horizon, b.horizon, k),
  bottom: mixHex(a.bottom, b.bottom, k),
  sun: b.sun && k > 0.5 ? b.sun : a.sun,
  sunDir: b.sunDir ?? a.sunDir,
});
