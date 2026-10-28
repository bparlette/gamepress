# The viral Short pipeline — capture standard for use case 1

How a gamepress game becomes a YouTube Short. Distilled from the Miso:
Starlight Adventure production (Oct 27, 2026), where three progressively
better attempts isolated what actually works. This doc is the authority for
capturing use-case-1 videos; `docs/USE-CASES.md` says *what* a viral demo
delivers, this says *how the video is made*.

Reference implementation: `tools/make_short.mjs` (generic) and, in the Hawk
repo, `tools/make_miso_short.mjs` (the original, commit `8b2853c`).

## The one-sentence version

Record **one fused stream** — `canvas.captureStream()` + a tap on the game's
own WebAudio graph, muxed by `MediaRecorder` in the page — driven by a
**deterministic stunt bot**, rendered **full-bleed**, and **measured** with
ffprobe before anyone quotes a spec.

## Why: the three Miso attempts

1. **Screenshot frame-series → ffmpeg.** Silent — pictures have no audio —
   and the frame cadence lied about speed. Dead on arrival.
2. **Offline-synthesized "matching" soundtrack.** Rejected by Cherie
   ("more real less lying"): representative SFX placed over footage is a
   dub, not gameplay sound. **Game video audio is the game's actual audio,
   captured while it plays. No exceptions, no representative tracks.**
3. **In-page recorder + coordinate stunt bot (the win).** One stream, so
   sync is structural, not something you fix in the edit. A bot choreographed
   against the level's real data threads a full beginning-to-end run with
   named set-pieces. This is the standard below.

## In-game hook (small, gated, inert for players)

Games that will be filmed carry a capture hook behind `?short=1`
(`?auto=1` spectate bots predate it; `?short=1` implies the bot drives).

1. **Audio tap.** When the AudioContext is created, also create a
   `MediaStreamDestination` and connect the game's master chain to it:
   - Master-gain games (one gain → destination): `masterGain.connect(recDest)`.
   - Per-voice games (each voice → destination): connect each voice's gain
     to `recDest` as well (see Miso's `tone()` / `noiseBurst()`).
   Creating the node is harmless for normal players; nothing records unless
   the recorder below runs.
2. **Recorder.** Under `?short=1` only:

   ```js
   function setupShortRecorder() {
     audioInit(); // ensure AC + recDest exist
     const stream = canvas.captureStream(60);
     const track = recDest && recDest.stream.getAudioTracks()[0];
     if (track) stream.addTrack(track);
     const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
       ? 'video/webm;codecs=vp9,opus' : 'video/webm';
     const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
     const chunks = [];
     rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
     rec.onstop = async () => {
       await fetch('/api/save_clip', { method: 'POST', body: await new Blob(chunks, { type: mime }).arrayBuffer() });
       window.__RECORDING_DONE = true;
     };
     rec.start();
     window.__RECORDER = rec;
   }
   ```

3. **Stop on the game's own end state** (course-clear screen, finish phase,
   results) plus a step/time failsafe — never a wall-clock guess in the tool.
4. **Expose the truth hooks** every filmable game should already have:
   `window.__events` (typed event log with game-time stamps: kills, stunts,
   finishes) and `window.__dbg()`. The event log is how a take is *judged* —
   a run "has a double kill" because the log says so, not because someone
   eyeballed it.

## The bot: choreograph, don't improvise

- Drive inputs from **game data**: find targets by spawn position / id,
  trigger jumps and actions inside position windows (Miso's bot: stomp the
  beetle at x=390, air-yarn the slime at x=810, double-kill the pair at
  1590/1680, bell leap at 4180→4320). Timed key-mashing takes deaths;
  coordinate choreography threads the level.
- **Full run, beginning to end.** Title/card → play → clear/finish screen
  on camera. Partial runs read as demos; complete runs read as *games*.
- **Seeded RNG** (`?seed=`) so a good take is reproducible and a bad one is
  diagnosable.
- **5-PLAY RULE still applies:** capture multiple takes (vary the seed),
  keep the ones whose event logs contain the target stunts, and cut the
  reel from verified moments. One fused stream per take keeps every clip's
  audio native.

## The tool: one command

`node tools/make_short.mjs --game-dir <dir> --out dist/shorts/<game>_short.mp4`

- Serves the game locally, spawns headless Chrome at `?short=1&auto=1`,
  waits for the page to POST its clip to `/api/save_clip`, then renders
  with ffmpeg and prints the **measure report** (below). Node builtins +
  Chrome + ffmpeg only — no npm deps.
- Per-game tools are thin wrappers (game dir, query, output name, stunt
  list) over this shape. Commit the tool *and* the output to the repo so
  any session can rerun it.

## Render standard

- **1080×1920, gameplay full-bleed and bright.** Default treatment for a
  landscape game is a center-crop fill (the follow-cam subject stays
  centered). No card frames, no dimming overlays, no dead space — see
  `docs/VISUAL-STANDARDS.md`. Wide HUD text may clip at the crop edges;
  if a game's money text is wide, prefer a blurred-fill backdrop over
  shrinking the gameplay.
- **Match the stream durations.** Trim to the shorter of video/audio.
  A silent tail is acceptable only where the game itself is silent
  (e.g. holding on a clear screen after the fanfare ends).
- Keep the recorder's native frame rate (cap 60). Do not resample to a
  "nicer" number and then quote it.

## The MEASURE gate (before any spec is repeated, anywhere)

The Miso report claimed "60 FPS"; the file measured 25 fps (card render)
and ~46 fps VFR (fullcrop render), with audio/video durations 6s apart in
one render and 1.8s apart in another. **Requested specs are not specs.**
Before a Short is delivered or described:

1. `ffprobe` both streams: resolution, **real fps** (frame count ÷ video
   duration), per-stream durations, audio sample rate/channels.
2. Durations agree within ~0.25s, or the gap is explained by the game's
   own silence.
3. Loudness spot-checks: near-silent where the game is silent (title
   screens prove the track is genuinely the game), clear peaks at the
   stunt moments.
4. Frame grabs at the stunt timestamps — the named moments are visibly
   in the cut.
5. **Check Drive recency before adjudicating or delivering.** Renders may
   iterate on Google Drive faster than the repo; the newest Drive file,
   not the repo copy, may be the real deliverable. (Learned the hard way,
   Oct 27: the repo held a stale card render while three better renders
   were already on Drive.)
6. Deliver as a **permanent, phone-openable link** (Drive
   anyone-with-link). Never `file://` paths from someone's machine.

## Honesty rules (Cherie, Oct 27, 2026 — "more real less lying")

- Real captured game audio only. No dubbed, synthesized, or
  "representative" tracks.
- Titles and descriptions claim only what the footage does. No fake
  provenance ("lost 1994 game") — the true angle is the hook
  ("brand-new homebrew, made in 2026").
- Report measured specs, not requested specs — in the delivery message
  and in the commit message.
