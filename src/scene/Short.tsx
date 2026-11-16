import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Captions, Word} from '../overlays/Captions';
import {useFontsReady} from '../overlays/fonts';
import {C} from '../theme';
import {placeCaption, shotBoxesAt} from './framing';
import {ShotScene} from './ShotScene';
import type {ShotList} from './types';

export const dB = (db: number) => Math.pow(10, db / 20);

export const shotFrames = (list: ShotList, fps: number) => list.shots.map((s) => Math.max(1, Math.round(s.duration * fps)));

export const totalFrames = (list: ShotList, fps: number) =>
  shotFrames(list, fps).reduce((a, b) => a + b, 0) + Math.round((list.payoffHold ?? 0.5) * fps);

// The scene template: plays the shot list back-to-back with hard cuts,
// whoosh on each cut, ding on the payoff, music bed at -22 dB, voiceover and
// synced captions. The last shot holds its final frame for `payoffHold`
// seconds, then the video hard-cuts (loops back into frame 0).
export const Short: React.FC<{list: ShotList; words: Word[] | null}> = ({list, words}) => {
  useFontsReady();
  const {fps} = useVideoConfig();
  const frames = shotFrames(list, fps);
  const hold = Math.round((list.payoffHold ?? 0.5) * fps);
  const starts = frames.reduce<number[]>((acc, f, i) => [...acc, i === 0 ? 0 : acc[i - 1] + frames[i - 1]], []);
  const sfx = list.sfx !== false;

  // caption placement: which shot is on screen at time t, where are the faces?
  const placeAt = React.useCallback(
    (t: number, w: number, h: number) => {
      const f = Math.round(t * fps);
      let i = starts.findIndex((s, k) => f >= s && f < s + frames[k]);
      if (i < 0) i = list.shots.length - 1;
      const p = Math.min(1, Math.max(0, (f - starts[i]) / Math.max(1, frames[i] - 1)));
      return placeCaption(shotBoxesAt(list.shots[i], p), w, h);
    },
    [list, fps, starts.join(','), frames.join(',')],
  );

  return (
    <AbsoluteFill style={{background: C.indigoDeep}}>
      {list.shots.map((shot, i) => {
        const last = i === list.shots.length - 1;
        return (
          <Sequence key={shot.id} from={starts[i]} durationInFrames={frames[i] + (last ? hold : 0)} name={`${i + 1}. ${shot.id}`}>
            <ShotScene shot={shot} frames={frames[i]} />
          </Sequence>
        );
      })}

      {words && words.length ? <Captions words={words} offset={list.captionOffset ?? 0} placeAt={placeAt} /> : null}

      {list.audio ? <Audio src={staticFile(list.audio)} /> : null}
      {list.music !== false ? <Audio src={staticFile('sfx/music-bed.wav')} volume={dB(-22)} loop /> : null}
      {sfx &&
        starts.slice(1).map((s, i) => (
          <Sequence key={`w${i}`} from={Math.max(0, s - 6)} durationInFrames={30} layout="none">
            <Audio src={staticFile('sfx/whoosh.wav')} volume={0.4} />
          </Sequence>
        ))}
      {sfx &&
        list.shots.flatMap((shot, i) =>
          (shot.sfx ?? []).map((e, k) => (
            <Sequence
              key={`s${i}-${k}`}
              from={starts[i] + Math.round(e.at * fps)}
              durationInFrames={Math.round((e.dur ?? 3) * fps)}
              layout="none"
            >
              <Audio src={staticFile(`sfx/${e.name}.wav`)} volume={e.volume ?? 0.6} loop={!!e.dur} />
            </Sequence>
          )),
        )}
      {sfx &&
        list.shots.map((shot, i) =>
          shot.payoff ? (
            <Sequence key={`d${i}`} from={starts[i] + Math.round((shot.payoffAt ?? 0) * fps)} durationInFrames={60} layout="none">
              <Audio src={staticFile('sfx/ding.wav')} volume={0.8} />
            </Sequence>
          ) : null,
        )}
    </AbsoluteFill>
  );
};
