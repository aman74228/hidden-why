import type {CameraMove} from '../camera/moves';
import type {CharacterProps} from '../characters/Character';
import type {TitleCardSpec} from '../overlays/TitleCard';
import type {FxSpec, SetSpec} from '../sets/ToonSet';

// JSON shot list schema — one file per Short in src/shots/<slug>.json
export type Shot = SetSpec & {
  id: string;
  beat?: number; // brief beat (1–6); stills script renders one still per beat
  stillAt?: number; // seconds into the shot for that beat's review still (marks the beat's still shot)
  duration: number; // seconds (rule: 4–6 s per cut)
  camera?: CameraMove; // default: auto "fit" framing
  cast?: CharacterProps[];
  // group shots: 'line' (default) puts everyone on one depth line, spaced so no
  // limb overlaps another body; 'manual' uses the given positions as-is
  layout?: 'line' | 'manual';
  gap?: number; // metres between reach boxes in 'line' layout (default 0.3)
  titleCard?: TitleCardSpec; // `at` is seconds into this shot
  titleCards?: TitleCardSpec[]; // several cards in one (long, sentence-length) shot
  payoff?: boolean; // ding plays at this shot's start (or at payoffAt)
  payoffAt?: number; // seconds into this shot
  note?: string;
  fx?: FxSpec;
  lightTo?: string; // blend lighting/sky towards these presets over mixAt
  skyTo?: string;
  mixAt?: [number, number]; // seconds into the shot
  labels?: {text: string; x: number; y: number}[]; // small on-screen labels (fractions of frame)
  grade?: 'flashback';
  roll?: [number, number]; // camera dutch roll in degrees over the shot
  dof?: number; // bokeh scale (0 = off)
  shake?: number; // camera shake amplitude (m): bumpy truck POV
  focusDist?: number | [number, number]; // metres, overrides the cast-based focus; [from, to] = rack focus over the shot
  sfx?: {name: string; at: number; volume?: number; dur?: number; gain?: number}[]; // public/sfx/<name>.mp3, `at` seconds into the shot
  // ---- shots cut from Google Flow clips (scripts/flow_prep.py upscales them) ----
  flow?: {clip: string; from?: number; to?: number; freeze?: {at: number; dur: number; zoom?: number; cut?: {after: number; zoom: [number, number]; origin: [number, number]}}; clipDur?: number; zoom?: [number, number]; holdZoom?: number; zoomAt?: [number, number]};
  overlays?: FlowOverlay[];
  captionY?: number; // fixed caption centre (fraction from top) for this shot
  allowFace?: string; // CHARACTERS.md rule 4: a declared, intended overlap with a face
};

// overlays on Flow shots: price tags, a rubber stamp, a card landing on an object.
// pos: [x, y] fractions, or keyframes [[t, x, y], ...] (seconds into the shot) to follow a moving object
export type FlowOverlay = {kind: 'tag' | 'stamp' | 'card'; at: number; until?: number; pos?: [number, number] | [number, number, number][]; rot?: number; scale?: number; text?: string; label?: string; word?: string};

export type ShotList = {
  slug: string;
  title?: string;
  audio?: string | null; // path inside /public, e.g. "vo/<slug>.mp3" (copied by scripts/prep.mjs)
  music?: boolean;
  sfx?: boolean;
  captionOffset?: number; // seconds; shift captions vs. audio
  payoffHold?: number; // seconds, default 0.5
  ambience?: {file: string; lufs?: number}; // a bed under everything (mix.py)
  musicDip?: unknown;
  shots: Shot[];
};
