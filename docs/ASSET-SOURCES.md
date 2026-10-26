# Asset sources — where gamepress games get their art, sound, and icons

Curated list of asset platforms worth reaching for before generating or hand-making
anything. (Sourced from a gamedev roundup by @DeepTechTR on X, Oct 24, 2026, then
filtered for what fits this repo's web/Roblox/viral-demo work.)

| Source | What it's for | Notes |
|---|---|---|
| **Kenney Assets** — https://kenney.nl/assets | Free game-ready asset packs: sprites, tiles, UI, 3D models, sounds | CC0 (public domain) — the first stop. No attribution needed, safe for commercial/itch releases. |
| **Lospec** — https://lospec.com | Pixel-art tools and **color palettes** | Palettes pair with the sprite workflow (8-bit/16-bit sheets) — grab a proven palette instead of inventing one. Also has a pixel-art editor and tutorials. |
| **Game Icons** — https://game-icons.net | 4,000+ game UI icons (SVG/PNG) | CC-BY — free with attribution. Perfect for HUDs, inventories, ability buttons. |
| **Freesound** — https://freesound.org | Sound effects and audio library | Per-file licenses vary (CC0 / CC-BY / CC-BY-NC — check before shipping in a paid game). gamepress already sources SFX here. |
| **OpenGameArt** — https://opengameart.org | Free game art: sprites, textures, music | License varies per asset (CC0/CC-BY/GPL) — check each download. Good for backgrounds and tile sets. |
| **Mixamo** — https://www.mixamo.com | Ready-made character animations + auto-rigging | Free with an Adobe account. Upload a character, get walk/run/attack animations — feeds the three.js games and Roblox-adjacent 3D work. The auto-rigger is the time-saver. |
| **itch.io assets** — https://itch.io/game-assets | Indie asset packs (free and paid) | The marketplace itself — useful when a specific style pack beats generating one. Check each pack's license. |
| **Godot Asset Library** — https://godotengine.org | Plugins and tools for Godot projects | Only relevant if a build targets Godot; gamepress is web-first, so this is reference-only for now. |
| **NVIDIA SimReady Assets** — https://huggingface.co/datasets/nvidia/simready-assets | 2,500 free 3D objects (GLB up to 8K + original Blender files): forklifts, robot arms, engines, medical devices, automotive | **Reference-only, and a big caveat:** built for simulation, very high triangle counts, not game-optimized. Usable only after decimation (same treatment as the Yeet Pets `*_deci` models) — pull single props, never bulk-download (full set is ~39 GB). Searchable on the Hub. |
| **Scenario Labs 3D Collection** — https://huggingface.co/datasets/scenario-labs/3d-collection | 1,300+ more free 3D models with images, prompts, and generation parameters | Same high-poly caveat as SimReady. The included prompts/parameters are the interesting part — they show how each model was AI-generated. |
| **Blender Skills** — https://github.com/arjun988/blender-skills | 94 AI skills that drive Blender via MCP: modeling, retopology, UV, materials, rigging, animation, optimization, engine export | MIT. The 19 pipeline skills gamepress uses are vendored in `docs/agent-skills/blender/`; the full set (styles, genres, worlds) stays upstream as reference. This is the "make the model game-ready" step after Meshy/SimReady — decimation, LODs, collision, export. |
| **Gameplay Atlas** — https://gameplayatlas.loopyhop.com | A field guide to game mechanics — breakdowns of gameplay systems plus art styles | Reference-only. Useful at the idea stage: start a build from a proven mechanic breakdown instead of a blank page. |
| **Quaternius** — https://quaternius.com | CC0 low-poly 3D model packs (characters, animals, vehicles, nature) | CC0 — no attribution, commercial-safe. Same CC0 spirit as Kenney but for 3D; several models already picked for Yeet Pets / Toad City concepts. First stop for stylized low-poly. |
| **Poly Haven** — https://polyhaven.com | CC0 PBR textures (https://polyhaven.com/textures) and HDRIs (https://polyhaven.com/hdris) | CC0. Photoreal textures + environment lighting for three.js scenes — grab an HDRI before hand-tuning lights. |
| **ambientCG** — https://ambientcg.com | CC0 PBR materials (ground, walls, fabrics, terrain) | CC0. Pairs with Poly Haven for surface work; resolution options keep web builds light. |
| **Sketchfab** — https://sketchfab.com | Huge 3D model marketplace/viewer, incl. free downloadable models | **License varies per model** — filter to downloadable + free and read each model's license (CC-BY common). Cars and one-off hero props are its strength. |
| **Fab / Unity Asset Store (free sections)** — https://fab.com · https://assetstore.unity.com | Free + limited-time-free assets for Unreal (Fab) and Unity (Asset Store) | Reference-only for web builds; directly useful for the Unity/Unreal side projects. Limited-time free drops rotate — worth a periodic skim. |

## UI reference libraries (look at real games before designing screens)

| Source | What it's for | Notes |
|---|---|---|
| **Game UI Database** — https://www.gameuidatabase.com | ~78,000 UI screens + transition videos from ~1,975 games, filterable by device (phone/tablet) and screen type (HUD, menus, settings, modals) | Free. The first stop before designing any HUD or menu — copy proven layouts instead of inventing them. |
| **Interface In Game** — https://interfaceingame.com | Game UI screenshots/videos organized by genre, UI element (menu, inventory, store, tutorial), and theme | Free. PC/console-heavy; best for menus, stores, and tutorials. |
| **Gamedexy** — https://www.gamedexy.com | Mobile free-to-play flows recorded step-by-step: onboarding, shops, daily rewards, battle passes, gacha | Free tier shows the first steps of each flow; Pro (~$99/yr) adds full flows + MCP access. Use for monetization/onboarding flow design (Yeet Pets-style loops). |
| **Flomob** — https://www.flomob.com | 100k+ real mobile-game UI patterns with AI semantic search, copy-to-Figma | Free to join. Gamedexy's closest alternative — use whichever has the game you're copying. |
| **Mobbin** — https://mobbin.com | 620k+ app (not game) screens: sign-up, settings, paywalls, onboarding | Paid. Only when a game needs app-grade account/paywall flows; the game-specific four above cover most needs. |

## Rules of thumb

- **License before use.** CC0 (Kenney, much of Freesound) ships anywhere. CC-BY needs an
  attribution line in the game's credits/readme. CC-BY-NC never goes in a paid release.
- **Palettes from Lospec, packs from Kenney, icons from Game Icons, SFX from Freesound** —
  that combo covers most 2D viral demos without opening a generator.
- Public-release rule still applies: no personal names or repo URLs in shipped files
  (see the itch.io/CrazyGames deliverable rules).
