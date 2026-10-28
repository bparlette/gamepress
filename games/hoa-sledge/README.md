# HOA SLEDGE — Code Violation #1

**One tap. One very large sledgehammer. Forty-five seconds to un-landscape the neighbour's illegal front-yard diorama.**

## Why it exists
The Gameplay is "aim-and-drop" (Gamepress `tap-timing`), but every hit is *real*: Rapier rigid bodies
(gnomes, lawn flamingos, Adirondack chairs, birdbaths, pink bikes) stack, tumble and fly. The comedy
is the physics, so the pile is authored to be top-heavy: gnome on chair on gnome.

## Controls
- **Tap / click / Space / J** — slam. The yellow reticle shows exactly where the head lands.
- The hammer auto-sweeps. Time your tap while the reticle is over the pile.
- Chain (combo) = consecutive slams that connect. Time slows for a beat on a 3+ hit.

## Round
- 45 s, target `dur × 450` points (`?dur=` and `?target=` override).
- Level 2 at 13 s, level 3 at 26 s (piles get taller and weirder).
- Params: `?auto=1` bot, `?failfirst=1` bot loses attempt 0, `?spectate=1&autostart=1` video mode,
  `?clean=1` no shell (HUD + game only).

## Build notes (external dependencies)
- **Rapier3D** (`games/_vendor/rapier3d-compat.js`) — real rigid-body physics.
- **three.js** via `kit/gp3d.js`; `kit/gpkit.js` for toon materials, lawn, fences, houses, people.
- Published to the Hawk arcade as a self-contained bundle: `g/hoa-sledge/` + `g/hoa-sledge/_kit/`
  (bundle.py copies the transitive kit closure and rewrites import specifiers).

## Press
`gamepress drive games/hoa-sledge/hook.drive.json` → `press/video/hoa-sledge-hook.mp4` (vertical,
29 s, win screen at 25.6 s). `gamepress grade hoa-sledge` → **100/100**.
