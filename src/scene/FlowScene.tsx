import React from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, getInputProps, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../theme';
import {Grain} from '../overlays/Grain';
import {TitleCard} from '../overlays/TitleCard';
import type {FlowOverlay, Shot} from './types';

// A shot cut from a Google Flow clip (public/flow/<NN>/hd/*.mp4, upscaled by scripts/flow_prep.py):
// plays the clip from `from`; if the shot is longer than what is left of the clip, the last frame
// is held with a slow push-in (never a speed change). Overlays (price tags, a stamp, a card that
// lands on an object) and our title cards sit on top.
const hdPath = (clip: string) => clip.replace(/\/([^/]+)$/, '/hd/$1');

const track = (pos: FlowOverlay['pos'], t: number): [number, number] => {
  if (!pos) return [0.5, 0.5];
  if (!Array.isArray(pos[0])) return pos as [number, number];
  const k = pos as [number, number, number][];
  if (t <= k[0][0]) return [k[0][1], k[0][2]];
  for (let i = 1; i < k.length; i++)
    if (t <= k[i][0]) {
      const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return [k[i - 1][1] + (k[i][1] - k[i - 1][1]) * u, k[i - 1][2] + (k[i][2] - k[i - 1][2]) * u];
    }
  const l = k[k.length - 1];
  return [l[1], l[2]];
};

const Overlay: React.FC<{o: FlowOverlay; frame: number; fps: number}> = ({o, frame, fps}) => {
  const t = frame / fps;
  if (t < o.at || (o.until !== undefined && t >= o.until)) return null;
  const f0 = Math.round(o.at * fps);
  const pop = spring({frame: frame - f0, fps, config: {damping: 11, stiffness: 180, mass: 0.6}});
  const [x, y] = track(o.pos, t);
  const s = o.scale ?? 1;
  const base: React.CSSProperties = {position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, fontFamily: FONT, whiteSpace: 'nowrap'};
  if (o.kind === 'tag') {
    // small cream price tag with a string hole; the price in bold indigo
    return (
      <div style={{...base, transform: `translate(-50%, -50%) rotate(${o.rot ?? 0}deg) scale(${s * (0.2 + 0.8 * pop)})`, opacity: Math.min(1, pop * 2)}}>
        <div style={{background: '#FBF4E2', border: `5px solid ${C.ink}`, borderRadius: 18, padding: '6px 26px 2px 44px', position: 'relative', boxShadow: `0 6px 0 ${C.ink}`}}>
          <div style={{position: 'absolute', left: 14, top: '50%', width: 16, height: 16, marginTop: -8, borderRadius: 8, border: `4px solid ${C.ink}`, background: '#D9CDB0'}} />
          <span style={{color: C.indigo, fontWeight: 800, fontSize: 64, letterSpacing: 2}}>{o.text}</span>
        </div>
      </div>
    );
  }
  if (o.kind === 'stamp') {
    // saffron rubber stamp: thumps down (big -> 1), slightly rotated, double border
    const k = interpolate(pop, [0, 1], [1.7, 1]);
    return (
      <div style={{...base, transform: `translate(-50%, -50%) rotate(${o.rot ?? -12}deg) scale(${s * k})`, opacity: Math.min(1, pop * 3)}}>
        <div style={{border: `7px solid ${C.accent}`, borderRadius: 14, padding: 5, background: 'rgba(255,248,235,0.18)'}}>
          <div style={{border: `3px solid ${C.accent}`, borderRadius: 9, padding: '4px 18px 0', color: C.accent, fontWeight: 800, fontSize: 48, letterSpacing: 3, textShadow: `0 0 2px ${C.ink}`}}>
            {o.text ?? 'MADE IN INDIA'}
          </div>
        </div>
      </div>
    );
  }
  // 'card': our indigo/saffron card, landing on an object (scale + settle)
  return (
    <div style={{...base, transform: `translate(-50%, -50%) rotate(${o.rot ?? 0}deg) scale(${s * (0.3 + 0.7 * pop)})`, opacity: Math.min(1, pop * 2)}}>
      <div style={{background: C.indigo, border: `6px solid ${C.accent}`, borderRadius: 22, padding: '8px 26px 4px', textAlign: 'center', boxShadow: `0 8px 0 ${C.ink}`}}>
        {o.label ? <div style={{color: C.accent, fontWeight: 800, fontSize: 34, letterSpacing: 4, textTransform: 'uppercase', lineHeight: 1}}>{o.label}</div> : null}
        <div style={{color: C.white, fontWeight: 800, fontSize: 58, lineHeight: 1.15}}>{o.word}</div>
      </div>
    </div>
  );
};

export const FlowScene: React.FC<{shot: Shot; frames: number}> = ({shot, frames}) => {
  const raw = useCurrentFrame();
  const {fps} = useVideoConfig();
  const qaHands = Boolean((getInputProps() as {qaHands?: boolean}).qaHands);
  const fl = shot.flow!;
  const frame = Math.min(raw, frames - 1);
  const avail = Math.floor(((fl.clipDur ?? 8) - (fl.from ?? 0)) * fps) - 1; // last frame of the clip inside this shot
  const local = Math.min(frame, avail);
  // hold: last frame + slow push-in; optional zoom over the whole shot
  const holdK = frame > avail ? (frame - avail) / Math.max(1, frames - 1 - avail) : 0;
  const zoom = (fl.zoom ? fl.zoom[0] + (fl.zoom[1] - fl.zoom[0]) * (frame / Math.max(1, frames - 1)) : 1) * (1 + (fl.holdZoom ?? 0.05) * holdK);
  if (qaHands) return <AbsoluteFill style={{background: '#000'}} />;
  const cards = shot.titleCards ?? (shot.titleCard ? [shot.titleCard] : []);
  return (
    <AbsoluteFill style={{background: C.indigoDeep, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: `${(fl.zoomAt ?? [0.5, 0.5])[0] * 100}% ${(fl.zoomAt ?? [0.5, 0.5])[1] * 100}%`}}>
        <Freeze frame={local}>
          <OffthreadVideo src={staticFile(hdPath(fl.clip))} startFrom={Math.round((fl.from ?? 0) * fps)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Freeze>
      </AbsoluteFill>
      {(shot.overlays ?? []).map((o, i) => (
        <Overlay key={i} o={o} frame={frame} fps={fps} />
      ))}
      <Grain frame={raw} />
      {cards.map((c, i) => (
        <TitleCard key={i} {...c} frame={frame} />
      ))}
    </AbsoluteFill>
  );
};
