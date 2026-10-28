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
(mapper handling, tile decoders, OAM parsers). `gamepress nesextract <rom>`
(`lib/nesextract.mjs`) covers the platform-generic layer: iNES header parse,
MD5 assert, CHR tile decode to pixel arrays, OAM sprite parse, palette
handling — no game-specific searches, so it works for any NES ROM. Steps:
obtain the ROM, assert its checksum, decode graphics (RLE/decompression as
the game does it), decode sprite pointer tables into per-frame bitmaps,
extract collision and enemy placement tables, capture palettes.

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
sound format. The `another6502` entry in tools.json (PyPI 6502 emulator,
MIT) is the ready-made interpreter for this step: instruction-stepped, not
cycle-accurate — sufficient for offline per-frame register-log capture.
Map channels one-to-one where possible (pulse→wave,
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

Implemented as `rateRatio`, `convVelocity`, `convAccel`, `convFrames` in
`kit/gbfixed.js` (K = 60.1/50 = 1.202 for the Contra NES→VB example).

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

## Target: CPS2

For CPS2 (Capcom Play System 2) the source art usually arrives as loose
sprite frames (digitized captures, sprite sheets) rather than a ROM to
extract from, so Part A becomes a **local conversion pipeline** instead
of ROM extraction. Part B is unchanged: a hand port, routine by routine.
The legal rules below apply in full — source art stays private and never
enters this repo; only the tools, the pipeline, and the specs are shared.

### The lean split: pixels local, code by AI

An LLM cannot efficiently slice pixels, calculate color distances, or
interleave bitplanes — and paying one to try burns a subscription in an
afternoon. Every mechanical stage runs locally in Python (Pillow); the
AI receives **only the generated C header and the hardware spec below**
and writes the renderer and the animation state machine against that
interface. Never upload raw PNGs or sprite sheets to the AI, and never
ask it for palettes, RGB values, or bitplane math.

| Stage | Runs | Input → Output |
|---|---|---|
| 1. Anchor & normalize | Local Python | Raw frames → canvas-standardized PNGs with one fixed foot origin for every frame |
| 2. Palette partition & quantize | Local Python | Normalized PNGs → per-tile palette assignments + a palette bank |
| 3. Slice, dedup, block-group | Local Python | Quantized frames → unique tiles, flip-variant dedup, rectangular blocks over dense regions |
| 4. Planar pack | Local Python | Tiles + blocks → `character_gfx.bin` (4bpp planar GFX data) + `character_frames.h` (metasprite descriptors) |
| 5. Renderer | AI (header + spec only) | Object-list drawing loop (68000 asm / C) |
| 6. Animation state machine | AI | Frame-duration tables + hitbox data → tick/collision update code |

### Palette strategy — the step that decides quality

Every CPS2 object carries exactly **one** palette: 15 colors + 1
transparent index, chosen from 32 palettes. So the packer's real job is
partitioning, not just quantizing:

- Build a per-character palette bank (up to 32 palettes) by clustering
  the color sets of the source tiles (e.g. k-means over tile palettes),
  then assign each tile or block its closest palette and quantize
  within it.
- Never run one global 15-color quantization over a whole digitized
  character — skin tones, costume, and effects collapse into mush.
- For digitized sources, Floyd–Steinberg dithering before quantization
  is a quality lever; tune it per game and judge by eye.
- A block (below) shares one palette across all its tiles, so
  block-grouping happens *inside* palette partitions.

### Object format — verified against the MAME driver source

This spec is taken from `cps2_render_sprites` in MAME's
`src/mame/capcom/cps2.cpp` (checked Oct 2026). Spec from the driver
source, not from secondary summaries: the patpend CPS2 page is dead
(404), and paraphrases of it in circulation swap the X/Y word order and
misplace priority.

- **Object RAM:** two 8 KB banks. Games write entries to the bank at
  **0x708000**; a second bank sits at 0x700000 (write-only — per MAME's
  map comment, no game uses it directly). A bank-swap bit (0x8040E0)
  selects the bank the hardware latches for display. There is no DMA
  copy between the banks.
- **Entry = 4 words (8 bytes):**
  - Word 0: **X** position (bits 0–9, 10-bit wrapped coordinate space);
    **bits 13–15 = priority (0–7)**.
  - Word 1: **Y** position (bits 0–9); **bits 13–14 = tile-code bits
    16–17**.
  - Word 2: tile code, low 16 bits.
  - Word 3: attributes — bits 0–4 palette (0–31), bit 5 flip X,
    bit 6 flip Y, bit 7 offset-enable (leave 0), **bits 8–11 = block
    width in tiles − 1, bits 12–15 = block height in tiles − 1**.
- **Blocked sprites:** width/height 0,0 draws a single 16×16 tile;
  larger values make one entry draw a rectangular block up to 16×16
  tiles (256×256 px), and the hardware flips the whole block. Per-tile
  scatter lists work but spend the object budget one tile at a time —
  for large digitized frames, blocks are the difference between
  fitting and not fitting.
- **Block tile layout in GFX ROM:** block tiles are addressed in
  16-code row groups — within a row, codes advance with the tile
  column; each new row starts 0x10 codes after the previous row's
  base. Place each block's tiles at a 16-aligned base code with rows
  strided by 0x10.
- **List termination:** end the object list with a terminator entry
  whose Y word is 0x8000. Without it, the hardware keeps drawing stale
  entries from the previous frame. Entries render in reverse list
  order.
- **Budget:** the bank holds 1024 entries; the hardware displays ~900
  objects per frame. Count blocks + single tiles, not raw tiles.

### Copy-paste prompt for the AI stages

Give the AI the generated header plus this prompt. The hardware block
below is the corrected spec — do not substitute other summaries.

```text
I am developing a CPS2 (Capcom Play System 2) arcade homebrew/port.

I have already processed, quantized, and packed the character sprites
into native CPS2 16x16 4bpp planar tile banks. I do NOT need you to
process image data.

Here is the C metasprite header structure generated by my local asset
pipeline:

typedef struct {
    int16_t dx;        // X offset of this tile from the actor origin
    int16_t dy;        // Y offset of this tile from the actor origin
    uint16_t tile_id;  // 16x16 tile index in CPS2 GFX memory
    uint8_t palette;   // Palette index 0-31
    uint8_t flags;     // bit 0 = flip X, bit 1 = flip Y
} CPS2_TileEntry;

typedef struct {
    uint16_t tile_count;
    const CPS2_TileEntry* tiles;
} CPS2_MetaspriteFrame;

TARGET HARDWARE SPECIFICATION (CPS2 object RAM — verified against the
MAME CPS2 driver source, src/mame/capcom/cps2.cpp):
 * Games write object entries to the bank at 0x708000. (A second bank
   sits at 0x700000; a bank-swap bit at 0x8040E0 selects the displayed
   bank and the hardware latches it for display.)
 * Each object entry is 4 words (8 bytes):
   * Word 0: X position (bits 0-9, 10-bit wrapped coordinate space);
     bits 13-15 = priority (0-7).
   * Word 1: Y position (bits 0-9); bits 13-14 are tile-code bits
     16-17.
   * Word 2: Tile code, low 16 bits.
   * Word 3: Attributes: bits 0-4 = palette (0-31), bit 5 = flip X,
     bit 6 = flip Y, bit 7 = offset-enable (leave 0), bits 8-11 =
     block width in tiles minus 1, bits 12-15 = block height in
     tiles minus 1. Width/height 0,0 = a single 16x16 tile; larger
     values make the hardware draw a rectangular block of tiles
     from one entry.
 * The object list must end with a terminator entry whose Y word is
   0x8000. The hardware displays at most ~900 objects per frame; the
   RAM bank holds 1024 entries.

TASK:
 * Write CPS2_DrawMetasprite(int16_t origin_x, int16_t origin_y,
   const CPS2_MetaspriteFrame* frame, uint8_t facing,
   uint8_t priority, uint16_t* oam, uint16_t* oam_index):
   - For each tile: sx = origin_x + dx, sy = origin_y + dy.
   - When facing == DIR_LEFT: sx = origin_x - dx - 16 and set the
     flip X bit. (Mirroring a 16 px tile about the origin subtracts
     the tile width as well; negating dx alone is off by 16 px.)
   - Pack word 0 = (sx & 0x3FF) | (priority << 13);
     word 1 = (sy & 0x3FF) | (((tile_id >> 16) & 0x3) << 13);
     word 2 = tile_id & 0xFFFF;
     word 3 = palette | (flipX << 5) | (flipY << 6).
   - Cull tiles fully outside the 384x224 playfield before writing.
   - Stop writing when *oam_index reaches 900.
 * Write CPS2_EndObjectList(uint16_t* oam, uint16_t* oam_index) that
   appends the terminator entry (Y word = 0x8000).
 * Do not include external dependencies or explanatory fluff. Output
   production-ready, compilable C only.
```

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
| NES (6502) | cc65 (incl. da65 disassembler) | https://cc65.github.io/ |
| Genesis (68000) | SGDK | https://github.com/Stephane-D/SGDK |
| CPS2 (68000) | gcc-68k cross toolchain; no SDK — the MAME driver source is the hardware spec | https://github.com/mamedev/mame |
| Virtual Boy | VUEngine + VUEngine Studio | https://github.com/VUEngine/VUEngine |

Emulators for testing: Mesen (NES), bsnes-hd / Snes9x (SNES),
mGBA (GB/GBC/GBA), mednafen / beetle-vb-libretro (Virtual Boy).

## Workflow

1. **Obtain and assert.** User supplies their ROM. Assert checksum
   (MD5) before any tool touches it. Record the exact disassembly commit
   used as the behavior reference.
2. **Extract (Part A).** Start from `gamepress nesextract <rom>` for the
   generic layer (header, MD5 assert, CHR tiles, OAM sprites, palettes,
   CHR preview PNG), then build the game-specific extraction scripts:
   graphics decoder (run the game's own decompressor offline), sprite
   tables → atlases, collision grids, enemy placement. Output preview
   images and overlays; check them by eye against the source.
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

- `gamepress nesextract <rom>` / `lib/nesextract.mjs` — generic NES ROM
  asset extraction: iNES header parse, MD5 assert, CHR tile decode to
  pixel arrays, OAM sprite parse, NES palette handling, CHR tile-sheet
  PNG previews. The Part A starting point — no game-specific searches.
- `kit/gbfixed.js` — 8.8 fixed-point math, sub-pixel accumulators,
  frame-rate conversion helpers (`rateRatio`, `convVelocity`,
  `convAccel`, `convFrames`).
- `tools.json` `another6502` — PyPI 6502 emulator (MIT) for offline
  sound-driver capture (interpreter + APU register log → target format).
- `kit/gpfeel.js` — the same mechanics in float for fast web prototyping
  (then convert to fixed-point for the ROM target).
- `kit/gpretro.js` — retro shaders if you also want a web preview that
  looks like the target hardware.
- `gamepress viral <dir>` — works on the web prototype to plan the
  announcement video.
