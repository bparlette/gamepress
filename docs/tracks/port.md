# Port track — convert games between retro platforms

Convert an existing game from one retro platform to another: NES→SNES,
SNES→Game Boy, NES→Virtual Boy, etc. This is a **hand port**, not a ROM
converter: automated asset extraction from the user's own ROM plus manual
reimplementation of the game logic. No NES code runs in the shipped game
(except the sound driver — see below).

Reference implementation: the Contra (NES) → Virtual Boy port
(github.com/alchemy27/Contra_VB), which this track's workflow is modeled
on. ~9,300 lines of Python tooling, ~6,000 lines of generated C, 16 builds
to shippable.

## When to use this track

- The user names a source platform and a target platform ("port this NES
  game to Virtual Boy").
- The user wants a game running on real retro hardware or an accurate
  emulator (not a web remake — that's the `demo` track).
- The user owns the source game (cartridge or ROM dump they made) and can
  supply the ROM file. The tools never ship with a ROM.

If they just want a retro-*styled* web game, use `demo` + `kit/gpretro.js`
instead. This track is for actual ROM/homebrew output.

## The two-part model

Every port has two parts. They have different automation profiles — do not
conflate them.

**Part A — automated asset extraction (mechanical, generalizable).**
Python scripts read the user's ROM and produce target-format assets:
tiles, maps, sprite frames, collision grids, enemy tables, palettes.
This part is reproducible and can be tooled once per source platform
(mapper handling, tile decoders, OAM parsers). Steps: obtain the ROM,
assert its checksum, decode graphics (RLE/decompression as the game does
it), decode sprite pointer tables into per-frame bitmaps, extract
collision and enemy placement tables, capture palettes.

**Part B — manual logic reimplementation (game-specific, not mechanical).**
All gameplay — player physics, enemy state machines, weapons, bosses,
room transitions — is rewritten in the target's language by reading the
annotated community disassembly and copying its constants, tables, and
state machines. A different game needs its own disassembly and its own
rewrite. Budget for this honestly: it is a hand port, routine by routine,
checked against the ROM. It is the bulk of the work.

## The sound exception

The one place source-platform code actually runs is the sound engine.
Technique (generalizable): write a minimal CPU interpreter for the source
platform (for NES: 6502, official opcodes only — no decimal mode, no
undocumented opcodes needed for most sound drivers), execute the game's
own sound driver **offline at build time**, record what it writes to the
audio registers per frame, and convert that recording to the target's
sound format. Map channels one-to-one where possible (pulse→wave,
triangle→wave, noise→noise), bake pitch/volume envelopes as keyframes,
and accept documented losses (DMC samples have no equivalent on most
targets — replace with noise bursts or drop; duty-cycle changes mid-sound
collapse to the dominant duty).

## Frame-rate conversion

Source and target rarely share a refresh rate (NES 60.1 Hz vs Virtual Boy
~50 Hz). This is an approximation, not cycle-accurate:

- Velocities × K, accelerations × K², where K = source_hz / target_hz.
- Durations in source frames converted proportionally (round; prefer
  matching durations and distances over per-frame positions).
- Do not model source lag frames, sprite flicker, or OAM limits.
- Randomness is not reproduced — substitute deterministic behavior and
  document it.
- Exception: reproduce exact check ordering where it decides gameplay
  (e.g. jump-landing probe windows that determine which ledges are
  climbable).

Use `kit/gbfixed.js` 8.8 fixed-point for positions — it maps 1:1 to
retro hardware integer math. Prototype feel on web first with
`kit/gpfeel.js` (same mechanics in float), then convert.

## Resolution and screen adaptation

When the target shows more screen than the source (VB 384 px wide vs NES
256 px), retune — do not just center:

- Enemies must spawn beyond the wider view (camera + margin), or they pop
  in visibly.
- Separate the **logic window** (full target view — enemies can be hit
  anywhere visible) from the **firing window** (source-sized — keeps
  original pacing and difficulty).
- Bullets live to the target screen edge.
- For stereoscopic targets (Virtual Boy): depth is a fixed per-eye x
  offset per layer, assigned by **content type** (sky/mountains far,
  playfield near) — not by screen row. Extend background layers under
  cliff edges so the parallax shift never opens gaps. There is no general
  mechanism for mid-frame raster effects; each needs a per-game
  substitute.

## Memory budgets shape the design

Retro targets have hard limits that force design decisions — discover
them early, not at link time:

- Character/tile memory (practical resident limits are far below nominal).
- Sprite/object counts per frame.
- Fixed engine memory pools (cannot simply be enlarged; pay for new
  actors by removing others).
- Chunk/streaming: cut large layers into screen-sized pieces and stream
  with padding; keep the worst-case resident set under budget before
  adding any actor.

When the build breaks on memory, the fix is always fewer simultaneous
things (bullets, explosions, pooled enemies) — never a bigger pool.

## Verification ladder

A port is done when it passes all four, in order:

1. **Data assertions (automated).** ROM checksum assert before any tool
   runs; extracted tables asserted against the disassembly; round-trip
   checks (target chars → image → compare).
2. **Visual comparison (manual).** Rendered levels and collision overlays
   checked against the source; stereo/depth previews inspected.
3. **Emulator bots (automated).** Scripted playthroughs (input scripts +
   memory-address checkpoints read from the built ELF each build) that
   reach every level/room/boss. Screenshots inspected by eye.
4. **Hardware playthrough (manual, the final gate).** Flash cart, real
   console, played by a human. The emulator is not trusted on its own —
   real hardware fails in ways emulators do not (state-change crashes,
   uninitialized memory reading as live framebuffer).

## Toolchain map

| Target | SDK | Install |
|---|---|---|
| SNES (65816) | PVSnesLib | https://github.com/alekmaul/pvsneslib |
| Game Boy / GBC | GBDK-2020 | https://github.com/gbdk-2020/gbdk-2020 |
| NES (6502) | cc65 | https://cc65.github.io/ |
| Genesis (68000) | SGDK | https://github.com/Stephane-D/SGDK |
| Virtual Boy | VUEngine + VUEngine Studio | https://github.com/VUEngine/VUEngine |

Emulators for testing: Mesen (NES), bsnes-hd / Snes9x (SNES),
mGBA (GB/GBC/GBA), mednafen / beetle-vb-libretro (Virtual Boy).

## Workflow

1. **Obtain and assert.** User supplies their ROM. Assert checksum
   (MD5) before any tool touches it. Record the exact disassembly commit
   used as the behavior reference.
2. **Extract (Part A).** Build the extraction scripts: graphics decoder
   (run the game's own decompressor offline), sprite tables → atlases,
   collision grids, enemy placement, palettes. Output preview images and
   overlays; check them by eye against the source.
3. **Reimplement (Part B).** Rewrite game logic routine by routine from
   the disassembly, in the target SDK's language. Constants, tables, and
   state machines come from the ROM. Prototype feel on web with
   `kit/gpfeel.js` first if useful, then commit to fixed-point with
   `kit/gbfixed.js`.
4. **Convert sound.** Interpreter + offline capture + register-log to
   target format (see "The sound exception").
5. **Adapt the screen.** Retune spawns, logic/firing windows, and depth
   layers for the target's resolution (see above).
6. **Budget memory.** Count worst-case resident tiles, sprites, and pool
   usage before adding actors. Stream large layers in chunks.
7. **Climb the verification ladder.** Data assertions → visual checks →
   emulator bots → hardware playthrough.

## Legal — hard rules

- **User supplies the ROM.** The tools never contain a ROM, extracted
  assets, or generated ROMs. The user provides their own dump of a game
  they own.
- **Extracted assets stay private.** Tiles, maps, sprites, and sound
  data extracted from the ROM are the copyright holder's material. Keep
  them private; distribute only the tools and the reimplemented code.
- **Logic reimplementation, not code copying.** Gameplay code is
  rewritten from the disassembly's behavior, not translated. Math,
  physics constants, state machines, and algorithms are not
  copyrightable expression — cite sources in comments.
- **No asset redistribution.** Sprites, tiles, music, or sound effects
  from the original game are never published or shared.
- We link to SDKs, emulators, and docs — never to ROMs.

## Example: NES → Virtual Boy (Contra)

1. Source: user's Contra (US) dump, MD5 asserted. Disassembly cloned
   for behavior reference (sprite names, constant checks).
2. Extract: Python runs the game's RLE graphics decoder offline into a
   PPU image; sprite pointer tables become per-pose atlases; collision
   grid and enemy tables read from ROM. Stereo preview PNGs checked by
   eye.
3. Prototype: player physics rebuilt on web with `kit/gpfeel.js`
   (`characterStep`, coyote time, jump buffering) until the jump arc
   matches.
4. Convert: positions to `kit/gbfixed.js` 8.8 fixed-point; velocities ×
   60.1/50, accelerations × K², durations rescaled.
5. Target: VUEngine project generated from templates; depth layers cut
   into ≤384 px chunks with per-eye parallax by content type; spawn
   distances extended for the 384 px view; firing kept to an NES-sized
   window.
6. Sound: 6502 interpreter runs Contra's sound driver offline; APU
   register log → VSU tracks (pulse/triangle/noise mapped, DMC dropped).
7. Verify: data asserts → overlay renders → emulator bots play through
   every room → flash cart on a real Virtual Boy.

## What gamepress provides

- `kit/gbfixed.js` — 8.8 fixed-point math, sub-pixel accumulators.
- `kit/gpfeel.js` — the same mechanics in float for fast web prototyping
  (then convert to fixed-point for the ROM target).
- `kit/gpretro.js` — retro shaders if you also want a web preview that
  looks like the target hardware.
- `gamepress viral <dir>` — works on the web prototype to plan the
  announcement video.
