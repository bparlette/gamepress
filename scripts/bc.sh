#!/bin/sh
# bc.sh <recipe> [seconds]: botcheck a recipe previously built by try.sh
GP_GAMES=/tmp/gp-try node "$(dirname "$0")/../bin/gamepress.mjs" botcheck try-$1 --seconds ${2:-40} --games /tmp/gp-try --json | python3 -c "import sys,json;d=json.load(sys.stdin);print('$1', 'OK' if d['ok'] else 'CHECK', ' '.join(('W' if e['win'] else 'L')+str(e['t']) for e in d['ends'][:5]), d['errors'])"
