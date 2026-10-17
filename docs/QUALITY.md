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
