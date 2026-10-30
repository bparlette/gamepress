#!/bin/bash
# One command for the three deliverables of a game: make-all.sh gN [--no-video]
#   1) pixel 8-bit page  out/gN.html      2) HD painted page out/gN.hd.html (only if the game has drawHD)  3) Short  out/gN_short.mp4
cd "$(dirname "$0")"; export NODE_PATH=$(npm root -g); g=$1
./check.sh $g 60 || exit 1                    # build + bot run + determinism + HUD lint
python3 build.py $g --hd >/dev/null
if grep -q "drawHD" games/$g.js; then HD=1 node snap.cjs $g 700 1500; else rm -f out/$g.hd.html; echo "no drawHD in $g: HD edition skipped"; fi
node snap.cjs $g 700 1500
[ "$2" = "--no-video" ] || video/short.sh out/${g}_short.mp4 $g
ls -la out/$g*.html out/${g}_short.mp4 2>/dev/null
