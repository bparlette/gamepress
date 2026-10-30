# Capabilities — the single-file map of gamepress

**Read this first if you are an AI building with gamepress directly** (not
relaying through `gamepress run` — relay AIs read `ORCHESTRATOR.md` only).
One page per question: *for this use case, which tools, which techniques,
which assets exist?* Every entry is one line with a verdict; the deep doc is
linked where one exists. `tracks.json` is the machine-readable version of
the track map; `gamepress context` is the ~400-token build cheat sheet.

## The five use cases (`docs/USE-CASES.md`)

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

### 5. Gameboy — "gamepress gameboy" (explicit words only)

- **Goal:** a complete, small, single-file NES-cabinet game — the game is
  the product, played upright on a phone, one sitting, persistent hi-score.
- **Form:** 256x224 indexed buffer, 22-colour palette, fixed 60 Hz timestep,
  cabinet pad below the screen, zero binary assets (string-map sprites +
  procedural art), one looping music format for every game.
- **Techniques:** the cabinet recipe (`docs/GAMEBOY.md`) — host game + ONE
  donor mechanic, D-pad + A/B only, mandatory attract bot, seeded RNG,
  `GAME` contract (`init/update/render/hud/info/bot`), shell hooks
  (`window.__shell/__norun/__log`).
- **Shell:** `head.html` + `core.js` + `loop.js` + `build.py`, frozen as a
  versioned template at `kit/cabinet/` (push pending from the originating
  build session, Oct 2026); the six Hawk reference builds are the interim
  source of truth.
- **Done =** live permanent playable link + registered with the other games
  + bot pass + a real-phone play verdict (touch and WebAudio are a human
  gate for this use case).

## Tracks (`tracks.json` → `docs/tracks/*.md`)

| Track | Purpose | Extra tools |
|---|---|---|
| shared | research, build, test, drive, pack — serves every track | `research new test drive scenes pack check bundle catalog status all grade copy build make doctor lint ideate voices icons repo botcheck context auto lego heal hooks stats local-ai approve expand` |
| hook | viral vertical video at full quality | `all --track hook`, `grade`, `drive` |
| demo | browser demo page on GitHub Pages | `publish-demo` |
| web-store | itch / CrazyGames / Steam / YouTube publishing | `build --target web\|steam`, `publish-pack`, `host` |
| full-game | approved slice → full production game | `approve expand test grade pack host` |
| roblox | Roblox experiences: Studio build, headless Luau tests, safe publish | `roblox`, `roblox-test`, `roblox-ship` — needs the owner's Open Cloud key (`docs/ROBLOX.md`) |
| port | retro platform conversions (e.g. NES → Virtual Boy) | `kit/gbfixed.js`, `lib/nesextract.mjs`, `another6502` — user must own the source game; extracted assets stay private |
| monetize | revenue micro-games / micro-SaaS, day-1 paywall | shared set + `kit/gpmonetize.js` |

## Building blocks

- **Recipes:** 34 built-in game recipes (one-tap-reflex, bullet-heaven,
  kart-racer, merge-sandbox, mini-zelda, …) — `gamepress recipes`; rules in
  `docs/RECIPES.md` + `docs/RECIPE-RULES.md`.
- **Lego kit:** controllers (topdown, swerve, aim-flick, tap-drop, orbit),
  spawners, hooks (vacuum-collect, chain-explode, merge-tier, …),
  progressions — composed by `gamepress lego`.
- **Kit modules (`kit/`):** gp2d / gp3d engines, gpfeel (juice), gpfx,
  gpphys, gpchar, gpsprites, gpaudio, gptouch (`docs/TOUCH.md`), gpviewport
  (9:16 safe zones), gpshaders / gptoon, gpretro + gbfixed (ports),
  gpmonetize. Index: `docs/KIT.md`.
- **Quality floor (80-pt rubric, in `gamepress context`):** ≥3 feel
  functions (hitstop / slowmo / popup / flash / shake / kick), particles +
  ≥4 SFX types, `?auto=1` lose-first-then-win bot, video 1080×1920 per
  `docs/SHORT-PIPELINE.md` (fused canvas+WebAudio capture, measured fps and
  stream durations — never quoted from the recorder request),
  −14 LUFS, hook caption ≤1s.
- **Case study — Miso, built three times:** Nintendo-style platformer,
  then a photoreal city rebuild with a grapple-swing yarn and a vertical
  level, then an all-3D three.js fighter/runner (Miso City Level 1).
  Production lessons (iOS silent-switch audio fix, visual reference rule,
  painted segment backdrops, invisible-floor rule, portrait OY pattern,
  grapple-by-constraint, and §7: the GLB color-space trap, combat
  readability, the verify harness, itch packaging): `docs/MISO-LESSONS.md`.
- **What reads as premium (the top 3):** one coherent visual system (style
  contract gate + normalised assets + unified lighting + one grade chain),
  game feel as a system (forgiveness windows + per-event feedback budget +
  layered audio), and a hard performance budget from day one (draw calls,
  DPR cap, KTX2/Draco) — plus the anti-patterns to refuse: `docs/PREMIUM.md`.
- **Voices/TTS (`tools.json` registry):** kokoro-tts (local, ~137 MB) for
  trailers and voice lines; edge-tts as network fallback (`gamepress
  voices --engine edge`); another6502 for port work. Registry rules:
  `docs/TOOLING.md` — large tools are declared, never committed.
- **Runtime:** Node 22+, Chrome (headless capture), ffmpeg 7+, git + gh.
  No npm dependencies; three.js r160 vendored.

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
- **Free sprite→3D→rig chain:** see `docs/SPRITE-TO-3D.md` (TRELLIS.2 /
  Hunyuan3D-2 via HF Spaces or Colab GPU, UniRig, local Blender rigger
  fallback) — the $0 route when a sprite has to become a walking 3D
  character; Meshy stays the paid alternative (free tier generates, but
  downloads are Pro-paywalled).
- **Sound:** Freesound (per-file license — CC-BY-NC never in a paid release).
- **UI reference (look before designing):** Game UI Database (~78k screens),
  Interface In Game, Gamedexy + Flomob (mobile F2P flows), Mobbin (app flows).

## Video tools beyond gamepress (detail: videopress `docs/TOOLS.md`)

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
