#!/usr/bin/env bash
# One still per beat (middle of the first shot of each beat) -> out/stills/<slug>/beat-N.png
set -euo pipefail
slug="$1"
node scripts/prep.mjs "$slug"
mkdir -p "out/stills/$slug"
node -e '
const l=require("./src/shots/'"$slug"'.json");let f=0,seen=new Set();
for(const s of l.shots){const n=Math.round(s.duration*30);const b=s.beat??s.id;
 if(!seen.has(b)){seen.add(b);console.log(b+" "+(f+Math.floor(n/2)));} f+=n;}' |
while read -r beat frame; do
  npx remotion still src/index.ts "$slug" "out/stills/$slug/beat-$beat.png" --frame="$frame"
done
