# Agent Skills library (vendored subset)

Game-development **Agent Skills** (Anthropic's SKILL.md format — a folder per skill, the
skill's `description` frontmatter is what an AI agent matches against the task) vendored
from the open-source collection below, for use by gamepress builds and any AI working in
this repo.

- **Upstream:** https://github.com/gamedev-skills/awesome-gamedev-agent-skills
  (74+ skills, 10 engines; ~3,600 GitHub stars as of Oct 2026)
- **License:** Apache-2.0 (see `LICENSE-upstream.txt` in this folder). Vendored
  2026-10-24; upstream remains the canonical source — check there for updates.
- **How to use:** find the skill that matches the task (start with `router/` — its
  `references/routing-table.md` maps tasks → skills), read its `SKILL.md`, follow it.
  Don't load the whole library into context; load the one skill the task needs.

## Vendored locally (the ones gamepress will most likely use)

**Router** — `router/SKILL.md` + routing table + engine detection.

**Disciplines (engine-agnostic)** — all 15:
`ai-behavior-trees-utility-ai`, `audio-design`, `camera-systems`, `create-game-assets`,
`dialogue-systems`, `game-ai`, `game-feel`, `game-ui-ux`, `input-systems`,
`level-design`, `performance-optimization`, `physics-tuning`, `procedural-gen`,
`save-systems`, `shader-programming`.

**Web engines** — all 6: `phaser-core`, `phaser-arcade-physics`, `pixijs-rendering`,
`threejs-scene-setup`, `threejs-materials-lighting`, `threejs-gltf-loading`.

**Roblox** (under `other-engines/`) — all 7: `roblox-luau`, `roblox-characters`,
`roblox-datastores`, `roblox-networking`, `roblox-physics`, `roblox-studio-workflow`,
`roblox-ui`.

**Genres** — `platformer`, `fps-shooter`, `puzzle`, `roguelike`, `tower-defense`.

**Workflows** — all 4: `itch-publish`, `steam-publish`, `prototype-fast`, `game-jam`.

**Blender 3D pipeline** (under `blender/`) — 19 skills vendored 2026-10-26 from a
second collection, **Blender Skills** (https://github.com/arjun988/blender-skills,
MIT — see `LICENSE-blender-skills.txt`): `blender-director` (orchestrates the chain),
`hard-surface`, `retopology`, `uv-workflow`, `materials`, `texture-workflow`,
`asset-optimization`, `lod-pipeline`, `collision-proxy`, `export-pipeline`,
`scene-assembly`, `set-dressing`, `unity-export`, `unreal-export`, `lowpoly-style`,
`horror-style`, `psx-horror-style`, `pixel-art-style`, `qa-review`. These execute in
Blender via the Blender MCP addon — the chain for a game prop is
director → hard-surface → UV → materials → optimization → export. The other ~75
upstream skills (styles, genres, worlds) are reference-only at the upstream repo.

## NOT vendored — reference upstream when needed

Each skill lives at
`https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/<group>/<name>/SKILL.md`

- **Godot (16):** godot-2d-movement, godot-3d-essentials, godot-animation, godot-audio,
  godot-csharp, godot-export, godot-gdscript, godot-gdscript-headless-testing,
  godot-multiplayer, godot-nodes-scenes, godot-physics, godot-resources, godot-shaders,
  godot-signals-groups, godot-tilemap, godot-ui-control
- **Unity (8):** unity-animation, unity-build-pipeline, unity-csharp-scripting,
  unity-input-system, unity-navmesh, unity-physics, unity-scriptableobjects,
  unity-tilemap-2d
- **Unreal (6):** unreal-behavior-trees, unreal-blueprints, unreal-cpp-gameplay,
  unreal-enhanced-input, unreal-niagara, unreal-packaging
- **Other engines (5):** bevy-ecs, defold-core, love2d-core, pygame-core,
  ebitengine-game (under `skills/ebitengine/`)
- **Genres (4):** card-game, rpg, survival-crafting, visual-novel

## Related collections — reference only (not vendored)

- **Claude Code Game Studios** — https://github.com/Donchitos/Claude-Code-Game-Studios
  (MIT): 49 agents / ~74 skills arranged as a studio hierarchy (directors → leads →
  specialists) with quality gates. Claude-Code-specific, so not vendored; the part
  worth borrowing is its default "minimal" rigor mode — one-page brief, then the
  smallest playable version — which matches gamepress's viral-demo default.
- **Gameplay Atlas** — https://gameplayatlas.loopyhop.com — a field guide to game
  mechanics: searchable breakdowns of gameplay systems and art styles. Reference
  when a build needs a mechanic library to start from instead of a blank page.

## Notes

- Upstream skills carry deeper `references/*.md` companions (e.g. game-feel's
  feedback-recipes). Most were **not** vendored to keep this subset lean — fetch them
  from the upstream path above if a skill points you at one. Exception (added
  2026-10-25 at the owner's request — the 3D set, best-for-games first): the three
  three.js references (`threejs-scene-setup/references/scene-graph.md`,
  `threejs-materials-lighting/references/materials-lights-table.md`,
  `threejs-gltf-loading/references/loaders-and-animation.md`) and
  `create-game-assets/references/three-d-pipeline.md` ARE vendored.
- If a vendored skill proves its worth, consider promoting its techniques into
  gamepress's own presets/recipes (docs/RECIPES.md, docs/NINTENDO-FEEL.md) rather than
  growing this folder.
