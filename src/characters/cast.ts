// Cast specs. Faces/colours are fixed; outfits can be reskinned per story via
// the `outfit` prop on <Character/> (body, sleeve, legs, trim).

export type CastName = 'chotu' | 'vik' | 'dada';

export type Outfit = {body: string; sleeve: string; legs: string; trim: string; shoes: string};

export type CastSpec = {
  name: CastName;
  height: number;
  skin: string;
  hair: string;
  headR: number;
  headSX: number; // head x/y squash
  headSY: number;
  neckY: number;
  headDY: number;
  hipY: number;
  legLen: number;
  legR: number;
  legGap: number;
  body: {w: number; h: number; y: number; flare: number};
  shoulderX: number;
  shoulderY: number;
  upper: number;
  lower: number;
  armR: number;
  eyeDX: number;
  eyeY: number;
  eyeR: number;
  mouthY: number;
  mouthW: number;
  eyes: 'wide' | 'smug' | 'calm';
  mouth: 'smile' | 'smirk';
  outfit: Outfit;
};

export const CAST: Record<CastName, CastSpec> = {
  chotu: {
    name: 'chotu',
    height: 1.42,
    skin: '#C98A5B',
    hair: '#3B2320',
    headR: 0.36,
    headSX: 1,
    headSY: 0.96,
    neckY: 0.78,
    headDY: 0.3,
    hipY: 0.34,
    legLen: 0.27,
    legR: 0.05,
    legGap: 0.085,
    body: {w: 0.46, h: 0.56, y: 0.52, flare: 0.2},
    shoulderX: 0.17,
    shoulderY: 0.72,
    upper: 0.19,
    lower: 0.18,
    armR: 0.045,
    eyeDX: 0.13,
    eyeY: 0.02,
    eyeR: 0.05,
    mouthY: -0.14,
    mouthW: 0.08,
    eyes: 'wide',
    mouth: 'smile',
    outfit: {body: '#F07A2A', sleeve: '#F07A2A', legs: '#F3E6CC', trim: '#FFD36B', shoes: '#7A3E2A'},
  },
  vik: {
    name: 'vik',
    height: 2.2,
    skin: '#B9774E',
    hair: '#2A1E33',
    headR: 0.27,
    headSX: 0.9,
    headSY: 1.06,
    neckY: 1.68,
    headDY: 0.25,
    hipY: 0.96,
    legLen: 0.88,
    legR: 0.05,
    legGap: 0.1,
    body: {w: 0.44, h: 0.82, y: 1.3, flare: 0.04},
    shoulderX: 0.19,
    shoulderY: 1.62,
    upper: 0.37,
    lower: 0.34,
    armR: 0.045,
    eyeDX: 0.1,
    eyeY: 0.03,
    eyeR: 0.04,
    mouthY: -0.12,
    mouthW: 0.075,
    eyes: 'smug',
    mouth: 'smirk',
    outfit: {body: '#1F9E95', sleeve: '#1F9E95', legs: '#2E3A64', trim: '#0F6B66', shoes: '#3A2A3A'},
  },
  dada: {
    name: 'dada',
    height: 1.62,
    skin: '#B07650',
    hair: '#F4F1EA',
    headR: 0.3,
    headSX: 1,
    headSY: 1,
    neckY: 1.02,
    headDY: 0.27,
    hipY: 0.4,
    legLen: 0.33,
    legR: 0.06,
    legGap: 0.12,
    body: {w: 0.8, h: 0.74, y: 0.72, flare: 0.12},
    shoulderX: 0.3,
    shoulderY: 0.95,
    upper: 0.22,
    lower: 0.21,
    armR: 0.055,
    eyeDX: 0.11,
    eyeY: 0.04,
    eyeR: 0.03,
    mouthY: -0.1,
    mouthW: 0.065,
    eyes: 'calm',
    mouth: 'smile',
    outfit: {body: '#8E5537', sleeve: '#8E5537', legs: '#F1E7D2', trim: '#F6E9CC', shoes: '#5A3624'},
  },
};
