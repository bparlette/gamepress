#!/bin/bash
# Short from 1-4 games: video/short.sh out.mp4 g17 g20 ...   (records each bot run, picks the best 10 s, adds title cards + chiptune)
# Needs: node+playwright (NODE_PATH=$(npm root -g)), python3 numpy pillow, ffmpeg. Games must be built first (python3 build.py gN).
OUT=$(realpath -m "$1"); shift; cd "$(dirname "$0")"; export NODE_PATH=${NODE_PATH:-$(npm root -g)} FR=${FR:-/tmp/frames}; mkdir -p "$FR"
python3 ../build.py "$@" >/dev/null || exit 1
for g in "$@"; do node rec2.cjs $g 6500 || exit 1; done
python3 mk2.py "$OUT" "$@"
