#!/usr/bin/env bash
# Final render -> out/<slug>.mp4
set -euo pipefail
slug="$1"
node scripts/prep.mjs "$slug"
npx remotion render src/index.ts "$slug" "out/$slug.raw.mp4" --codec=h264 --crf=18 --audio-codec=aac --concurrency=1
bash scripts/master.sh "out/$slug.raw.mp4" "out/$slug.mp4"
rm -f "out/$slug.raw.mp4"
