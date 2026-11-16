#!/usr/bin/env bash
# Loudness-master a render to about -14 LUFS integrated with true peak ≤ -1 dBTP:
# measure → static gain to target → peak limiter (-3 dBFS, leaves headroom for
# AAC overshoot) → AAC 192k, 48 kHz stereo. Video stream copied untouched.
# usage: scripts/master.sh in.mp4 out.mp4
set -euo pipefail
in="$1"; out="$2"
I=$(ffmpeg -hide_banner -nostats -i "$in" -map 0:a -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14 - ($I) + 0.3, 2))")
ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy \
  -af "aresample=48000,volume=${G}dB,alimiter=limit=0.63:level=false:attack=1:release=60" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$out"
ffmpeg -hide_banner -nostats -i "$out" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):' | tail -2 | tr -s ' ' | sed 's/^/master:/'
