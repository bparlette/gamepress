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
The tool replies with either:
- `{"ask": "...", "questions": [...]}` — ask the human, relay back with `--answer`
- `{"status": "building", ...}` — the tool is building; go to step 3
- `{"done": true, "game": "<url>", "video": "<url>", "images": [...]}` — show the human the links

**3. Poll a build:**
```
gamepress run --status <id>
```
Reply is `{"state": "building", "step": "..."}` or `{"done": true, ...}` or `{"error": "..."}`.
If building, wait and poll again. If done, show the links. If error, show the error.

## Rules

- Always pass `--json` (or parse the JSON from stdout).
- Answers go in `--answer` as a JSON object. Option questions use numbers: `{"art": 0}`.
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
{"job": "a1b2c3d4", "state": "done", "done": true, "game": "games/run-a1b2c3d4/index.html", "video": "press/video/run-a1b2c3d4-hook.mp4", "images": []}
```
