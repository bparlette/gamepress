# Cloud Runners — free compute for the slow jobs

Everyone using gamepress already has GitHub set up. That means free cloud
compute with zero setup friction: this repo is public, so GitHub Actions
gives **unlimited free runner minutes**.

## Why

The slowest gamepress steps are the ones that just burn CPU locally:

| Job | Local cost | Cloud cost |
|---|---|---|
| `gamepress drive` (video render) | minutes of Chrome + ffmpeg | free |
| `gamepress voice` batch (TTS) | 136MB model + per-line synthesis | free |
| `npm test` (full suite) | 2+ minutes, blocks your terminal | free |

Offload those, keep your machine (and your AI's terminal) free for the
creative work: writing drive plans, scripts, and game code.

## How it works

1. Push a job file (drive plan JSON, script text file) to the repo — or
   trigger a workflow manually from the Actions tab.
2. The runner checks out the repo, installs deps, runs the gamepress
   command, and uploads the result as a workflow **artifact**.
3. Download the artifact (MP4, WAVs) from the Actions run page, or pull it
   with `gh run download`.

No secrets needed for any of these jobs. Everything runs on public data.

## Which jobs make sense

- **`drive` (video render)** — the #1 candidate. Chrome + ffmpeg on a
  runner, MP4 comes back as an artifact. See
  `.github/workflows/render-video.yml`.
- **`voice` batch (TTS)** — the runner downloads the 136MB int8 Kokoro model
  once per run via `gamepress setup --tts`, synthesizes every line, uploads
  the WAVs. See `.github/workflows/tts-batch.yml`.
- **`test` suite** — runs on every push so broken main gets caught without
  anyone running tests locally. See `.github/workflows/test.yml`.

## Which jobs DON'T make sense

Anything interactive or prompt-driven:

- `gamepress auto "<idea>" --prompt` — asks questions, needs a human.
- `gamepress make` with missing answers — same.
- `gamepress drive` with `--watch` or any flag that opens a local browser
  for eyeballing. Cloud runners are headless; use `--quick` smoke tests
  locally and full renders in the cloud.

Rule of thumb: if the command needs a keyboard or a pair of eyes, it stays
local. If it takes a file in and produces a file out, it can go to a runner.

## Triggering from the Actions tab

All three workflows use `workflow_dispatch` with inputs, so you (or your AI)
can trigger them by hand:

1. Go to the repo's **Actions** tab.
2. Pick the workflow (e.g. "Render video").
3. Click **Run workflow**, fill in the inputs (plan path, voice preset…).
4. Wait for the green check, download the artifact.

From the CLI, `gh` does the same thing:

```bash
# render a video from a drive plan already in the repo
gh workflow run render-video.yml -f plan=examples/pigskin-bowl/hook.drive.json

# synthesize a batch of voice lines
gh workflow run tts-batch.yml -f script=press/vo-lines.txt -f voice=trailer

# download the newest artifact from a run
gh run download <run-id>
```

## Colab — when you need a GPU

None of today's gamepress jobs need a GPU, but if that changes (local
vision grading at scale, future ML-assisted capture), Colab is the same
pattern: free compute, file in / file out.

```python
# in a Colab cell — gamepress is zero-npm-deps, so this just works
!git clone https://github.com/bparlette/gamepress.git
%cd gamepress
!node bin/gamepress.mjs setup --tts      # one-time per session
!node bin/gamepress.mjs voice "Your line here" --voice trailer --out /content/out.wav
```

Then download `/content/out.wav` from the Colab file browser. Colab
sessions time out after ~12h and lose the model download, so prefer GitHub
Actions for repeatable batch jobs and reach for Colab only when a GPU is
actually required.

## `gamepress cloud` — implemented

`gamepress cloud` wraps the slow commands with cloud-first, local-fallback
behavior:

```bash
gamepress cloud drive examples/pigskin-bowl/hook.drive.json
gamepress cloud voice press/vo-lines.txt --voice trailer
gamepress cloud test
```

### Fallback rule (Cherie's directive)

**If cloud can't run the job, run it locally. Never error on cloud
unavailability.** The command tries GitHub Actions first and falls back to
the exact local equivalent when any of these are true:

- the workflow file is missing from `.github/workflows/`
- the `gh` CLI isn't installed or isn't authenticated
- triggering the workflow fails
- the run fails or the artifact download fails or times out

The fallback is silent-ish: one line to stderr saying cloud was unavailable
and the job is running locally, then normal local output. Downstream steps
(`pack`, `check`) work unchanged because artifacts land in the same paths a
local run would produce.

This same rule applies everywhere gamepress touches the network for
convenience: if the API, the browser, or the artifact can't be reached, do
the work locally instead of failing.

## `gamepress run` is cloud-first by default

The orchestrator (`gamepress run`, see ORCHESTRATOR.md) runs its slow
pipeline steps — `test` and `video` — on cloud runners first, with the same
silent local fallback. The human never has to think about it:

```bash
gamepress run --job <id> --answer '{"idea": "..."}'   # cloud-first
gamepress run --job <id> --answer '{"idea": "..."}' --local  # force local
```

`gamepress all <id>` and `gamepress auto` behave the same way (both accept
`--local`). `runAll()` takes a `cloud` option (default `true`).

One extra guard applies to pipeline cloud runs: **cloud runners check out
origin, so they can only see committed files.** If the game's files or the
drive plan have uncommitted changes (the normal case for a fresh
`gamepress run` build), the pipeline skips cloud with one stderr line and
runs locally — no wasted polling against a run that could never see the
files. Commit + push first if you want the cloud to do the work.

## Workflow files

The workflows live in `.github/workflows/`:

| File | Trigger | Does |
|---|---|---|
| `render-video.yml` | manual (`workflow_dispatch`) | `gamepress drive <plan>` → MP4 artifact |
| `tts-batch.yml` | manual (`workflow_dispatch`) | `gamepress voice` per line → WAVs artifact |
| `test.yml` | push + PR | `npm test` |

**Maintainer note:** the GitHub connector cannot write `.github/workflows/*`
(it silently drops the change). Update these files through the browser's web-UI
file editor and verify with the API afterwards.
