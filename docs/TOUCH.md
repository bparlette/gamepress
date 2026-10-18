# TOUCH.md — Mobile touch standard

**Rule: every action game gets the modern mobile layout. No fixed pads, no tiny
rectangles.**

The industry standard (Brawl Stars, Genshin Impact, Archero):

```
┌────────────────────────┬────────────────────────┐
│                        │                        │
│   LEFT HALF            │   RIGHT HALF           │
│   floating joystick    │   circular buttons     │
│                        │                        │
│   touch anywhere ->    │        (B)             │
│   stick anchors        │   (A)                  │
│   under thumb,         │                        │
│   drag = move vector   │   A = primary action   │
│                        │   B = secondary        │
└────────────────────────┴────────────────────────┘
```

## The spec

| Component | Placement | Behavior |
|---|---|---|
| Virtual stick | Left 50% (`x < innerWidth/2`) | Floating anchor on pointerdown; drag vector clamped to maxRadius, normalized to [-1, 1]; resets on release |
| Action buttons | Bottom-right cluster | Circular, 64–84px targets (+8px invisible padding), scale-tween on press |
| Events | PointerEvent API | Distinct `pointerId` per touch — stick drag and button taps never cancel each other |
| Hygiene | `touch-action: none` | No scroll, zoom, or rubber-banding; no text selection |

## Wiring it up — `kit/gptouch.js`

Zero dependencies, ESM, DOM overlay (no canvas needed):

```js
import { TouchController, isTouchDevice } from '../_vendor/gptouch.js';

// Only on real touch devices. Desktop: null, keyboard path runs untouched.
// ?touch=0 forces it off (testing). Headless/bot runs see no touch -> null,
// so drive/botcheck are unaffected.
const TC = isTouchDevice() ? new TouchController({
  buttons: [
    { id: 'a', label: '⚔' },   // primary, big, bottom-most
    { id: 'b', label: '🛡' },   // secondary
  ],
  maxRadius: 56,   // stick throw, px
  deadzone: 0.18,  // stick deadzone, 0..1
}) : null;

function update(dt) {
  const ti = TC ? TC.getInput() : null;  // call ONCE per frame
  const left  = (ti && ti.x < -0.35) || g.keys.ArrowLeft;
  const right = (ti && ti.x >  0.35) || g.keys.ArrowRight;
  const jumpP = (ti && ti.aPressed)  || g.pressed.Space;  // edge
  const jumpH = (ti && ti.a)          || g.keys.Space;    // held
  ...
}
```

`getInput()` returns `{ x, y }` (stick, -1..1, deadzone applied) plus one entry
per button: `{ [id]: held, [id]Pressed: edge }`. The `*Pressed` flags
**auto-consume on read** — call `getInput()` exactly once per frame.

Conventions:
- Button `a` = primary action (attack / jump / punch), `b` = secondary.
- Merge with keyboard with `||` — keyboard always works, touch adds.
- When `ti` is non-null, skip the old `g.btn(...)` canvas buttons (the DOM
  overlay replaces them); the `g.btn` fallback stays for desktop/mouse.
- Stick Y: up is negative. For 2D platformers use `x` only; brawlers use both.

## When to use it

- **Always** for: platformers, brawlers, duel/fighting, run-and-gun, kart, shmup —
  anything with movement + 1–3 actions.
- **Don't** for: tap-anywhere games (one-tap-reflex), drag-only (bullet-heaven),
  menus — the overlay would swallow the taps those games need.

## Customizing

```js
new TouchController({
  buttons: [
    { id: 'a', label: '🔥', size: 88 },
    { id: 'b', label: '💨', size: 64 },
    { id: 'c', label: '🛡', size: 64 },
  ],
  maxRadius: 64,
  deadzone: 0.12,
  force: true,   // build DOM even without touch (dev testing)
});
```

`TC.destroy()` removes the overlay. `isTouchDevice()`, `clampStick()`, and
`stickVector()` are exported pure and unit-tested (`test/gptouch.test.mjs`).
