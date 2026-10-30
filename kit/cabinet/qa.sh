#!/bin/bash
# whole-cabinet QA in parallel: qa.sh [secs] [seeds...]  -> table of outcome per game per seed + page errors
cd "$(dirname "$0")"; export NODE_PATH=$(npm root -g); SECS=${1:-50}; shift; SEEDS=${@:-"1 2 3"}
python3 build.py >/dev/null || exit 1
IDS=$(python3 -c "import json;print(' '.join(x['id'] for x in json.load(open('games.json'))))")
for g in $IDS; do for s in $SEEDS; do echo "$g $s"; done; done | xargs -P 6 -L1 bash -c 'o=$(node test.cjs $0 '$SECS' $1 2>&1); m=$(echo "$o"|grep -o "\"msg\":\"[^\"]*\""|head -1|cut -d\" -f4); t=$(echo "$o"|grep -o "\"t\":[0-9.]*"|tail -1|cut -d: -f2); e=$(echo "$o"|grep "^errors"|grep -vc "\[\]"); echo "$0 seed=$1 ${m:-NO-FINISH} t=$t err=$e"' | sort -V
