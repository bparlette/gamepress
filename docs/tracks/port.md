# Port track — convert games between retro platforms

Convert an existing game from one retro platform to another: NES→SNES,
SNES→Game Boy, NES→Virtual Boy, etc. Clean-room reimplementation —
mechanics and math ported, no copyrighted assets.

## When to use this track

- The user names a source platform and a target platform ("port this NES
  game to Virtual Boy").
- The user wants a game running on real retro hardware or an accurate
  emulator (not a web remake — that's the `demo` track).
- The user owns the source game (cartridge or ROM dump they made).

If they just want a retro-*styled* web game, use `demo` + `kit/gpretro.js`
instead. This track is for actual ROM/homebrew output.

## Toolchain map

| Target | SDK | Install |
|---|---|---|
| SNES (65816) | PVSnesLib | https://github.com/alekmaul/pvsneslib |
| Game Boy / GBC | GBDK-2020 | https://github.com/gbdk-2020/gbdk-2020 |
| NES (6502) | cc65 | https://cc65.github.io/ |
| Genesis (68000) | SGDK | https://github.com/Stephane-D/SGDK |

Emulators for testing: Mesen (NES), bsnes-hd / Snes9x (SNES),
mGBA (GB/GBC/GBA), mednafen (Virtual Boy).

## Workflow

1. **Extract mechanics.** Play the source game (or read its disassembly /
   decomp if one exists). Write down the verbs, the physics numbers, the
   enemy behaviors, the timing. Numbers and algorithms only — never art,
   music, or level layouts.
2. **Reimplement with `kit/gbfixed.js`.** 8.8 fixed-point positions,
   sub-pixel accumulators, integer-only hot paths. Prototype the feel on
   web first if useful — `kit/gpfeel.js` has the same mechanics in float
   for quick iteration.
3. **Target the SDK.** Write the game in the target SDK (C for PVSnesLib /
   GBDK-2020). Keep the fixed-point math — it maps 1:1 to hardware.
4. **Test in emulator.** Frame-step through jumps, collisions, scrolling.
   Compare feel against the source game side by side.
5. **Hardware test (optional).** Flash cart / EverDrive if the user has one.

## Legal — hard rules

- **Clean-room only.** Reimplement mechanics from observation. Never copy
  code, art, music, or level data from the original.
- **No Nintendo assets.** Sprites, tiles, music, sound effects from the
  original game must be recreated from scratch or replaced.
- **User must own the source.** If porting a commercial game, the user
  needs to own a copy. We link to SDKs and docs, never to ROMs.
- **Math is fair game.** Physics constants, state machines, and algorithms
  are not copyrightable expression. Cite sources in comments.

## Example: NES → Virtual Boy

1. Source: an NES platformer the user owns. Extract: run speed, jump arc
   (apex height in pixels, hang frames), enemy patrol patterns, scroll
   speed.
2. Prototype: rebuild the movement in a web page using `kit/gpfeel.js`
   (`characterStep`, coyote time, jump buffering) until it feels right.
3. Convert: rewrite positions with `kit/gbfixed.js` 8.8 fixed-point —
   this is what the Virtual Boy's 32-bit CPU expects.
4. Target: Virtual Boy homebrew via the VB SDK (or mednafen for testing).
   Virtual Boy is stereoscopic — duplicate the playfield with a horizontal
   offset per eye; gameplay math stays identical.
5. Test: mednafen with anaglyph/3D output, compare jump feel against the
   NES original running in Mesen.

## What gamepress provides

- `kit/gbfixed.js` — 8.8 fixed-point math, sub-pixel accumulators.
- `kit/gpfeel.js` — the same mechanics in float for fast web prototyping
  (then convert to fixed-point for the ROM target).
- `kit/gpretro.js` — retro shaders if you also want a web preview that
  looks like the target hardware.
- `gamepress viral <dir>` — works on the web prototype to plan the
  announcement video.
