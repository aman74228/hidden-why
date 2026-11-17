#!/usr/bin/env bash
# Opening preview with the strict mix: scripts/preview.sh <slug> <seconds>  -> out/preview/<slug>-<N>s.mp4
set -euo pipefail
slug="$1"; secs="${2:-10}"
node scripts/prep.mjs "$slug" >/dev/null
mkdir -p out/preview
python3 scripts/mix.py "$slug" "out/preview/$slug.mix.wav" >/dev/null
last=$((secs * 30 - 1))
npx remotion render src/index.ts "$slug" "out/preview/$slug.video.mp4" --codec=h264 --crf=18 --frames=0-$last --muted 2>&1 | grep -iE "error" || true
ffmpeg -hide_banner -loglevel error -y -i "out/preview/$slug.video.mp4" -i "out/preview/$slug.mix.wav" \
  -map 0:v:0 -map 1:a:0 -t "$secs" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "out/preview/$slug-${secs}s.mp4"
rm -f "out/preview/$slug.video.mp4"
echo "out/preview/$slug-${secs}s.mp4"
