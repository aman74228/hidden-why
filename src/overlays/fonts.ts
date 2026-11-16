import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {BALOO_700, BALOO_800} from './fontData';

// Caption/title font from embedded bytes (no fetch, so long-lived audio
// streams can't starve it). Faces are registered at module load; the render
// wait is taken inside a component via useFontsReady(), because Remotion resets
// its delayRender table during page init — a module-level delayRender would
// never be cleared and would time out on renders longer than ~2 minutes.
const toBuf = (b64: string) => {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
};

let ready: Promise<unknown> = Promise.resolve();
if (typeof document !== 'undefined') {
  ready = Promise.all(
    ([['700', BALOO_700], ['800', BALOO_800]] as const).map(([weight, data]) => {
      const f = new FontFace('Baloo 2', toBuf(data), {weight});
      document.fonts.add(f);
      return f.load();
    }),
  ).catch((e) => console.warn('[fonts] Baloo 2 failed to load', e));
}

export const useFontsReady = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    ready.finally(() => continueRender(handle));
  }, [handle]);
};
