#!/bin/zsh
# sweep.sh — the full-suite gate. Runs every built game through QA + the feel audit
# in three parallel lanes, then prints one scorecard.
#   ./scripts/sweep.sh            # all games on disk
#   ./scripts/sweep.sh id1 id2    # just these
cd "$(dirname "$0")/.."
OUT=/tmp/sweep; mkdir -p $OUT; rm -f $OUT/*.log

if [[ $# -gt 0 ]]; then IDS=($@); else
  IDS=(${(f)"$(ls /Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos/g/_v2/*/game.js | sed 's#.*/_v2/##;s#/game.js##')"})
fi

print -P "%F{cyan}▸ lint%f"
node scripts/lint-api.mjs $IDS | tail -1

print -P "%F{cyan}▸ qa ($#IDS games, 3 lanes)%f"
i=0
for id in $IDS; do
  lane=$(( i % 3 )); i=$(( i + 1 ))
  ( node scripts/qa.mjs $id >> $OUT/lane$lane.log 2>&1 ) &
  # keep at most 3 chrome instances alive per lane batch
  if (( i % 3 == 0 )); then wait; fi
done
wait

cat $OUT/lane*.log | grep -E '^(PASS|FAIL)' | sort -k2 > $OUT/qa.txt
node scripts/juice.mjs > $OUT/juice.txt 2>&1

print -P "\n%F{cyan}▸ scorecard%f"
paste <(awk '{print $1, $2}' $OUT/qa.txt) <(grep -E '^(RICH|ok- |THIN)' $OUT/juice.txt | awk '{print $1, $3}' | sed 's/score=//' ) 2>/dev/null | \
  awk 'BEGIN{printf "%-7s %-24s %s\n","VERDICT","GAME","JUICE"}{printf "%-7s %-24s %s\n",$1,$2,$3}'
print ""
print "pass $(grep -c '^PASS' $OUT/qa.txt)/$(wc -l < $OUT/qa.txt | tr -d ' ')   thin $(grep -c '^THIN' $OUT/juice.txt)   fail:"
grep '^FAIL' $OUT/qa.txt | sed 's/^/  /' || print "  none 🎉"
