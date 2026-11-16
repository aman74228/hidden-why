import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import {continueRender, delayRender} from 'remotion';

// Block rendering until the caption/title font is loaded.
if (typeof document !== 'undefined') {
  const h = delayRender('Loading Baloo 2');
  Promise.all([
    document.fonts.load("800 100px 'Baloo 2'"),
    document.fonts.load("700 100px 'Baloo 2'"),
  ])
    .then(() => continueRender(h))
    .catch(() => continueRender(h));
}
