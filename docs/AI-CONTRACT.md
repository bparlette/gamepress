# AI Driver Contract

When you drive gamepress, you agree to the following. You are the driver; the repo is your toolbox;
the human gives you ideas and answers in chat, you run the commands. These rules keep every AI
behaving the same way on this repo.

## 1. Decision defaults

When the repo doesn't specify and the human hasn't answered, use these. Don't guess, don't stall:

- **Recipe:** the simplest one that fits the idea.
- **Art style:** `toon`.
- **Track:** `demo` (local + GitHub Pages).
- **Video:** 15s vertical hook format.
- If truly ambiguous between two equal options, pick the first alphabetically and note the choice in your output.

## 2. Failure protocol

When any command fails:

1. Read the full error. Retry once — transient failures happen.
2. If it fails again, try the documented fallback (check docs or `--help`).
3. If no fallback works: **STOP.** Report to the human with: the exact command, the exact error, what you tried, and what you need from them.
4. **NEVER** silently skip a failed step and claim success. **NEVER** invent a workaround that bypasses the pipeline.

## 3. Definition of done

Before saying "finished," ALL must be true:

- `gamepress test` passes on the game.
- The game runs in a browser with no console errors.
- Video renders (if the track includes video).
- Store assets exist in `publish/<id>/` (if the track includes packaging).
- `gamepress check` passes (if packaging).
- No secrets, tokens, or personal paths in any committed file.

## 4. Ask vs. proceed

**PROCEED SILENTLY:** building, testing, local renders, scaffolding, research, linting.

**ALWAYS ASK FIRST:** publishing to any platform (YouTube, itch.io, Steam, CrazyGames, Cloudflare, Roblox),
spending money, deleting files or repos, pushing to main, creating public repos.

When in doubt, ask. A wrong guess on an irreversible action is worse than a question.

## 5. Preset workflow

When you collect game preferences from the human (art style, hook angle, difficulty, etc.) via `--answers`
or conversation, **ALWAYS** offer to save their answers as a named preset afterwards — ask them what to
call it. Use `gamepress preset save <name>`. Next time they want a similar game, offer
`gamepress auto "<idea>" --preset <name>` to reuse their favorite combos without re-asking.

## 6. Naming conventions

- Game IDs: kebab-case (`my-cool-game`).
- Presets: kebab-case (`dark-pixel-horror`).
- Branches: `ai-<short-description>` (`ai-bullet-heaven-demo`).
- Commits: imperative mood, short (`Add bullet heaven recipe`).

## 7. Token efficiency

Minimize token spend:

- Use `--json` on every command and parse the output — don't re-read files to check what a command just told you.
- Don't re-read unchanged files. If you read it this session and nothing modified it, trust your copy.
- Batch independent commands. Don't run five sequential calls when one `all` does it.
- Read docs once per session, not once per command.

## 8. The don't list

- **NEVER** commit secrets, API keys, tokens, or personal paths.
- **NEVER** invent URLs, IDs, or success messages. If you didn't verify it, don't claim it.
- **NEVER** claim a deploy worked without opening the live link and confirming.
- **NEVER** push to main without the human explicitly saying "push" or "merge."
- **NEVER** overwrite another agent's work. Check `git status` and `git log` before committing in shared repos.
- **NEVER** run `git reset --hard` or `git stash` on files you didn't create.

## 9. Session handoff

If picking up where another agent left off (or handing off), write/read `press/SESSION.md` in the game
dir: what was done, what's next, what's blocked. 10 lines max.

## 10. Thread, don't queue

When the human gives you multiple tasks — or one task splits into independent pieces — run them **in parallel** with subagents, not one after another.

- Independent = no shared files, no ordering dependency. Game build + video render + doc update = three subagents.
- Dependent = one needs the other's output. Chain those, thread the rest.
- A single message with three asks is three threads, not a queue.
- Report each thread's result as it lands; don't hold finished work hostage behind slower threads.

Sequential work when parallel was possible is a bug, not a style choice.

## 11. Prompt before you build

When the human gives you a game idea in chat, **DO NOT jump straight to building.** Follow the conversation flow:

1. **Ask** about the details that change the game: art style, difficulty/speed, camera angle, hook for the video, any must-have or must-avoid mechanics. 2-4 questions max, not an interrogation.
2. **Offer** to save their answers as a named preset (per §5) — ask what to call it.
3. **Then** build, using `gamepress auto "<idea>" --answers <file>` or the collected preferences directly.

`gamepress auto` exists for exactly this flow — use it. A game built on guessed preferences is rework waiting to happen. The 30 seconds of questions saves 30 minutes of rebuilding.

**NEVER** skip this because the idea "seems clear enough." It isn't. Ask.

## 12. Self-improvement direction (Harness²)
Google open-sourced Harness² (Oct 2026, Apache-2.0, github.com/google-research/harness2, paper arxiv.org/abs/2610.14224): turns any agent harness into a self-improving system. The agent proposes edits to its own harness, probes them on the same task, and keeps only changes backed by behavioral evidence (Propose-Probe-Compose) — no ground-truth labels or verifiers needed. A second recursion level saves adopted harnesses + lessons to a library so each new task starts from accumulated experience.

Results: +11.5 pts on WorkBuddy-Bench, +11.8pp on Harvey's legal benchmark; all 4 model/harness setups improved on all 3 benchmarks. A weaker model (GLM-5) with a better harness beat base Gemini 3.5 Flash. 8 editable components: system prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins. Cost: ~4 agent runs per task. Caveat: Meta-Harness still leads on some setups.

gamepress already does the informal version: tests catch regressions, docs get corrected when reality disagrees, the kit evolves per game. Harness² is the formal version of that loop. Future direction: let `gamepress` runs propose their own harness edits (new recipes, better defaults, fixed prompts) and validate them against the test suite before keeping them.

Sources: [@akshay_pachaar](https://x.com/akshay_pachaar/status/2111753928031531232), [@Marktechpost](https://x.com/marktechpost/status/2111737885141688348) (Oct 18, 2026).

## 13. Cherie's 12 rules for AI game developers

These are the highest-impact rules for any AI building games. Some overlap with sections above — they're collected here as the checklist.

1. **One file to read.** The AI reads a single instruction file (ORCHESTRATOR.md), never explores the repo or docs. Biggest token saver there is.
2. **Prompt before you build.** (See §11.) Ask 3-4 questions before writing code.
3. **Sample before full build.** Show a plan plus a small working sample first. Get approval, then build everything. A 30-second sample saves 30 minutes of rework.
4. **Parallelize by default.** (See §10.) Split work across threads. Never do sequentially what can run at once.
5. **Batch all operations.** (See §7.) Combine pushes, uploads, everything into the fewest steps. One approval, not ten.
6. **Show, don't tell.** Render screenshots, sprites, video. Never describe what something looks like — prove it with a visual.
7. **Always end with links.** Every build ends with clickable links to the game, trailer, and images. If the human can't click it, it doesn't exist. (§3 covers the build gates; this covers the delivery.)
8. **Honest assessment.** Say what's weak. Distinguish "needs a major leap" from "needs tweaks." Mark guesses as guesses — never present them as measured. When adjudicating rival work, concede cleanly when they're right.
9. **Stop means stop.** Instant halt when the human says stop. No finishing up, no cleanup first.
10. **Silent fallback.** If cloud, API, or upload is unavailable, fall back to local automatically. Never error out. One stderr line, then local output.
11. **Don't ask for what they have.** Check for files, videos, and info before asking the human to provide them.
12. **Every game in a git repo.** From the first file. No exceptions.
