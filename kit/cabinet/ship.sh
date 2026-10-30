#!/bin/bash
# copy built games into a Hawk checkout: ship.sh /path/to/hawk g12 g13   (writes games/<g>/index.html)
cd "$(dirname "$0")"; H=$1; shift; python3 build.py "$@" >/dev/null
for g in "$@"; do mkdir -p $H/games/$g; cp out/$g.html $H/games/$g/index.html; done
