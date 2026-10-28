#!/bin/zsh
# deploy.sh — one command to ship the Cat Arcade v2 suite to the live Hawk arcade.
#   ./scripts/deploy.sh              # sync runtime, integrate, thumbnails, commit, push
#   ./scripts/deploy.sh --no-push    # everything except the git push
#
# Safe to re-run. Only touches g/_v2, g/_v1 (never), thumbs/*-v2.webp and games.json.
set -e
cd "$(dirname "$0")/.."
DEMOS=/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos
BRANCH=$(git -C "$DEMOS" rev-parse --abbrev-ref HEAD)

step() { print -P "\n%F{cyan}▸ $1%f"; }

step "1/6  runtime → g/_v2/_vendor (kit is the single source of truth)"
./scripts/sync-v2.sh > /dev/null && echo "     $(ls "$DEMOS/g/_v2/_vendor" | wc -l | tr -d ' ') files synced"

step "2/6  lint the games against the engine API"
node scripts/lint-api.mjs | tail -2

step "3/6  catalogue + hub (reads what is actually on disk)"
node scripts/integrate.mjs | head -2
node scripts/hub.mjs

step "4/6  card art (real in-game frames, not title cards)"
node scripts/thumbs.mjs 2>&1 | tail -3

step "5/6  feel audit"
node scripts/juice.mjs | tail -3

n=$(ls "$DEMOS"/g/_v2/*/game.js 2>/dev/null | wc -l | tr -d ' ')
step "6/6  commit + push ($n games on $BRANCH)"
cd "$DEMOS"
git add -A games.json g/_v2 thumbs
git -c user.name="cat-arcade" -c user.email="cat-arcade@local" commit -m "feat(cat-arcade-v2): $n games on the gp2x runtime

- rebuilt every game on the shared gp2x engine (bloom, particles, camera punch, hit-stop)
- new arcade hub: live bot preview, catalogue search, genre filters, v1 A/B links
- card art rendered from real gameplay frames
- originals preserved untouched in g/_v1/" 2>&1 | tail -3 || echo "     nothing to commit"
if [[ "$1" != "--no-push" ]]; then
  git push origin "$BRANCH" 2>&1 | tail -2
  print -P "%F{green}live: https://bparlette.github.io/Hawk/brad-demos/g/_v2/%f"
else
  echo "     (skipped push)"
fi
