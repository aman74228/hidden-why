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
};

export const GROUNDS: Record<string, GroundPreset> = {
  stone: {base: '#C99A6B', tileA: '#D7AC7C', tileB: '#BE8E62', line: '#8A6650'},
  sand: {base: '#E2B472', tileA: '#E8BE80', tileB: '#D9A862', line: '#C29358'},
  grass: {base: '#7FA65A', tileA: '#8DB466', tileB: '#739A50', line: '#5D8048'},
  wood: {base: '#9A6440', tileA: '#A86F48', tileB: '#8E5A3A', line: '#6A4030'},
  obsidian: {base: '#3A3560', tileA: '#45407A', tileB: '#302C55', line: '#221F44'},
};

export const LIGHTS: Record<string, LightPreset> = {
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
  interior: {
    key: '#FFB85A', keyIntensity: 3.4, keyDir: [-4, 5, 3],
    sky: '#FFD49A', shade: '#2A2C66', hemi: 0.9,
    ambient: '#3A2E6A', ambientIntensity: 0.5,
    fog: '#6A4650', fogNear: 7, fogFar: 34, charTint: '#FFEBD0', rim: '#FFC877',
  },
};
