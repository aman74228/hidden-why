#!/usr/bin/env bash
# One still per beat -> out/stills/<slug>/beat-N.png
# Uses the shot with `stillAt` for each beat (else the middle of the beat's first shot).
set -euo pipefail
slug="$1"
node scripts/prep.mjs "$slug"
mkdir -p "out/stills/$slug"
node -e '
const l=require("./src/shots/'"$slug"'.json");let f=0;const pick={};
for(const s of l.shots){const n=Math.round(s.duration*30);const b=s.beat??s.id;
 const fr=f+(s.stillAt!==undefined?Math.round(s.stillAt*30):Math.floor(n/2));
 if(s.stillAt!==undefined||!(b in pick))pick[b]=Math.min(fr,f+n-1); f+=n;}
for(const b in pick)console.log(b+" "+pick[b]);' |
while read -r beat frame; do
  echo "beat $beat -> frame $frame"
  npx remotion still src/index.ts "$slug" "out/stills/$slug/beat-$beat.png" --frame="$frame" 2>&1 | grep -iE "error" || true
done
