# Changelog

Release history for gamepress. The `gamepress version` command prepends a template here on each bump.

## [Unreleased]

### Added
- `test/catalog.test.mjs` — every registry recipe must have a template and a catalog row; `npm test` runs all `test/*.test.mjs`
- README restored (description, entry points, recipe table); docs fixes: TOOLING commands/Kokoro size, KIT cross-link to NINTENDO-FEEL
- `gamepress --help` / `gamepress <cmd> --help` — generated help for all 45+ commands (the #1 token-saver)
- `gamepress approve <id>` / `gamepress expand <id> [--blueprint]` — full-game track CLI (was documented but missing)
- `gamepress setup` (no args) — full environment bootstrap: doctor + download all `tools.json` tools
- `gamepress voices --engine kokoro` (now the default) — offline batch voiceover via Kokoro; `--engine edge` for Edge TTS
- `lib/tools.mjs` + `tools.json` — external tool registry (URLs, sizes, sha256, update checks); `gamepress tools [--check]`
- `lib/tts.mjs` + `gamepress voice` — local Kokoro TTS (int8, ~137MB) with trailer/character/narrator presets
- `edge-tts` registered in `tools.json` as a network-service fallback
- Tests for `lib/tools.mjs`, `lib/tts.mjs`, `lib/pipeline.mjs` (13 tests); 120 s test timeout guard
- `scripts/README.md`; `docs/DRIVING.md` "Advanced: in-engine director scripts" (merged from `game-director-scripting.md`)

### Changed
- `gamepress deploy` is a deprecated alias of `gamepress host` (same args, deprecation warning; removal in a future release)
- `gamepress capture` unified on `lib/cdp.mjs` (one Chrome driver, `findChrome()`, file:// fixes)
- `gamepress voices` defaults to Kokoro (offline) instead of Edge TTS (network)
- Kokoro model switched to int8 quantized (109 MB vs 326 MB; `~/.gamepress/tts` now ~137 MB total)
- `doctor()` requires strict exit status 0 (broken installs no longer report OK)
- `lint()` only flags usernames in path-like contexts (no more false positives on short usernames)
- `drive --quick` clones the plan before mutating (no more leaked mutations)
- `grade` handles corrupt/unreadable videos as a clean failure instead of an unhandled exception

### Fixed
- `_askYesNo` defined — `gamepress auto --prompt` no longer crashes with `ReferenceError`
- `gamepress context` host signature corrected (`gamepress host <host> <id> [--live]`)
- README: 24 recipes (was "12"), `host [--live]` (was `deploy [--run]`)
- TOOLING.md: Kokoro v1.1, commands section points at `gamepress --help`, links `local-ai-integration.md`
- KIT.md: added `gpviewport.js`, `gplevels.js`, `three.module.min.js` rows; Kokoro ~137 MB

## 2026-10-17 — voice + tools

- `gamepress voice` command with Kokoro TTS (local, free, CPU-friendly)
- `tools.json` manifest registry with versions, sizes, sha256, `gamepress tools --check` update detection
- Kokoro updated to v1.1 (repackaged upstream release)
- AI-CONTRACT.md merged to main (§10 threading, §11 prompt-before-build)
- All branches merged to main per "everything lands on main" rule

## 2026-10-17 — stage-appropriate tools

- `kit/gpshaders.js` — retro shader wrappers for demo-stage polish (vertex jitter, bayer dither, scanlines)
- `docs/RAPIER-UPGRADE.md`, `docs/PLAYROOM-UPGRADE.md` — when to graduate from gpfeel to Rapier/PlayroomKit
- img2threejs 4-view image intake (`--image-mode upload|describe|game|prompt-me`)
- Monetize track: `kit/gpmonetize.js` (rewarded ads, paywall, share cards) + `docs/tracks/monetize.md`
- Port track: `kit/gpretro.js`, `kit/gbfixed.js`, `docs/tracks/port.md`, REA/img2threejs extraction docs
- Intel scan extractions: Galaxy `sphericalGravity`, Melee `meleeKnockback` → `gpfeel.js`
- VIRAL-PLAYBOOK: retention engine wins (safe zones, FOV comp, hook templates, BPM sync)

## 2026-10-16 — recipes + feel

- 24 game recipes with `viral` specs (hook, bot choreography, escalation, climax, personality)
- 24 recipes with `feel` specs (gpfeel.js feature mapping per recipe)
- `kit/gpfeel.js` — Nintendo-decomp-derived: Mario/Sonic physics, `characterStep()`, Lakitu camera, FSM, APU, deterministic RNG, hit-stop, trauma camera
- `gamepress viral <game-dir>` — viral signal scanner with 4 questions
- DRIVING.md viral capture checklist ("film the game, not the menu")

## 2026-10-15 and earlier

See git log. Highlights: Lego engine (`gplego.js`), runtime telemetry grading, `gamepress context` digest,
`--answers`/`--preset`/`--prompt` flows, Cloudflare Pages host, `gamepress repo`, Roblox Open Cloud shipping,
24 one-screen recipes, shared kit modules, layered audio presets.
