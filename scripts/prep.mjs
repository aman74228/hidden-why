// Copies audio/<slug>.mp3 into public/vo/ so Remotion can load it via staticFile("vo/<slug>.mp3").
import fs from 'node:fs';
const slug = process.argv[2];
if (!slug) throw new Error('usage: node scripts/prep.mjs <slug>');
fs.mkdirSync('public/vo', {recursive: true});
const src = `audio/${slug}.mp3`;
if (fs.existsSync(src)) {
  fs.copyFileSync(src, `public/vo/${slug}.mp3`);
  console.log(`copied ${src} -> public/vo/${slug}.mp3`);
} else console.warn(`no ${src} yet`);
// Shorts cut from Google Flow clips: upscale them (and build the ambience bed) if needed
const list = `src/shots/${slug}.json`;
if (fs.existsSync(list) && JSON.parse(fs.readFileSync(list, 'utf8')).shots.some((s) => s.flow)) {
  const {execFileSync} = await import('node:child_process');
  execFileSync('python3', ['scripts/flow_prep.py', slug], {stdio: 'inherit'});
}
