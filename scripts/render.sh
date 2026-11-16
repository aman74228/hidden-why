#!/usr/bin/env bash
# Final render -> out/<slug>.mp4
set -euo pipefail
slug="$1"
node scripts/prep.mjs "$slug"
npx remotion render src/index.ts "$slug" "out/$slug.mp4" --codec=h264 --crf=18
