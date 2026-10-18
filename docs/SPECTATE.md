# Spectate / attract mode (gamepress standard)

The arcade attract-mode pattern, standardized. Every gamepress game **must** support it.

## The contract

Three URL params. No exceptions, no renames:

| Param | Meaning |
|---|---|
| `?spectate=1` | Attract mode: the player becomes a bot, bots play each other, the camera directs itself at the action |
| `?autostart=1` | Skip all menus, straight into gameplay |
| `?seed=N` | Deterministic RNG seed — same seed, same match, every take |

Example: `game.html?spectate=1&autostart=1&seed=42`

## Why it exists

Scripted input ("walk forward, click at t=3") produces dead footage — the failure mode behind two rejected HOA Warfare videos. A game playing itself with a heat-seeking camera produces real kills, real drama, real juice. The game is its own stunt performer.

`gamepress drive` prefers spectate plans over scripted input. Scripted input is the fallback, not the default (see `docs/DRIVING.md`, `docs/VIRAL-PLAYBOOK.md`).

## What the game must do

1. **Parse the params.** Use `parseSpectateParams()` from `kit/gpfeel.js`:
   ```js
   import { parseSpectateParams } from '../kit/gpfeel.js';
   const { spectate, autostart, seed } = parseSpectateParams();
   ```
   Seed your RNG with `seed` (see rule 3 in `docs/RECIPE-RULES.md` — `?seed=` is already required there).

2. **In spectate mode, the "player" is a bot.** Same bot brain as `?auto=1`, but the camera is cinematic, not first-person. No HUD elements that assume a human (crosshair, "press X" prompts).

3. **Drive the camera with `spectateCamera()`.** From `kit/gpfeel.js`:
   ```js
   import { spectateCamera } from '../kit/gpfeel.js';
   // each frame:
   spectateCamera(cam, actors, recentEvents, { dt });
   // actors: [{ id, x, y, z, alive, target? }]  — target = who they're fighting
   // recentEvents: [{ type: 'kill'|'hit'|'score', x, z }] — your game's event log
   // cam: { x, y, z, lookX, lookY, lookZ } — same contract as updateCamera()
   ```
   The director scores actors by event heat (kill=3, hit=1, other=0.5, decaying), chases the hottest actor positioned behind them relative to their target, and slow-orbits the arena when nothing is happening. Never a dead frame.

4. **Emit events.** The camera is only as good as your event feed. Push `{ type, x, z }` for kills, big hits, scores, and goals into whatever array you hand to `spectateCamera()`. (Reuse `window.__events` if you already log there for `gamepress drive` audio.)

5. **Autostart skips everything.** Title screen, faction select, difficulty — all skipped. One exception: if the game needs a user gesture for audio, start muted; `drive` captures audio from the event log, not the speakers.

## Camera rules

- **Chase the action, not the player.** In spectate mode there is no player. Frame whoever is about to do something interesting.
- **Cut to kills.** A kill event should yank the camera's attention — the heat model does this automatically (kill=3 dominates).
- **Orbit on downtime.** Between waves, during respawns, before first contact: slow orbit, never static.
- **Never show a menu.** If the game is in any menu state during `?spectate=1`, that's a bug.

## Testing it

Load `game.html?spectate=1&autostart=1&seed=7` in a browser. You should see bots fighting with a camera that follows the kills, with zero input from you. If it looks boring, the problem is your event feed or your bot — not the camera.

`gamepress drive` with `"spectate": true` in the plan does this headlessly and records it (see `docs/DRIVING.md`).
