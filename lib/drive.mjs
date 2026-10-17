// gamepress drive: play a scripted, frame-locked session of ANY web game and encode it as a video.
//
//  * Virtual clock: requestAnimationFrame, timers, performance.now, Date.now and Math.random are replaced
//    (lib/inject.js), so the game advances exactly 1/fps per video frame and the same plan gives the same video.
//  * Scripted input: key presses, mouse clicks and JS snippets at exact video times (plan.input).
//  * Captions, slow-motion, audio (synth sfx from the game's event log + optional music bed) from the same plan.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';
import { serveDir } from './serve.mjs';
import { ttsHook } from './studio.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SFX = JSON.parse(readFileSync(join(HERE, '..', 'presets', 'sfx.json'), 'utf8'));
const ffmpeg = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
const KEYCODES = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, ' ': 32, Space: 32, Shift: 16, Tab: 9 };

/** Flatten plan.input into sorted press/release/click/eval actions on the video timeline (seconds). */
export function buildActions(input = []) {
  const acts = [];
  for (const s of input) {
    if (s.key !== undefined) { acts.push({ t: s.t, type: 'down', key: s.key }); acts.push({ t: s.t + (s.hold ?? 0.08), type: 'up', key: s.key }); }
    else if (s.down !== undefined) acts.push({ t: s.t, type: 'down', key: s.down });
    else if (s.up !== undefined) acts.push({ t: s.t, type: 'up', key: s.up });
    else if (s.click) acts.push({ t: s.t, type: 'click', at: s.click });
    else if (s.eval) acts.push({ t: s.t, type: 'eval', js: s.eval });
    else throw new Error(`unknown input step: ${JSON.stringify(s)}`);
  }
  return acts.sort((a, b) => a.t - b.t);
}

/** Active captions at video time t, with the age used for the pop-in animation. */
export const captionsAt = (list = [], t) => list.filter(c => t >= c.t && t < (c.until ?? c.t + 3)).map(c => ({ text: c.text, pos: c.pos || 'top', style: c.style || 'hook', age: t - c.t }));

/** Game-time factor at video time t (slow-motion windows). */
export const speedAt = (slowmo = [], t) => slowmo.find(s => t >= s.t && t < s.until)?.factor ?? 1;

/** Video time (s) at which game time `gameMs` was reached, given the per-frame game clock. */
export function videoTimeOf(gameMs, gts, fps) {
  let lo = 0, hi = gts.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; gts[m] >= gameMs ? hi = m : lo = m + 1; }
  return lo / fps;
}

function synthSfx(name, dir) {
  const spec = SFX[name]; if (!spec) throw new Error(`no sfx preset "${name}" (see presets/sfx.json)`);
  const file = join(dir, `${name}.wav`);
  if (!existsSync(file)) ffmpeg('-f', 'lavfi', '-i', `aevalsrc='${spec.expr}':d=${spec.d}:s=48000`, '-af', `volume=${spec.gain ?? 1}`, '-ar', '48000', '-ac', '1', file);
  return file;
}

/** A simple looping bass + hat bed. `bpm` and `pattern` (semitones) are tweakable in the plan. */
function synthBed(dir, seconds, { bpm = 128, root = 55, pattern = [0, 0, 7, 5, 0, 0, 10, 7], gain = 0.5, lead = 0.35 } = {}) {
  const step = 60 / bpm / 2;
  const note = pattern.map((s, i) => `if(eq(mod(floor(t/${step.toFixed(5)}),${pattern.length}),${i}),${s},`).join('') + '0' + ')'.repeat(pattern.length);
  const expr = `(sin(2*PI*${root}*pow(2,(${note})/12)*t)*0.5+(gt(sin(2*PI*${root}*pow(2,(${note})/12)*t*2),0)*2-1)*0.08)*exp(-2.5*mod(t,${step.toFixed(5)}))*${gain}+(random(0)*2-1)*exp(-45*mod(t,${step.toFixed(5)}))*0.08*${gain}+sin(2*PI*${root}*4*pow(2,(${note}+12*mod(floor(t/${step.toFixed(5)}),2))/12)*t)*exp(-7*mod(t,${step.toFixed(5)}))*0.18*${lead}*${gain}`;
  const file = join(dir, 'bed.wav');
  ffmpeg('-f', 'lavfi', '-i', `aevalsrc='${expr}':d=${seconds}:s=48000`, '-ar', '48000', '-ac', '1', file);
  return file;
}

/** Validate a plan without launching Chrome: schema sanity, game file exists, input steps parse, rough render time. */
export function dryRun(planFile) {
  const planPath = resolve(planFile), plan = JSON.parse(readFileSync(planPath, 'utf8')), problems = [];
  const expand = v => v.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, k, d) => process.env[k] ?? d ?? '');
  if (plan.root) { const r = resolve(dirname(planPath), expand(plan.root)), f = join(r, (plan.path || '').split('?')[0]); if (!existsSync(f)) problems.push(`game file missing: ${f} (plan.root is relative to the plan file)`); }
  else if (!plan.url) problems.push('plan needs "url" or "root"');
  try { buildActions(plan.input); } catch (e) { problems.push(e.message); }
  const dur = plan.duration || 10, fps = plan.fps || 30;
  if (plan.audio?.map) for (const [k, v] of Object.entries(plan.audio.map)) if (v && !SFX[v] && !/[./]/.test(v)) problems.push(`audio.map ${k} -> "${v}" is not in presets/sfx.json`);
  if (!plan.thumb && plan.thumb !== 0) problems.push('no "thumb" time: demo-page thumbnail will be missing');
  return { ok: !problems.length, problems, frames: Math.round(dur * fps), estRenderSeconds: Math.round(dur * fps * 0.25 * (plan.scale || 2) / 2) };
}

export async function drive(planFile, { outDir = 'press/video', quick = false, vo = false } = {}) {
  const planPath = resolve(planFile);
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  if (quick) Object.assign(plan, { scale: 1, fps: 15, duration: Math.min(plan.duration || 10, quick), name: (plan.name || 'clip') + '.quick' }); // smoke test: low-res, short
  const [W, H] = plan.viewport || [540, 960];
  const scale = plan.scale || 2, fps = plan.fps || 30, seed = plan.seed ?? 1;
  const name = plan.name || 'clip';
  const nFrames = Math.round((plan.duration || 10) * fps);
  const work = mkdtempSync(join(tmpdir(), 'gamepress-drive-'));
  const frames = join(work, 'frames'); mkdirSync(frames);
  let server, chrome;
  const cleanup = async () => { try { await chrome?.close(); } catch {} server?.close(); rmSync(work, { recursive: true, force: true }); };
  try {
    let url = plan.url;
    const expand = v => v.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, k, d) => process.env[k] ?? d ?? ''); // root may be "${GAMES_DIR:-../games}"
    if (plan.root) { server = await serveDir(resolve(dirname(planPath), expand(plan.root))); url = `http://127.0.0.1:${server.port}/${plan.path || ''}`; }
    if (!url) throw new Error('plan needs "url" or "root"');
    chrome = await launchChrome({ width: W, height: H, scale });
    const { send, evaluate } = chrome;
    await send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(join(HERE, 'inject.js'), 'utf8').replace('__SEED__', String(seed)) });
    await send('Page.navigate', { url });
    for (let i = 0; i < 80; i++) { await new Promise(r => setTimeout(r, 150)); if (await evaluate('document.readyState').catch(() => '') === 'complete') break; }
    if (/^not found$/i.test(await evaluate('document.body ? document.body.innerText.trim() : ""'))) throw new Error(`page 404: ${url} (is plan.root correct? it is relative to the plan file)`);
    await evaluate('window.__gp.step(16); window.__gp.step(16)');
    if (plan.ready) await evaluate(plan.ready);

    const down = new Set();
    const keyEvt = (type, key) => send('Input.dispatchKeyEvent', { type, key, code: key.length === 1 ? (/[a-z]/i.test(key) ? `Key${key.toUpperCase()}` : key === ' ' ? 'Space' : key) : key,
      windowsVirtualKeyCode: KEYCODES[key] ?? key.toUpperCase().charCodeAt(0), text: type === 'keyDown' && key.length === 1 ? key : undefined });
    const actions = buildActions(plan.input);
    let ai = 0; const gts = [];
    const msPerFrame = 1000 / fps;
    for (let f = 0; f < nFrames; f++) {
      const t = f / fps;
      while (ai < actions.length && actions[ai].t <= t + 1e-9) {
        const a = actions[ai++];
        if (a.type === 'down') { if (!down.has(a.key)) { down.add(a.key); await keyEvt('keyDown', a.key.replace('Space', ' ')); } }
        else if (a.type === 'up') { down.delete(a.key); await keyEvt('keyUp', a.key.replace('Space', ' ')); }
        else if (a.type === 'click') for (const ty of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: ty, x: a.at[0], y: a.at[1], button: 'left', clickCount: 1 });
        else if (a.type === 'eval') await evaluate(a.js);
      }
      const gt = await evaluate(`(__gp.captions(${JSON.stringify(captionsAt(plan.captions, t))}), __gp.step(${(msPerFrame * speedAt(plan.slowmo, t)).toFixed(4)}))`);
      gts.push(gt);
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      writeFileSync(join(frames, `${String(f).padStart(5, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
      if (f % 30 === 0) process.stdout.write(`\r  ${name}: frame ${f}/${nFrames}`);
    }
    process.stdout.write(`\r  ${name}: frame ${nFrames}/${nFrames}\n`);
    if (chrome.logs.length) console.error('  page errors:\n   ' + [...new Set(chrome.logs)].slice(0, 5).join('\n   '));

    // Collect runtime telemetry for runtime-first grading
    const gpStats = await evaluate('JSON.stringify(window.__gpStats || null)').then(JSON.parse).catch(() => null);
    const gpEnds = await evaluate('JSON.stringify(window.__ends || [])').then(JSON.parse).catch(() => []);
    const gpEventsCount = await evaluate('(window.__events || []).length').catch(() => 0);

    // ---- audio
    const a = plan.audio;
    const out = resolve(outDir, `${name}.mp4`); mkdirSync(dirname(out), { recursive: true });
    const inputs = ['-framerate', String(fps), '-i', join(frames, '%05d.jpg')];
    let filter = null, nAudio = 0;
    if (a) {
      const dur = nFrames / fps, tracks = [];
      const events = a.source ? (await evaluate(`JSON.stringify(${a.source})`).then(JSON.parse).catch(() => [])) : [];
      const sfxDir = join(work, 'sfx'); mkdirSync(sfxDir);
      const lastAt = {}; const placed = [];
      for (const ev of events) {
        const m = a.map && ev.type in a.map ? a.map[ev.type] : ev.type;
        if (!m) continue;
        const file = m.includes('/') || m.endsWith('.wav') || m.endsWith('.mp3') ? resolve(dirname(planPath), m) : (SFX[m] ? synthSfx(m, sfxDir) : null);
        if (!file) continue;
        const vt = videoTimeOf(ev.t * 1000, gts, fps);
        if (vt > dur || vt - (lastAt[m] ?? -1) < 0.04) continue;
        lastAt[m] = vt; placed.push({ file, vt });
        if (placed.length >= 160) break;
      }
      for (const p of placed) tracks.push({ file: p.file, delay: Math.round(p.vt * 1000), vol: a.gain ?? 1 });
      if (a.music) tracks.push({ file: a.music === 'bed' ? synthBed(sfxDir, dur, a.bed) : resolve(dirname(planPath), a.music), delay: 0, vol: a.musicGain ?? 0.5 });
      const voText = typeof vo === 'string' ? vo : (vo && plan.captions?.[0]?.text) || a.vo?.text || (typeof a.vo === 'string' ? a.vo : '');
      if (voText) {
        const voWav = await ttsHook(voText, join(sfxDir, 'vo.wav'), { voice: a.vo?.voice });
        if (voWav) tracks.push({ file: voWav, delay: 120, vol: a.vo?.gain ?? 1.45 });
      }
      nAudio = tracks.length;
      if (nAudio) {
        for (const t of tracks) inputs.push('-i', t.file);
        const mix = tracks.map((t, i) => `[${i + 1}:a]adelay=${t.delay}|${t.delay},volume=${t.vol}[a${i}]`).join(';') + ';' + tracks.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${nAudio}:normalize=0,atrim=0:${dur},asetpts=N/SR/TB`;
        // two-pass loudnorm: measure first, then apply linearly, so the result really lands on -14 LUFS instead of undershooting
        const LN = 'loudnorm=I=-14:TP=-1.5:LRA=11';
        let meas = ''; try { const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inputs, '-filter_complex', `${mix},${LN}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-'], { encoding: 'utf8' }); const j = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
          if (isFinite(+j.input_i)) meas = `:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`; } catch {}
        filter = `${mix},${LN}${meas},apad[aout]`;
        console.log(`  audio: ${placed.length} sfx${a.music ? ' + music' : ''}${voText ? ' + vo' : ''}`);
      }
    }
    const dur2 = nFrames / fps, vch = [plan.blur > 1 ? `tmix=frames=${plan.blur}` : '', plan.fade?.in ? `fade=t=in:st=0:d=${plan.fade.in}` : '', plan.fade?.out ? `fade=t=out:st=${dur2 - plan.fade.out}:d=${plan.fade.out}` : ''].filter(Boolean).join(',');
    const args = [...inputs];
    if (filter && vch) filter = `[0:v]${vch}[vout];` + filter;
    if (filter && plan.fade?.out) filter = filter.replace('[aout]', `,afade=t=out:st=${dur2 - plan.fade.out}:d=${plan.fade.out}[aout]`);
    if (!filter && vch) args.push('-vf', vch);
    if (filter) args.push('-filter_complex', filter, '-map', vch ? '[vout]' : '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest');
    ffmpeg(...args, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(plan.crf ?? 20), '-maxrate', plan.maxrate || '12M', '-bufsize', '24M', '-preset', 'medium', '-movflags', '+faststart', out);
    if (plan.thumb !== undefined) {
      const idx = Math.min(nFrames - 1, Math.round(plan.thumb * fps));
      ffmpeg('-i', join(frames, `${String(idx).padStart(5, '0')}.jpg`), '-frames:v', '1', out.replace(/\.mp4$/, '.thumb.jpg'));
    }
    const state = plan.report ? await evaluate(plan.report).catch(() => null) : null;
    const statsOut = out.replace(/\.mp4$/, '.stats.json');
    writeFileSync(statsOut, JSON.stringify({ gpStats, ends: gpEnds, eventsCount: gpEventsCount, state, errors: [...new Set(chrome.logs)].slice(0, 5) }, null, 2));
    console.log(`✅ ${out}${state ? '\n   final state: ' + JSON.stringify(state) : ''}`);
    return { out, state, stats: gpStats };
  } finally { await cleanup(); }
}

/**
 * hooks <id>: Automated Multi-Hook A/B Generator.
 * Takes the rendered <id>-hook.mp4 and produces 3 distinct A/B hook variants for social testing:
 *   - <id>-hook-fail.mp4       ("99% FAIL AT LEVEL 2" — opens on the fail/action moment)
 *   - <id>-hook-satisfying.mp4 ("WAIT FOR THE CHAIN REACTION" — opens on peak climax then loops)
 *   - <id>-hook-question.mp4   ("LEFT OR RIGHT?" — bold question banner hook)
 */
export function generateHooks(id, { videoDir = 'press/video', examples = 'examples' } = {}) {
  const src = resolve(videoDir, `${id}-hook.mp4`);
  if (!existsSync(src)) throw new Error(`render base video first: gamepress all ${id} --track hook`);
  let title = id.toUpperCase();
  try { title = JSON.parse(readFileSync(join(examples, id, 'meta.json'), 'utf8')).title || title; } catch {}
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString().trim()) || 18;
  const fontCandidates = ['/System/Library/Fonts/Supplemental/Impact.ttf', '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'];
  const font = fontCandidates.find(f => existsSync(f));
  const bannerFilter = (text, color = '#ffd34d') => font
    ? `drawbox=x=0:y=80:w=iw:h=130:color=black@0.72:t=fill:enable='lt(t,3.2)',drawtext=fontfile='${font}':text='${text.replace(/[':\\]/g, '')}':fontsize=64:fontcolor=${color}:borderw=5:bordercolor=black:x=(w-text_w)/2:y=115:enable='lt(t,3.2)'`
    : 'null';

  const variants = [
    { suffix: 'fail', headline: '99 PERCENT FAIL THIS', color: '#ff4d6d', startOffset: 0 },
    { suffix: 'satisfying', headline: 'ODDLY SATISFYING', color: '#7dff7d', startOffset: Math.min(3.5, dur * 0.2) },
    { suffix: 'question', headline: `CAN YOU BEAT ${title}?`, color: '#ffd34d', startOffset: Math.min(1.5, dur * 0.1) },
  ];

  const outputs = [];
  for (const v of variants) {
    const out = resolve(videoDir, `${id}-hook-${v.suffix}.mp4`);
    ffmpeg('-ss', v.startOffset.toFixed(2), '-i', src, '-vf', bannerFilter(v.headline, v.color), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out);
    outputs.push({ variant: v.suffix, headline: v.headline, file: out });
  }
  return { id, count: outputs.length, variants: outputs };
}

