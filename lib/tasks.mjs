// gamepress tasks an AI runs end to end: research, new (scaffold), test, bundle, publish-pack. See AGENTS.md.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome } from './cdp.mjs';
import { serveDir } from './serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const ensure = d => mkdirSync(d, { recursive: true });

/** research <channel-or-search-url>: pull titles+views with yt-dlp, rank patterns, write research/brief.json for the AI to extend. */
export function research(target, out = 'research') {
  ensure(out);
  const r = spawnSync('yt-dlp', ['--flat-playlist', '--print', '%(id)s\t%(view_count)s\t%(title)s', target], { encoding: 'utf8' });
  if (r.error || r.status) throw new Error('yt-dlp failed (brew install yt-dlp): ' + (r.error?.message || r.stderr.slice(0, 200)));
  const vids = r.stdout.trim().split('\n').map(l => { const [id, v, ...t] = l.split('\t'); return { id, views: Number(v) || 0, title: t.join('\t') }; }).sort((a, b) => b.views - a.views);
  const flat = /trailer|teaser|final boss|#shorts$/i, avg = a => (a.length ? Math.round(a.reduce((s, v) => s + v.views, 0) / a.length) : 0);
  const brief = { source: target, count: vids.length, top: vids.slice(0, 10), avgViews: avg(vids), avgViewsTitledTrailer: avg(vids.filter(v => flat.test(v.title))), avgViewsOther: avg(vids.filter(v => !flat.test(v.title))),
    todo: ['Web-search the top viral browser/mobile game clips of the last 30 days; add 5 to `references` with url + why it works.', 'Pick one concept whose payoff reads in 1 second; write `concept` (hook, loop, win/lose, 3 characters/props).', 'Then: gamepress new <id>'], references: [], concept: null };
  writeFileSync(join(out, 'brief.json'), JSON.stringify(brief, null, 1)); return brief;
}

/** new <id>: scaffold g/<id>/index.html from templates/3d.html and examples/<id>/{hook.drive.json,meta.json}. */
export function scaffold(id, { games = 'games', title } = {}) {
  const dir = join(games, id); if (existsSync(dir)) throw new Error(dir + ' exists'); ensure(dir);
  writeFileSync(join(dir, 'index.html'), readFileSync(join(ROOT, 'templates', '3d.html'), 'utf8').replaceAll('__TITLE__', title || id));
  const ex = join('examples', id); ensure(ex);
  writeFileSync(join(ex, 'hook.drive.json'), JSON.stringify({ name: id + '-hook', root: '${GAMES_DIR:-' + games + '}', path: id + '/index.html?dpr=1&clean=1', viewport: [540, 960], scale: 2, fps: 30, seed: 1, duration: 18, report: 'window.__game', thumb: 8,
    input: [{ t: 1, down: ' ' }, { t: 4, up: ' ' }], captions: [{ t: 0, until: 3, text: 'WRITE THE HOOK HERE', pos: 'top', style: 'hook' }, { t: 12, until: 18, text: 'Play free. Link in bio', pos: 'bottom', style: 'cta' }], slowmo: [], audio: { source: 'window.__events', music: 'bed', musicGain: 0.3 } }, null, 2));
  writeFileSync(join(ex, 'meta.json'), JSON.stringify({ id, title: title || id, tagline: '', description: '', tags: ['browser game', 'html5'], youtubeTitle: '', category: 'Viral Demos', price: 0 }, null, 2));
  return dir;
}

/** test <gameDir|url>: load, press keys, step 6 s of virtual time; verdict JSON (errors, blank frame, state change, events, ms/frame). Exit 1 on failure. */
export async function testGame(target, { root, keys = [' ', 'd', 'a'], seconds = 6 } = {}) {
  let server, url = target;
  if (!/^https?:/.test(target)) { const dir = resolve(root || dirname(dirname(resolve(target)))); server = await serveDir(dir); url = `http://127.0.0.1:${server.port}/${resolve(target).slice(dir.length + 1)}${resolve(target).endsWith('.html') ? '' : '/index.html'}?dpr=1&clean=1`; }
  const c = await launchChrome({ width: 540, height: 960 }), v = { url, errors: [], ok: false };
  try {
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(join(HERE, 'inject.js'), 'utf8').replace('__SEED__', '1') });
    await c.send('Page.navigate', { url });
    for (let i = 0; i < 80 && (await c.evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) await new Promise(r => setTimeout(r, 150));
    const first = JSON.stringify(await c.evaluate('window.__game').catch(() => null)); let t0 = Date.now(), frames = 0;
    for (let f = 0; f < seconds * 30; f++) {
      if (f % 45 === 0) for (const k of keys) { await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k === ' ' ? 'Space' : 'Key' + k.toUpperCase(), windowsVirtualKeyCode: k === ' ' ? 32 : k.toUpperCase().charCodeAt(0), text: k }); }
      if (f % 45 === 30) for (const k of keys) await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k === ' ' ? 'Space' : 'Key' + k.toUpperCase(), windowsVirtualKeyCode: k === ' ' ? 32 : k.toUpperCase().charCodeAt(0) });
      await c.evaluate('__gp.step(33.3)'); frames++;
    }
    v.msPerFrame = Math.round((Date.now() - t0) / frames);
    const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); v.frameBytes = Buffer.from(shot.result.data, 'base64').length;
    v.state = await c.evaluate('window.__game').catch(() => null); v.stateChanged = JSON.stringify(v.state) !== first; v.events = await c.evaluate('(window.__events||[]).length').catch(() => 0);
    v.errors = [...new Set(c.logs)].slice(0, 5);
    const problems = []; if (v.errors.length) problems.push('page errors'); if (v.frameBytes < 12000) problems.push('frame looks blank/flat'); if (!v.state) problems.push('no window.__game'); else if (!v.stateChanged) problems.push('state never changed (input not wired?)'); if (!v.events) problems.push('no sfx events'); if (v.msPerFrame > 600) problems.push('slow: ' + v.msPerFrame + ' ms/frame');
    v.problems = problems; v.ok = !problems.length;
  } finally { await c.close(); server?.close(); }
  return v;
}

/** bundle <gameDir>: self-contained HTML5 zip for itch.io / CrazyGames (shared ../_vendor copied in and import paths rewritten). */
export function bundle(gameDir, out = 'dist') {
  const g = resolve(gameDir), id = basename(g), vendor = join(dirname(g), '_vendor'), tmp = mkdtempSync(join(tmpdir(), 'gp-bundle-')), dst = join(tmp, id);
  cpSync(g, dst, { recursive: true });
  if (existsSync(vendor)) cpSync(vendor, join(dst, '_vendor'), { recursive: true });
  for (const f of readdirSync(dst).filter(f => f.endsWith('.html'))) { const p = join(dst, f); writeFileSync(p, readFileSync(p, 'utf8').replaceAll('../_vendor/', './_vendor/')); }
  ensure(out); const zip = resolve(out, id + '.zip'); rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', zip, '.'], { cwd: dst }); rmSync(tmp, { recursive: true, force: true });
  return { zip, bytes: statSync(zip).size };
}

/** publish-pack <id>: gather everything the hosting step needs into publish/<id>/ with manifest.json (see docs/HOSTING.md). */
export function publishPack(id, { gamesDir, videoDir = 'press/video', outDir = 'publish', examples = 'examples' } = {}) {
  const meta = JSON.parse(readFileSync(join(examples, id, 'meta.json'), 'utf8')), dir = join(outDir, id), press = join(dir, 'press'), video = resolve(videoDir, `${id}-hook.mp4`);
  if (!existsSync(video)) throw new Error(`render the video first: gamepress drive ${examples}/${id}/hook.drive.json`);
  ensure(join(press, 'raw', 'shots')); ensure(join(press, 'raw', 'clips'));
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString());
  for (let i = 0; i < 8; i++) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String((dur * (i + 1)) / 9), '-i', video, '-frames:v', '1', join(press, 'raw', 'shots', `s${i}.png`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(dur * 0.45), '-i', video, '-frames:v', '1', join(press, 'raw', 'hero.png')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', join(press, 'raw', 'clips', 'a.mp4')]);
  spawnSync(process.execPath, [join(ROOT, 'bin', 'gamepress.mjs'), 'pack', '--dir', press], { stdio: 'inherit' });
  const b = gamesDir ? bundle(join(gamesDir, id), dir) : null; mkdirSync(join(dir, 'youtube'), { recursive: true });
  cpSync(video, join(dir, 'youtube', 'short.mp4')); cpSync(join(press, 'raw', 'hero.png'), join(dir, 'youtube', 'thumbnail.png'));
  const manifest = { id, meta, bundle: b && { zip: b.zip, bytes: b.bytes, entry: 'index.html' }, assets: press + '/out',
    itch: { dir: press + '/out/itch', zip: b?.zip, butlerTarget: `<itch-user>/${id}:html5`, title: meta.title, tagline: meta.tagline, description: meta.description, tags: meta.tags, classification: 'game', kind: 'html', embed: { width: 540, height: 960, mobileFriendly: true } },
    crazygames: { dir: press + '/out/crazygames', zip: b?.zip, title: meta.title, description: meta.description, tags: meta.tags, orientation: 'portrait', preview: press + '/out/crazygames/preview.mp4' },
    steam: { dir: press + '/out/steam', note: 'Web demo only: for Steam wrap the build (Electron/NW.js) or use the shipped desktop wrapper, then depots via steamcmd.', title: meta.title, shortDescription: meta.tagline, trailer: press + '/out/steam/trailer.mp4' },
    youtube: { video: dir + '/youtube/short.mp4', thumbnail: dir + '/youtube/thumbnail.png', title: meta.youtubeTitle || meta.tagline, description: `${meta.description}\n\nPlay free: <ITCH_URL>\n#shorts #${meta.tags.slice(0, 2).join(' #').replaceAll(' ', '')}`, tags: [...meta.tags, 'shorts'], privacy: 'public', madeForKids: false } };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2)); return manifest;
}
