#!/usr/bin/env bash
# Review frames from one bundle: scripts/sheet.sh <slug> <outdir> <frame...>  (half scale)
set -euo pipefail
slug="$1"; out="$2"; shift 2
node scripts/prep.mjs "$slug" >/dev/null
mkdir -p "$out"
b=$(mktemp -d)/bundle
npx remotion bundle src/index.ts --out-dir "$b" >/dev/null 2>&1
for f in "$@"; do
  npx remotion still "$b" "$slug" "$out/f$(printf %04d $f).png" --frame="$f" --scale=0.5 2>&1 | grep -iE "error" || true
done
rm -rf "$(dirname "$b")"
