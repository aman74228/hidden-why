import React from 'react';
import {Composition} from 'remotion';
import {Short, totalFrames} from './scene/Short';
import {SHOT_LISTS, wordsFor} from './scene/registry';
import {FPS, H, W} from './theme';

export const Root: React.FC = () => (
  <>
    {SHOT_LISTS.map((list) => (
      <Composition
        key={list.slug}
        id={list.slug}
        component={Short}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={totalFrames(list, FPS)}
        defaultProps={{list, words: wordsFor(list.slug)}}
      />
    ))}
  </>
);
