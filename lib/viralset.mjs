// gamepress theme <hero> [--world w] ...: the "viral 30" use case end to end.
// 30 re-skinned recipe games -> hook video + thumbnail + catalog entry each -> 2x15 full packs + 2x5 free demo packs -> QC -> publish.
// Lessons baked in: never write games into the repo's games/ folder; resume after timeouts; one failed game must not stop the other 29;
// smoke-test every pack in a real browser; pull before and after pushing the demo-page repo and stop (don't guess) on a catalog conflict.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, launchChrome } from './cdp.mjs';
import { serveDir } from './serve.mjs';
import { buildTheme, buildThemePacks, themeRecipeIds } from './themes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const setName = (theme, world) => theme + (world ? '-' + world : '');
const stateFile = name => join(ROOT, '.gp', `viral-${name}.json`);
const readState = name => { try { return JSON.parse(readFileSync(stateFile(name), 'utf8')); } catch { return { done: [], failed: {} }; } };
const writeState = (name, s) => { mkdirSync(join(ROOT, '.gp'), { recursive: true }); writeFileSync(stateFile(name), JSON.stringify(s, null, 1)); };

/** Refuse setups that caused trouble: output inside the repo's games/ folder, missing Chrome/ffmpeg. Throws with the fix. */
export function preflight(c, { needCatalog = false } = {}) {
  if (resolve(c.games) === join(ROOT, 'games')) throw new Error('refusing to write 30 games into the gamepress repo: set GP_GAMES (and GP_CATALOG) to the demo-page folder, or pass --games <dir>');
  if (needCatalog && !c.catalog) throw new Error('set GP_CATALOG (or --catalog) to the demo page games.json');
  try { findChrome(); } catch { throw new Error('Chrome not found (set CHROME=/path/to/chrome)'); }
  if (spawnSync('ffmpeg', ['-version']).status !== 0) throw new Error('ffmpeg not installed (brew install ffmpeg)');
}

/** Build every game of the set, render the missing ones (resumable, time-budgeted), then build the packs when all 30 are done. */
export async function renderSet(theme, { world, c: c0, make, runAll, render = false, force = false, only, budgetMin = 100, log = () => {} } = {}) {
  let c = c0; preflight(c, { needCatalog: render });
  const name = setName(theme, world); c = { ...c, examples: join(ROOT, '.gp', 'viral', name, 'examples') }; // plans/meta stay out of git
  const built = buildTheme(theme, { make, games: c.games, examples: c.examples, only, world });
  const st = force ? { done: [], failed: {} } : readState(name), started = Date.now(), out = { set: name, games: built.games.length, rendered: [], failed: {}, pending: [] };
  if (render) for (const id of built.games) {
    if (st.done.includes(id)) continue;
    if ((Date.now() - started) / 60000 > budgetMin) { out.pending.push(id); continue; }
    try { log(`render ${id}`); await runAll(id, 'demo', c, { force: true, cloud: false, log }); st.done.push(id); delete st.failed[id]; out.rendered.push(id); }
    catch (e) { st.failed[id] = e.message.split('\n')[0]; out.failed[id] = st.failed[id]; }
    writeState(name, st);
  }
  out.pending = render ? built.games.filter(id => !st.done.includes(id) && !out.failed[id]) : [];
  out.allDone = render && !only && built.games.every(id => st.done.includes(id));
  if (out.allDone || (!render && !only)) { try { out.packs = buildThemePacks(theme, { games: c.games, catalog: c.catalog, world }).map(p => p.id); } catch (e) { out.packsNote = e.message; } }
  if (out.pending.length) out.next = `time budget reached: run the same command again to resume (${out.pending.length} left)`;
  return out;
}

/** Headless smoke test of each pack page: starts, rotates through every game, demo packs end on the upsell, no console errors. */
export async function packSmoke(games, packIds) {
  const srv = await serveDir(games), res = [], sl = ms => new Promise(r => setTimeout(r, ms));
  for (const pid of packIds) {
    const c = await launchChrome({ width: 390, height: 780 });
    try {
      await c.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/${pid}/index.html` }); await sl(1200);
      await c.evaluate("document.getElementById('go').click()"); await sl(2500);
      const n = await c.evaluate('window.__pack.games.length'), seen = new Set();
      for (let i = 0; i < n + 1; i++) { const idx = await c.evaluate('window.__pack.idx'); if (idx >= 0) seen.add(idx); await c.evaluate('window.__pack.next(true)'); await sl(2600); }
      const demo = await c.evaluate("document.body.classList.contains('demo')"), up = await c.evaluate("document.getElementById('upsell').classList.contains('show')");
      res.push({ pack: pid, games: n, visited: seen.size, upsell: demo ? up : null, errors: c.logs.length, ok: seen.size >= Math.min(n, 3) && c.logs.length === 0 && (!demo || up) });
    } catch (e) { res.push({ pack: pid, ok: false, error: e.message }); }
    await c.close();
  }
  srv.close?.(); return res;
}

/** One image with the thumbnail of every game in the set, for a human to skim before publishing. */
export function contactSheet(ids, catalog, out) {
  const tdir = join(dirname(resolve(catalog)), 'thumbs'), files = ids.map(i => join(tdir, i + '.webp')).filter(existsSync);
  if (!files.length) throw new Error('no thumbnails found (render first)');
  const cols = 6, cell = 200, rows = Math.ceil(files.length / cols);
  const vf = files.map((_, i) => `[${i}:v]scale=${cell}:${cell}:force_original_aspect_ratio=increase,crop=${cell}:${cell}[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * cell}_${Math.floor(i / cols) * cell}`).join('|')}`;
  mkdirSync(dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex', vf, '-frames:v', '1', out]);
  return { out, games: files.length, rows };
}

/** Commit + push the demo-page repo. Pulls first and after; stops with a clear message on a conflict (never guesses). */
export function publishSet(c, name) {
  const dir = dirname(resolve(c.catalog)); const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  const top = git('rev-parse', '--show-toplevel'); if (top.status !== 0) throw new Error(`${dir} is not a git repo`);
  const repo = top.stdout.trim(), g = (...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' });
  const rel = resolve(c.games).startsWith(repo) ? dirname(resolve(c.games)) : repo;
  g('add', '-A', rel); if (!g('diff', '--cached', '--quiet').status) return { published: false, note: 'nothing to commit' };
  g('commit', '-m', `viral set ${name}: 30 games + 4 packs`, '-m', 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>');
  const pull = g('pull', '--rebase', '--autostash', 'origin', 'main');
  if (pull.status !== 0) { g('rebase', '--abort'); throw new Error(`pull --rebase conflicted (likely games.json or a thumbnail someone else changed). Rebase aborted, your commit is kept locally in ${repo}: resolve by hand, then git push origin main`); }
  const push = g('push', 'origin', 'main'); if (push.status !== 0) throw new Error('push failed: ' + (push.stderr || '').split('\n')[0]);
  return { published: true, repo };
}
