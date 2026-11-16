import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../theme';
import './fonts';

export type TitleCardSpec = {label: string; word: string; at?: number; duration?: number};

// Indigo panel, #F2A33A border, small upper label + big lower word.
export const TitleCard: React.FC<TitleCardSpec & {frame?: number}> = ({label, word, at = 0, duration = 2, frame: f}) => {
  const cur = useCurrentFrame();
  const {fps} = useVideoConfig();
  const frame = (f ?? cur) - at * fps;
  if (frame < 0 || frame > duration * fps) return null;
  const inS = spring({frame, fps, config: {damping: 13, stiffness: 180}});
  const out = interpolate(frame, [duration * fps - 6, duration * fps], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(inS, [0, 1], [0.6, 1]) * interpolate(out, [0, 1], [0.9, 1]);
  const wordSize = word.length > 8 ? 150 : 190;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: Math.min(inS * 1.5, 1) * out}}>
      <AbsoluteFill style={{background: 'rgba(20,18,60,0.35)'}} />
      <div
        style={{
          transform: `translateY(-440px) scale(${scale}) rotate(${interpolate(inS, [0, 1], [-4, -1.5])}deg)`,
          background: `linear-gradient(170deg, ${C.indigo} 0%, ${C.indigoDeep} 100%)`,
          border: `14px solid ${C.accent}`,
          borderRadius: 44,
          padding: '50px 80px 40px',
          minWidth: 700,
          textAlign: 'center',
          boxShadow: `0 24px 0 ${C.ink}, 0 30px 80px rgba(20,16,60,0.6)`,
          fontFamily: FONT,
        }}
      >
        <div style={{color: C.accent, fontWeight: 700, fontSize: 64, letterSpacing: 14, lineHeight: 1}}>{label.toUpperCase()}</div>
        <div
          style={{
            color: C.white,
            fontWeight: 800,
            fontSize: wordSize,
            lineHeight: 1.05,
            marginTop: 18,
            letterSpacing: 4,
            textShadow: `0 8px 0 ${C.ink}`,
          }}
        >
          {word.toUpperCase()}
        </div>
      </div>
    </AbsoluteFill>
  );
};
