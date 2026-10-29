# SPRITE-TO-3D — sprite → 3D → rig: the free chain

How a 2D character becomes a walking 3D one. There are two routes: a paid
hosted generator (Meshy) and a free chain built from open models. This doc
is the free chain, end to end, with the traps marked — every trap below was
hit in production (Miso, Oct 28, 2026), not read off a spec sheet.

> Tool rows live in `docs/ASSET-SOURCES.md`; the one-line capability map is
> `docs/CAPABILITIES.md`. Generated meshes still owe the normalisation pass
> in `docs/PREMIUM.md` §1 (decimation, scale, palette) before they ship.

## 1. Two routes — pick by constraint, not by habit

**Meshy (paid route).** Fast, hosted, textured output, house account.
Generate on the free tier if you like — but know the wall before you start:
**verified Oct 28, 2026: on the free plan, GLB downloads are Pro-paywalled.**
Generation is free-tier; export is not. A finished, rigged cat sat in the
workspace with no way out short of subscribing. Reach for Meshy when speed
matters more than the subscription and the plan is already paid.

**The free chain (this doc).** $0 at every step; slower, and dependent on
quota or a borrowed GPU. Quality is competitive — TRELLIS.2 output rivals
hosted tools — and nothing is paywalled at the export step. This is the
default when there is no deadline breathing down the run.

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

**(b) Google Colab GPU — the reliable free route.** Run the model repo in
a Colab notebook on a free T4: no shared quota, and the GLB downloads
straight out of the session. The notebook pattern (kept with the project
that first used it — `Hunyuan3D_on_Colab.ipynb` is the worked example):

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

## 5. Step 4 — verify before presenting anything

Generators and riggers both fail politely — the file exists, the walk is
wrong. Gate every result:

- [ ] **Parse the GLB**: bone count, one skin, animation present and named
      (the house convention is an action named exactly `Walk`).
- [ ] **Render phase stills** (0 / 25 / 50 % of the cycle): feet alternate,
      mid-swing foot actually lifts, no limb drags through the body.
- [ ] **Eyeball the stills against the reference image** — silhouette and
      proportions, not vibes.
- [ ] **Presentation rule (learned Oct 28, 2026):** show the character
      **standing on a ground plane with a contact shadow under the feet**.
      A mid-stride frame floating in a grey void reads as *falling*, not
      walking — the reviewer rejects the pose before they ever see the
      likeness. Standing shot first, walk frames second.

## Costs

| Route | Cost | The catch |
|---|---|---|
| Meshy free tier | $0 to generate | **Downloads paywalled** — export needs Pro |
| HF Spaces (TRELLIS.2 / Hunyuan3D-2) | $0 | Shared ZeroGPU quota can refuse the download step; a free HF token raises it |
| Colab free tier | $0 | T4 (16 GB), session time limits; mini checkpoints on OOM |
| UniRig | $0 | Needs a GPU — same Colab session; staged public release, see repo for license |

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
