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
