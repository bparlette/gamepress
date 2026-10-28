#!/bin/zsh
# Push the kit runtime into the Hawk v2 staging folder (what GitHub Pages serves).
set -e
K=/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/kit
D=/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos/g/_v2/_vendor
mkdir -p "$D"
cp $K/gp2x.js $K/gpsnd.js $K/gp2d.js $K/gpmath.js $K/gptween.js $K/gpsprites.js $K/gpaudio.js $K/gpcast.js $K/gpfeel.js "$D"/
cp $K/matter.min.js $K/gsap.min.js $K/tone.min.js "$D"/
ls -la "$D" | tail -12
