# Quality bar

Gamepress builds the **most enjoyable, visually authentic, commercial-grade forms of every game**.
Nothing in Gamepress is a minimalist web toy, stick-figure prototype, or barebones demo. Whether building a full game or an automated YouTube Short:

## Core Quality Mandate (Ignore Artificial Constraints)
1. **Never Compromise on Assets or Fidelity**:
   - **Ignore artificial constraints** (such as "must be under 20KB", "no external images", or "vanilla canvas only") unless explicitly requested by the user.
   - Use the highest quality assets available: genuine sprite sheets, high-resolution layered parallax stages, CRT scanline & bloom post-processing, and multi-layer sound.
2. **Instant, High-Tempo Gameplay (Zero Dead Time)**:
   - Characters must never stand still waiting. In demos and videos, aggressive action begins from frame 1.
   - Scripted high-octane flow: immediate projectile clashes, rush-down combos, parries, anti-air counters, and dramatic K.O. finishes.
3. **Professional Combat & Physics Architecture**:
   - Active frame windows, hit invulnerability buffers, spatial hurtbox checks (ducking under highs, jumping over sweeps).
   - Hitstop freezes (100–350ms), directional camera shake, spark bursts, and slow-mo zoom.
4. **Authentic Audio**:
   - Dynamic synth chords, FM bass grooves, impactful hit thuds, and voice announcer calls.
5. **Native 9:16 Short & 16:9 Landscape Dual Support**:
   - Always format clips cleanly for vertical YouTube Shorts / TikTok with high-contrast text banners, combo counters, and K.O. callouts.

Reference showpieces (Hawk repo, `brad-demos/g/`): **wasteland-van** (Roadkill Rig: cel + outline look, vehicle vs horde), **cinema-city**, **shell-shock-3d**, **street-fighter-arcade**.
Plain spheres, boxes and flat colours do not go viral. Every demo needs these, all available in `_vendor/gpkit.js`:

| Need | Use |
|---|---|
| Characters, not primitives | `catGeo()`, `zombieGeo()`, `carGeo()` merged low-poly models; `crowd()` for instanced hordes; `hero()` for one outlined character. Add a new `build([...])` model for each new creature |
| Cel look | `toon(color)` (3-step ramp) everywhere; outline hero objects (`hero()`); renderer already uses ACES tone mapping, saturation and vignette |
| Place, not a void | `sky()` gradient + fog, `groundTex()` texture, props (trees, buildings with window textures), `blobs()` contact shadows |
| Physics, not flat boxes | `gpmatter.js` / Matter.js / Rapier for realistic rigid bodies, ragdoll tumbles, pinball bumpers, spring constraints; `gpphys.js` for lightweight circles/craters |
| Juice & Spring Physics | `gptween.js` `punch(obj, prop, amount)`, `tween()`, `spring()`, `Easing.easeOutElastic` for squashes, stretches, camera zooms; `particles()` burst on hits; `g.shake()` / `st.shake()`; hit-stop/slow-mo |
| Sound & Adaptive Music | `sfx()` for multi-oscillator hits/coins; `startBgm()` / `playChord()` in `gpaudio.js` for adaptive background synth loops that speed up during combos |
| Readable numbers | big HUD counters that climb; milestone `st.hud.banner('4,000 CATS!')` |
| Payoff in 15 s | pacing knobs (`?speed`, `?grow`, `?auto`) so the video shows the satisfying part fast |

Performance budget: instanced draw calls, <= ~1.5M triangles on screen, 60 fps desktop, playable on a phone. Cap crowds (cats 4,000, zombies 5,000).

Review checklist for step 7 (look at frames at 1 s, middle, end): hook readable? characters recognisable? colour varied (not one hue)? motion on every
part of the screen? impact feedback visible? text not overlapping the HUD? Fix and re-render until all yes.


## The kit (use it, do not hand-roll)
`g/_vendor/gp3d.js`: `st.shell` (title/pause/results/replay/best/mute), `st.end`, game feel (`hitstop`, `slowmo`, `popup`, `flash`, `kick`), `st.cine` camera moves. `gpkit.js`: toon, `catGeo/zombieGeo/carGeo`, `crowd(...legs)` with walk cycle (`walkClock`), `hero`, `particles`, `sky`, `groundTex`, `blobs`. Check yourself with `gamepress grade <id>`: it scores the source and the video and prints fixes. It is a floor; always look at the stills it writes.

`createStage({style})` / `?style=`: toon, roblox (blocky Lambert), comic, painted, pixel16, pixel8 (post-process shader in gp3d.js; boxy geometry for roblox/pixel). Games must call kit builders after createStage so the style applies.
