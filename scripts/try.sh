#!/bin/sh
# try.sh <recipe> [style] [seed]: build a recipe into /tmp/gp-try, run the headless test, print the verdict and screenshot path. For recipe development.
set -e
R=$1; ST=${2:-toon}; D=/tmp/gp-try; mkdir -p $D
echo "{\"style\":\"$ST\"}" > /tmp/gp-try-spec.json
rm -rf $D/try-$R; GP_GAMES=$D node "$(dirname "$0")/../bin/gamepress.mjs" make try-$R --recipe $R --spec /tmp/gp-try-spec.json --games $D --examples /tmp/gp-try-ex > /dev/null
node "$(dirname "$0")/../bin/gamepress.mjs" test $D/try-$R --root $D --json | python3 -c "import sys,json;d=json.load(sys.stdin);print('$R', 'OK' if d['ok'] else 'FAIL', d['problems'], d['errors'][:2], d.get('hints'), d.get('screenshot'))"
