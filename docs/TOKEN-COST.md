# Token cost of `gamepress run` — measured 2026-10-17

**Method:** simulated a fresh AI following ORCHESTRATOR.md end-to-end on a real
idea ("flappy bird but you are a cat dodging pipes" → one-tap-reflex).
Every tool response was captured and measured. Token counts use the
chars÷4 heuristic for English/JSON on BPE tokenizers (accurate to ~±15%;
no tiktoken on this VM). Human messages cost the AI nothing and are excluded.
"Thinking" tokens are estimated from turn count × typical relay reasoning.

## Per-stage breakdown (orchestrator)

| Stage | What the AI reads/writes | Chars | ≈ Tokens |
|---|---|---|---|
| 1. Read ORCHESTRATOR.md | the one file | 3,501 | 875 |
| 2. `run` → `{"ask": "What game..."}` | JSON reply | 92 | 23 |
| 3. Relay question to human | AI message | ~120 | 30 |
| 4a. Strong match → recipe + questions | JSON reply | 548 | 137 |
| 4b. Weak match → 34-option list | JSON reply | 2,127 | 532 |
| 5. Relay questions to human | AI message | ~200 | 50 |
| 6. `--answer` → `{"status":"building"}` | JSON reply | 109 | 27 |
| 7. Polls (`--status`, ~5 polls) | JSON replies | ~550 | 140 |
| 8. `{"done": true, game, video, 7 images}` | JSON reply | 547 | 137 |
| 9. Relay links to human | AI message | ~226 | 56 |
| 10. Thinking across ~6 turns | reasoning | — | ~750 |

**Total, strong match: ~2,225 tokens.**
**Total, weak match (options list): ~2,620 tokens.**

## The old way (manual pipeline) — estimated from the Pigskin Bowl session

| Stage | Chars | ≈ Tokens |
|---|---|---|
| README.md | 2,255 | 564 |
| docs/AI-CONTRACT.md | 5,075 | 1,269 |
| docs/DRIVING.md | 13,118 | 3,280 |
| docs/VIRAL-PLAYBOOK.md | 10,564 | 2,641 |
| Recipe discovery (grep + read spec) | ~3,000 | 750 |
| `--help` reads across commands | ~4,000 | 1,000 |
| Command outputs (make/test/drive/grade JSON) | ~5,000 | 1,250 |
| Debug iterations (3–4 fix cycles reading errors/code) | ~8,000 | 2,000 |
| Thinking across ~18 turns | — | ~5,000 |
| **Total** | | **~16,750** |

## Comparison

| | Old way | Orchestrator | Saving |
|---|---|---|---|
| Tokens per game | ~16,750 | ~2,225 | **~7.5× (≈87%)** |
| Docs read | 4+ files, ~29K chars | 1 file, 3.5K chars | 8× |
| Decisions the AI makes | ~18 turns | ~6 turns | 3× |

The orchestrator's real win is **fewer decisions, not just fewer bytes**.
Thinking tokens were ~30% of the old cost; the relay pattern nearly
eliminates them.

## Honest caveats

1. **The weak-match options list is the most expensive single response**
   (532 tokens — 24% of a full run). "Football game" → 34 options is the
   common case for loose ideas, and it's pure list.
2. **ORCHESTRATOR.md is the floor.** Every run pays 875 tokens before doing
   anything. It's 78 lines; the example session is ~1/4 of it.
3. **Polling keeps the AI engaged** doing nothing. ~140 tokens of pure wait.
4. **Error recovery isn't in the protocol.** Two real builds in this session
   failed on the perf test (`slow: 661 ms/frame` vs 600 threshold —
   SwiftShader environment, not a game bug). Per the protocol the AI shows
   the error and stops: 103 tokens, human gets nothing. The whole 2,225-token
   session is wasted on an environmental flake.
5. **Build compute isn't tokens** but it is wall-clock: ~4–8 min per game
   even when the AI spends ~2K tokens. Token cost and time cost are
   decoupled — the orchestrator fixes the former, not the latter.

## Recommendations (biggest first)

1. **Trim the options list.** Show top 8 matches + "N more — reply `more`".
   Saves ~400 tokens on the most common failure path. (Issue: crude routing
   should confirm game type; fewer options make the confirm cheaper too.)
2. **Slim ORCHESTRATOR.md to <700 tokens.** Cut the example session, merge
   the cloud rules into two lines. Saves ~175 tokens off every run's floor.
3. **Add error recovery to the protocol.** `{"error": ...}` should carry a
   `{"retry": "..."}` hint (e.g. perf-flake → `--answer` resumes at test).
   A failed build currently wastes the entire session.
4. **Push instead of poll.** One `--status` with `wait: true` (long-poll),
   or a callback. Kills ~140 tokens of waiting per run.
5. **Cache the file read.** ORCHESTRATOR.md is static per release; an AI
   that has read it this session shouldn't re-read it for run #2.
   (Protocol already implies this; make it explicit: "read once per session".)
