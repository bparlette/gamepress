# Quality bar

Reference showpieces (Hawk repo, `brad-demos/g/`): **wasteland-van** (Roadkill Rig: cel + outline look, vehicle vs horde), **cinema-city**, **shell-shock-3d**.
Plain spheres, boxes and flat colours do not go viral. Every demo needs these, all available in `_vendor/gpkit.js`:

| Need | Use |
|---|---|
| Characters, not primitives | `catGeo()`, `zombieGeo()`, `carGeo()` merged low-poly models; `crowd()` for instanced hordes; `hero()` for one outlined character. Add a new `build([...])` model for each new creature |
| Cel look | `toon(color)` (3-step ramp) everywhere; outline hero objects (`hero()`); renderer already uses ACES tone mapping, saturation and vignette |
| Place, not a void | `sky()` gradient + fog, `groundTex()` texture, props (trees, buildings with window textures), `blobs()` contact shadows |
| Juice | `particles()` burst on every hit/eat/land; `st.shake()`; hit-stop/slow-mo in the drive plan; FOV kick on speed |
| Sound | `sfx('boom'|'meow'|'groan'|'goo'|'crash'|'pop'|'win'...)` on every event (also feeds video audio) |
| Readable numbers | big HUD counters that climb; milestone `st.hud.banner('4,000 CATS!')` |
| Payoff in 15 s | pacing knobs (`?speed`, `?grow`, `?auto`) so the video shows the satisfying part fast |

Performance budget: instanced draw calls, <= ~1.5M triangles on screen, 60 fps desktop, playable on a phone. Cap crowds (cats 4,000, zombies 5,000).

Review checklist for step 7 (look at frames at 1 s, middle, end): hook readable? characters recognisable? colour varied (not one hue)? motion on every
part of the screen? impact feedback visible? text not overlapping the HUD? Fix and re-render until all yes.


## The kit (use it, do not hand-roll)
`g/_vendor/gp3d.js`: `st.shell` (title/pause/results/replay/best/mute), `st.end`, game feel (`hitstop`, `slowmo`, `popup`, `flash`, `kick`), `st.cine` camera moves. `gpkit.js`: toon, `catGeo/zombieGeo/carGeo`, `crowd(...legs)` with walk cycle (`walkClock`), `hero`, `particles`, `sky`, `groundTex`, `blobs`. Check yourself with `gamepress grade <id>`: it scores the source and the video and prints fixes. It is a floor; always look at the stills it writes.

`createStage({style})` / `?style=`: toon, roblox (blocky Lambert), comic, painted, pixel16, pixel8 (post-process shader in gp3d.js; boxy geometry for roblox/pixel). Games must call kit builders after createStage so the style applies.
