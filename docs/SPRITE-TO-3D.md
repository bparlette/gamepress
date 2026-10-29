# SPRITE-TO-3D — sprite → 3D → rig: the free chain

How a 2D character becomes a walking 3D one. There are three routes: a paid
hosted generator (Meshy), a free chain built from open models, and a local
procedural build in Blender that skips image→mesh entirely. This doc is
the free routes, end to end, with the traps marked — every trap below was
hit in production (Miso, Oct 28–29, 2026), not read off a spec sheet.

> Tool rows live in `docs/ASSET-SOURCES.md`; the one-line capability map is
> `docs/CAPABILITIES.md`. Generated meshes still owe the normalisation pass
> in `docs/PREMIUM.md` §1 (decimation, scale, palette) before they ship.

## 1. Two routes — pick by constraint, not by habit

**Meshy (paid route).** Fast, hosted, textured output, house account.
Generate on the free tier if you like — but know the wall before you start:
**verified Oct 28, 2026: on the free plan, GLB downloads are Pro-paywalled.**
Generation is free-tier; export is not. A finished, rigged cat sat in the
workspace with no way out short of subscribing (30 credits spent getting
there). Two more field notes from the same run: the model's texture was
never verified — every preview rendered grey — and Meshy's auto-rig
picked the wrong skeleton class (quadruped for a bipedal character).
Reach for Meshy when speed matters more than the subscription and the
plan is already paid.

**The free chain (this doc).** $0 at every step; slower, and dependent on
quota or a borrowed GPU. Quality is competitive — TRELLIS.2 output rivals
hosted tools — and nothing is paywalled at the export step. This is the
default when there is no deadline breathing down the run.

**The local procedural route — the one that actually shipped Miso.**
Skip image→mesh: build the character in Blender from a parameterized
builder script, measured against the reference image (§2). Proven
end-to-end Oct 28–29, 2026: one builder + per-character parameter sets
produced a whole cast — the hero plus three enemy dogs — on **one shared
20-bone biped rig**, exported as GLBs under a strict action contract
(§4), and shipped in a live three.js game. When the design is known and
the style is stylized, this route beats image→3D on control, iteration
speed, and likeness — and it costs $0 with no quota, no GPU, and no
paywall anywhere in it. The roster trick is the point: **one builder,
many parameter sets** — tall/skinny, short/fat, and heavy body plans
from the same code, so a cast stays visually consistent for free.

## 2. Step 1 — the reference image

Everything downstream is only as good as this one input:

- [ ] **One clean front-view image of the character** — the actual sprite,
      upscaled if it is small. Transparent or clean flat background.
- [ ] **Measure the proportions from the image before rigging** (head as a
      fraction of height, head width vs body width, leg length). Write the
      numbers down; the rig step is judged against them.
- [ ] **Never work from a text description of the character.** A written
      summary of what a character looks like produces a plausible stranger,
      not the character. The image is the spec (the visual-reference rule,
      `docs/MISO-LESSONS.md`).

## 3. Step 2 — image → mesh, three free ways

**(a) Hugging Face Spaces — zero setup, shared quota.** Both models run as
public Spaces: TRELLIS.2 (`microsoft/TRELLIS.2`) and Hunyuan3D-2
(Tencent). Upload the image, generate, download the GLB. The trap:
**ZeroGPU's anonymous quota is a shared pool, and it can refuse the
extract/download step even after generation succeeds** — verified
Oct 28, 2026: the mesh generated twice, `/extract_glb` refused both times.
A free HF account token raises your personal quota and is the cheap fix.
Oct 29 update, from the post-reset retry: generation succeeded
server-side again and `/extract_glb` was refused again — **including once
with 179s of quota remaining against a 120s request, so the quota check
is not simply request < remaining; expect the extract step to be the
blocker and plan around it.** And know the other failure shape when you
see it: the Hunyuan3D-2 Space's `/generation_all` was failing with a
bare server-side `NameError` (Oct 29) — that is a broken Space worker,
not quota; retrying it buys nothing until the Space is fixed.

**(b) Google Colab GPU — the reliable free route, attended only.** Run the
model repo in a Colab notebook on a free T4: no shared quota, and the GLB
downloads straight out of the session. **The catch is the human, not the
GPU: an interactive Colab run left overnight died on timed-out approval
taps and produced nothing (Oct 28–29, 2026).** Schedule GPU sessions
while the user is present to approve prompts — a notebook that cannot
survive unattended approvals is worth zero however good the pattern is.
The notebook pattern (kept with the project that first used it —
`Hunyuan3D_on_Colab.ipynb` is the worked example):

1. Check the GPU (`nvidia-smi`) — CPU runtime means stop, switch runtime.
2. Clone the model repo, install requirements.
3. Upload the reference image (`files.upload()`).
4. Generate: full model first, **mini checkpoint as the fallback on OOM**
   (the texture-paint step is the VRAM-hungry one on a 16 GB T4 — a
   shape-only export still counts as progress; paint can retry after).
5. Export the GLB and pull it down with `files.download()`.

The same notebook pattern hosts UniRig for step 3 — one Colab session can
carry the whole chain.

**(c) Local GPU — if one exists.** The models want a real NVIDIA card
(≥8 GB VRAM floor; the full-res TRELLIS.2 settings ask for much more).
The gamepress VM has **no GPU at all**, which is why Colab is the default
route here and local is listed last.

## 4. Step 3 — rig the mesh

**UniRig** (VAST-AI / Tripo + Tsinghua, SIGGRAPH 2025) — one model that
predicts a skeleton and skinning weights for arbitrary meshes. Two rules:

- **Pick the class that matches the character's actual body.** UniRig has
  quadruped *and* biped classes. A bipedal mascot rigged as a quadruped
  gets a horizontal spine and walks wrong, however good the mesh is —
  verified the hard way, Oct 28, 2026. When the character stands on two
  legs, rig it on two legs.
- **Check the release state before planning around it.** The public
  release is staged — the skeleton-prediction component (trained on
  Articulation-XL2.0) shipped first; check the repo / HF card for the
  current skinning status.

**Fallbacks, in order:**

- **Local procedural Blender riggers** (project-local): bone templates
  (quadruped and biped) + procedural gait, skinned by distance fields.
  Crude next to UniRig, but they run on this VM with no GPU and they
  proved the end-to-end walk loop before any generated mesh existed.
- **Standard bodies:** Mixamo (humanoid auto-rig + stock animations) and
  Mesh2Motion (creatures) — already catalogued in `docs/ASSET-SOURCES.md`.
  If the character is close to a standard body, these beat any AI rig.

### Build rules the procedural route proved (Oct 28–29, 2026)

The shipped cast (hero + 3 dogs, one shared 20-bone biped rig) runs on a
strict contract and three hard rules:

- **Action-name contract:** every character exports exactly the actions
  the game asks for, named exactly — for a fighting cast: `Walk`,
  `Attack`, `Hit`, `Down`. Reference durations from the shipped dogs:
  Walk 1.04s / Attack 0.5s / Hit 0.29s / Down 0.62s. One skeleton + one
  contract means the engine code never special-cases a character.
- **Tail rule: build tail geometry along the skeleton's bone arc, never
  hanging free.** Verts modelled off the arc get claimed by thigh/shin
  skinning weights and stretch into a crumpled sheet trailing from the
  hip during Walk. Found by proof-rendering the Walk cycle (§5), not by
  inspecting the bind pose — the bind pose looked fine.
- **Down-clip auto-grounding:** a fall clip can settle the skinned mesh
  *below* the floor (measured 0.32 units on the tall character). Fix in
  the file, not the engine: evaluate the skinned mesh at the clip's held
  end frame, measure the residual, and lift the root keys by exactly
  that amount — ground truth baked in, residual 0.000.

## 5. Step 4 — verify before presenting anything

Generators and riggers both fail politely — the file exists, the walk is
wrong. Gate every result:

- [ ] **Parse the GLB**: bone count, one skin, animation present and named
      (the house convention is an action named exactly `Walk`).
- [ ] **Render phase stills** (0 / 25 / 50 % of the cycle): feet alternate,
      mid-swing foot actually lifts, no limb drags through the body.
- [ ] **Render action proof stills from the final GLBs** — every action in
      the contract (Walk / Attack / Hit / Down), not just the walk.
- [ ] **Eyeball the stills against the reference image** — silhouette and
      proportions, not vibes. Specs pass while looks fail: the first-pass
      defects caught *only* by eye on the Miso cast were a floating
      accessory (a medallion hovering off the chest), a visible shin/foot
      gap, a belt hovering around the belly like a hula hoop, and
      "snowman egg" proportions on the short character. Every one of
      those files parsed clean.
- [ ] **Presentation rule (learned Oct 28, 2026):** show the character
      **standing on a ground plane with a contact shadow under the feet**.
      A mid-stride frame floating in a grey void reads as *falling*, not
      walking — the reviewer rejects the pose before they ever see the
      likeness. Standing shot first, walk frames second.

## Costs

| Route | Cost | The catch |
|---|---|---|
| Meshy free tier | $0 to generate | **Downloads paywalled** — export needs Pro; texture unverified (grey previews); auto-rig can pick the wrong skeleton class |
| HF Spaces (TRELLIS.2 / Hunyuan3D-2) | $0 | Shared ZeroGPU quota refuses the *extract* step (even with quota left); a free HF token raises it; a Space can also just be broken (NameError) |
| Colab free tier | $0 | T4 (16 GB), session time limits; mini checkpoints on OOM; **attended runs only** — unattended sessions die on approval timeouts |
| UniRig | $0 | Needs a GPU — same Colab session; staged public release, see repo for license |
| Local procedural (Blender builders) | $0 | Costs builder-script time up front; full control, no quota/GPU/paywall — the route that shipped Miso's cast |

## Licenses (read before shipping output commercially)

- **TRELLIS.2 — MIT** (code and weights). Two NVIDIA dependencies
  (nvdiffrast / nvdiffrec) carry their own terms — check them if the
  commercial stack must be fully clean.
- **Hunyuan3D-2 — Tencent Hunyuan 3D Community License.** Not plain open
  source: it does not apply in the EU, UK, or South Korea; products over
  1M monthly active users need a separate license; outputs may not be
  used to train other AI models.
- **UniRig — see repo for license**, and note the staged release above.

## Sources

- TRELLIS.2 — github.com/microsoft/TRELLIS.2 (MIT; GLB export, PBR materials)
- Hunyuan3D-2 — github.com/Tencent/Hunyuan3D-2 (Community License text via scancode-licensedb: tencent-hunyuan-3d-2.0-cla)
- UniRig — github.com/VAST-AI-Research/UniRig · weights: huggingface.co/VAST-AI/UniRig (staged release note on the model card)
- Production evidence: Miso 3D runs, Oct 28, 2026 (Meshy paywall, ZeroGPU refusal, quadruped-vs-biped rig) — `docs/MISO-LESSONS.md`
- Production evidence: Miso City Level 1, Oct 29, 2026 — the local procedural route shipped the full cast (hero + 3 dogs, shared 20-bone rig, Walk/Attack/Hit/Down) in a live three.js game; engine-integration lessons (color-space trap, verify harness, itch packaging) in `docs/MISO-LESSONS.md` §7
