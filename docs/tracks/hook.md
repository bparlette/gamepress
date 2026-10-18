# Track: hook (viral vertical video)

A hook video is a game shipped as a 15-59 s vertical clip. It is held to the same bar as a store release: if the game looks cheap, the video is wasted.

```
gamepress status <id> --json          # what exists, what is stale
gamepress all <id> --track hook       # test -> render video -> grade (skips what is done; --force redoes)
gamepress grade <id>                  # score, exact fixes, 3 stills: LOOK at them
```
Needs: nothing (no accounts). Output: `press/video/<id>-hook.mp4` (+ `.thumb.jpg`) **plus** the alternate orientation `press/video/<id>-hook-horizontal.mp4` — every video-producing run captures the game natively in both 9:16 and 16:9 (two real playthroughs, no cropping). Override with `--horizontal-only` / `--vertical-only`.

## The look (what the grader enforces, see `docs/QUALITY.md`)
- Real characters (cats, zombies, cars), toon look, textured ground, sky, particles; never plain balls.
- Game shell + feel from `gp3d.js`: `st.shell`, `st.end`, `st.hitstop`, `st.slowmo`, `st.popup`, `st.flash`, `st.kick`, `st.cine`. Walk cycle: `crowd(scene, geo, n, true, legHeight)` + `walkClock.value = st.t`.
- Video plan (`examples/<id>/hook.drive.json`): caption at t<=1 s, CTA caption at the end, `blur: 2`, `fade: {in, out}`, audio `{source:"window.__events", music:"bed"}`. Two-pass loudness lands on -14 LUFS.
- Subject must be readable on a phone: check the stills for scale and clutter. A 100/100 grade is a floor, not proof.

Other tracks reuse the same video: `demo` adds the demo-page entry, `web-store` adds bundle + store images + copy.
