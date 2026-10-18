// status / all / grade: the token-saving layer. `status` says what is done or stale in one JSON line, `all` runs only what is missing,
// `grade` scores a game + its hook video against the quality bar (docs/QUALITY.md) and says exactly what to fix.
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, dryRun } from './drive.mjs';
import { lint } from './extras.mjs';
import { testGame, publishPack, publishDemo } from './tasks.mjs';
import { healGame, isLocalAiEnabled } from './local_ai.mjs';
import { cloudOrLocal } from './cloud.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/**
 * Cloud runners check out origin — they can only see committed files.
 * Skip cloud (one stderr line, then local) when the job's files have
 * uncommitted changes or were never committed. Never throws.
 */
function cloudReadyFor(paths, job) {
  try {
    for (const p of paths) {
      const dirty = execFileSync('git', ['status', '--porcelain', '--', p], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      const tracked = execFileSync('git', ['ls-files', '--', p], { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (dirty || !tracked) {
        process.stderr.write(`cloud skipped (${job}: uncommitted changes) — running locally\n`);
        return false;
      }
    }
    return true;
  } catch {
    process.stderr.write(`cloud skipped (${job}: not a git checkout) — running locally\n`);
    return false;
  }
}

/** Paths: flags > env (GP_GAMES, GP_CATALOG) > ./gamepress.config.json {games, catalog} (gitignored, per machine). */
export function config(flags = {}) {
  let f = {}; try { f = JSON.parse(readFileSync('gamepress.config.json', 'utf8')); } catch {}
  return { games: resolve(flags.games || process.env.GP_GAMES || f.games || 'games'), catalog: flags.catalog || process.env.GP_CATALOG || f.catalog || null,
    examples: resolve(flags.examples || 'examples'), videoDir: resolve(flags.video || 'press/video'), publish: resolve(flags.publish || 'publish'), state: resolve('.gp'),
    localAi: isLocalAiEnabled({ localAi: flags.localAi }) };
}
const mtime = p => (existsSync(p) ? statSync(p).mtimeMs : 0);
const newest = d => { if (!existsSync(d)) return 0; let m = 0; for (const e of readdirSync(d, { withFileTypes: true })) m = Math.max(m, e.isDirectory() ? (e.name === 'node_modules' ? 0 : newest(join(d, e.name))) : mtime(join(d, e.name))); return m; };
const stamp = (c, id, k, v) => { mkdirSync(c.state, { recursive: true }); writeFileSync(join(c.state, `${id}.${k}.json`), JSON.stringify({ ...v, at: Date.now() })); };
const read = (c, id, k) => { try { return JSON.parse(readFileSync(join(c.state, `${id}.${k}.json`), 'utf8')); } catch { return null; } };

export const TRACK_STEPS = { hook: ['test', 'video', 'grade'], demo: ['test', 'video', 'grade', 'demo'], 'web-store': ['test', 'video', 'grade', 'pack'] };

export function status(id, c) {
  const game = join(c.games, id), src = Math.max(newest(game), newest(join(c.games, '_vendor')));
  const video = join(c.videoDir, `${id}-hook.mp4`), t = read(c, id, 'test'), g = read(c, id, 'grade');
  const st = (exists, at) => (!exists ? 'missing' : at && at < src ? 'stale' : 'done');
  const steps = { game: existsSync(join(game, 'index.html')) ? 'done' : 'missing', test: st(!!t?.ok, t?.at), video: st(existsSync(video), mtime(video)), grade: st(!!g, g?.at && g.at > mtime(video) ? g.at : 1),
    pack: st(existsSync(join(c.publish, id, 'manifest.json')), mtime(join(c.publish, id, 'manifest.json')) > mtime(video) ? mtime(join(c.publish, id, 'manifest.json')) : 1),
    demo: c.catalog && existsSync(c.catalog) && readFileSync(c.catalog, 'utf8').includes(`"id": "${id}"`) ? 'done' : 'missing' };
  if (steps.pack === 'done' && mtime(join(c.publish, id, 'manifest.json')) < mtime(video)) steps.pack = 'stale';
  if (steps.grade === 'done' && g.at < mtime(video)) steps.grade = 'stale';
  const next = Object.entries(steps).find(([, v]) => v !== 'done')?.[0] || null;
  return { id, steps, grade: g ? { score: g.score, pass: g.pass } : null, next };
}

// ---------------------------------------------------------------- grade (runtime-first + static fallback)
const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
export function grade(id, c, { threshold = 80 } = {}) {
  const checks = []; const add = (name, pts, ok, tip) => checks.push({ name, pts: ok ? pts : 0, max: pts, ok: !!ok, ...(ok ? {} : { fix: tip }) });
  const file = join(c.games, id, 'index.html'), src = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const statsFile = join(c.videoDir, `${id}-hook.stats.json`);
  const rtObj = existsSync(statsFile) ? (() => { try { return JSON.parse(readFileSync(statsFile, 'utf8')); } catch { return null; } })() : null;
  const rt = rtObj?.gpStats || null;
  const is2DOrLego = /createGame\(|runLegoGame\(/.test(src);

  add('game exists', 4, !!src, `create ${file} (gamepress new ${id})`);
  add('game shell (title, pause, results, replay)', 8,
    !!rt?.shell || is2DOrLego || (/st\.shell\(/.test(src) && /st\.end\(/.test(src)),
    'use createGame() (2D), runLegoGame() (Lego), or call st.shell({id,title,onReset}) and st.end({win,score}) (3D)');
  add('game feel (hit-stop, slow-mo, popups, flash, FOV kick)', 8,
    (rt && (rt.hitstops + rt.shakes + rt.popups + rt.flashes) >= 2) || /runLegoGame\(/.test(src) || ['hitstop', 'slowmo', 'popup', 'flash', 'kick', 'shake'].filter(k => src.includes(`.${k}(`)).length >= 3,
    'trigger at least 3 of hitstop/slowmo/popup/flash/kick/shake on big moments');
  add('scripted camera move / dynamic framing', 3,
    !!rt?.cameraMoved || is2DOrLego || /st\.cine\(/.test(src),
    'add st.cine([...]) or move camera dynamically so the opening sells scale');
  add('animated characters (walk cycle)', 6,
    !!rt?.walkAnimated || /walkClock/.test(src) && (/true,\s*[.\d]/.test(src) || /legs/.test(src)) || /hero\(/.test(src) && /walkClock/.test(src) || /drawChar\(|\b(cat|dog|zombie|person|ship)\(|runLegoGame\(/.test(src),
    'animate characters with walkClock (3D) or drawChar/cat/dog/zombie (2D)');
  add('real characters (cats/zombies/cars, not balls)', 8,
    !!rt?.customGeo || /(catGeo|dogGeo|zombieGeo|carGeo|personGeo|crowdGeo|drawChar|cat|dog|zombie|person|ship|runLegoGame)\b/.test(src),
    'use catGeo/zombieGeo/carGeo (gpkit) or drawChar/cat/dog/zombie (gpsprites) instead of bare primitives');
  add('look kit (toon + sky + textured ground)', 5,
    !!rt?.shell || is2DOrLego || (/toon\(/.test(src) && /sky\(/.test(src) && /groundTex\(/.test(src)),
    'use createGame() (2D) or toon(), sky() and groundTex() from gpkit (3D)');
  add('particles', 3,
    (rt?.particles > 0) || /particles\(|\.burst\(|runLegoGame\(/.test(src),
    'add particles() or g.burst() for impacts');
  add('sound variety (>=4 sfx types)', 3,
    (rtObj?.eventsCount >= 4) || /runLegoGame\(/.test(src) || new Set([...src.matchAll(/(?:sfx\(|snd:\s*)([^)}]*)/g)].flatMap(m => [...m[1].matchAll(/'(\w+)'/g)].map(x => x[1]))).size >= 4,
    'call sfx() with at least 4 different types');
  add('capture contract (__game, auto mode)', 2,
    !!rtObj?.state || is2DOrLego || (/window\.__game/.test(src) && /auto/.test(src)),
    'expose window.__game and honour ?auto=1');

  const vid = join(c.videoDir, `${id}-hook.mp4`);
  if (!existsSync(vid)) add('hook video exists', 50, false, `gamepress drive examples/${id}/hook.drive.json`);
  else {
    // F6: corrupt/unreadable video -> clean grade failure, not an unhandled exception.
    let pr;
    try {
      pr = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,codec_type,r_frame_rate:format=duration', '-of', 'json', vid], { encoding: 'utf8' }).stdout);
      if (!pr.streams || !pr.streams.length) throw new Error('no streams');
    } catch {
      add('video readable', 50, false, `${vid} is corrupt or unreadable — re-render: gamepress drive examples/${id}/hook.drive.json`);
      const score = checks.reduce((s, x) => s + x.pts, 0), max = checks.reduce((s, x) => s + x.max, 0);
      const r = { id, score: Math.round((score / max) * 100), pass: false, threshold, runtimeTelemetry: !!rt, fixes: checks.filter(x => !x.ok).map(x => `${x.name}: ${x.fix}`), checks };
      stamp(c, id, 'grade', { score: r.score, pass: r.pass }); return r;
    }
    const v = pr.streams.find(s => s.codec_type === 'video'), a = pr.streams.find(s => s.codec_type === 'audio'), dur = +pr.format.duration, [fn, fd] = v.r_frame_rate.split('/').map(Number), fps = fn / (fd || 1);
    add('video 1080x1920 vertical', 8, v.width >= 1080 && v.height >= 1920, 'plan: viewport [540,960] with scale 2');
    add('video >= 30 fps', 4, fps >= 29.5, 'plan.fps >= 30');
    add('video 15-59 s (Shorts)', 6, dur >= 15 && dur <= 59, 'plan.duration between 15 and 59');
    add('has audio', 6, !!a, 'add plan.audio {source:"window.__events", music:"bed"}');
    const lo = ff(['-i', vid, '-af', 'ebur128', '-f', 'null', '-']).stderr, I = [...lo.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1];
    add('loudness near -14 LUFS', 6, I && Math.abs(+I + 14) <= 2.5, `got ${I} LUFS; plan.audio normalises to -14, check music/sfx exist`);
    const sg = ff(['-i', vid, '-vf', 'fps=2,signalstats,metadata=print:file=-', '-an', '-f', 'null', '-']), txt = sg.stdout + sg.stderr;
    const avg = k => { const m = [...txt.matchAll(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`, 'g'))].map(x => +x[1]); return m.length ? m.reduce((p, q) => p + q, 0) / m.length : 0; };
    add('picture not dark/blown out', 4, avg('YAVG') > 25 && avg('YAVG') < 210, `mean luma ${avg('YAVG').toFixed(0)}; adjust lights/sky/bg`);
    add('colourful (toon palette)', 4, avg('SATAVG') > 25, `mean saturation ${avg('SATAVG').toFixed(0)}; use brighter, more saturated colours`);
    add('constant motion', 4, avg('YDIF') > 1.5, `frame-to-frame change ${avg('YDIF').toFixed(1)}; hook needs action in every second`);
    const plan = (() => { try { return JSON.parse(readFileSync(join(c.examples, id, 'hook.drive.json'), 'utf8')); } catch { return {}; } })();
    add('hook caption in first second', 3, (plan.captions || []).some(x => x.t <= 1), 'add a caption at t=0');
    add('call-to-action caption', 2, (plan.captions || []).some(x => x.style === 'cta'), 'add a {style:"cta"} caption near the end');
    add('polish (motion blur or fades)', 3, plan.blur > 1 || plan.fade, 'plan.blur: 2 and plan.fade: {in:.2,out:.4}');
  }
  const score = checks.reduce((s, x) => s + x.pts, 0), max = checks.reduce((s, x) => s + x.max, 0), pct = Math.round((score / max) * 100);
  const r = { id, score: pct, pass: pct >= threshold, threshold, runtimeTelemetry: !!rt, fixes: checks.filter(x => !x.ok).map(x => `${x.name}: ${x.fix}`), checks };
  if (existsSync(vid)) { mkdirSync(join(c.state, id), { recursive: true }); const dur = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', vid], { encoding: 'utf8' }).stdout;
    r.stills = [0.25, 0.5, 0.75].map((k, i) => { const f = join(c.state, id, `look-${i + 1}.jpg`); spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(dur * k), '-i', vid, '-frames:v', '1', '-vf', 'scale=360:-1', f]); return f; });
    r.lookAtStills = 'The checklist is a floor, not proof of quality: view these stills and judge subject scale, clutter, readability and whether it matches Roadkill Rig / Cel City / Turtles 3D.'; }
  stamp(c, id, 'grade', { score: pct, pass: r.pass }); return r;
}

// ---------------------------------------------------------------- all
/** Run every missing/stale step of a track in order; stop at the first failure with a one-line reason (or auto-heal if --heal).
 *  cloud (default true): slow steps (test, video) try free GitHub runners first, falling back to local silently. */
export async function runAll(id, track, c, { force = false, heal = false, localAi = c.localAi, vo = false, log = () => {}, cloud = true } = {}) {
  const steps = TRACK_STEPS[track]; if (!steps) throw new Error(`track must be one of ${Object.keys(TRACK_STEPS).join(', ')} (roblox has its own commands: gamepress tracks roblox)`);
  const ran = [], skipped = [], heals = [];
  for (const step of steps) {
    const s = status(id, c).steps[step]; if (!force && s === 'done') { skipped.push(step); continue; }
    log(`→ ${step}`);
    if (step === 'demo' || step === 'pack') {
      let l = lint(id, c.games);
      if (!l.ok && heal) { const h = await healGame(id, { gamesDir: c.games, examples: c.examples, localAi, lintFn: () => lint(id, c.games) }); heals.push(h); l = lint(id, c.games); }
      if (!l.ok) throw new Error(`lint: ${l.problems[0]} (+${l.problems.length - 1} more: gamepress lint ${id})`);
    }
    if (step === 'test') {
      const gameDir = join(c.games, id);
      const doTest = () => testGame(gameDir);
      let r = (cloud && cloudReadyFor([gameDir], 'test'))
        ? await cloudOrLocal('test', doTest, { outDir: '.' }).then(cr => cr.cloud ? { ok: true, cloud: true, runId: cr.runId } : cr)
        : await doTest();
      if (!r.ok && heal) {
        log(`  healing ${id}...`);
        const h = await healGame(id, { gamesDir: c.games, examples: c.examples, localAi, testFn: testGame, lintFn: () => lint(id, c.games) });
        heals.push(h);
        r = await testGame(join(c.games, id));
      }
      stamp(c, id, 'test', { ok: r.ok });
      if (!r.ok) throw new Error(`test failed: ${(r.problems || []).join('; ') || 'see gamepress test'}`);
    }
    else if (step === 'video') {
      const plan = join(c.examples, id, 'hook.drive.json'); const d = dryRun(plan); if (!d.ok) throw new Error(`plan invalid: ${d.problems[0]}`);
      const doDrive = () => drive(plan, { outDir: c.videoDir, vo });
      // A string --vo override can't be passed to the workflow; plan-embedded vo rides along fine.
      const voOverride = typeof vo === 'string' && vo;
      if (cloud && !voOverride && cloudReadyFor([plan, join(c.games, id)], 'drive')) {
        await cloudOrLocal('drive', doDrive, {
          inputs: { plan: relative(ROOT, plan), out: relative(ROOT, c.videoDir), quick: '0' },
          artifact: 'video', outDir: c.videoDir,
        });
      } else {
        if (cloud && voOverride) process.stderr.write('cloud skipped (drive: --vo override) — running locally\n');
        await doDrive();
      }
    }
    else if (step === 'grade') { const g = grade(id, c); if (!g.pass) throw new Error(`grade ${g.score}/${g.threshold}: ${g.fixes[0]} (+${g.fixes.length - 1} more: gamepress grade ${id})`); }
    else if (step === 'demo') { if (!c.catalog) throw new Error('set --catalog or GP_CATALOG to the demo page games.json'); publishDemo(id, { catalog: c.catalog, videoDir: c.videoDir, examples: c.examples }); }
    else if (step === 'pack') publishPack(id, { gamesDir: c.games, catalog: c.catalog, videoDir: c.videoDir, examples: c.examples, outDir: c.publish });
    ran.push(step);
  }
  return { id, track, ran, skipped, ...(heals.length ? { heals } : {}), status: status(id, c) };
}

