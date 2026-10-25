#!/bin/bash
# Renders the cuts listed in cuts.json (shorts / joined / long). Needs Google Chrome + ffmpeg.
#   make.sh dry                 timeline check of every chapter (seconds, no rendering): MUST show one kill per scene
#   make.sh still <chapter>     render ONE chapter + contact sheet of stills (look at it before a full batch)
#   make.sh shorts              vertical 1080x1920 Shorts  -> dist/director/viral/shorts/
#   make.sh long                landscape 1920x1080 cut    -> dist/director/viral/long/
# Parts are cached in dist/director/viral/parts/: delete a part to re-render it. dist/director/ is gitignored.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
D=tools/director/direct.mjs; V=tools/director/scripts/viral; OUT=dist/director/viral
list() { node -e "const s=JSON.parse(require('fs').readFileSync('$V/cuts.json'));console.log(($1).join(' '))"; }
SHORTS=$(list "s.shorts"); LONG=$(list "s.long"); JOINED=$(list "Object.keys(s.joined||{})")
ALL=$(list "Object.keys(s.chapters)")
render() { local c=$1 dst=$2; [ -f "$dst" ] || CUT=$c node $D $V/chapter.mjs "$dst"; }
join() { local out=$1; shift; local l; l=$(mktemp)
  for f in "$@"; do echo "file '$PWD/$f'" >> "$l"; done
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$l" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$out"; rm -f "$l"; }

case "${1:-}" in
  dry) for c in $ALL; do echo -n "$c: "; CUT=$c node $D $V/chapter.mjs --dry | tail -1; done ;;
  still) c=${2:?usage: make.sh still <chapter>}; mkdir -p $OUT/still; f=$OUT/still/$c.mp4; rm -f "$f"; render "$c" "$f"
    n=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | cut -d. -f1)
    ffmpeg -y -loglevel error -i "$f" -vf "fps=6/${n:-30},scale=360:-1,tile=6x1" -frames:v 1 $OUT/still/$c.sheet.png
    echo "contact sheet: $OUT/still/$c.sheet.png" ;;
  shorts)
    mkdir -p $OUT/shorts $OUT/parts
    for c in $SHORTS; do render $c $OUT/parts/v-$c.mp4; cp $OUT/parts/v-$c.mp4 $OUT/shorts/$c.mp4; done
    for j in $JOINED; do parts=$(list "s.joined['$j']"); for c in $parts; do render $c $OUT/parts/v-$c.mp4; done
      join $OUT/shorts/$j.mp4 $(for c in $parts; do echo $OUT/parts/v-$c.mp4; done); done ;;
  long)
    mkdir -p $OUT/long $OUT/parts
    for c in $LONG; do [ -f $OUT/parts/h-$c.mp4 ] || HOA_LANDSCAPE=1 CUT=$c node $D $V/chapter.mjs $OUT/parts/h-$c.mp4; done
    join $OUT/long/best-of.mp4 $(for c in $LONG; do echo $OUT/parts/h-$c.mp4; done) ;;
  *) echo "usage: make.sh dry|still <chapter>|shorts|long"; exit 1 ;;
esac
