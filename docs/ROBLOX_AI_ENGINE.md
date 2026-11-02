# Roblox Beta AI & StudioMCP Autonomous Game Creation Engine

Comprehensive reference and automated orchestration guide for building commercial-quality Roblox games using the official Roblox Studio MCP proxy and Beta generative AI toolset (`generate_scene`, `generate_mesh`, `generate_texture`, `generate_material`, `generate_avatar`).

---

## 1. Official Architecture & Connection

```
[Antigravity Agent / External LLM] 
       │ (JSON-RPC over stdio)
       ▼
[/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP]
       │ (Internal Studio IPC / Named Pipes)
       ▼
[Roblox Studio 0.745+ Runtime]
 ├── Edit DataModel (Static scenes, layout, procedural models)
 ├── Server DataModel (Physics, game rules, replication, remotes)
 └── Client DataModel (HUD, cameras, local VFX, input handling)
```

### Configuration (`mcp_config.json`)
```json
{
  "mcpServers": {
    "Roblox_Studio": {
      "command": "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP"
    }
  }
}
```

---

## 2. Beta AI Tool Capabilities

| Tool | Capability | Parameters | Produced Output |
| :--- | :--- | :--- | :--- |
| **`generate_scene`** *(Text-to-Scene)* | Generates macro-scale multi-model assemblies | `textPrompt`, `boundingBoxPosition`, `boundingBoxSize`, `images` | Folder containing `ProceduralModel` trees with tunable attributes, proper materials, and physical alignment. |
| **`generate_mesh`** *(Text-to-Mesh)* | Generates custom 3D mesh geometry | `textPrompt`, `segmentation` (`auto`/`none`/`explicit`), `partNames`, `maxTriangles`, `size` | MeshPart or segmented Multi-Part Model (up to 8 parts). |
| **`generate_texture`** *(Text-to-Texture)* | Synthesizes PBR texture maps | `textPrompt`, `textureType`, `resolution` | Albedo, Roughness, Normal, and Metalness maps mapped to MeshParts. |
| **`generate_material`** *(Text-to-Material)* | Generates custom physical `MaterialVariant`s | `baseMaterial`, `materialDescription`, `materialPattern` | Surface materials modifying visual appearance and friction/elasticity physics. |
| **`generate_avatar`** *(Text-to-Avatar)* | Creates animated humanoid characters | `prompt`, `style`, `accessories` | Fully rigged R15 character with joints and collision groups. |

---

## 3. Autonomous In-Engine Inspection & Verification

- **`execute_luau`**: Direct unthrottled execution of Luau code on Studio's main thread across `Edit`, `Server`, or `Client`. Enables reading/writing instance properties, parenting, and dynamically connecting remotes.
- **`screen_capture`**: Off-screen viewport rendering with arbitrary `camera_position` and `look_at_position` vectors `[x, y, z]`. Bypasses GUI obstructions, dialogs, and window sizes to take clean promotional or QC screenshots.
- **`start_stop_play`**: Programmatically toggles Playtest mode (`is_start: true / false`).
- **`search_game_tree` & `inspect_instance`**: Returns flat structured JSON hierarchy and property dictionaries.

---

## 4. Benchmark Case Studies (Verified Live)

### Case 1: *Nome Gold: Deep Dredge* (`Universe: 10773321948`)
- **Macro Industrial Dredge**: Generated a 1,528-part floating pontoon mining vessel (`generate_scene`) with hydraulic excavator boom, sluice riffles, diesel generator housing, fuel drums, and suction intake hoses.
- **Underwater Seabed Claim**: Generated a 7,324-part subarctic seabed with slate bedrock crevices, granite boulders, and gravel beds.
- **Gameplay Integration**: Automatically wired 45 AI crevice models into `Workspace.Crevices` (for `[E] Pry Crevice` nugget spill) and 7 giant boulders into `Workspace.Boulders` (for `[F] Flip Rock`).
- **Water & Lighting**: Injected voxel water terrain and subarctic Future lighting (`ClockTime = 16.8`, Ambient blending).

### Case 2: *Dig Flop Fling Race* (`Universe: 10773318471`)
- **Derby Arena**: Generated a 2,642-part racetrack layout with 48 curved rubber tire barrier models, two-tier wooden grandstands, cheering booths, and timber rails.
- **Character Enhancements**: Equipped ragdoll runners with glowing neon visors, dynamic speed ribbon trails, and running dust emitters.

---

## 5. Pure-Luau Synthesis (Matching AI Quality Without Cloud Limits)

Roblox's AI constructs environments by stacking primitive parts into **`ProceduralModel`** hierarchies. To match or exceed this quality in offline or budget-constrained environments:
1. **Parametric Model Kits**: Use mathematical curve placement (`CFrame.fromMatrix` along Bezier paths) for barriers, pipes, and railings.
2. **Material Variant Diversity**: Mix `CorrodedMetal`, `DiamondPlate`, `Slate`, and `Cobblestone` with tuned roughness instead of default `Plastic`.
3. **Lighting Harmony**: Always configure `Technology = Enum.Technology.Future`, `ShadowSoftness <= 0.25`, and layer `BloomEffect` + `ColorCorrectionEffect`.
