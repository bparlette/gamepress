#!/bin/bash
# one command per batch: build, headless bot run (errors + info), determinism. usage: check.sh g12 g13 [secs]
cd "$(dirname "$0")"; export NODE_PATH=$(npm root -g)
G=(); SECS=45; for a in "$@"; do [[ $a =~ ^[0-9]+$ ]] && SECS=$a || G+=("$a"); done
python3 build.py "${G[@]}" >/dev/null || exit 1
# lint: pixel drawing inside hud() is lost (hud runs after the blit); use draw()/ui()
for g in "${G[@]}"; do awk '/^  hud\(/{h=1} h&&/rect\(|fillCircle\(|spr\(|ART\./{print "LINT "FILENAME": pixel call in hud() will not show"; exit} /^  (bot|info)/{h=0}' games/$g.js; done
for g in "${G[@]}"; do echo "== $g"; node test.cjs $g $SECS 2>&1 | tail -4 | cut -c1-300; done
node seedcheck.cjs "${G[@]}" 2>&1 | tail -${#G[@]}
