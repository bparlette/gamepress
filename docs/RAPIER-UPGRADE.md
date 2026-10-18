# Rapier upgrade — full-game physics

**Stage: FULL GAME only. Demos stay on hand-written physics / `kit/gpfeel.js`.**

`docs/MAKING-GAMES.md` explains why demos hand-roll physics: one contact
type, fully deterministic, no WASM load. That stops being true when:

- **Real players play** — not scripted bots. Unpredictable input needs a
  solver, not bespoke contact code.
- **Stacking / friction / joints** — towers, ragdoll chains, vehicles with
  suspension. Hand-rolled Verlet hits a wall here.
- **Netcode** — Rapier is bit-deterministic across clients (same inputs,
  same WASM build → same result). JS float drift breaks lockstep.

## Install

```bash
npm i @dimforge/rapier3d-compat   # 3D (use rapier2d-compat for 2D)
```

No build step needed — the `-compat` bundle runs in the browser as-is.
Vendor the file next to the game (stores run games sandboxed; see `lint`).

## Migration pattern

Replace the ad-hoc velocity integration, keep everything else:

```js
import RAPIER from './rapier3d-compat.js';
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

// one rigid body per dynamic entity, fixed 60 Hz step
function update(dt) {
  world.timestep = 1 / 60;
  world.step();
  for (const e of entities) {
    const p = e.body.translation(), q = e.body.rotation();
    e.mesh.position.set(p.x, p.y, p.z);
    e.mesh.quaternion.set(q.x, q.y, q.z);
  }
}
```

Bind rigid-body position **and** rotation quaternion directly to the
Three.js mesh instances. The render loop stays separate from the fixed
physics step (same contract as `docs/DRIVING.md`).

## What stays in gpfeel.js

Game feel is **not** physics. These stay, unchanged, on top of Rapier:

- `squashStretch()` / `SquashStretch` — visual deformation on impact
- `RetroController` coyote time + jump buffering — input forgiveness,
  not simulation
- `TraumaCamera` — screen shake is presentation
- `DeterministicRNG` — seeded RNG for spawns/loot (independent of physics)
- `VirtualAPU` — audio, untouched

Rule of thumb: **Rapier owns the simulation, gpfeel owns the feel.**

## What to watch for

- WASM init is async — gate `st.run()` on `RAPIER.init()` resolving.
- CCD (continuous collision detection) for fast projectiles:
  `body.enableCcd(true)` — otherwise tunneling at 60 Hz.
- Determinism across machines needs the **same Rapier version** vendored
  for every client. Pin it.
