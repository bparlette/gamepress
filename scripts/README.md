# scripts/ — developer utilities

Small shell/Node helpers for recipe development and debugging. Not part of the
`gamepress` CLI; run them directly.

| Script | What it does |
|---|---|
| `try.sh <recipe> [style] [seed]` | Build a recipe into `/tmp/gp-try`, run the headless test, print verdict + screenshot path. For recipe development. |
| `bc.sh <recipe> [seconds]` | Botcheck a recipe previously built by `try.sh` (lose-then-win proof). |
| `bcall.sh` | Botcheck all recipes built by `try.sh`. |
| `montage.sh <recipe>...` | Side-by-side montage of the last headless-test screenshots → `/tmp/montage.jpg`. |
| `render-all.sh [plan...]` | Render every `examples/**/*.drive.json` (or the named ones). At most 3 at a time on a laptop → `press/video/<name>.mp4`. |
| `trace.mjs <gamesDir> <gameId> <seconds> [every] [expr]` | Print game state every N frames on the virtual clock (bot debugging). |
| `roblox-key.sh` | Paste a Roblox Open Cloud API key in an editor → macOS Keychain (`gamepress-roblox-api-key`); key never touches the repo or shell history. |
