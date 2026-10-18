# Rotation rules (packs and hubs)

What the Cat Arcade demo taught us. These rules apply to every rotating page: the four packs (`templates/packs/pack.html`: two 15-game, two 5-game demos) and the hubs (`templates/hub/hub.html`, incl. casts). Change them in those two templates and the kit, not per game.

1. **Show the game, don't start it.** Games load with `?pack=1&hold=1`. `kit/gp2d.js` keeps drawing but freezes the simulation; `kit/gp3d.js` pauses logic and keeps rendering. The first touch or key anywhere starts it (`window.__gpHold`) and posts `{gp:'started'}` to the parent; the round timer starts then. No "tap to start" text.
2. **The first touch is also the first input.** It is not swallowed, so a tap in the middle of the screen can start the game and drive the stick or flap in the same gesture.
3. **The stick works anywhere.** `kit/gptouch.js` anchors the floating stick under the thumb wherever it lands (not only the left half), unless the touch is on a button.
4. **One play per game, rapid fire, endless loop.** Last game goes back to the first. Demos loop too (the GET THE FULL PACK button stays in the bar). Full-hub only: finishing a whole loop opens the hero-unlock screen; demos never unlock.
5. **A second turn only for a quick loss**: you lose within 3 s of the first touch, or finish with a score of 0. One retry per game, new seed (toast "AGAIN!").
6. **Touch hygiene in the kit**: `touch-action:none` on the canvas and page, pointer + touch listeners, overlay z-index above the game's own touch layer. Check with the headless touch test (Input.dispatchTouchEvent), then a real phone.

Test checklist for a rotation page: each game shows a picture before the touch (not black), is frozen until the touch, runs after it, no console errors; the hub reaches the last game and wraps to the first.
