# gamepress Cleanup Audit — 2026-10-17

Full-repo audit of `bparlette/gamepress` at origin/main tip `74d8095` (checked 2026-10-17 ~9:15 PM EDT).
Read: `bin/gamepress.mjs`, all `lib/*.mjs` + `lib/tts_bridge.py`, all `kit/*.js`, `docs/*.md` + `docs/tracks/*.md`,
`tracks.json`, `tools.json`, `README.md`, `AGENTS.md`, `presets/`, `scripts/`, `test/`.

Nothing has been changed. This file is findings only — each item is a proposed fix for Cherie to approve.

---

## 1. CLEANUP — dead code, duplicates, unused files, stale docs

| # | Item | Location | Detail |
|---|---|---|---|
| C1 | **`deploy` and `host` are byte-identical duplicate commands** | `bin/gamepress.mjs:454` vs `:461` | Same implementation, different name, different usage string. Pick one name, delete the other (or make one an alias). |
| C2 | **`test/expand.test.mjs` imports two files that don't exist** | `test/expand.test.mjs:8-9` | Imports `../lib/expand.mjs` and `../kit/gplevels.js` — neither file exists in the repo. This test always fails. Either build the missing files or delete the test. |
| C3 | **`tracks.json` lists `approve` and `expand` tools that don't exist** | `tracks.json` (shared + full-game tracks) | No `approve` or `expand` command in `bin/gamepress.mjs`. The full-game track is documented (`docs/tracks/full-game.md` exists) but its core tools are ghosts. |
| C4 | **`gamepress context` advertises a wrong `host` signature** | `lib/extras.mjs` (contextDigest) | Tells the AI: `gamepress host <id> --to github,itch,youtube,steam [--live]`. Real signature: `gamepress host <itch\|crazygames\|steam\|youtube\|cloudflare\|github> <id> [--live]`. Any AI following the cheat sheet will type a broken command. |
| C5 | **`voices` (Edge TTS) vs `voice` (Kokoro) naming collision** | `bin/gamepress.mjs:9-11, 467, 468` | Two different TTS engines one letter apart: `voices` = Edge TTS (needs network, MP3 output, batch from JSON), `voice` = Kokoro (local, WAV, one-liner). Confusing. Rename to `voices-edge` / `voices-local`, or document the difference prominently in the CLI header. |
| C6 | **`docs/local-ai-integration.md` is orphaned** | `docs/local-ai-integration.md` | Zero references from README, AGENTS.md, or any other doc. It's about the Qwen 14B local-AI setup. Either link it from TOOLING.md / README or fold it into `docs/TOOLING.md`. |
| C7 | **KIT.md kit table missing `gpviewport.js` and `three.module.min.js`** | `docs/KIT.md` | Table lists 13 kit files; `gpviewport.js` (safe-zone helpers, used by viral pipeline) and the vendored `three.module.min.js` are missing. `gbfixed.js` IS listed, so this is an oversight not a policy. |
| C8 | **TOOLING.md says kokoro-tts v1.0, tools.json says v1.1** | `docs/TOOLING.md:29` | Stale one version behind after the v1.1 update. |
| C9 | **README says "12 fixed recipes", actually 24** | `README.md:55` | The recipe registry grew to 24 (+4 legacy in extras.mjs). README's status table is stale. AGENTS.md correctly says "24 + 4". |
| C10 | **README `deploy` usage shows `[--run]`, code uses `[--live]`** | `README.md:36` | Copy-paste from an older version. The flag is `--live`. |
| C11 | **Leftover test screenshots in `.gp/`** | `.gp/pigskin-bowl.test.jpg`, `.gp/test.jpg` | Untracked scratch from test runs. Harmless but should be gitignored or cleaned. |
| C12 | **Untracked scratch dirs** | `examples/test-kart/`, `games/test-kart/`, `games/_vendor/`, `intel/`, `research/test-kart.json` | Explicitly left alone per instructions. Decide: gitignore them or delete. `games/_vendor/` is a copy of kit (regenerable via `syncKit`), `intel/` is the intel-scan output. |
| C13 | **`docs/TOOLING.md` Commands section only lists 7 of 40+ commands** | `docs/TOOLING.md` ("Commands" section) | Lists `init, capture, drive, scenes, pack, check, catalog` — the original seven. 30+ newer commands (`auto`, `make`, `voice`, `tools`, `lego`, etc.) aren't mentioned. Should point at README/AGENTS.md or be regenerated. |

---

## 2. FIX — bugs, inconsistencies, missing error handling

| # | Item | Severity | Location | Detail |
|---|---|---|---|---|
| F1 | **`_askYesNo` is called but never defined — `gamepress auto --prompt` crashes** | **HIGH** | `bin/gamepress.mjs:401` | The `--prompt` flow asks "Do you want to start from an image?" via `_askYesNo(...)`, but only `_askText` and `_askChoice` are defined. Result: `ReferenceError: _askYesNo is not defined` at runtime. This is a live crash on the documented interactive path. Fix: define `_askYesNo` (yes/no prompt) next to `_askText`/`_askChoice`. |
| F2 | **`test/fit.test.mjs` and `test/drive.test.mjs` hang forever** | **MED** | `test/fit.test.mjs`, `test/drive.test.mjs` | `fit.test.mjs` hangs on an unresolved promise (event loop drains, test never completes). `drive.test.mjs` likely launches Chrome and blocks. The suite can't run green as-is. Fix: add timeouts / skip conditions when Chrome isn't available. |
| F3 | **`lint()` flags the username in ANY file — false positives** | MED | `lib/extras.mjs` (lint) | The regex `\b<username>\b` fires on common words if the OS username is short (e.g. user `hatch`, `mac`, `dev`). A game mentioning "hatch" legitimately would fail lint. Fix: require a path-like context, or only scan for `/Users/<name>` and `/home/<name>` patterns. |
| F4 | **`doctor()` `has()` treats any stderr output as "installed"** | MED | `lib/extras.mjs` (doctor) | `has()` returns true if the command produced ANY output even with nonzero status. A broken ffmpeg install that prints an error would report as OK. Fix: check `r.status === 0` strictly for required tools. |
| F5 | **`drive()` `--quick` silently rewrites plan duration** | LOW | `lib/drive.mjs` (drive) | `quick` overrides `plan.duration` and `plan.name` in-place. If the caller reuses the plan object, the mutation leaks. Minor; clone before mutating. |
| F6 | **`grade()` video checks crash if ffprobe output is unexpected** | LOW | `lib/pipeline.mjs` (grade) | `JSON.parse(spawnSync('ffprobe', ...).stdout)` with no try/catch — a corrupt video file throws an unhandled exception instead of a clean grade failure. Wrap in try/catch, add a "video unreadable" check. |
| F7 | **`make()` hex-color hack is fragile** | LOW | `lib/extras.mjs` (make) | `hexify()` converts `#rrggbb` strings to bare `0xrrggbb` via regex on JSON output. If a spec value legitimately contains a 6-hex-char string (e.g. a seed or ID), it gets corrupted. Works today because only color fields match `^#[0-9a-f]{6}$`, but it's a landmine. Document or replace with an explicit `colors` list in the recipe registry. |
| F8 | **`capture()` in bin uses raw WebSocket instead of `lib/cdp.mjs`** | LOW | `bin/gamepress.mjs` (capture) | Two Chrome drivers exist: the bin's hand-rolled WebSocket client (capture) and `lib/cdp.mjs` `launchChrome` (used by drive/tasks). The bin one doesn't use the file:// fixes or `findChrome()`. Should be unified on `cdp.mjs`. |

---

## 3. ORGANIZE — wrong place, naming, merge/split candidates

| # | Item | Location | Proposal |
|---|---|---|---|
| O1 | **`voices` (Edge TTS) belongs with the tools registry** | `lib/studio.mjs` | Edge TTS is a network service with its own failure modes; Kokoro is in `tools.json`. Either register Edge TTS as a tool entry (type: network) or move `voices` into `lib/tts.mjs` next to Kokoro so all voice synthesis lives in one place. |
| O2 | **`game-director-scripting.md` overlaps `DRIVING.md`** | `docs/game-director-scripting.md` vs `docs/DRIVING.md` | Both document deterministic capture / scripted play. The director doc is Hawk/HOA-Warfare-specific war stories; DRIVING.md is the reference. Merge: keep DRIVING.md as the reference, fold the director doc's unique patterns (camera choreography, `__capStep`) into it as an "advanced" section, delete the standalone file. |
| O3 | **`NINTENDO-FEEL.md` vs KIT.md `gpfeel.js` section** | `docs/NINTENDO-FEEL.md` | NINTENDO-FEEL.md documents the feel constants; KIT.md has a gpfeel row. They're complementary (design doc vs API ref) — fine as-is, but cross-link both ways. Currently only one direction is linked. |
| O4 | **`setup/index.html` is undiscoverable** | `setup/index.html` | README mentions "the setup wizard" linking to it, but it's a raw HTML file with no `gamepress` command pointing at it. Either add `gamepress setup` (no args) to open/serve it, or drop the link from README. |
| O5 | **`scripts/` has no README** | `scripts/` | `try.sh`, `bc.sh`, `montage.sh`, `trace.mjs`, `render-all.sh`, `roblox-key.sh` — useful dev tools, zero documentation. One `scripts/README.md` (10 lines) would save every new AI a read-through. |
| O6 | **Track docs are stubs (100-200 words each)** | `docs/tracks/*.md` | `shared.md` (167 words), `demo.md` (109), `hook.md` (208), `web-store.md` (192), `roblox.md` (147) — these are supposed to be the "read this first" docs per AGENTS.md but contain almost nothing. Either flesh them out or point them at the real docs (they mostly duplicate AGENTS.md's pipeline table). |
| O7 | **`press/` directory holds HOA Warfare artifacts, not gamepress's** | `press/` | `press/video/hoa-karen-*.mp4`, `press/hoa-karen-*.drive.json` are HOA Warfare's viral videos, committed to the gamepress repo. They don't belong here — they're another project's deliverables. Move to the hoa-warfare repo or gitignore `press/`. |
| O8 | **`examples/` mixes gamepress's own examples with foreign games** | `examples/` | `examples/hoa-warfare.plan.json` and `examples/pigskin-bowl/` are real games' plans, not generic examples. Consider `examples/` = generic only, real games live under `games/`. |

---

## 4. ADD — obvious gaps

| # | Item | Detail |
|---|---|---|
| A1 | **`gamepress --help` / per-command `--help`** | There is no help flag. The only usage info is the fallback error string and the CLI header comment. Add `--help` (overview) and `gamepress <cmd> --help` (per-command flags). This is the #1 token-saver missing: AIs currently read source to learn flags. |
| A2 | **Implement or remove the full-game track's `approve`/`expand` commands** | `tracks.json` + `docs/tracks/full-game.md` promise a two-phase approve→expand flow. The test file references `lib/expand.mjs` (missing). Either build it (approveDemo, generateBlueprint, scaffoldExpansion per the test) or delete the track and its test. |
| A3 | **`gamepress setup` (no args) — full environment bootstrap** | Today `setup` only does `--tts`. Extend to: check `doctor`, download all `tools.json` tools, print next steps. One command to go from clone to ready. |
| A4 | **Tests for `lib/tools.mjs`, `lib/tts.mjs`, `lib/pipeline.mjs`** | The three newest/most-critical libs have zero tests. `presets`, `recipes`, `gpfeel`, `upgrade` are tested. Add: tools manifest load/verify, tts preset resolution (no model needed), pipeline status/next-step logic. |
| A5 | **`gamepress voices` needs a Kokoro backend option** | `voices` (batch voice lines from JSON) only uses Edge TTS (network, may be blocked from datacenters). Wire it to Kokoro via `lib/tts.mjs` so batch voiceover works offline. This also resolves the C5 naming confusion: one engine, one command family. |
| A6 | **CHANGELOG.md** | No changelog. `version` command writes "changelog template" per release but there's no CHANGELOG.md in the repo. Start one; the release history is currently only in git log. |
| A7 | **`docs/RECIPES.md` doesn't mention `--feel` wiring** | gpfeel.js exists with Mario/Sonic physics, but there's no documented path from recipe → feel preset. The pending "wire gpfeel into recipe templates / `--feel nintendo` flag" item has no doc home. |
| A8 | **Deprecation path for `deploy` vs `host`** | Whichever name survives (C1), keep the other as an alias for one release with a deprecation warning, then remove. Don't break existing scripts silently. |

---

## Top 5 most impactful fixes

1. **F1 — Define `_askYesNo` (`bin/gamepress.mjs:401`).** Live crash on the documented `gamepress auto --prompt` interactive path. One function, 5 lines, unblocks the primary AI-driven flow.
2. **A1 — Add `--help`.** Every new AI (and Cherie) currently reads source code to learn 40+ commands and their flags. A generated help screen is the single biggest token-saver missing from the repo.
3. **C1 — Kill the `deploy`/`host` duplicate.** Two identical commands with different names is how AIs learn the wrong one and how docs rot. One name + alias.
4. **A2 — Resolve the ghost `approve`/`expand` commands.** The full-game track is advertised in `tracks.json`, documented in `docs/tracks/full-game.md`, and tested in `test/expand.test.mjs` — but the implementation files don't exist. Either build or delete; a phantom track erodes trust in the whole contract.
5. **C4 — Fix the `gamepress context` host signature.** The ~400-token cheat sheet is the token-saving entry point; it currently teaches a broken `host` command. Wrong docs at the entry point poison every downstream run.

---

## Test status (for reference)

| Suite | Result |
|---|---|
| `presets.test.mjs` | 6/6 pass |
| `recipes.test.mjs` | 2/2 pass |
| `gpfeel.test.mjs` | 17/17 pass |
| `upgrade.test.mjs` | 6/6 pass |
| `fit.test.mjs` | **hangs** (unresolved promise) |
| `drive.test.mjs` | **hangs** (Chrome) |
| `expand.test.mjs` | **fails** (imports nonexistent files) |
