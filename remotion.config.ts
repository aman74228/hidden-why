import {Config} from '@remotion/cli/config';

// Use the pre-installed headless Chromium (no download needed) + software WebGL.
Config.setBrowserExecutable(
  process.env.REMOTION_BROWSER ??
    '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
);
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(1); // software WebGL already uses every core; more tabs thrash
Config.setOverwriteOutput(true);
Config.setDelayRenderTimeoutInMilliseconds(120000);
