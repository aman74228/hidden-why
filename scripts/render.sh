#!/usr/bin/env bash
# Final render -> out/<slug>.mp4: picture from Remotion (muted), soundtrack from
# scripts/mix.py (strict CLAUDE.md levels, already at -14 LUFS / -1 dBTP), muxed.
set -euo pipefail
slug="$1"
node scripts/prep.mjs "$slug"
python3 scripts/mix.py "$slug" "out/$slug.mix.wav" > "out/$slug.levels.json"
npx remotion render src/index.ts "$slug" "out/$slug.raw.mp4" --codec=h264 --crf=18 --muted --concurrency=1
ffmpeg -hide_banner -loglevel error -y -i "out/$slug.raw.mp4" -i "out/$slug.mix.wav" -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "out/$slug.mp4"
rm -f "out/$slug.raw.mp4" "out/$slug.mix.wav"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact "out/$slug.mp4"
ffmpeg -hide_banner -nostats -i "out/$slug.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):'
