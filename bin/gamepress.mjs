#!/usr/bin/env node
// gamepress: capture scenes from a game and build every store-page asset (Steam, itch.io, CrazyGames, social).
//
//   gamepress init [dir]                    create press/ with a starter capture plan
//   gamepress capture <plan.json>           drive a web game in headless Chrome: stills + clips -> press/raw
//   gamepress drive <plan.json> [--out dir] frame-locked scripted playthrough of a web game -> captioned MP4 with audio
//   gamepress catalog <games.json> --id x --title "X" --category "Y" --path g/x/index.html [--still shot.jpg] [--orientation portrait]
//                                           add/update a game on a demo page catalog and build its thumbnail
//   gamepress voices <script.json> [--dir press] [--engine edge|kokoro]  batch-synthesize voice lines for a game
//                                           (Edge TTS = network/MP3; --engine kokoro = local/WAV, offline)
//   gamepress voice "Your script here" [--voice trailer|character|narrator|VOICE_ID] [--speed 1.0] [--out out.wav]
//                                           local Kokoro TTS (free, no API); run `gamepress setup` once first
//   gamepress setup [--tts]                 full environment bootstrap (doctor + download all tools.json tools); --tts = Kokoro only
//   gamepress tools [--check]               list external tools (sizes, install status); --check for upstream updates
//   gamepress approve <id> [--notes ...]    approve a vertical-slice demo; define full-game expansion goals
//   gamepress expand <id> [--blueprint]     token-saving AI blueprint, or scaffold a multi-level world (gplevels.js)
//   gamepress --help | gamepress <cmd> --help   generated help for all commands
//   gamepress roblox <file.rbxl> --universe N --place N [--type Published|Saved] [--rojo project.json] [--live]
//                                           publish a Roblox place via Open Cloud (dry run unless --live)
//   gamepress cloud drive <plan.json> | voice <script.txt> | test   free GitHub runners, auto-falls-back to local
//   gamepress scenes <video> [--count 12]   any game: pull the best stills and clips out of a screen recording
//   gamepress pack [--platforms steam,itch,crazygames,social] [--focus 0.5,0.4]
//                                           crop/scale/encode everything each store needs -> press/out/<platform>
//   gamepress check                         verify press/out against each store's requirements
//
// Layout (all paths relative to --dir, default ./press):
//   raw/hero.png          the one key image (capsules, covers, backgrounds are cropped from it)
//   raw/shots/*.png       gameplay screenshots (store screenshot galleries)
//   raw/clips/*.mp4       gameplay clips (trailer, GIF, social video are cut from these)
//   raw/trailer.mp4       optional: a finished trailer; used instead of joining raw/clips
//   out/<platform>/...    deliverables
// Needs Node 22+, ffmpeg/ffprobe, and Google Chrome for `capture`. No npm dependencies.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, rmSync, mkdtempSync, copyFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, driveBatch, dryRun, generateHooks } from '../lib/drive.mjs';
import { ideate, applyAnswers } from '../lib/ideate.mjs';
import { viralCommand } from '../lib/viral.mjs';
import { make, doctor, lint, vision, contextDigest, RECIPES, REGISTRY } from '../lib/extras.mjs';
import { config, status, grade, runAll } from '../lib/pipeline.mjs';
import { catalogCommand } from '../lib/catalog.mjs';
import { research, scaffold, testGame, botCheck, bundle, publishPack, publishDemo, copyDraft, buildTarget, repoInit } from '../lib/tasks.mjs';
import { visualSmokeTest } from '../lib/visual.mjs';
import { publishRoblox, shipRoblox, runLuau } from '../lib/roblox.mjs';
import * as hosts from '../lib/hosts/index.mjs';
import { voices, bumpVersion, makeIcons, compositeCapsuleLogo } from '../lib/studio.mjs';
import { probeLocalAi, healGame, isLocalAiEnabled } from '../lib/local_ai.mjs';
import { buildLegoGame } from '../lib/lego.mjs';
import { gatherStats } from '../lib/stats.mjs';
import { listPresets, loadPreset, savePreset, deletePreset, sanitizeAnswers, readAnswersFile, recordLastAnswers, readLastAnswers, promptAnswers } from '../lib/presets.mjs';
import { printImageWorkflow, printImageIntake, intakeQuestions, generateViewPrompts, answersToDescription } from '../lib/img2threejs.mjs';
import { speak, setupTts, VOICE_PRESETS } from '../lib/tts.mjs';
import { listTools, checkUpdates, downloadTool, loadManifest } from '../lib/tools.mjs';
import { approveDemo, getApproval, listApprovals, generateBlueprint, scaffoldExpansion } from '../lib/expand.mjs';
import { cloudAvailable, cloudOrLocal } from '../lib/cloud.mjs';
import { startRun, answerRun, statusRun } from '../lib/run.mjs';
import { createInterface as _rl } from 'node:readline';

/** One-off free-text prompt (only called when --prompt already verified a TTY). */
async function _askText(q) {
  const rl = _rl({ input: process.stdin, output: process.stdout });
  try { return (await new Promise(r => rl.question(q + ' ', r))).trim(); }
  finally { rl.close(); }
}

/** One-off choice prompt: returns the chosen option id. */
async function _askChoice(q, options) {
  const rl = _rl({ input: process.stdin, output: process.stdout });
  try {
    const menu = options.map((o, i) => `  ${i + 1}. ${o.label}`).join('\n');
    const a = (await new Promise(r => rl.question(`${q}\n${menu}\nchoice [1-${options.length}]: `, r))).trim();
    const n = parseInt(a, 10);
    return options[(isNaN(n) ? 1 : Math.min(Math.max(n, 1), options.length)) - 1].id;
  } finally { rl.close(); }
}

/** One-off yes/no prompt: returns true for yes. */
async function _askYesNo(q) {
  const rl = _rl({ input: process.stdin, output: process.stdout });
  try {
    const a = (await new Promise(r => rl.question(`${q} [y/N] `, r))).trim().toLowerCase();
    return a === 'y' || a === 'yes';
  } finally { rl.close(); }
}

/**
 * Start-from-image intake: 4 ways in (docs/IMG2THREEJS-WORKFLOW.md).
 * --image-mode upload|describe|game|prompt-me (+ --image-desc) for scripted runs;
 * interactive choice + follow-ups in --prompt mode.
 */
async function _imageIntake(recipeName) {
  let mode = flag('image-mode');
  const desc = flag('image-desc', '');
  if (!mode && argv.includes('--prompt') && !JSON_OUT) {
    mode = await _askChoice('\nDo you have images, or should I generate them?', [
      { id: 'upload', label: 'I have images — validate them' },
      { id: 'describe', label: 'I will describe the asset — generate the 4 view prompts' },
      { id: 'game', label: 'Name a game — find reference art and generate clean versions' },
      { id: 'prompt-me', label: 'Prompt me — ask 4 quick questions, then write the prompts' },
    ]);
  }
  mode = mode || 'prompt-me';
  const opts = { recipe: recipeName, description: desc };

  if (mode === 'describe' && !desc && argv.includes('--prompt') && !JSON_OUT) {
    opts.description = await _askText('Describe the hero asset in one sentence:');
  }
  if (mode === 'game' && argv.includes('--prompt') && !JSON_OUT) {
    opts.game = await _askText('Which game? (I will find reference art, then generate clean isolated versions)');
    // Ask the 4 questions against the reference so the prompts match the game's look.
    console.log('\nQuick questions to lock the look:');
    const answers = {};
    for (const q of intakeQuestions()) answers[q.id] = await _askText(`  ${q.question}`);
    opts.answers = answers;
  }
  if (mode === 'prompt-me' && argv.includes('--prompt') && !JSON_OUT) {
    const answers = {};
    for (const q of intakeQuestions()) answers[q.id] = await _askText(`  ${q.question}`);
    const description = answersToDescription(answers);
    console.log(`\nLocked in: "${description}" — generating the 4 view prompts...`);
    printImageIntake('describe', { ...opts, description });
    return;
  }
  printImageIntake(mode, opts);
}


const HERE = dirname(fileURLToPath(import.meta.url));
const PRESETS = JSON.parse(readFileSync(join(HERE, '..', 'presets', 'platforms.json'), 'utf8'));
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const cmd = argv[0];
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(i > 0 && arr[i - 1].startsWith('--')));
const DIR = resolve(flag('dir', 'press'));
const RAW = join(DIR, 'raw'), OUT = join(DIR, 'out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ffmpeg = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
const probe = file => {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,codec_name,r_frame_rate:format=duration,size', '-of', 'json', file]).toString());
  const s = (j.streams || []).find(x => x.width) || {};
  return { w: s.width, h: s.height, codec: s.codec_name, duration: Number(j.format?.duration || 0), bytes: Number(j.format?.size || statSync(file).size) };
};
const list = (dir, re) => (existsSync(dir) ? readdirSync(dir).filter(f => re.test(f)).sort().map(f => join(dir, f)) : []);
const ensure = d => mkdirSync(d, { recursive: true });
const mb = b => (b / 1048576).toFixed(2);

// ------------------------------------------------------------------ video/image filters
/** ffmpeg filter that turns any frame into exactly w x h. */
function fitFilter(w, h, fit = 'cover', focus = [0.5, 0.5]) {
  if (fit === 'contain') return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  if (fit === 'blurpad') {
    return `split[a][b];[a]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=28:4,eq=brightness=-0.12[bg];` +
      `[b]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`;
  }
  return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:(iw-${w})*${focus[0]}:(ih-${h})*${focus[1]},setsar=1`;
}
const parseFocus = s => (s ? s.split(',').map(Number) : [0.5, 0.5]);

// ------------------------------------------------------------------ capture (web games, headless Chrome over CDP)
// Unified on lib/cdp.mjs (F8): one Chrome driver, findChrome(), file:// fixes.
async function capture(planFile) {
  const { launchChrome } = await import('../lib/cdp.mjs');
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const [W, H] = plan.viewport || [1920, 1080];
  ensure(join(RAW, 'shots')); ensure(join(RAW, 'clips'));
  let onFrame = null;
  const chrome = await launchChrome({ width: W, height: H,
    onEvent: (method, params, send) => { if (method === 'Page.screencastFrame') { send('Page.screencastFrameAck', { sessionId: params.sessionId }); onFrame?.(params); } } });
  const { send } = chrome;
  const finish = async code => { await chrome.close().catch(() => {}); process.exit(code); };
  const watchdog = setTimeout(() => { console.error('capture timed out'); finish(2); }, (plan.timeoutSec || 600) * 1000);
  watchdog.unref?.();
  try {
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: plan.url });
    await sleep(plan.loadWaitMs ?? 4000);

    const snap = async (type = 'png') => Buffer.from((await send('Page.captureScreenshot', { format: type, quality: 85 })).result.data, 'base64');
    const KEYS = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, ' ': 32, Shift: 16, Tab: 9 };
    const keyEvt = (type, k) => send('Input.dispatchKeyEvent', { type, key: k, code: k.length === 1 ? `Key${k.toUpperCase()}` : k, windowsVirtualKeyCode: KEYS[k] ?? k.toUpperCase().charCodeAt(0), text: type === 'keyDown' && k.length === 1 ? k : undefined });
    const run = async steps => {
      for (const s of steps) {
        if (s.wait) await sleep(s.wait);
        else if (s.eval) await send('Runtime.evaluate', { expression: s.eval, awaitPromise: true });
        else if (s.key) { await keyEvt('keyDown', s.key); await sleep(s.hold ?? 80); await keyEvt('keyUp', s.key); }
        else if (s.click) { const [x, y] = s.click; for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); }
        else if (s.move) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: s.move[0], y: s.move[1] });
        else if (s.shot) {
          const dir = s.shot === 'hero' ? RAW : join(RAW, 'shots');
          const file = join(dir, s.shot === 'hero' ? 'hero.png' : `${s.shot}.png`);
          writeFileSync(file, await snap()); console.log('  still', file);
        } else if (s.record) await record(s.record);
      }
    };
    // record: Chrome's screencast pushes a frame whenever the page repaints (far faster than polling
    // screenshots); frames keep their real timestamps and are rebuilt into a constant-30fps MP4
    const record = async r => {
      const profile = mkdtempSync(join(tmpdir(), 'gamepress-'));
      const frames = join(profile, `rec_${r.name}`); ensure(frames);
      const stamps = [];
      onFrame = f => { const n = stamps.length; writeFileSync(join(frames, `${String(n).padStart(6, '0')}.jpg`), Buffer.from(f.data, 'base64')); stamps.push(f.metadata.timestamp); };
      await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
      await Promise.all([run(r.steps || []), sleep((r.seconds ?? 6) * 1000)]);
      await send('Page.stopScreencast'); onFrame = null;
      if (stamps.length < 2) { console.error(`  clip ${r.name}: Chrome sent ${stamps.length} frames (is the page animating?)`); rmSync(profile, { recursive: true, force: true }); return; }
      const list = stamps.map((t, i) => `file '${join(frames, `${String(i).padStart(6, '0')}.jpg`)}'\nduration ${(i + 1 < stamps.length ? stamps[i + 1] - t : 0.04).toFixed(4)}`).join('\n');
      writeFileSync(join(frames, 'list.txt'), list);
      const out = join(RAW, 'clips', `${r.name}.mp4`);
      ffmpeg('-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '17', out);
      console.log(`  clip ${out} (${stamps.length} frames over ${(stamps.at(-1) - stamps[0]).toFixed(1)}s)`);
      rmSync(profile, { recursive: true, force: true });
    };
    await run(plan.steps || []);
    clearTimeout(watchdog);
    await finish(0);
  } catch (err) { console.error('capture failed:', err.message); await finish(1); }
}

// ------------------------------------------------------------------ scenes (any game: pull the best moments from a recording)
function scenes(video) {
  if (!video || !existsSync(video)) die(`usage: gamepress scenes <recording.mp4> [--count 12]`);
  const count = Number(flag('count', 12)), threshold = flag('threshold', '0.25');
  ensure(join(RAW, 'shots')); ensure(join(RAW, 'clips'));
  const info = probe(video);
  console.log(`${basename(video)}: ${info.w}x${info.h}, ${info.duration.toFixed(1)}s`);
  // 1. cut points where the picture changes a lot (new area, new fight, menu -> gameplay)
  const log = join(tmpdir(), `gamepress-scenes-${process.pid}.txt`);
  execFileSync('ffmpeg', ['-y', '-i', video, '-vf', `select='gt(scene,${threshold})',metadata=print:file=${log}`, '-an', '-f', 'null', '-'], { stdio: 'ignore' });
  const cuts = existsSync(log) ? [...readFileSync(log, 'utf8').matchAll(/pts_time:([\d.]+)/g)].map(m => Number(m[1])) : [];
  const marks = [0, ...cuts, info.duration].filter((t, i, a) => i === 0 || t - a[i - 1] > 1.5);
  // 2. one candidate frame from the middle of each scene, then keep the most detailed (largest JPEG = most detail)
  const tmp = mkdtempSync(join(tmpdir(), 'gamepress-cand-'));
  const cand = [];
  for (let i = 0; i + 1 < marks.length; i++) {
    const t = (marks[i] + marks[i + 1]) / 2, f = join(tmp, `c${String(i).padStart(3, '0')}.jpg`);
    ffmpeg('-ss', String(t), '-i', video, '-frames:v', '1', '-q:v', '2', f);
    if (existsSync(f)) cand.push({ t, start: marks[i], end: marks[i + 1], f, size: statSync(f).size });
  }
  const best = cand.sort((a, b) => b.size - a.size).slice(0, count).sort((a, b) => a.t - b.t);
  best.forEach((c, i) => {
    const name = `scene_${String(i + 1).padStart(2, '0')}`;
    ffmpeg('-ss', String(c.t), '-i', video, '-frames:v', '1', join(RAW, 'shots', `${name}.png`));
    const len = Math.min(8, c.end - c.start);
    ffmpeg('-ss', String(c.start), '-t', String(len), '-i', video, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', join(RAW, 'clips', `${name}.mp4`));
  });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${cuts.length} cuts found, kept ${best.length} scenes -> ${RAW}/shots and ${RAW}/clips`);
  console.log('Next: pick your favourite still, copy it to raw/hero.png, delete the weak ones, then run `gamepress pack`.');
}

// ------------------------------------------------------------------ pack
function sources() {
  const shots = list(join(RAW, 'shots'), /\.(png|jpe?g)$/i);
  const heroFile = list(RAW, /^hero\.(png|jpe?g)$/i)[0] || shots.find(f => /hero/i.test(basename(f))) || shots[0];
  const gallery = shots.filter(f => f !== heroFile);
  const clips = list(join(RAW, 'clips'), /\.(mp4|mov|webm)$/i);
  return { hero: heroFile, shots: gallery.length ? gallery : shots, clips, trailer: existsSync(join(RAW, 'trailer.mp4')) ? join(RAW, 'trailer.mp4') : null };
}

function joinClips(clips, w, h, fps, fit, maxSeconds, out) {
  // normalise every clip to the target size/fps first, then join with the concat demuxer (no re-encode)
  const tmp = mkdtempSync(join(tmpdir(), 'gamepress-join-'));
  const parts = clips.map((c, i) => {
    const f = join(tmp, `p${i}.mp4`);
    ffmpeg('-i', c, '-vf', `${fitFilter(w, h, fit)},fps=${fps},format=yuv420p`, '-an', '-c:v', 'libx264', '-crf', '18', f);
    return f;
  });
  writeFileSync(join(tmp, 'list.txt'), parts.map(f => `file '${f}'`).join('\n'));
  ffmpeg('-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-t', String(maxSeconds), '-c:v', 'copy', '-movflags', '+faststart', out);
  rmSync(tmp, { recursive: true, force: true });
}

function makeVideo(spec, src, focus, outDir) {
  const out = join(outDir, spec.file);
  const fit = spec.fit || 'contain';
  if (src.trailer && spec.from === 'trailer') {
    ffmpeg('-i', src.trailer, '-vf', `${fitFilter(spec.w, spec.h, fit, focus)},fps=${spec.fps},format=yuv420p`, '-t', String(spec.maxSeconds), '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out);
  } else if (src.clips.length) {
    joinClips(src.clips, spec.w, spec.h, spec.fps, fit, spec.maxSeconds, out);
  } else return false;
  return true;
}

function makeGif(spec, src, outDir) {
  const input = src.trailer || src.clips[0];
  if (!input) return false;
  const out = join(outDir, spec.file), pal = join(tmpdir(), `gamepress-pal-${process.pid}.png`);
  let width = spec.w, fps = spec.fps, colors = 128;
  // shrink until under the size limit
  for (let attempt = 0; attempt < 6; attempt++) {
    const vf = `fps=${fps},${fitFilter(width, Math.round(width * spec.h / spec.w), 'cover')}`;
    ffmpeg('-t', String(spec.maxSeconds), '-i', input, '-vf', `${vf},palettegen=max_colors=${colors}`, pal);
    ffmpeg('-t', String(spec.maxSeconds), '-i', input, '-i', pal, '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', out);
    if (statSync(out).size <= spec.maxMB * 1048576) return true;
    width = Math.round(width * 0.85); fps = Math.max(10, fps - 1); colors = Math.max(64, colors - 16);
  }
  return true;
}

const CAPSULE_LOGO_IDS = new Set(['header_capsule', 'small_capsule', 'main_capsule', 'vertical_capsule', 'library_capsule', 'cover', 'banner']);

function pack() {
  const src = sources();
  if (!src.hero) die(`No images in ${RAW}. Run \`gamepress capture\` or \`gamepress scenes\` first.`);
  const focus = parseFocus(flag('focus'));
  const title = argv.includes('--no-logo') ? null : flag('title', null);
  const wanted = (flag('platforms') || Object.keys(PRESETS).filter(k => !k.startsWith('_')).join(',')).split(',');
  for (const p of wanted) {
    const preset = PRESETS[p];
    if (!preset) { console.error(`unknown platform ${p}`); continue; }
    const dir = join(OUT, p); ensure(dir);
    console.log(`\n${preset.label}`);
    for (const a of preset.assets) {
      const jpg = /\.jpe?g$/i.test(a.file);
      const enc = jpg ? ['-q:v', '2'] : [];
      if (a.from === 'hero') {
        const dst = join(dir, a.file);
        ffmpeg('-i', src.hero, '-vf', fitFilter(a.w, a.h, a.fit, focus), ...enc, '-frames:v', '1', dst);
        const logoAdded = title && CAPSULE_LOGO_IDS.has(a.id) ? compositeCapsuleLogo(dst, title) : false;
        console.log(`  ✓ ${a.file} ${a.w}x${a.h}${logoAdded ? ' (+logo)' : ''}`);
      } else {
        const pool = src.shots.slice(0, a.max);
        pool.forEach((f, i) => ffmpeg('-i', f, '-vf', fitFilter(a.w, a.h, a.fit, focus), ...enc, '-frames:v', '1', join(dir, a.file.replace('{n}', String(i + 1).padStart(2, '0')))));
        console.log(`  ${pool.length >= (a.min || 1) ? '✓' : '✗'} ${pool.length} screenshots ${a.w}x${a.h}${pool.length < (a.min || 1) ? ` (need ${a.min})` : ''}`);
      }
    }
    if (preset.gif) console.log(makeGif(preset.gif, src, dir) ? `  ✓ ${preset.gif.file}` : `  ✗ ${preset.gif.file}: no clips in ${join(RAW, 'clips')}`);
    if (preset.video) console.log(makeVideo({ ...preset.video, fit: preset.video.fit || 'contain' }, src, focus, dir) ? `  ✓ ${preset.video.file}` : `  ✗ ${preset.video.file}: no clips in ${join(RAW, 'clips')}`);
    if (preset.rules) preset.rules.forEach(r => console.log(`  ! ${r}`));
  }
  console.log(`\nDone: ${OUT}. Run \`gamepress check\` to verify against each store's limits.`);
}

// ------------------------------------------------------------------ check
function check() {
  let bad = 0;
  const fail = m => { bad++; console.log(`  ✗ ${m}`); };
  for (const [p, preset] of Object.entries(PRESETS)) {
    if (p.startsWith('_')) continue;
    const dir = join(OUT, p);
    if (!existsSync(dir)) { console.log(`${preset.label}: not built (run pack)`); continue; }
    console.log(`\n${preset.label}`);
    for (const a of preset.assets) {
      const re = new RegExp('^' + a.file.replace('{n}', '\\d+').replace('.', '\\.') + '$');
      const files = list(dir, re);
      if (!files.length) { if (!a.optional) fail(`${a.file} missing`); continue; }
      let ok = true;
      for (const f of files) { const i = probe(f); if (i.w !== a.w || i.h !== a.h) { fail(`${basename(f)} is ${i.w}x${i.h}, needs ${a.w}x${a.h}`); ok = false; } }
      if (a.min && files.length < a.min) { fail(`${files.length} screenshots, store needs at least ${a.min}`); ok = false; }
      if (ok) console.log(`  ✓ ${files.length > 1 ? `${files.length} x ` : ''}${a.id} ${a.w}x${a.h}`);
    }
    if (preset.gif) {
      const f = join(dir, preset.gif.file);
      if (!existsSync(f)) fail(`${preset.gif.file} missing`);
      else { const s = statSync(f).size; s > preset.gif.maxMB * 1048576 ? fail(`${preset.gif.file} is ${mb(s)} MB, limit ${preset.gif.maxMB} MB`) : console.log(`  ✓ gif ${mb(s)} MB`); }
    }
    if (preset.video) {
      const f = join(dir, preset.video.file);
      if (!existsSync(f)) fail(`${preset.video.file} missing`);
      else { const i = probe(f); i.duration > preset.video.maxSeconds + 0.5 ? fail(`${preset.video.file} is ${i.duration.toFixed(0)} s, limit ${preset.video.maxSeconds}`) : console.log(`  ✓ video ${i.w}x${i.h} ${i.duration.toFixed(1)} s ${mb(i.bytes)} MB`); }
    }
  }
  console.log(bad ? `\n${bad} problem(s)` : '\nAll good.');
  process.exit(bad ? 1 : 0);
}

function init() {
  const d = resolve(positional[0] || DIR);
  ensure(join(d, 'raw', 'shots')); ensure(join(d, 'raw', 'clips'));
  copyFileSync(join(HERE, '..', 'examples', 'web-game.plan.json'), join(d, 'plan.json'));
  console.log(`Created ${d}. Edit ${join(d, 'plan.json')} (url + steps), then:\n  gamepress capture ${join(d, 'plan.json')} --dir ${d}\n  gamepress pack --dir ${d}\n  gamepress check --dir ${d}`);
}

const JSON_OUT = argv.includes('--json');
const LOCAL_AI = isLocalAiEnabled({ localAi: argv.includes('--local-ai') ? true : argv.includes('--no-local-ai') ? false : undefined });
function die(msg) { JSON_OUT ? console.log(JSON.stringify({ ok: false, error: String(msg).split('\n')[0] })) : console.error(String(msg).split('\n')[0]); process.exit(1); }

// ------------------------------------------------------------------ help (A1: generated from command definitions)
const HELP = {
  init: ['create press/ with a starter capture plan', 'gamepress init [dir]', ['--dir press']],
  capture: ['drive a web game in headless Chrome: stills + clips -> press/raw', 'gamepress capture <plan.json>', ['--dir press']],
  drive: ['frame-locked playthrough of a web game -> captioned MP4 with audio (spectate-first: "spectate":true in plan lets the game perform itself)', 'gamepress drive <plan.json> [--out dir] [--quick N] [--vo "text"] [--dry-run] [--batch a.json,b.json] [--batch-dir plans/] [--horizontal-only] [--vertical-only]', ['--out press/video', '--quick 4 (smoke test: low-res, short)', '--vo "line" (voiceover)', '--dry-run (validate only)', '--batch (one Chrome session, N videos)', '--batch-dir (all *.json in dir)', '--horizontal-only / --vertical-only (default: both orientations)', 'plan "spectate":true -> ?spectate=1&autostart=1&seed=N, input ignored (docs/SPECTATE.md)', 'output: <name>.mp4 + <name>-horizontal.mp4 / <name>-vertical.mp4 (dual orientation default)']],
  catalog: ['add/update a game on a demo page catalog and build its thumbnail', 'gamepress catalog <games.json> --id x --title "X" --path g/x/index.html', ['--id', '--title', '--category', '--path', '--still shot.jpg', '--orientation portrait', '--keys {}', '--labels {}']],
  scenes: ['pull the best stills and clips out of a screen recording', 'gamepress scenes <video> [--count 12]', ['--count 12', '--threshold 0.25']],
  pack: ['crop/scale/encode everything each store needs -> press/out/<platform>', 'gamepress pack [--platforms steam,itch] [--focus 0.5,0.4] [--title "Game"]', ['--platforms', '--focus x,y', '--title', '--no-logo']],
  check: ['verify press/out against each store\'s requirements', 'gamepress check', ['--dir press']],
  auto: ['zero-AI path: idea -> playable game + video in one command', 'gamepress auto "<idea>" [--track demo] [--prompt] [--from-image] [--lego] [--preset name]', ['--id x', '--track demo|web-store|hook', '--style toon|comic|...', '--answers a.json', '--preset name', '--prompt (interactive)', '--from-image (img2threejs)', '--image-mode upload|describe|game|prompt-me', '--image-desc "..."', '--lego', '--local-ai', '--heal', '--vo']],
  lego: ['build a composable gplego game from an idea', 'gamepress lego <id> --idea "<idea>" [--spec spec.json]', ['--idea', '--spec']],
  make: ['build a whole game from a recipe + small JSON spec', 'gamepress make <id> --recipe <name> --spec spec.json', ['--recipe', '--spec', '--answers a.json', '--force']],
  recipes: ['list the 24 game recipes (or regenerate docs/RECIPES-CATALOG.md)', 'gamepress recipes [--md]', ['--md (write docs)', '--json']],
  new: ['scaffold a new game shell', 'gamepress new <id> [--games dir] [--title T] [--target web|roblox]', ['--games', '--title', '--target']],
  test: ['headless playtest + visual smoke test: must print "ok": true', 'gamepress test <game dir or url> [--root dir]', ['--root']],
  visual: ['visual smoke test: screenshot + pixel-variance render check', 'gamepress visual <game dir or url> [--seconds 10]', ['--seconds 10']],
  botcheck: ['prove the demo loses then wins (bot playtest)', 'gamepress botcheck <game-id> [--seconds 40]', ['--seconds 40']],
  status: ['what is done/stale, what is next (token-saving)', 'gamepress status <game-id> [--json]', ['--json', '--games', '--catalog']],
  all: ['run every missing/stale step of a track in order', 'gamepress all <id> --track hook|demo|web-store [--heal] [--vo] [--horizontal-only] [--vertical-only]', ['--track', '--force', '--heal', '--vo', '--local (skip cloud)', '--local-ai', '--horizontal-only / --vertical-only (default: both orientations)']],
  grade: ['score game + hook video against the quality bar', 'gamepress grade <id> [--vision] [--threshold 80]', ['--vision (Ollama)', '--threshold 80']],
  heal: ['auto-repair lint/test bugs (optionally with local AI)', 'gamepress heal <id> [--no-local-ai]', ['--no-local-ai']],
  hooks: ['render 3 opening A/B hook variants', 'gamepress hooks <id>', []],
  stats: ['aggregate grade + YouTube/itch stats into a promotion verdict', 'gamepress stats [id]', []],
  'local-ai': ['probe optional local Ollama coprocessor', 'gamepress local-ai', []],
  ideate: ['research a game idea: archetype, one-ups, questions', 'gamepress ideate "<idea>" [--offline]', ['--offline']],
  viral: ['scan a game for viral signals; outputs 4 questions to answer before the drive plan', 'gamepress viral <game-dir>', []],
  preset: ['save/reuse named answer presets', 'gamepress preset save <name> | list | show <name> | delete <name>', []],
  doctor: ['check every tool the pipeline needs', 'gamepress doctor', []],
  lint: ['catch personal paths, secrets, external requests, huge bundles', 'gamepress lint <id>', ['--games']],
  copy: ['write store copy (description, tags) for a game', 'gamepress copy <id>', []],
  build: ['build a target bundle', 'gamepress build <id> --target web|steam|roblox', ['--target']],
  host: ['publish to a host: tries the real upload, else prints exact manual steps', 'gamepress host <itch|crazygames|steam|youtube|cloudflare|github> <id> [--live]', ['--live', '--user', '--dir publish']],
  deploy: ['DEPRECATED alias of `host` — use `gamepress host` instead', 'gamepress deploy <host> <id> [--live]', ['--live']],
  repo: ['init git repo + layout (+ GitHub creation)', 'gamepress repo <id> [--github] [--private]', ['--github', '--private', '--examples']],
  bundle: ['zip a game dir for distribution', 'gamepress bundle <game dir> [--out dist]', ['--out dist']],
  'publish-demo': ['add game to the GitHub Pages demo catalog', 'gamepress publish-demo <id> --catalog <games.json> [--push]', ['--catalog', '--push', '--video']],
  'publish-pack': ['package store deliverables + manifest', 'gamepress publish-pack <id> [--games dir]', ['--games', '--catalog', '--video']],
  roblox: ['publish a Roblox place via Open Cloud (dry run unless --live)', 'gamepress roblox <file.rbxl> --universe N --place N [--live]', ['--universe', '--place', '--type Published|Saved', '--rojo project.json', '--live']],
  'roblox-ship': ['save draft -> Luau test -> publish a Roblox place', 'gamepress roblox-ship <file.rbxl> --universe N --place N [--test t.luau]', ['--universe', '--place', '--test']],
  'roblox-test': ['run a Luau test script against a place version', 'gamepress roblox-test <script.luau> [--version N]', ['--version']],
  tracks: ['list tracks (or one track\'s tools)', 'gamepress tracks [name]', []],
  research: ['research a YouTube Shorts channel for the playbook', 'gamepress research <channel/shorts url> [--out research]', ['--out']],
  voices: ['batch-synthesize voice lines from JSON (Edge TTS, network; --engine kokoro for offline)', 'gamepress voices <script.json> [--dir press] [--engine edge|kokoro]', ['--dir press', '--engine edge']],
  voice: ['one-liner local TTS via Kokoro (free, offline)', 'gamepress voice "Your script here" [--voice trailer|character|narrator|VOICE_ID]', ['--voice narrator', '--speed 1.0', '--out file.wav']],
  setup: ['environment bootstrap: doctor + download all tools.json tools (or just --tts)', 'gamepress setup [--tts]', ['--tts (Kokoro only)']],
  tools: ['list external tools (sizes, install status); --check for upstream updates', 'gamepress tools [--check]', ['--check']],
  version: ['bump version + changelog template', 'gamepress version [major|minor|patch]', []],
  icons: ['PWA icon set + manifest + OG snippet from one logo', 'gamepress icons --logo <logo.png> [--name Title]', ['--logo', '--name']],
  approve: ['approve a vertical-slice demo; define full-game expansion goals', 'gamepress approve <id> [--notes "..."] [--levels N] [--worlds "a,b,c"]', ['--notes', '--levels 5', '--worlds']],
  expand: ['token-saving AI blueprint (--blueprint) or scaffold multi-level world', 'gamepress expand <id> [--blueprint] [--levels N] [--worlds "a,b,c"]', ['--blueprint', '--levels', '--worlds']],
  context: ['~400-token AI cheat sheet (the token-saving entry point)', 'gamepress context [--2d|--3d|--lego|--recipe <name>]', ['--2d', '--3d', '--lego', '--recipe']],
  cloud: ['run a slow job on free GitHub runners, falling back to local automatically', 'gamepress cloud drive <plan.json> | voice <script.txt> | test', ['--out dir', '--quick N', '--voice narrator', '--speed 1.0', '--local (skip cloud)']],
  run: ['conversational orchestrator: the tool drives, the AI just relays (see ORCHESTRATOR.md). Cloud-first: slow steps try free GitHub runners, --local forces local.', 'gamepress run [--answer \'{...}\' --job <id>] [--status <id>] [--local]', ['--answer', '--job', '--status', '--local (skip cloud, run locally)']],
  help: ['this help (or per-command: gamepress <cmd> --help)', 'gamepress --help | gamepress <cmd> --help', []],
};
function printHelp() {
  const cmds = Object.keys(HELP).filter(c => c !== 'help').sort();
  console.log('gamepress — idea to hosted game, every step scriptable. No npm dependencies.\n');
  console.log('Usage: gamepress <command> [options]   (add --json to any command for machine output)\n');
  console.log('Commands:');
  const w = Math.max(...cmds.map(c => c.length));
  for (const c of cmds) console.log(`  ${c.padEnd(w)}  ${HELP[c][0]}`);
  console.log('\nGlobal flags: --json, --local-ai, --no-local-ai, --heal, --vo, --answers, --preset, --prompt');
  console.log('Docs: AGENTS.md (start here), docs/AI-CONTRACT.md (AI driver rules), docs/TOOLING.md');
}
function printCommandHelp(c) {
  const h = HELP[c];
  if (!h) die(`no help for "${c}"`);
  console.log(`gamepress ${c} — ${h[0]}\n\nUsage:\n  ${h[1]}`);
  if (h[2].length) console.log('\nFlags:\n' + h[2].map(f => `  ${f}`).join('\n'));
}
if (cmd === '--help' || cmd === '-h' || cmd === 'help') { printHelp(); process.exit(0); }
if ((argv.includes('--help') || argv.includes('-h')) && cmd && HELP[cmd]) { printCommandHelp(cmd); process.exit(0); }
const CFG = () => config({ games: flag('games'), catalog: flag('catalog'), video: flag('video'), publish: flag('publish'), localAi: LOCAL_AI });
const need = (what) => positional[0] || die(`usage: gamepress ${what} <game-id> [--games dir] [--catalog games.json] [--json]`);
const out = (o, text) => console.log(JSON_OUT || !text ? JSON.stringify(o, JSON_OUT ? undefined : 1) : text(o));

const _dispatch = { init, capture: () => capture(positional[0] || die('usage: gamepress capture <plan.json>')),
  catalog: () => { const g = k => flag(k); catalogCommand({ catalogPath: positional[0] || die('usage: gamepress catalog <games.json> --id ...'), still: g('still'), thumbDir: g('thumbdir') || 'thumbs',
    entry: { id: g('id') || die('--id required'), title: g('title') || g('id'), category: g('category') || 'Other', keys: JSON.parse(g('keys') || '{}'), labels: JSON.parse(g('labels') || '{}'), autostart: [], orientation: g('orientation') || 'any', path: g('path') || die('--path required'), ...(g('note') ? { note: g('note') } : {}) } }); console.log('catalog updated'); },
  research: () => console.log(JSON.stringify(research(positional[0] || die('usage: gamepress research <channel/shorts url>'), flag('out', 'research')), null, 1)),
  new: () => console.log('created', scaffold(positional[0] || die('usage: gamepress new <id> [--target web|roblox] [--games dir] [--title T]'), { games: CFG().games, title: flag('title'), target: flag('target', 'web') })),
  status: () => out(status(need('status'), CFG()), o => `${o.id}: ${Object.entries(o.steps).map(([k, v]) => `${k}=${v}`).join(' ')}${o.grade ? ` grade=${o.grade.score}` : ''} -> next: ${o.next || 'nothing, all done'}`),
  grade: async () => { const r = grade(need('grade'), CFG(), { threshold: +flag('threshold', 80) }); if (argv.includes('--vision') && r.stills) { r.vision = await vision(r.stills); if (r.vision.available && r.vision.score < 75) { r.pass = false; r.fixes.push(...r.vision.failed.map(q => 'vision: ' + q)); } } out(r, o => `${o.id}: ${o.score}/100 ${o.pass ? 'PASS' : 'FAIL'}${o.fixes.length ? '\n  fix: ' + o.fixes.join('\n  fix: ') : ''}`); process.exit(r.pass ? 0 : 1); },
  all: () => runAll(need('all --track hook|demo|web-store'), flag('track', 'demo'), CFG(), { force: argv.includes('--force'), heal: argv.includes('--heal'), localAi: LOCAL_AI, vo: flag('vo') || argv.includes('--vo'), cloud: !argv.includes('--local'), orientation: argv.includes('--horizontal-only') ? 'horizontal-only' : argv.includes('--vertical-only') ? 'vertical-only' : 'both', log: m => !JSON_OUT && console.log(m) }).then(r => out(r, o => `${o.id}: ran [${o.ran}] skipped [${o.skipped}] -> next: ${o.status.next || 'done'}`)).catch(e => die(e.message)),
  auto: async () => {
    const idea = positional.join(' ') || die('usage: gamepress auto "<game idea>" [--id x] [--track demo|web-store|hook] [--style comic] [--answers answers.json] [--preset name] [--prompt] [--from-image [--image-mode upload|describe|game|prompt-me] [--image-desc "..."]] [--lego] [--local-ai] [--heal] [--vo]');
    const br = ideate(idea, { live: !argv.includes('--offline') });
    const id = flag('id') || br.file.split('/').pop().replace('.json', '');
    let hookLine = flag('hook') || '';
    const ans = {};
    for (const q of (br.questions || [])) ans[q.id] = q.default ?? 0;
    if (flag('style')) ans.style = Math.max(0, ['toon', 'roblox', 'comic', 'painted', 'pixel16', 'pixel8'].indexOf(flag('style')));
    if (flag('preset')) try { Object.assign(ans, sanitizeAnswers(loadPreset(flag('preset')).answers, br.questions || [])); } catch (e) { die('preset: ' + e.message); }
    if (flag('answers')) try { Object.assign(ans, sanitizeAnswers(readAnswersFile(flag('answers')), br.questions || [])); } catch (e) { die(e.message); }
    if (argv.includes('--prompt')) { if (JSON_OUT) die('--prompt cannot be combined with --json'); try { Object.assign(ans, await promptAnswers(br.questions || [], ans)); } catch (e) { die(e.message); } }

    // Start-from-image: img2threejs workflow (docs/IMG2THREEJS-WORKFLOW.md).
    // Asked first in --prompt mode; for scripted runs use --from-image (+ --image-mode, --image-desc).
    let fromImage = argv.includes('--from-image');
    if (argv.includes('--prompt') && !JSON_OUT && !fromImage) {
      fromImage = await _askYesNo('\nDo you want to start from an image? (generates the hero asset via the img2threejs workflow)');
    }

    let recipeName = br.recipe;
    if (recipeName && !argv.includes('--lego')) {
      if ((br.questions || []).some(q => q.id === 'hook') && ans.hook === undefined) ans.hook = 0;
      const spec = { ...applyAnswers(recipeName, ans), title: flag('title') || idea.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 28), ...(hookLine ? { hook: hookLine } : {}) };
      hookLine = spec.hook;
      recordLastAnswers(CFG().state, { idea, id, recipe: recipeName, archetype: br.archetype, answers: ans, spec });
      make(id, { recipe: recipeName, spec, games: CFG().games, examples: CFG().examples, force: argv.includes('--force') });
      if (fromImage) await _imageIntake(recipeName);
    } else {
      const lg = await buildLegoGame(id, { idea, gamesDir: CFG().games, examples: CFG().examples, localAi: LOCAL_AI });
      hookLine = lg.spec.hookText;
      recipeName = 'lego:' + lg.spec.controller + '+' + lg.spec.hook;
      recordLastAnswers(CFG().state, { idea, id, recipe: recipeName, archetype: br.archetype, answers: ans, spec: lg.spec });
    }
    await runAll(id, flag('track', 'demo'), CFG(), { force: true, heal: argv.includes('--heal'), localAi: LOCAL_AI, vo: flag('vo') || argv.includes('--vo'), cloud: !argv.includes('--local'), log: m => !JSON_OUT && console.log(m) })
      .then(r => out({ idea, id, recipe: recipeName, hook: hookLine, ...r }, o => `${id}: ${o.ran} done; hook "${hookLine}"`)).catch(e => die(e.message));
  },
  lego: async () => {
    const id = need('lego');
    const spec = flag('spec') ? JSON.parse(readFileSync(flag('spec'), 'utf8')) : {};
    const idea = flag('idea') || positional.slice(1).join(' ') || id;
    const res = await buildLegoGame(id, { idea, spec, gamesDir: CFG().games, examples: CFG().examples, localAi: LOCAL_AI });
    out(res, o => `lego built ${o.dir} (${o.spec.controller} + ${o.spec.spawner} + ${o.spec.hook} + ${o.spec.progression}) -> next: gamepress all ${o.id} --track hook`);
  },
  context: () => {
    const mode = argv.includes('--2d') ? '2d' : argv.includes('--3d') ? '3d' : argv.includes('--lego') ? 'lego' : 'all';
    out(contextDigest({ mode, recipe: flag('recipe') }));
  },
  heal: () => healGame(need('heal'), { gamesDir: CFG().games, examples: CFG().examples, localAi: !argv.includes('--no-local-ai'), testFn: testGame, lintFn: g => lint(basename(g), CFG().games) })
    .then(r => { out(r, o => `${o.id}: ${o.ok ? 'HEALED' : 'NEEDS_ATTENTION'} (${o.actions.join('; ') || 'no changes'})${o.remainingProblems?.length ? '\n  remaining: ' + o.remainingProblems.join('; ') : ''}`); process.exit(r.ok ? 0 : 1); }).catch(e => die('heal: ' + e.message)),
  hooks: () => { try { const r = generateHooks(need('hooks'), { videoDir: CFG().videoDir, examples: CFG().examples }); out(r, o => `${o.id}: rendered ${o.count} A/B hooks -> ${o.variants.map(v => v.file).join(', ')}`); } catch (e) { die('hooks: ' + e.message); } },
  stats: () => gatherStats(positional[0] || null, { gamesDir: CFG().games, publishDir: CFG().publish, stateDir: CFG().state })
    .then(r => out(r, o => o.games.map(g => `${g.id.padEnd(20)} grade=${String(g.gradeScore ?? '-').padStart(3)} yt=${g.ytViews} itch=${g.itchViews} -> ${g.verdict}`).join('\n') || 'no games found')).catch(e => die('stats: ' + e.message)),
  'local-ai': () => probeLocalAi().then(r => out({ ...r, enabledByDefault: LOCAL_AI }, o => `local-ai: ${o.available ? `AVAILABLE (${o.model} at ${o.host})` : `NOT RUNNING (${o.reason}) — optional, all commands work without it`}`)),
  ideate: () => out(ideate(positional.join(' ') || die('usage: gamepress ideate "<game idea>" [--offline]'), { live: !argv.includes('--offline') }), o => `${o.live?.insights ? 'live: common words [' + o.live.insights.commonWords + '], numbers ' + o.live.insights.titlesWithNumber + ', vs ' + o.live.insights.titlesWithVs + '; inspiration (do not copy): ' + o.live.suggestedHooks.join(' | ') + '\n' : o.live?.error ? o.live.error + '\n' : ''}${o.archetype}${o.recipe ? ' (recipe ' + o.recipe + ')' : ''}\nreferences: ${o.references.join('; ')}\none-ups:\n - ${o.oneUps.join('\n - ')}\nassets: ${o.assets.map(a => a.id + (a.have ? '' : '*')).join(', ')} (*=build it)\nquestions:\n${o.questions.map(q => ' ? ' + q.ask + '\n' + q.options.map((x, i) => `    ${i}) ${x.label}`).join('\n')).join('\n')}\nsaved ${o.file}\nnext: ${o.next}`),
  viral: () => out(viralCommand(positional[0] || die('usage: gamepress viral <game-dir>')), o => `VIRAL BRIEF: ${o.title}\n${o.description ? o.description.slice(0, 300) + '\n' : ''}\n Hooks:\n - ${o.viralHooks.join('\n - ') || '(play the game to find them)'}\n Audio: ${o.audioCount || 0} files${o.audioAssets.length ? ' e.g. ' + o.audioAssets.slice(0, 3).join(', ') : ''}\n\n ANSWER THESE BEFORE WRITING THE DRIVE PLAN:\n${o.questions.map((q, i) => `${i + 1}. ${q.ask}\n   hint: ${q.hint}`).join('\n')}\n\nnext: ${o.next}`),
  preset: () => { const sub = positional[0] || die('usage: gamepress preset save <name> | list | show <name> | delete <name> [--json]');
    try {
      if (sub === 'list') return out(listPresets(), ps => ps.length ? ps.map(p => `${p.name}${p.archetype ? ` (${p.archetype})` : ''} — ${p.answers} answers${p.created ? `, saved ${p.created.slice(0, 10)}` : ''}${p.broken ? ' [broken]' : ''}`).join('\n') : 'no presets saved yet (run: gamepress auto "<idea>", then: gamepress preset save <name>)');
      if (sub === 'show') return out(loadPreset(positional[1] || flag('name') || die('usage: gamepress preset show <name>')));
      if (sub === 'delete') { deletePreset(positional[1] || flag('name') || die('usage: gamepress preset delete <name>')); return out({ ok: true }, () => 'deleted'); }
      if (sub === 'save') { const name = positional[1] || flag('name') || die('usage: gamepress preset save <name>'); const last = readLastAnswers(CFG().state); if (!last) die('no recent auto run: run gamepress auto "<idea>" first'); const f = savePreset(name, last); return out({ ok: true, name, file: f }, o => `saved preset "${o.name}" → ${o.file}`); }
      die('usage: gamepress preset save <name> | list | show <name> | delete <name>');
    } catch (e) { die('preset: ' + e.message); } },
  make: () => { const base = flag('spec') ? JSON.parse(readFileSync(flag('spec'), 'utf8')) : {}; const sp = { ...(flag('answers') ? applyAnswers(flag('recipe'), JSON.parse(readFileSync(flag('answers'), 'utf8'))) : {}), ...base }; if (!flag('spec') && !flag('answers')) die(`usage: gamepress make <id> --recipe ${Object.keys(RECIPES).join('|')} --spec spec.json (see docs/RECIPES.md)`) ; out(make(need('make'), { recipe: flag('recipe'), spec: sp, games: CFG().games, examples: CFG().examples, force: argv.includes('--force') })); },
  recipes: () => { const R = Object.values(REGISTRY); if (argv.includes('--md')) { const md = ['# Recipe catalog', '', 'Generated by `gamepress recipes --md` from `presets/recipes.json`. Rules: `docs/RECIPE-RULES.md`. Build one: `gamepress make <id> --recipe <recipe> [--answers a.json]`, or `gamepress auto "<idea>"`.', '', '| Recipe | Title | Hook | 3-second rule | Touch | Don\'t build |', '|---|---|---|---|---|---|', ...R.map(r => `| \`${r.id}\` (${r.engine}) | ${r.title} | ${r.hook} | ${r.threeSecond} | ${r.touch} | ${r.dontBuild.slice(0, 3).join('; ')} |`), '', 'Viral-format recipes built earlier (3D, in `templates/recipes/`): `hole-eater`, `crowd-runner`, `glass-drop`, `demolition`.'].join('\n'); writeFileSync('docs/RECIPES-CATALOG.md', md + '\n'); console.log('wrote docs/RECIPES-CATALOG.md'); } else out(R.map(r => ({ id: r.id, title: r.title, hook: r.hook, engine: r.engine, seconds: r.seconds, viral: r.viral, feel: r.feel })), o => o.map(r => `${r.id.padEnd(24)} ${r.engine}  ${String(r.seconds).padStart(2)}s  ${r.title}: ${r.hook}`).join('\n')); },
  doctor: () => { const r = doctor(); out(r, o => o.rows.map(x => `${x.ok ? '✓' : x.optional ? '·' : '✗'} ${x.name}${x.fix ? '  -> ' + x.fix : ''}`).join('\n')); process.exit(r.ok ? 0 : 1); },
  lint: () => { const r = lint(need('lint'), CFG().games); out(r, o => o.ok ? 'clean' : o.problems.join('\n')); process.exit(r.ok ? 0 : 1); },
  copy: () => copyDraft(need('copy'), { examples: CFG().examples, outDir: CFG().publish, localAi: LOCAL_AI }).then(c => out({ copy: c }, o => 'wrote ' + o.copy)).catch(e => die('copy: ' + e.message)),
  build: () => out(buildTarget(need('build --target web|steam|roblox'), flag('target', 'web'), { gamesDir: CFG().games }), o => JSON.stringify(o)),
  // deploy is a deprecated alias of host (C1/A8): one implementation, deprecation warning, removal next release.
  _doHost: () => hosts[positional[0]]?.upload(JSON.parse(readFileSync(join(flag('dir', 'publish'), positional[1] || die('usage: gamepress host <itch|crazygames|steam|youtube|cloudflare|github> <id> [--live]'), 'manifest.json'), 'utf8')), { dryRun: !argv.includes('--live'), user: flag('user') }).then(r => console.log(JSON.stringify(r, null, 1))).catch(e => { if (e.manualSteps?.length) console.log(JSON.stringify({ ok: false, error: String(e.message).split('\n')[0], manualSteps: e.manualSteps }, null, 1)); else die(e.message); }) || die('unknown host'),
  deploy: function () { console.error('DEPRECATED: `gamepress deploy` is now `gamepress host` (same args). This alias will be removed in a future release.'); return this._doHost(); },
  host: function () { return this._doHost(); },
  botcheck: () => botCheck(positional[0] ? resolve(CFG().games, positional[0]) : die('usage: gamepress botcheck <game-id> [--seconds 40]'), { root: CFG().games, seconds: +flag('seconds', 40) }).then(r => out(r, o => `${o.ok ? 'OK' : 'CHECK'}: ${o.ends.map(e => (e.win ? 'W' : 'L') + e.t).join(' ')}${o.errors.length ? ' errors ' + o.errors : ''}`)).catch(e => die('botcheck: ' + e.message)),
  test: () => testGame(positional[0] || die('usage: gamepress test <game dir or url> [--root dir]'), { root: flag('root') }).then(v => { console.log(JSON.stringify(v, null, 1)); process.exit(v.ok ? 0 : 1); }).catch(e => die('test failed: ' + e.message)),
  visual: () => visualSmokeTest(positional[0] || die('usage: gamepress visual <game dir or url> [--seconds 10]'), { seconds: +flag('seconds', 10) }).then(v => { console.log(JSON.stringify(v, null, 1)); process.exit(v.ok ? 0 : 1); }).catch(e => die('visual failed: ' + e.message)),
  bundle: () => console.log(bundle(positional[0] || die('usage: gamepress bundle <game dir> [--out dist]'), flag('out', 'dist'))),
  'publish-demo': () => console.log(JSON.stringify(publishDemo(positional[0] || die('usage: gamepress tracks [name] | publish-demo <id> --catalog <games.json> [--push]'), { catalog: flag('catalog') || die('--catalog required'), videoDir: flag('video', 'press/video'), push: argv.includes('--push') }))),
  repo: () => out(repoInit(need('repo'), { games: CFG().games, examples: flag('examples', 'examples'), github: argv.includes('--github'), isPrivate: argv.includes('--private') }), o => `${o.id}: ${o.done.join('; ') || 'nothing new'}${o.skipped.length ? '\n  skipped: ' + o.skipped.join('; ') : ''}`),
  'publish-pack': () => console.log(JSON.stringify(publishPack(positional[0] || die('usage: gamepress publish-pack <id> --games <dir>'), { gamesDir: flag('games'), catalog: flag('catalog'), videoDir: flag('video', 'press/video') }), null, 1)),
  'roblox-ship': () => shipRoblox({ file: positional[0], universeId: flag('universe'), placeId: flag('place'), testScript: flag('test') }).then(r => { console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1); }).catch(e => die('roblox-ship: ' + e.message)),
  'roblox-test': () => runLuau({ script: readFileSync(positional[0] || die('usage: gamepress roblox-test <script.luau> [--version N]'), 'utf8'), version: flag('version') }).then(r => { console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1); }).catch(e => die('roblox-test: ' + e.message)),
  roblox: () => publishRoblox({ file: positional[0], universeId: flag('universe'), placeId: flag('place'), versionType: flag('type', 'Published'), rojoProject: flag('rojo'), live: argv.includes('--live') }).then(r => console.log(JSON.stringify(r, null, 1))).catch(e => die('roblox: ' + e.message)),
  tracks: () => { const t = JSON.parse(readFileSync(join(HERE, '..', 'tracks.json'), 'utf8')); const k = positional[0]; console.log(JSON.stringify(k ? t[k] || die('tracks: shared | demo | web-store | roblox') : t, null, 1)); },
  drive: () => {
    const orientation = argv.includes('--horizontal-only') ? 'horizontal-only' : argv.includes('--vertical-only') ? 'vertical-only' : 'both';
    const opts = { outDir: flag('out', join(DIR, 'video')), quick: argv.includes('--quick') ? Number(flag('quick', 4)) || 4 : false, vo: flag('vo') || argv.includes('--vo'), orientation };
    if (argv.includes('--dry-run')) return out(dryRun(positional[0] || die('usage: gamepress drive <plan.json> [--dry-run]')));
    const batch = flag('batch'), batchDir = flag('batch-dir');
    if (batch || batchDir) {
      const files = batch ? batch.split(',').map(s => s.trim()).filter(Boolean)
        : readdirSync(batchDir || die('usage: gamepress drive --batch-dir <dir>')).filter(f => f.endsWith('.json')).map(f => join(batchDir, f)).sort();
      if (!files.length) die('drive --batch: no plan files found');
      return driveBatch(files, opts).then(r => out(r.map(x => x.out))).catch(e => die('drive --batch failed: ' + e.message));
    }
    return drive(positional[0] || die('usage: gamepress drive <plan.json>'), opts).catch(e => die('drive failed: ' + e.message));
  }, scenes: () => scenes(positional[0]), pack, check,
  voices: () => voices(positional[0] || die('usage: gamepress voices <script.json> [--dir press] [--engine edge|kokoro]'), { dir: flag('dir', 'press'), engine: flag('engine', 'kokoro') }).then(r => out({ command: 'voices', ...r }, o => `voices: ${o.synthesized} synthesized, ${o.skipped} skipped, ${o.failed} failed → ${o.manifest}`)).catch(e => die('voices: ' + e.message)),
  voice: () => { try { const r = speak(positional.join(' ') || die(`usage: gamepress voice "Your script here" [--voice ${Object.keys(VOICE_PRESETS).join('|')}|VOICE_ID] [--speed 1.0] [--out file.wav]`), { voice: flag('voice', 'narrator'), speed: flag('speed') ? Number(flag('speed')) : undefined, output: flag('out') }); out(r, o => `voice → ${o.file} (${o.seconds}s, voice=${o.voice}, speed=${o.speed})`); } catch (e) { die('voice: ' + e.message); } },
  setup: () => {
    if (argv.includes('--tts')) { try { const r = setupTts(); out(r, o => `tts ready → ${o.dir}/ (${o.files.join(', ')})`); } catch (e) { die('setup: ' + e.message); } return; }
    // Full environment bootstrap (A3): doctor + download every tools.json tool + next steps.
    const d = doctor();
    console.log('doctor:');
    d.rows.forEach(x => console.log(`  ${x.ok ? '✓' : x.optional ? '·' : '✗'} ${x.name}${x.fix && !x.ok ? '  -> ' + x.fix : ''}`));
    const manifest = loadManifest();
    for (const name of Object.keys(manifest)) {
      try { const r = downloadTool(name); console.log(`${name}: ${r.files.map(f => f.file + ' ' + (f.verified || f.action)).join(', ')}`); }
      catch (e) { console.log(`${name}: FAILED — ${e.message.split('\n')[0]}`); }
    }
    // gh CLI: needed for `gamepress cloud` (cloud runners) and repo ops.
    try { execFileSync('gh', ['--version'], { stdio: 'ignore' }); console.log('gh: already installed'); }
    catch {
      const platform = process.platform;
      const install = platform === 'darwin' ? 'brew install gh' : platform === 'linux' ? 'sudo apt install gh  (or: sudo dnf install gh)' : 'winget install GitHub.cli';
      console.log(`gh: NOT INSTALLED — needed for gamepress cloud.\n  install: ${install}\n  then: gh auth login`);
    }
    console.log('\nnext: gamepress auto "<idea>" --track demo   (or: gamepress context for the 400-token cheat sheet)');
  },
  tools: () => { try {
    if (argv.includes('--check')) { const r = checkUpdates(); out({ command: 'tools --check', updates: r }, o => o.updates.map(u => `${u.tool}: ${u.current} → ${u.latest}${u.update ? '  UPDATE AVAILABLE' : ''}`).join('\n')); }
    else { const r = listTools(); out({ command: 'tools', tools: r }, o => o.tools.map(t => `${t.tool} ${t.version} — ${t.network ? 'network service' : t.total_mb + 'MB'} ${t.installed === null ? '[service]' : t.installed ? '[installed]' : '[missing]'} — ${t.description}`).join('\n')); }
  } catch (e) { die('tools: ' + e.message); } },
  version: () => { try { const r = bumpVersion(positional[0] || 'patch', { dir: flag('dir', '.') }); out({ command: 'version', ...r }, o => `${o.from} → ${o.to} (${o.file}); changelog template added to ${o.changelog}`); } catch (e) { die('version: ' + e.message); } },
  icons: () => { try { const r = makeIcons(flag('logo') || die('usage: gamepress icons --logo <logo.png> [--name Title]'), { dir: flag('dir', 'press'), name: flag('name', 'Game') }); out({ command: 'icons', ...r }, o => `icons → ${o.dir}/ (${o.files.join(', ')})`); } catch (e) { die('icons: ' + e.message); } },
  approve: () => { try {
    const r = approveDemo(need('approve'), { notes: flag('notes', ''), levels: flag('levels') ? Number(flag('levels')) : 5,
      worlds: flag('worlds') ? flag('worlds').split(',').map(s => s.trim()) : [], gamesDir: CFG().games, stateDir: CFG().state });
    out(r, o => `${o.id}: APPROVED — ${o.approval.expansion.levels} levels${o.approval.expansion.worlds.length ? ' across ' + o.approval.expansion.worlds.join(', ') : ''}${o.notes ? '\n  notes: ' + o.notes : ''}\n  next: gamepress expand ${o.id} --blueprint`);
  } catch (e) { die('approve: ' + e.message); } },
  expand: () => { try {
    const id = need('expand');
    const opts = { gamesDir: CFG().games, stateDir: CFG().state, levels: flag('levels') ? Number(flag('levels')) : undefined,
      worlds: flag('worlds') ? flag('worlds').split(',').map(s => s.trim()) : [] };
    if (argv.includes('--blueprint')) { const b = generateBlueprint(id, opts); out(b, o => JSON.stringify(o, null, 1)); return; }
    const r = scaffoldExpansion(id, { ...opts, levels: opts.levels || 5 });
    out(r, o => `${o.id}: scaffolded ${o.levels} levels → ${o.gameFile} (demo backed up to ${o.backup})\n  kit: ../_vendor/gplevels.js synced\n  next: build each level per the blueprint, then: gamepress all ${o.id} --track web-store`);
  } catch (e) { die('expand: ' + e.message); } },
  cloud: () => {
    // gamepress cloud <drive|voice|test> — cloud-first, local-fallback (Cherie's rule:
    // never error on cloud unavailability, just run it locally).
    const sub = positional[0] || die('usage: gamepress cloud drive <plan.json> | voice <script.txt> | test [--local]');
    if (argv.includes('--local')) process.stderr.write('cloud: --local flag — skipping cloud\n');
    const localDrive = () => drive(positional[1] || die('usage: gamepress cloud drive <plan.json>'),
      { outDir: flag('out', join(DIR, 'video')), quick: argv.includes('--quick') ? Number(flag('quick', 4)) || 4 : false,
        vo: flag('vo') || argv.includes('--vo'), orientation: argv.includes('--horizontal-only') ? 'horizontal-only' : argv.includes('--vertical-only') ? 'vertical-only' : 'both' }).catch(e => die('drive failed: ' + e.message));
    const localVoice = () => {
      const scriptFile = positional[1] || die('usage: gamepress cloud voice <script.txt> [--voice x] [--speed N] [--out dir]');
      const lines = readFileSync(scriptFile, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
      const outDir = flag('out', join(DIR, 'vo')); mkdirSync(outDir, { recursive: true });
      const voice = flag('voice', 'narrator'), speed = flag('speed') ? Number(flag('speed')) : undefined;
      const files = lines.map((line, i) => {
        const f = join(outDir, `line-${String(i + 1).padStart(3, '0')}.wav`);
        return speak(line, { voice, speed, output: f }).file;
      });
      return { files, count: files.length };
    };
    const localTest = () => { execFileSync('npm', ['test'], { stdio: 'inherit', cwd: join(HERE, '..') }); return { ok: true }; };
    if (sub === 'drive') {
      const plan = positional[1] || die('usage: gamepress cloud drive <plan.json> [--out dir] [--quick N]');
      if (argv.includes('--local')) return localDrive();
      return cloudOrLocal('drive', localDrive, {
        inputs: { plan, out: flag('out', 'press/video'), quick: argv.includes('--quick') ? String(flag('quick', 4)) : '0' },
        artifact: 'video', outDir: flag('out', join(DIR, 'video')),
      }).then(r => out(r, o => o.cloud ? `cloud drive → ${o.outDir}/ (run #${o.runId})` : JSON.stringify(o, null, 1)));
    }
    if (sub === 'voice') {
      const script = positional[1] || die('usage: gamepress cloud voice <script.txt> [--voice x] [--speed N] [--out dir]');
      if (argv.includes('--local')) return out(localVoice(), o => `voice → ${o.count} lines → ${flag('out', join(DIR, 'vo'))}/`);
      return cloudOrLocal('voice', localVoice, {
        inputs: { script, voice: flag('voice', 'narrator'), speed: flag('speed', '1.0'), out: flag('out', 'press/vo') },
        artifact: 'vo-lines', outDir: flag('out', join(DIR, 'vo')),
      }).then(r => out(r, o => o.cloud ? `cloud voice → ${o.outDir}/ (run #${o.runId})` : `${o.count} lines → ${flag('out', join(DIR, 'vo'))}/`));
    }
    if (sub === 'test') {
      if (argv.includes('--local')) return localTest();
      return cloudOrLocal('test', localTest, { outDir: '.' })
        .then(r => { if (!r.cloud) return; console.log(`cloud test passed (run #${r.runId})`); });
    }
    die('usage: gamepress cloud drive <plan.json> | voice <script.txt> | test [--local]');
  },
  run: async () => {
    // Conversational orchestrator (ORCHESTRATOR.md): the tool drives, the AI relays.
    const statusId = flag('status') || (positional[0] === '--status' ? positional[1] : null);
    if (flag('status') || positional.includes('--status')) {
      const id = flag('status') || positional[positional.indexOf('--status') + 1] || die('usage: gamepress run --status <job-id>');
      return out(statusRun(id));
    }
    const answerRaw = flag('answer');
    const jobId = flag('job');
    if (answerRaw) {
      let answers;
      try { answers = JSON.parse(answerRaw); } catch { die('--answer must be a JSON object'); }
      if (!jobId) die('usage: gamepress run --job <id> --answer \'{...}\'');
      const r = await answerRun(jobId, answers, { local: argv.includes('--local') });
      return out(r);
    }
    return out(await startRun());
  } };
const _handler = _dispatch[cmd];
if (!_handler) die('usage: gamepress --help  (lists all commands; per-command: gamepress <cmd> --help)');
_handler.call(_dispatch);

