import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, H, W} from '../theme';
import './fonts';

export type TitleCardSpec = {label: string; word: string; at?: number; duration?: number; crossed?: boolean; crossAt?: number; intro?: boolean};

const TOP = 0.1; // 10% from top (allowed 8–12%)
const MIN_TOP = 0.08;
const MAX_W = 0.75 * W; // never wider than 75% of the frame
const PAD_X = 56;
const BORDER = 10;
const LABEL = 46;

// Card size estimate (px) so we can keep it off faces before layout.
export const titleCardSize = (word: string) => {
  const chars = Math.max(word.length, 3);
  const base = chars <= 7 ? 150 : chars <= 10 ? 130 : 110;
  const fs = Math.min(base, (MAX_W - 2 * (PAD_X + BORDER)) / (chars * 0.66));
  const h = 34 + 28 + 2 * BORDER + LABEL + 10 + fs * 1.02;
  return {fs, h};
};

// Indigo panel, #F2A33A border, small upper label + big lower word.
// Anchored at 8–12% from the top; `maxBottom` (fraction of frame height) is
// the highest face top it must stay above — the card shrinks to respect it.
export const TitleCard: React.FC<TitleCardSpec & {frame?: number; maxBottom?: number}> = ({
  label,
  word,
  at = 0,
  duration = 2,
  frame: f,
  maxBottom = 1,
  crossed,
  crossAt = 0.8,
  intro = true,
}) => {
  const cur = useCurrentFrame();
  const {fps} = useVideoConfig();
  const frame = (f ?? cur) - at * fps;
  if (frame < 0 || frame > duration * fps) return null;

  const {fs, h} = titleCardSize(word);
  const strike = crossed ? Math.min(1, Math.max(0, (frame - crossAt * fps) / 8)) : 0;
  let top = TOP * H;
  let fitScale = Math.min(1, (maxBottom * H - top) / h);
  if (fitScale < 0.8) {
    top = MIN_TOP * H;
    fitScale = Math.min(1, (maxBottom * H - top) / h);
  }
  fitScale = Math.max(0.5, fitScale);

  const inS = intro ? spring({frame, fps, config: {damping: 13, stiffness: 180}}) : 1;
  const out = interpolate(frame, [duration * fps - 6, duration * fps], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = fitScale * interpolate(inS, [0, 1], [0.6, 1]) * interpolate(out, [0, 1], [0.9, 1]);
  return (
    <AbsoluteFill style={{opacity: Math.min(inS * 1.5, 1) * out, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            transform: `scale(${scale}) rotate(${interpolate(inS, [0, 1], [-4, -1.5])}deg)`,
            transformOrigin: 'top center',
            maxWidth: MAX_W,
            boxSizing: 'border-box',
            background: `linear-gradient(170deg, ${C.indigo} 0%, ${C.indigoDeep} 100%)`,
            border: `${BORDER}px solid ${C.accent}`,
            borderRadius: 36,
            padding: `34px ${PAD_X}px 28px`,
            textAlign: 'center',
            boxShadow: `0 16px 0 ${C.ink}, 0 24px 60px rgba(20,16,60,0.55)`,
            fontFamily: FONT,
          }}
        >
          <div style={{color: C.accent, fontWeight: 700, fontSize: LABEL, letterSpacing: 12, lineHeight: 1}}>{label.toUpperCase()}</div>
          <div
            style={{
              color: C.white,
              fontWeight: 800,
              fontSize: fs,
              lineHeight: 1.02,
              marginTop: 10,
              letterSpacing: 3,
              whiteSpace: 'nowrap',
              textShadow: `0 7px 0 ${C.ink}`,
              position: 'relative',
              opacity: 1 - strike * 0.35,
            }}
          >
            {word.toUpperCase()}
            {strike > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: '-4%',
                  top: '48%',
                  height: fs * 0.13,
                  width: `${108 * strike}%`,
                  background: '#E5533D',
                  border: `5px solid ${C.ink}`,
                  borderRadius: 999,
                  transform: 'rotate(-6deg)',
                  transformOrigin: 'left center',
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
