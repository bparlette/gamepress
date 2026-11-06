# Capabilities — the single-file map of gamepress

**Read this first if you are an AI building with gamepress directly** (not
relaying through `gamepress run` — relay AIs read `ORCHESTRATOR.md` only).
One page per question: *for this use case, which tools, which techniques,
which assets exist?* Every entry is one line with a verdict; the deep doc is
linked where one exists. `tracks.json` is the machine-readable version of
the track map; `gamepress context` is the ~400-token build cheat sheet.

## The four use cases (`docs/USE-CASES.md`)

**Default rule: every request is Use Case 1 (viral video demo) unless the
human explicitly says "full game", "assets", or "trailer". Never ask.**

### 1. Viral video demo — "gamepress youtube" (DEFAULT)

- **Goal:** the game exists to be filmed. The video is the product.
- **Delivers, always, all three:** playable link (verified loading) +
  downloadable video (permanent link) + viral title for the Short.
- **Tools:** `gamepress run` / `auto` / `lego` / `make` (build), `drive`
  (scripted bot capture, `docs/DRIVING.md`), `all --track hook`, `grade`,
  `host` (GitHub Pages for the demo; video links back to the itch.io page).
- **Techniques:** ART-FIRST — sprites first in **both** 8-bit and 16-bit,
  presented side by side for the human to pick; background second, matching
  the winner; code only after both approvals (`docs/SPRITE-ATLAS.md` §5/§5a,
  slicer `tools/slice_spritesheet.py`). **5-PLAY RULE** — record 5 bot runs,
  edit the best moments into one reel, never one continuous playthrough.
  VIRAL-PLAYBOOK (`docs/VIRAL-PLAYBOOK.md`): hook in the first second, one
  gag per Short, fail-then-win, title = surprising claim or payoff (never
  "trailer"), 9:16 safe zones, juice hierarchy (hit-stop first).
- **Quality rule:** demo and full game differ only in LENGTH, never in
  quality — best physics, juice, and visuals in every demo.
- **Assets:** sprite workflow + Lospec palettes, Kenney packs, Game Icons
  (see Asset sources below). Sound: gameplay audio front and center.

### 2. Store assets — "gamepress assets"

- **Goal:** upload-ready store packages for games that already exist.
- **Tools:** `pack` / `publish-pack` / `check` (spec verification), `scenes`
  (stills/clips from a recording), `catalog` (thumbnails), `host` targets:
  itch (butler), Steam (steamcmd), CrazyGames (**manual checklist only —
  no API**), Cloudflare, GitHub Pages, YouTube (API). Specs live in
  `presets/platforms.json` — verify against current store docs before use.
- **Tracks:** `web-store` (`docs/tracks/web-store.md`).
- **Done =** files meeting each store's spec, verified by `check`.

### 3. Trailer production — "gamepress trailer"

- **Goal:** cinematic trailers and vertical clips cut from gameplay.
- **Split of labor:** gamepress captures (`drive`, spectate mode,
  `docs/SPECTATE.md`); **videopress edits** (its `docs/CAPABILITIES.md`
  is the single-file map over there). HyperFrames (HTML → MP4) is the
  motion-design option for title/promo pieces (see `docs/TOOLING.md`).

### 4. Playable game — "full game" (explicit words only)

- **Goal:** the funnel's end — a game a stranger would actually play.
- **Tools:** `approve` / `expand` (scale an approved vertical slice),
  `test` + `botcheck` (lose-then-win proof), `grade`, `pack`, `host`.
- **Techniques:** Nintendo feel (`docs/NINTENDO-FEEL.md`), quality bar
  (`docs/QUALITY.md`), kit modules below. Track: `full-game`.

## Tracks (`tracks.json` → `docs/tracks/*.md`)

| Track | Purpose | Extra tools |
|---|---|---|
| shared | research, build, test, drive, pack — serves every track | `research new test drive scenes pack check bundle catalog status all grade copy build make doctor lint ideate voices icons repo botcheck context auto lego heal hooks stats local-ai approve expand` |
| hook | viral vertical video at full quality | `all --track hook`, `grade`, `drive` |
| demo | browser demo page on GitHub Pages | `publish-demo` |
| web-store | itch / CrazyGames / Steam / YouTube publishing | `build --target web\|steam`, `publish-pack`, `host` |
| full-game | approved slice → full production game | `approve expand test grade pack host` |
| roblox | Roblox experiences: Studio build, headless Luau tests, safe publish | `roblox`, `roblox-test`, `roblox-ship` — needs the owner's Open Cloud key (`docs/ROBLOX.md`) |
| port | retro platform conversions (e.g. NES → Virtual Boy) | `kit/gbfixed.js`, `lib/nesextract.mjs`, `another6502` — user must own the source game; extracted assets stay private · decomp mechanics references (formulas/numbers only): `docs/decomp-mechanics/` — SM64DS movement, Melee frame data, **Galaxy spherical gravity (100% decomp, refreshed Nov 5 2026)**, Pikmin 2 AI; index in `docs/DECOMP-REFERENCE.md` |
| monetize | revenue micro-games / micro-SaaS, day-1 paywall | shared set + `kit/gpmonetize.js` |

## Building blocks

- **Recipes:** 34 built-in game recipes (one-tap-reflex, bullet-heaven,
  kart-racer, merge-sandbox, mini-zelda, …) — `gamepress recipes`; rules in
  `docs/RECIPES.md` + `docs/RECIPE-RULES.md`.
- **Lego kit:** controllers (topdown, swerve, aim-flick, tap-drop, orbit),
  spawners, hooks (vacuum-collect, chain-explode, merge-tier, …),
  progressions — composed by `gamepress lego`.
- **Kit modules (`kit/`):** gp2d / gp3d engines, gpfeel (juice), gpfx,
  gpphys, gpchar, gpsprites, gpaudio, gpmusic (seeded BGM composer),
  gptouch (`docs/TOUCH.md`), gpviewport
  (9:16 safe zones), gpshaders / gptoon, gpretro + gbfixed (ports),
  gpmonetize. Index: `docs/KIT.md`.
- **Quality floor (80-pt rubric, in `gamepress context`):** ≥3 feel
  functions (hitstop / slowmo / popup / flash / shake / kick), particles +
  ≥4 SFX types, `?auto=1` lose-first-then-win bot, video 1080×1920 @30fps,
  −14 LUFS, hook caption ≤1s.
- **Voices/TTS (`tools.json` registry):** kokoro-tts (local, ~137 MB) for
  trailers and voice lines; edge-tts as network fallback (`gamepress
  voices --engine edge`); another6502 for port work. Registry rules:
  `docs/TOOLING.md` — large tools are declared, never committed.
- **Runtime:** Node 22+, Chrome (headless capture), ffmpeg 7+, git + gh.
  No npm dependencies; three.js r160 vendored.

## Adopted from Pyxel (audited Nov 2026)

Pyxel (Python fantasy console, MIT) was registered prototype-track on
Nov 4. A hands-on build day (Nov 6) separated what it genuinely does
better from what the kit already does better; the wins were adopted:

- **Seeded BGM composition — adopted as `kit/gpmusic.js`.** Pyxel's
  `gen_bgm` turns a genre preset + a seed into a finished loop in one
  call. gamepress had SFX (gpaudio) and drones (gpfeel) but no composer.
  `composeBGM(preset, seed)` returns melody/bass/drums as step data —
  pure and deterministic, so music passes the same seedcheck discipline
  as gameplay — plus a thin WebAudio player (`playBGM`). Presets:
  field, battle, chill, dungeon, title. Tests: `test/gpmusic.test.mjs`.
- **Touch controls appear automatically — adopted as a standard.**
  Pyxel's web runtime shows a gamepad on touch devices with zero
  per-game wiring; the game just reads one input API. The gamepress
  form of the same rule: a game that reads pad input gets `gptouch`
  controls by default (`docs/TOUCH.md`) — touch is never a per-game
  extra, and a game is not done until its pad input works untouched
  by a keyboard.
- **One-command packaging — adopted with a correction.** Pyxel goes
  source → shareable page in one step (`package` + `app2html`); match
  that friction in `publish-pack`. But a shipped gamepress page must
  be fully self-contained: Pyxel's export loads its runtime from
  kitao.dev at play time, and an external runtime dependency fails
  our package check.
- **Pyxel itself — stays prototype-track.** 3.0 (Nov 5, 2026) added
  Pyxel Cube, a textured-primitive retro 3D engine. Measured Nov 6:
  two playable demos in a day (a 3D platformer level; a Zombie Metroid
  remake with painted textures, backdrop composite, and HD+-style
  juice transplanted in), but the 256×224 / 16-color dithered
  renderer reads far below the kit's HD tiers on the same game
  (owner verdict: "looks horrible"), and nothing ships from it.
  Reference for fast 3D-feel prototypes only.

## Minecraft (audited Nov 2026 — full detail: `docs/MINECRAFT.md`)

- **Money:** the Bedrock Marketplace is the royalty route — curated
  Partner Program (business entity + 3-piece portfolio to apply),
  70% headline creator share vs Roblox's ~25%. Shortcut in: build
  for an existing partner team (per-map royalty share). No-gate cash:
  Java-server commissions/premade builds on BuiltByBit. Earnings
  figures in the doc are secondary-guide estimates, not Microsoft
  data.
- **AI tooling:** no official Mojang MCP (Roblox's Studio MCP is
  first-party; Minecraft's are community). MCP servers control a
  Mineflayer **bot** (yuniko-software/minecraft-mcp-server is the
  flagship) — player-speed building, demo-grade. For generation at
  scale use **GDMC-HTTP + GDPC**: a Java mod exposing the live world
  over HTTP + a Python client — code generates whole settlements.
- **The catch:** all AI tooling is Java Edition; the Marketplace is
  Bedrock. Pipeline: generate in Java → convert with Amulet/Chunker
  → Bedrock gameplay in JavaScript (Script API) → package.

## Agent skills (`docs/agent-skills/` — index: `docs/agent-skills/INDEX.md`)

- **Blender pipeline (19 skills vendored, MIT):** start every 3D job with
  `blender-director`; chain: hard-surface → retopology → uv-workflow →
  materials / texture-workflow → asset-optimization → lod-pipeline /
  collision-proxy → export-pipeline (unity-export / unreal-export),
  scene-assembly / set-dressing, styles (lowpoly, horror, psx-horror,
  pixel-art), `qa-review` before anything ships. Full 94-skill set stays
  upstream (arjun988/blender-skills) as reference.
- **Also vendored:** web-engines (three.js companions), disciplines,
  genres, workflows, router, other-engines — see the INDEX.

## Borrowed from the agent-skills ecosystem (audited Nov 2026, free only)

Two finds via @RoundtableSpace, filtered by the standing **free-only**
rule — anything that costs money per use is noted as not adopted.

- **awesome-gamedev-agent-skills (Apache-2.0, free)** —
  https://github.com/gamedev-skills/awesome-gamedev-agent-skills
  A 77-skill collection in portable SKILL.md format with a router
  that loads only the skill matching the engine/task. The parts that
  overlap this stack, kept as reference (upstream, not vendored —
  quality varies per skill and nothing here is proven by a shipped
  game yet): the **three.js** and **Phaser** engine skills, the
  **Roblox** skills, the art-production / character-animation /
  performance-optimization disciplines, and the **steam-publish**
  and **itch-publish** workflows. The Godot set (16 skills, Godot
  4.7) is the deepest if a Godot project ever starts. Install for
  coding-agent harnesses: `npx skills add
  gamedev-skills/awesome-gamedev-agent-skills`.
- **Video to Game — techniques adopted, pipeline NOT adopted** —
  skill: https://github.com/lovisdotio/video-to-game (MIT, free);
  gallery: https://fal-video-to-game.vercel.app/
  The author's pipeline generates a 10–15 s AI gameplay video on
  fal (MiniMax H3 Max / Seedance 2.5), has the agent study it frame
  by frame, generate matching assets, and write a single-file
  Three.js game. Running it costs roughly $0.79–$15.48 per game in
  fal generation — **paid per use, so the pipeline is not adopted.**
  Two zero-cost techniques are:
  - **Self-playtest loop:** after building, the agent plays its own
    game and fixes what it finds — falls, wall clips, dead moments —
    before a human ever sees it. This is a behavior pattern, not a
    tool: add "play it and fix what breaks" as a required pass in
    agent build prompts, ahead of the human phone verdict.
  - **Spec-by-video:** a short clip as the build spec — the clip
    fixes the look, the camera, and one mechanic, and the agent
    builds toward matching it. Free when the clip is our own
    capture (a reference game's trailer moment, a previous build's
    best run, a hand-made mock). Never point it at someone else's
    game footage to reproduce their game — originals only; the
    technique is neutral, the input decides.

## Asset sources (full table: `docs/ASSET-SOURCES.md`)

- **First stops (CC0, ship anywhere):** Kenney (packs), Quaternius (low-poly
  3D), Poly Haven (PBR textures + HDRIs), ambientCG (PBR materials).
- **2D/UI:** Lospec (palettes), Game Icons (CC-BY, credit line), OpenGameArt
  (per-asset license), itch.io asset packs (per-pack license).
- **3D:** Sketchfab (per-model license), Fab / Unity Asset Store free
  sections, NVIDIA SimReady + Scenario Labs collections (**reference-only,
  high-poly — decimate before use**), Meshy (AI generation, house account).
- **Animation:** Mixamo (humanoid auto-rig + animations, free w/ Adobe
  account); **Mesh2Motion** (browser auto-rigger + 170 CC0 creature
  animations — the non-humanoid gap); Blender skills for cleanup/export.
- **Sound:** Freesound (per-file license — CC-BY-NC never in a paid release).
- **UI reference (look before designing):** Game UI Database (~78k screens),
  Interface In Game, Gamedexy + Flomob (mobile F2P flows), Mobbin (app flows).

## Video tools beyond gamepress (detail: videopress `docs/TOOLS.md`)

- **Tesseract** (Mirage — **free**) — agent-native creative engine: video
  editing, motion graphics, and 3D scenes (editable `.tsrct` projects;
  agents control geometry, materials, lighting, cameras; path-traced
  renders) driven through a CLI + agent skills
  (https://github.com/mirage-hq/Tesseract). The local engine is fully
  free, including preview, rendering, and export (to 4K60) — no account
  or API key; the paid Captions cloud service is separate and not used.
  Runs on macOS/Windows/Linux. Candidate for trailer/demo editing and
  agent-built 3D scenes without an NLE; evaluate against the current
  capture/ffmpeg flow before adopting. Via @trymirage, Nov 4, 2026.
- **Editly** (MIT) — declarative Node+ffmpeg assembly; candidate spec layer
  for repeatable trailer formats.
- **AutoSubs** (MIT) — on-device subtitles + Resolve/Premiere/AE bridges;
  fallback when an edit lives in an NLE.
- **Pattern reference only:** OpenChatCut (AGPL — never embed) and
  FireRed-OpenStoryline (style-skill archiving idea → videopress presets).
- **Reference only, not runnable on the local stack:** LTX-2, WanVideo,
  CogVideo, VACE, DiffSynth-Studio, MuseTalk (heavy NVIDIA GPU);
  MoneyPrinterTurbo (**do not adopt** — auto-generated stock+voice shorts
  fail the QC gate; its stock sources Pexels/Pixabay/Coverr are listed in
  videopress as B-roll only).

## Hard rules that override everything above

- Work on **main**; batch every GitHub operation into the fewest calls.
- Public repo: no secrets, no personal names or paths in shipped files.
- Never call anything done/live until the human-openable link has been
  opened and verified showing the current version.
- QC gate (ORCHESTRATOR.md): would a stranger actually play this?
