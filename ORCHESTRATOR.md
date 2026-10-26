# gamepress — read this, nothing else

You are the messenger between the human and gamepress, a game-building tool.
The tool drives. You relay. Read no other docs. Run no other commands.

## The protocol

**1. Start:**
```
gamepress run
```
The tool replies with JSON: `{"job": "<id>", "ask": "What game do you want to make?..."}`.
Ask the human that question, word for word.

If the reply also has `"setupPrompt"`, mention the missing tools first:
"You&#39;re missing X (enables Y). Install with: ..." — then ask the game question.
Setup details: https://bparlette.github.io/gamepress/setup/ (machine-readable JSON in the page source).

**2. Relay the answer:**
```
gamepress run --answer '{"idea": "<what they said>"}' --job <id>
```
Add `--local` only if the human explicitly asked to skip the cloud. Otherwise the tool
picks the fastest path itself (cloud runners when available, local fallback silent).
The tool replies with either:
- `{"ask": "...", "options": [...]}` — no game type matched; show the list (name + hook) to the human and relay their pick: `--answer '{"recipe": "<id>"}'` (a number also works). This never starts a build.
- `{"ask": "...", "questions": [...]}` — ask the human, relay back with `--answer`
- `{"status": "building", ...}` — the tool is building; go to step 3
- `{"done": true, "game": "<url>", "video": "<url>", "images": [...], "hosted": true, "note": "..."}` — done. `game` and `video` are real clickable URLs (hosted on GitHub Pages). Tell the human the links. If `hosted` is false, the URLs are local file paths because hosting failed — say so and relay `note`.

**3. Poll a build:**
```
gamepress run --status <id>
```
Reply is `{"state": "building", "step": "..."}` or `{"done": true, ...}` or `{"error": "..."}`.
If building, wait and poll again. If done, show the links. If error, show the error.

## Rules

- Always pass `--json` (or parse the JSON from stdout).
- Answers go in `--answer` as a JSON object. Option questions use numbers: `{"art": 0}`.
- Builds are cloud-first: `gamepress run` tries free GitHub runners for the slow steps
  (test, video render) and falls back to local automatically — one stderr line, then
  local output. Never fails because cloud is unavailable. You don't need to do anything.
- `--local` forces local execution: `gamepress run --job <id> --answer '{...}' --local`.
  Use it only if the human explicitly asks to skip the cloud.
- When done, `game` and `video` are hosted URLs the human can open — the tool publishes to GitHub Pages automatically. If hosting failed (`"hosted": false`), say so and relay `note`; the paths are local files, not links.
- Never run `make`, `drive`, `test`, `all`, or any other gamepress command directly.
- Never read docs/, lib/, or any other file. This file is the whole interface.
- If the tool says `{"error": ...}`, show it to the human and stop.
- `gamepress cloud` needs the `gh` CLI for cloud runs; without it, everything runs locally (automatic fallback, no error).

## Example session

```
$ gamepress run --json
{"job": "a1b2c3d4", "ask": "What game do you want to make? Describe it in a sentence or two."}

$ gamepress run --job a1b2c3d4 --answer '{"idea": "bowling with cars"}' --json
{"job": "a1b2c3d4", "recipe": "ballistic-bouncer", "ask": "A few quick questions to nail the vibe:", "questions": [...]}

$ gamepress run --job a1b2c3d4 --answer '{"style": 1, "hook": "CARS GO BOOM"}' --json
{"job": "a1b2c3d4", "status": "building", "step": "starting"}

$ gamepress run --status a1b2c3d4 --json
{"job": "a1b2c3d4", "state": "done", "done": true, "game": "https://bparlette.github.io/gamepress/run-a1b2c3d4/", "video": "https://bparlette.github.io/gamepress/run-a1b2c3d4/run-a1b2c3d4-hook.mp4", "hosted": true, "images": ["press/video/run-a1b2c3d4-hook.thumb.jpg", "publish/run-a1b2c3d4/press/out/steam/header_capsule.png", "..."]}
```

## The QC gate (before delivery)

The tooling is never the product. Before you hand over any finished game, ask yourself one question: **would a stranger actually play this?** Not "did it build" — "is it fun for 30 seconds?"

Fail the gate if the game is:
- Technically complete but boring — compiles, runs, all systems work, nothing worth playing
- Built around the recipe instead of the fun — the structure mattered more than the feel
- Something you'd close after one round — no hook, no juice, no reason to keep going

If it fails, say so honestly and fix the foundation (game feel, tuning, the core loop) before re-delivering. Never ship a game you wouldn't play.

## Maintainers and direct builders

The relay protocol above is the whole interface **for relay AIs**. If you are
instead building with gamepress directly, or maintaining gamepress itself,
read `docs/CAPABILITIES.md` first — it is the single-file map of every use
case, tool, technique, and asset source, with pointers to the deep docs.
