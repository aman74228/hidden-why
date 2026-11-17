import React from 'react';
import {AbsoluteFill} from 'remotion';

// Subtle animated film grain: an SVG noise field re-seeded every frame,
// overlay-blended at low opacity (deterministic per frame).
export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.07}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id={`g${frame % 24}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${frame % 24})`} />
    </svg>
  </AbsoluteFill>
);
