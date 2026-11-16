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
  payoff?: boolean; // ding plays at this shot's start (or at payoffAt)
  payoffAt?: number; // seconds into this shot
  note?: string;
  fx?: FxSpec;
  lightTo?: string; // blend lighting/sky towards these presets over mixAt
  skyTo?: string;
  mixAt?: [number, number]; // seconds into the shot
  labels?: {text: string; x: number; y: number}[]; // small on-screen labels (fractions of frame)
  grade?: 'flashback';
  sfx?: {name: string; at: number; volume?: number; dur?: number}[]; // public/sfx/<name>.wav, `at` seconds into the shot
};

export type ShotList = {
  slug: string;
  title?: string;
  audio?: string | null; // path inside /public, e.g. "vo/<slug>.mp3" (copied by scripts/prep.mjs)
  music?: boolean;
  sfx?: boolean;
  captionOffset?: number; // seconds; shift captions vs. audio
  payoffHold?: number; // seconds, default 0.5
  shots: Shot[];
};
