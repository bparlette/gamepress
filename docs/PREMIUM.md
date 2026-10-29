# PREMIUM — what makes a game read as premium (the top 3)

Premium vs. amateur is almost never decided by asset fidelity, poly count, or
engine choice. It is decided by three **systems**. AI makes content (code,
models, sprites) cheap; none of these three is automatic. Treat each as a
gate with numbers, not a vibe.

> Feel constants for movement itself live in `docs/NINTENDO-FEEL.md`
> (`kit/gpfeel.js`). House style/quality mandates live in `docs/QUALITY.md`.
> This doc is the layer above both: what to enforce, in what order, and what
> to refuse.

## 1. One coherent visual system

Ship one *look*, not a pile of individually decent assets. Three gates, in
order of leverage:

**Gate A — style contract, enforced before an asset enters the game.**
- [ ] Fixed palette + value range, written down before generation starts.
- [ ] One texel/pixel density across all assets; one world scale (1 unit = 1 m).
- [ ] Silhouette readable at gameplay distance.
- [ ] PBR bands per material class (roughness/metalness ranges, not per-asset guesses).
- [ ] 2D: one sprite resolution, one light direction, shared outline weight.
- [ ] Every AI asset passes a normalisation pass: palette remap, scale fix,
      retopo/decimation for 3D, roughness/normal cleanup, normal maps for
      sprites that need to catch light. Raw generator output never ships.

**Gate B — lighting renders the quality.**
- [ ] Image-based light on everything: HDRI / room environment via PMREM
      (`scene.environment` in three.js). No default ambient+directional look.
- [ ] Exactly **one** key shadow-casting light.
- [ ] Contact grounding on every object: shadow, baked AO, or blob shadow
      (`blobs()` in the kit). Floating objects read as fake instantly.

**Gate C — one post chain, used as grading, not confetti.** Fixed order:
- [ ] HalfFloat HDR buffer → selective bloom (high threshold) → SSAO/SSGI
      *sparingly* → ACES Filmic or AgX tone mapping, applied **once, at the
      end** → LUT / colour grade → vignette → SMAA/TRAA.
- [ ] Merged passes (pmndrs `postprocessing` `EffectPass`), never a chain of
      full-screen passes each doing one effect. The gp3d shell already
      applies ACES + vignette; add to it, don't duplicate it.

**Why this is #1 — the HD-2D evidence.** *Octopath Traveler* shipped crude
16-bit-style sprites at full price; what made it read as premium was the
system around them: a real 3D environment, a point light so sprites cast
shadows, tilt-shift/bloom/fog. The producer spent ~1.5 months on lighting
and shadow alone. Presentation system beats asset fidelity.

## 2. Game feel as a system

The same mechanics feel cheap or premium depending on latency, forgiveness,
and feedback. Cheapest large quality jump available — and the one AI code
generation most often omits entirely.

**Control generosity first (before any cosmetics):**
- [ ] Input-to-response inside the player's correction cycle: **< 100 ms**.
- [ ] Coyote time **0.08–0.15 s**; jump input buffering **0.10–0.15 s**.
- [ ] Corner correction on jumps/dashes; variable jump height; halved
      gravity near jump peak. (Movement constants: `docs/NINTENDO-FEEL.md`.)
- [ ] Easing on all motion. Linear tweens are a bug.

**A feedback budget for every meaningful event — all of it, same frame:**
- [ ] Squash/stretch or anticipation on the actor.
- [ ] Particles emitted from the point of action.
- [ ] Hit-flash on the target; knockback on the target.
- [ ] Hit-stop **3–6 frames** on heavy impacts (fighters run longer —
      `docs/QUALITY.md`).
- [ ] Camera shake is trauma-based: `shake = trauma²`, trauma decays, hits
      add trauma — never a fixed shake per hit. Cap it; ship an intensity /
      reduced-motion toggle.
- [ ] Layered audio on the same event (e.g. whoosh + thud + reaction),
      pitch randomised **±5–15%** per play. Audio is half the feedback:
      every interaction gets a sound, no silent impacts.

**Rule: feel is specified numerically or it doesn't happen.** Put the
windows, frame counts, and pitch ranges in the build brief as numbers, then
playtest them. "Make it juicy" collapses to a generic default and is not a
spec.

## 3. Hard performance budget, from day one

A beautiful still that stutters reads as amateur *in motion*. Perceived
smoothness is frame-time consistency (even 16.6 ms frames), not average FPS.
State the budget as acceptance criteria and measure it; do not assume it.

- [ ] Draw calls **~100–150 max** for 60 fps on mid-range hardware —
      measure with `renderer.info.render.calls`.
- [ ] Instancing (`InstancedMesh`), batching, merged static geometry,
      shared materials, texture atlases. Repeated props are never
      individual meshes. (House triangle/crowd caps: `docs/QUALITY.md`.)
- [ ] Pixel ratio capped: `min(devicePixelRatio, 2)`; 1.5 on mobile.
      Frequently the highest-ROI single line in the codebase.
- [ ] Assets compressed **once, at build time**: KTX2/Basis textures (stay
      compressed in VRAM — a 4K texture is ~64 MB raw, ~4 MB as KTX2),
      Draco/Meshopt geometry (−80–90% on the wire), prune/weld/quantise
      in the same pass. Doubly important for AI meshes, which arrive
      polygon-dense and unoptimised.
- [ ] One shadow light, shadow map 512–1024; baked lighting where possible;
      spatial post effects at half resolution.
- [ ] Adaptive quality tiers: drop pixel ratio / post / instance counts
      when fps declines; static fallback below that.
- [ ] Simulation-bound? Use WASM physics (Rapier) — its 2025 builds run
      2–5× faster than its 2024 packages (maintainer-reported).
- [ ] WebGPU is safe to target (all major browsers since Safari 26) but is
      not faster everywhere — profile before migrating for speed alone.

Performance work done last means cutting the effects and feedback that made
the game look premium. Budgeted first, it costs almost nothing visually.

## Anti-patterns — overrated or commonly misapplied

- **SSGI/SSR as magic.** Screen-space effects can only bounce/reflect what
  is already on screen; they are noisy, costly at full res, and
  `realism-effects` has **no orthographic-camera support** — a bad fit for
  HD-2D-style games. Baked AO + a good environment map + selective
  half-res SSR usually wins.
- **Post-processing stacking.** Bloom + chromatic aberration + film grain +
  heavy DOF + vignette all at once is the most recognisable amateur
  signature there is: it washes contrast and blurs gameplay-critical
  detail. Restrained and ordered (Gate C) or nothing.
- **More / higher-fidelity AI assets.** More generations amplify
  incoherence (§1) and load size (§3). Fidelity *budgets* (texel density,
  tri budget per asset class, LODs) beat fidelity maxima.
- **Maximum juice.** Juice is an amplifier, not a substitute: it multiplies
  whatever the core loop already is, and past a threshold it destroys
  legibility and comfort. Tune it, cap it, toggle it.
- **A physics engine as the 2D platformer character controller.**
  *Celeste*'s team deliberately used no physics engine so outcomes could be
  predetermined and forgiving; tight platformers feel better with a bespoke
  kinematic controller + forgiveness windows (§2). Rapier earns its place
  for rigid-body worlds, stacks, vehicles, and queries.
- **Engine wars.** Within a genre-appropriate class, the engine explains
  very little of the premium/amateur gap compared with §§1–3. Pick by
  genre and ecosystem, then stop relitigating it.

## AI calculus — what to delegate, what to own

**Use AI aggressively for:**
- Volume *inside* the contract: props, scatter, texture/PBR-stack variants
  (its most reliable production ROI), sprite variants from a style reference.
- Scaffolding: render loop, loaders, post chain, instancing, physics wiring.
- SFX/music drafts, concept and mood exploration.

**Never delegate to the generator:**
- Cross-asset consistency — imposed externally: style contract + the §1
  normalisation gate + a single grade. AI has no persistent art director.
- Hero/animated asset topology, UVs, rigs — raw text-to-3D is
  blockout-grade and deforms under animation without cleanup.
- Feel timing — the numbers in §2 come from the brief and the playtest,
  never from the model's defaults.
- Performance architecture — generated code defaults to one mesh / one
  material / no compression and may suggest deprecated APIs; feed it
  current docs, and verify the §3 numbers yourself.

The scarce resource moved from production to **direction, curation, and
budget enforcement**. Spend the saved time there, not on more content.

## Sources

- Maddy Thorson, *Celeste & Forgiveness* — maddymakesgames.com/articles/celeste_and_forgiveness
- Steve Swink, *Game Feel* (2009); Jonasson & Purho, *Juice It or Lose It* (2012); Nijman, *The Art of Screenshake* (2013)
- pmndrs `postprocessing` — github.com/pmndrs/postprocessing (EffectPass merging, HalfFloat + end-of-chain tone mapping)
- HD-2D / *Octopath Traveler* — en.wikipedia.org/wiki/HD-2D (Asano on lighting/shadow)
- Dimforge, *The year 2025 in Dimforge* (Rapier 2–5× speedup) — dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge
- *What is Frame Pacing?* — framepacer.com/guides/what-is-frame-pacing
- Three.js performance budgets (draw calls, DPR cap, KTX2/Draco) — hontran.dev/blog/three-js-performance-optimization
