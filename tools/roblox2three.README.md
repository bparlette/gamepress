# roblox2three — Roblox Parts → Three.js scene exporter

`tools/roblox2three.mjs` converts a Studio scene (Parts, wedges, cylinders, lights, Lighting settings) into one self-contained Three.js HTML page. Plain Node 18+, no dependencies.

Full usage lives in the roblox2three section of `docs/ROBLOX.md`. Short version:

```
node tools/roblox2three.mjs serve                 # receiver on 127.0.0.1:8787 -> scene.json
node tools/roblox2three.mjs luau                  # prints the Studio exporter script
# Studio: Game Settings -> Security -> "Allow HTTP Requests" ON, then run the exporter
# in the command bar (exports the current Selection, or all of Workspace if nothing is selected)
node tools/roblox2three.mjs build scene.json scene.html [--meshes meshes.json] [--three BASE] [--title T]
node tools/roblox2three.mjs sample                # 10-part test scene.json (every shape + both light types)
```

## STATUS — verification state (Nov 2, 2026)

Checked in at the owner's direction BEFORE full verification. The file is byte-identical to the version that passed the checks below — no code fixes were needed or applied.

### Verified (headless, this repo's rig)

- `node --check` passes. All subcommands run: `sample` → 10-part scene.json; `build` → scene.html (10,481 B); `serve` smoke-tested with a real POST (chunk accepted → scene.json written); `luau` prints the 54-line exporter.
- **Render test PASSED** (headless Chromium, local three.js r160 served via the `--three` option): `window.__r2t.ready === true`, `parts = 10`, `draws = 9` (parts grouped by shape+material into InstancedMesh; the two same-material cylinders share one draw), **zero page errors, zero console errors**.
- **Geometry / handedness PASSED** — Roblox and Three.js are both right-handed +Y-up and the CFrame transplant does NOT mirror the scene. Per sample element:
  - Wedge: tall vertical face at local +Z, slope descending to the −Z toe (isolated render).
  - CornerWedge: apex over the (+X, +Z) corner (isolated render with a marker ball parked at that corner — apex rises directly behind it).
  - Rotation handedness: the same wedge at +90° yaw moves its tall edge from +Z to +X, exactly as a right-handed R_y(+90°) requires; a transposed/mirrored matrix would send it to −X.
  - Cylinders: horizontal, length along world Z after their 90° yaw. Ball on the floor. Neon flat-bright unlit + cyan point-light pool. Glass translucent. Metal block's 45° yaw visible. SpotLight pool at scene centre. Directional shadows cast.
- **Escaping**: a part named `x</script><script>alert(1)</script>` builds safely — `<` is escaped as `\u003c` in the inlined JSON.

### UNTESTED — test list for the next AI

1. **Studio side, end to end (never run)**: in a real Studio place — Game Settings → Security → "Allow HTTP Requests" ON; `node tools/roblox2three.mjs serve`; run the printed Luau in the command bar; confirm the console prints `roblox2three: exported N parts, M lights`, `scene.json` lands complete, and `build` + browser render match the Studio view (positions, colours, wedge/corner orientations in a REAL scene, not just the sample).
2. **Selection vs Workspace**: export with a partial Selection and with an empty Selection (Workspace fallback) — confirm no duplicates and no missing descendants.
3. **Multi-batch export**: a scene with > 1,500 parts (forces multiple POST chunks; receiver resets on chunk 1 and appends) and a > 10k-part scene for InstancedMesh performance.
4. **MeshParts / `--meshes` (code path never rendered)**: a scene with MeshParts/Unions + a meshes.json mapping MeshId asset URLs to local .glb files — confirm they load, are fitted to the part Size, and are CFrame-oriented correctly; confirm the block fallback when a mapping is missing.
5. **CDN default build**: build WITHOUT `--three` and open with internet access — the render test only exercised the local-three build (identical except the import-map base).
6. **Real-scene material fidelity**: compare against Studio for the material table (roughness/metalness approximations), Glass (forced ≥ 35% transparency), ForceField, Reflectance→metalness, and the point/spot intensity factor (a tune-to-taste ×6 constant in the client).
7. **Lighting edge cases**: night ClockTime (sun below horizon — background/ambient blend), fog with FogEnd < 100000, disabled lights (exporter skips them), SurfaceLights (not exported — only Point/Spot are).

### Known limitations (by design / code review)

No Terrain; no textures, SurfaceAppearance, or decals; no Surface inputs, animations, or scripts; unions export as "Mesh" without CSG geometry; only lights parented to a BasePart are exported; the sun is synthesized from ClockTime (Roblox's real sun direction is not exported).
