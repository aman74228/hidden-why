import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../theme';
import './fonts';

export type Word = {word: string; start: number; end: number};
export type Chunk = {text: string; start: number; end: number};

// Group word timestamps into 1–2 word chunks.
export const chunkWords = (words: Word[], maxChars = 12): Chunk[] => {
  const out: Chunk[] = [];
  let i = 0;
  while (i < words.length) {
    const a = words[i];
    const b = words[i + 1];
    const pair =
      b &&
      !/[.,!?;:]$/.test(a.word) &&
      a.word.length + b.word.length + 1 <= maxChars &&
      b.start - a.end < 0.25;
    if (pair) {
      out.push({text: `${a.word} ${b.word}`, start: a.start, end: b.end});
      i += 2;
    } else {
      out.push({text: a.word, start: a.start, end: a.end});
      i += 1;
    }
  }
  // each chunk stays up until the next one starts (no flicker in short gaps)
  return out.map((c, k) => {
    const next = out[k + 1];
    const end = next && next.start - c.end < 0.6 ? next.start : c.end + 0.25;
    return {...c, end};
  });
};

// Caption type size (60% of v2) and its box estimate as frame fractions.
export const captionFont = (text: string) => (text.length > 9 ? 60 : 68);
export const captionBox = (text: string) => {
  const fs = captionFont(text);
  return {w: Math.min(0.95, (text.length * fs * 0.62 + 40) / 1080), h: (fs * 1.15) / 1920};
};

// `placeAt(time, w, h)` returns the vertical centre (fraction from top) that
// keeps the caption off faces/bodies; evaluated once per chunk so it never jitters.
export const Captions: React.FC<{
  words: Word[];
  offset?: number;
  placeAt?: (t: number, w: number, h: number) => number;
}> = ({words, offset = 0, placeAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + offset;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const cur = chunks.find((c) => t >= c.start && t < c.end);
  if (!cur) return null;
  const local = (t - cur.start) * fps;
  const pop = spring({frame: local, fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  // sentence case: keep the script's own capitalisation, drop quotes and trailing punctuation
  const clean = cur.text.replace(/^["“‘]+/, '').replace(/["”’.,;:]+$/g, '').replace(/\.\.\.$/, '').replace(/["“”]/g, '');
  void placeAt;
  const y = 0.7; // fixed: centred at 70% of frame height
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: `${y * 100}%`,
          left: 0,
          right: 0,
          transform: `translateY(-50%) scale(${scale})`,
          textAlign: 'center',
          padding: '0 60px',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: captionFont(clean),
          lineHeight: 1,
          color: C.white,
          WebkitTextStroke: `11px ${C.ink}`,
          paintOrder: 'stroke fill',
          textShadow: `0 5px 0 ${C.ink}`,
          letterSpacing: 0.5,
        }}
      >
        {clean}
      </div>
    </AbsoluteFill>
  );
};
