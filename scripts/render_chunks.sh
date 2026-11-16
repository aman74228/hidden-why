#!/usr/bin/env bash
# Robust final render: video in N chunks (stream-copy joined), audio rendered
# once (no seams), then muxed and loudness-mastered.
# usage: scripts/render_chunks.sh <slug> [chunks=4]
set -euo pipefail
slug="$1"; n="${2:-4}"
FLAGS="--gl=swangle --concurrency=1 --timeout=120000"
node scripts/prep.mjs "$slug" >/dev/null
total=$(npx remotion compositions src/index.ts 2>/dev/null | awk -v s="$slug" '$1==s {print $4}')
dir="out/.chunks-$slug"; mkdir -p "$dir"; : > "$dir/list.txt"
step=$(( (total + n - 1) / n ))
for i in $(seq 0 $((n-1))); do
  a=$((i*step)); b=$(( (i+1)*step - 1 )); [ $b -ge $total ] && b=$((total-1))
  f="$dir/part$i.mp4"
  if [ ! -s "$f" ]; then
    echo "chunk $((i+1))/$n: frames $a-$b"
    npx remotion render src/index.ts "$slug" "$f.tmp.mp4" --codec=h264 --crf=18 --muted --frames=$a-$b $FLAGS 2>&1 | tr '\r' '\n' | grep -E "not cleared|Error" || true
    [ -s "$f.tmp.mp4" ] || { echo "chunk $((i+1)) FAILED"; exit 1; }
    mv "$f.tmp.mp4" "$f"
  fi
  echo "file '$(basename "$f")'" >> "$dir/list.txt"
  echo "chunk $((i+1))/$n done"
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$dir/list.txt" -c copy "$dir/video.mp4"
python3 scripts/mix_audio.py "$slug" "$dir/audio.wav"  # same mix as Short.tsx, no frame re-render
ffmpeg -hide_banner -loglevel error -y -i "$dir/video.mp4" -i "$dir/audio.wav" -map 0:v -map 1:a -c:v copy -c:a pcm_s16le "out/$slug.raw.mov"
bash scripts/master.sh "out/$slug.raw.mov" "out/$slug.mp4"
rm -f "out/$slug.raw.mov"
echo "DONE out/$slug.mp4"
