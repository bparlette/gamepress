// make / doctor / lint / vision: the "less AI, more script" layer. `make` builds a whole game from a recipe + a small JSON spec,
// `doctor` and `lint` catch environment and publish mistakes, `vision` asks a local vision model fixed yes/no questions about stills.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { findChrome } from './cdp.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const META_KEYS = ['hook', 'tagline', 'description', 'tags', 'youtubeTitle', 'category'];
export const RECIPES = { 'crowd-runner': { seconds: 26, doc: 'steer a crowd through math gates, topple a boss', keys: { left: 'KeyA', right: 'KeyD' } }, 'hole-eater': { seconds: 30, doc: 'steer a growing hole that swallows a city', keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' } } };
const hexify = v => JSON.stringify(v, (k, x) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? '@@0x' + x.slice(1) + '@@' : x)).replace(/"@@(0x[0-9a-f]{6})@@"/gi, '$1');

/** make <id> --recipe R --spec spec.json: game + hook plan + meta from a recipe. The AI only writes the spec (title, colours, gate list, hook line). */
export function make(id, { recipe, spec, games = 'games', examples = 'examples', force = false }) {
  const R = RECIPES[recipe]; if (!R) throw new Error(`recipe: ${Object.keys(RECIPES).join(' | ')}`);
  const dir = join(games, id); if (existsSync(dir) && !force) throw new Error(`${dir} exists (pick a new id or pass --force)`);
  const gameSpec = Object.fromEntries(Object.entries(spec).filter(([k]) => !META_KEYS.includes(k))), title = spec.title || id;
  const html = readFileSync(join(ROOT, 'templates', 'recipes', recipe + '.html'), 'utf8').replace('/*SPEC*/ ...{} /*END*/', '/*SPEC*/ ...' + hexify(gameSpec) + ' /*END*/').replaceAll('__TITLE__', title);
  mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html);
  const ex = join(examples, id); if (existsSync(ex) && force) return { game: join(dir, 'index.html'), note: 'examples kept (force only rewrites the game)', next: `gamepress all ${id} --track demo --force` }; mkdirSync(ex, { recursive: true });
  const tagline = spec.tagline || `${title}: ${R.doc}`;
  writeFileSync(join(ex, 'hook.drive.json'), JSON.stringify({ name: id + '-hook', root: '${GP_GAMES:-' + relative(ex, games) + '}', path: `${id}/index.html?auto=1&dpr=1&clean=1`, viewport: [540, 960], scale: 2, fps: 30, seed: 5, duration: R.seconds, report: 'window.__game', input: [],
    captions: [{ t: 0, until: 4, text: spec.hook || tagline, pos: 'top', style: 'hook' }, { t: R.seconds - 6, until: R.seconds, text: 'Play free. Link in bio', pos: 'bottom', style: 'cta' }], slowmo: [], blur: 2, fade: { in: 0.2, out: 0.4 }, thumb: R.seconds * 0.55,
    audio: { source: 'window.__events', music: 'bed', musicGain: 0.3, bed: { bpm: 136, root: 62 } } }, null, 2));
  writeFileSync(join(ex, 'meta.json'), JSON.stringify({ id, title, tagline, description: spec.description || tagline, tags: spec.tags || [recipe.replace('-', ' '), 'browser game', 'html5'], youtubeTitle: spec.youtubeTitle || spec.hook || tagline, category: spec.category || 'Viral Demos', price: 0, keys: R.keys, labels: {}, orientation: 'any' }, null, 2));
  return { game: join(dir, 'index.html'), plan: join(ex, 'hook.drive.json'), next: `gamepress all ${id} --track demo` };
}

/** doctor: every tool the pipeline needs, with the command that installs a missing one. */
export function doctor() {
  const has = (c, a = ['-version']) => { const r = spawnSync(c, a, { encoding: 'utf8' }); return r.status === 0 || (r.stdout + r.stderr).length > 0 && !r.error; };
  const row = (name, ok, fix, opt = false) => ({ name, ok: !!ok, ...(ok ? {} : { fix }), ...(opt ? { optional: true } : {}) });
  let chrome = true; try { findChrome(); } catch { chrome = false; }
  const rows = [row('node >= 22', +process.versions.node.split('.')[0] >= 22, 'brew install node'), row('ffmpeg', has('ffmpeg'), 'brew install ffmpeg'), row('ffprobe', has('ffprobe'), 'brew install ffmpeg'), row('chrome', chrome, 'install Google Chrome or set CHROME=/path'),
    row('zip', has('zip', ['-v']), 'brew install zip'), row('cwebp (thumbnails)', has('cwebp', ['-version']), 'brew install webp', true), row('rojo (roblox build)', has('rojo', ['--version']), 'brew install rojo', true),
    row('ollama (local vision judge)', has('ollama', ['--version']), 'brew install ollama; ollama pull qwen3-vl:4b-instruct', true), row('butler (itch upload)', has('butler', ['-V']), 'brew install --cask itch (or itch.io/docs/butler)', true)];
  return { ok: rows.filter(r => !r.optional).every(r => r.ok), rows };
}

/** lint <id>: things that must never ship: personal paths/secrets, external requests (stores run games offline/sandboxed), huge bundles. */
export function lint(id, games) {
  const dir = join(games, id), problems = [], home = homedir(), user = home.split('/').pop();
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  if (!existsSync(dir)) return { ok: false, problems: [`no game at ${dir}`] };
  let bytes = 0;
  for (const f of walk(dir)) { const st = statSync(f); bytes += st.size; if (!/\.(html|js|json|css|txt|md)$/.test(f) || st.size > 3e6) continue; const t = readFileSync(f, 'utf8'), rel = relative(dir, f);
    if (t.includes(home) || /\/Users\/[A-Za-z]/.test(t) || (user && user.length > 3 && new RegExp(`\\b${user}\\b`, 'i').test(t))) problems.push(`${rel}: personal path/name (use relative paths)`);
    if (/(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}/i.test(t)) problems.push(`${rel}: looks like a secret`);
    for (const m of t.matchAll(/(?:src|href|from|import\()\s*=?\s*['"](https?:)?\/\/(?!www\.w3\.org)[^'"]+/g)) problems.push(`${rel}: external request ${m[0].slice(0, 60)} (stores run games sandboxed: vendor it)`); }
  if (!existsSync(join(dir, 'index.html'))) problems.push('no index.html at the game root');
  if (bytes > 40e6) problems.push(`bundle is ${(bytes / 1e6).toFixed(0)} MB (CrazyGames/itch prefer < 50 MB zipped; vendor adds ~1 MB)`);
  return { ok: !problems.length, problems, bytes };
}

const QUESTIONS = ['Is there a clearly visible main subject (character, crowd, hole or vehicle) that is not tiny?', 'Is the scene colourful and clean, with no large empty or black areas except intentional ones?', 'Is any on-screen text readable?', 'Does it look like a polished mobile game rather than a prototype?'];
/** vision <stills...>: ask a local Ollama vision model fixed yes/no questions. Returns per-still answers; never blocks if Ollama is absent. */
export async function vision(stills, { model = process.env.GP_VISION || 'qwen3-vl:4b-instruct', host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' } = {}) {
  const out = [];
  for (const f of stills) { const images = [readFileSync(f).toString('base64')], answers = [];
    for (const q of QUESTIONS) { try { const r = await fetch(`${host}/api/chat`, { method: 'POST', body: JSON.stringify({ model, stream: false, options: { temperature: 0 }, messages: [{ role: 'user', content: q + ' Answer only YES or NO.', images }] }) }); if (!r.ok) throw new Error(String(r.status)); answers.push({ q, yes: /^\s*yes/i.test((await r.json()).message?.content || '') }); } catch (e) { return { available: false, reason: `ollama not reachable (${model}); skip or run: ollama pull ${model}` }; } }
    out.push({ still: f, answers }); }
  const total = out.flatMap(o => o.answers), yes = total.filter(a => a.yes).length;
  return { available: true, model, score: Math.round(100 * yes / total.length), failed: [...new Set(total.filter(a => !a.yes).map(a => a.q))] };
}
