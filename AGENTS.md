# AGENTS.md: for AIs maintaining gamepress

Not for AIs making a game for a human: those read `ORCHESTRATOR.md` and use only `gamepress run` (the tool asks, you relay).
This file is for AIs changing the tool itself. Read `docs/AI-CONTRACT.md` for the behavioral contract.

## Map
- `bin/gamepress.mjs` CLI (command table drives `--help`); `lib/*.mjs` logic; `kit/` shared game code; `templates/`, `presets/`, `tools.json` (external tools), `tracks.json` (track -> tools -> doc).
- Tracks and their docs: `gamepress tracks` or `docs/tracks/*.md` (shared, hook, demo, web-store, full-game, roblox, port, monetize).
- Recipes: `gamepress recipes`, rules in `docs/RECIPE-RULES.md`, shared code in `docs/KIT.md`. Hosting stubs: `docs/HOSTING.md`, `lib/hosts/*.mjs`.
- Environment: `docs/TOOLING.md`, `gamepress doctor`, `gamepress setup`.

## Pipeline (what `run` / `all` automate)
research -> new/make/lego -> test (`botcheck` proves lose-then-win) -> drive (`--quick 8` while iterating) -> grade -> publish-pack -> check -> publish-demo -> host (dry run unless `--live`).
Quality bar: `docs/QUALITY.md`; control contract: `docs/DRIVING.md`. Token savers: `gamepress context`, `status <id> --json`, `all <id> --track ... --heal`.

## Rules
- Run from repo root; add `--json` for machine output; errors are one line.
- Targeted edits; keep CLI help, `tracks.json`, and track docs in sync with real commands.
- Tests: `node --test test/*.test.mjs`. Commit small; `git pull --rebase` before push.
- Public repo: no secrets, no personal paths or names. Credentials live in the OS keychain / `~/.config/gamepress/` only.
- Other agents share checkouts: check `git status` for foreign uncommitted work; never stage it.

## Roblox
Flow, key scopes and pitfalls: `docs/ROBLOX.md` and `docs/tracks/roblox.md`. Ship with `gamepress roblox-ship <file.rbxl> --test templates/roblox-smoke.luau` (needs the owner's Open Cloud key).

Use case: a themed set of 30 games + 4 packs (`gamepress theme <hero> --world <w> --render --qc --publish`): see docs/VIRAL-SET.md.
- Cast / character-roster arcade (e.g. Karen Arcade with voices): `docs/CAST.md`.
