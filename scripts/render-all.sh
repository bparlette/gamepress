#!/bin/zsh
# Render every examples/**/*.drive.json (or the ones named as arguments, e.g. tiny-kaiju ball-avalanche).
# Each render launches its own headless Chrome; run at most 3 at a time on a laptop. Output: press/video/<name>.mp4
cd "$(dirname "$0")/.." || exit 1
plans=("$@")
if [ ${#plans[@]} -eq 0 ]; then plans=(examples/*/*.drive.json); else plans=(${^plans/#/examples/}/hook.drive.json); fi
for p in $plans; do
  echo "== $p"
  node bin/gamepress.mjs drive "$p" --out press/video || echo "FAILED: $p"
done
