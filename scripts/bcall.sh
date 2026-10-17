#!/bin/sh
# bcall.sh <seconds> <recipe>...: build + botcheck each recipe, one line each (L=lose, W=win, time in virtual seconds)
S=$1; shift
for r in "$@"; do "$(dirname "$0")/try.sh" $r > /tmp/try.out 2>&1; grep -q " FAIL" /tmp/try.out && { cat /tmp/try.out | cut -c1-300; continue; }; "$(dirname "$0")/bc.sh" $r $S; done
