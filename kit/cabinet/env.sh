#!/bin/bash
# source this: sets NODE_PATH for playwright, checks tools, picks a persistent frames dir (never /tmp: it is wiped on restart).
# Works if playwright is global (npm i -g playwright) or local; falls back to installing it next to this file.
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
G="$(npm root -g 2>/dev/null)"
if [ -d "$G/playwright" ]; then export NODE_PATH="$G${NODE_PATH:+:$NODE_PATH}"
elif [ -d "$here/node_modules/playwright" ]; then export NODE_PATH="$here/node_modules${NODE_PATH:+:$NODE_PATH}"
else echo "playwright missing: run  (cd $here && npm i playwright && npx playwright install chromium)"; fi
export FR="${FR:-$here/out/frames}"; mkdir -p "$FR"
for t in node python3 ffmpeg; do command -v $t >/dev/null || echo "missing tool: $t (videos need ffmpeg; builds need python3 + node)"; done
