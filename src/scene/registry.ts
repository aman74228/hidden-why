import type {Word} from '../overlays/Captions';
import type {ShotList} from './types';

// Auto-discovers every shot list in src/shots/*.json and its captions in
// src/captions/<slug>.json (written by scripts/align.py). No per-Short code.
declare const require: {
  context: (dir: string, deep: boolean, re: RegExp) => {keys(): string[]; (k: string): unknown};
};

const shotCtx = require.context('../shots', false, /\.json$/);
const capCtx = require.context('../captions', false, /\.json$/);

export const SHOT_LISTS: ShotList[] = shotCtx.keys().map((k) => shotCtx(k) as ShotList);

export const wordsFor = (slug: string): Word[] | null => {
  const key = `./${slug}.json`;
  return capCtx.keys().includes(key) ? (capCtx(key) as Word[]) : null;
};
