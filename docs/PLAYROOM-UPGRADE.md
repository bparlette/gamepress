# PlayroomKit upgrade — instant multiplayer

**Stage: FULL GAME only (or a multiplayer demo variant). Never in the base
demo build — a 20-second viral clip has no use for a second player.**

[PlayroomKit](https://joinplayroom.com) drops 1–4 player realtime sync and
phone-as-controller into any Three.js canvas. The killer feature for
gamepress: it renders a **QR code on screen**; spectators scan it and their
phone becomes a controller. No app install, no accounts.

## 15-line integration

```html
<script src="https://unpkg.com/playroomkit/multiplayer.umd.min.js"></script>
<script type="module">
import { createStage } from '../_vendor/gp3d.js';

await Playroom.insertCoin({ gameId: 'YOUR_GAME_ID' }); // shows the QR code
// get the player's phone-as-gamepad state every frame:
function update(dt) {
  const players = Playroom.getPlayers(); // [{ getState('left'), ... }]
  for (const p of players) {
    const move = p.getState('move') || { x: 0 }; // set from phone UI
    // ... drive your entity with move.x, same as keyboard input
  }
}
Playroom.onPlayerJoin(p => spawnPlayer(p)); // late joiners just work
</script>
```

Design the phone UI once with `Playroom.setStateForPlayer()` /
`UI.insert()` joystick + buttons — PlayroomKit ships a virtual gamepad.

## Which recipes benefit

| Recipe | Why |
|---|---|
| `arena-brawler` | 1v1/2v2 on one screen; phones are the controllers |
| `kart-racer` | 4-player split-input without split-screen hardware |
| `footsies-duel` | versus is the whole game; QR code = instant opponent |

## Notes

- Get a free `gameId` at joinplayroom.com (one per game).
- Vendor the UMD for store builds — `lint` flags external requests
  (stores run games sandboxed/offline).
- State sync is **not** deterministic lockstep; it's snapshot
  interpolation. Fine for party games, wrong for ranked fighters —
  pair with `docs/RAPIER-UPGRADE.md` if you need both.
- Keep the single-player bot path (`?auto=1`) working: the viral clip
  pipeline films the game without any phones present.
