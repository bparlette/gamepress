// make / doctor / lint / vision: the "less AI, more script" layer. `make` builds a whole game from a recipe + a small JSON spec,
// `doctor` and `lint` catch environment and publish mistakes, `vision` asks a local vision model fixed yes/no questions about stills.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, copyFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { findChrome } from './cdp.mjs';
import { probeLocalAi } from './local_ai.mjs';
import { LEGO_SCHEMA } from './lego.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const META_KEYS = ['hook', 'tagline', 'description', 'tags', 'youtubeTitle', 'category'];
const REG = JSON.parse(readFileSync(join(ROOT, 'presets', 'recipes.json'), 'utf8')).recipes;
export const REGISTRY = Object.fromEntries(REG.map(r => [r.id, r]));
export const RECIPES = { ...Object.fromEntries(REG.map(r => [r.id, { seconds: r.seconds, doc: r.threeSecond, keys: {}, reg: r }])), 'crowd-runner': { seconds: 26, doc: 'steer a crowd through math gates, topple a boss', keys: { left: 'KeyA', right: 'KeyD' } }, 'glass-drop': { seconds: 24, doc: 'drop a hero through glass panes where one of each pair breaks', keys: { fire: 'Space' } }, demolition: { seconds: 26, doc: 'blow a voxel structure apart with artillery', keys: { fire: 'Space', left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' } }, 'hole-eater': { seconds: 30, doc: 'steer a growing hole that swallows a city', keys: { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' } } };
// F7: hexify converts "#rrggbb" strings to bare 0xrrggbb for game specs that expect
// numeric colors. Only exact 6-hex-char strings match — seeds/IDs are safe unless they
// literally look like a CSS color. If a recipe needs non-color hex strings, add its
// fields to META_KEYS or list them explicitly in the recipe's spec handling instead.
const hexify = v => JSON.stringify(v, (k, x) => (typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? '@@0x' + x.slice(1) + '@@' : x)).replace(/"@@(0x[0-9a-f]{6})@@"/gi, '$1');

/** Copy the kit (gp2d, gp3d, gpkit, gpphys, gplego, ...) into <games>/_vendor so every game's ../_vendor/ imports resolve. Only copies changed files. */
export function syncKit(games) {
  const src = join(ROOT, 'kit'), dst = join(games, '_vendor'); mkdirSync(dst, { recursive: true }); let n = 0;
  for (const f of readdirSync(src)) { const a = join(src, f), b = join(dst, f); if (!existsSync(b) || statSync(a).size !== statSync(b).size || readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')) { copyFileSync(a, b); n++; } } return n;
}

/** make <id> --recipe R --spec spec.json: game + hook plan + meta from a recipe. The AI only writes the spec (title, colours, gate list, hook line). */
export function make(id, { recipe, spec, games = 'games', examples = 'examples', force = false }) {
  const R = RECIPES[recipe]; if (!R) throw new Error(`recipe: ${Object.keys(RECIPES).join(' | ')}`);
  const dir = join(games, id); if (existsSync(dir) && !force) throw new Error(`${dir} exists (pick a new id or pass --force)`);
  const reg = R.reg, gameSpec = Object.fromEntries(Object.entries(spec).filter(([k]) => !META_KEYS.includes(k) || k === 'hook')), title = spec.title || reg?.title || id; if (reg && !gameSpec.hook) gameSpec.hook = reg.hook;
  const html = readFileSync(join(ROOT, 'templates', 'recipes', recipe + '.html'), 'utf8').replace('/*SPEC*/ ...{} /*END*/', '/*SPEC*/ ...' + (reg?.colors === 'css' ? JSON.stringify(gameSpec) : hexify(gameSpec)) + ' /*END*/').replaceAll('__TITLE__', title);
  syncKit(games);
  mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html);
  const ex = join(examples, id); if (existsSync(ex) && force) return { game: join(dir, 'index.html'), note: 'examples kept (force only rewrites the game)', next: `gamepress all ${id} --track demo --force` }; mkdirSync(ex, { recursive: true });
  const tagline = spec.tagline || (reg ? reg.hook : `${title}: ${R.doc}`);
  writeFileSync(join(ex, 'hook.drive.json'), JSON.stringify({ name: id + '-hook', root: '${GP_GAMES:-' + relative(ex, games) + '}', path: `${id}/index.html?auto=1${reg?.engine === '2d' ? '' : '&dpr=1&clean=1'}&seed=${spec.seed || 7}${spec.style ? '&style=' + spec.style : ''}`, viewport: [540, 960], scale: 2, fps: 30, seed: 5, duration: R.seconds, report: 'window.__game', input: [],
    captions: [{ t: 0, until: 4, text: spec.hook || reg?.hook || tagline, pos: reg ? 'tiptop' : 'top', style: 'hook' }, { t: R.seconds - 6, until: R.seconds, text: 'Play free. Link in bio', pos: 'bottom', style: 'cta' }], slowmo: [], ...(recipe === 'demolition' ? { input: Array.from({ length: Math.floor((R.seconds - 5) / 1.9) }, (_, i) => ({ t: 1.5 + i * 1.9, key: ' ', hold: 0.1 })) } : {}), blur: 2, fade: { in: 0.2, out: 0.4 }, thumb: R.seconds * 0.55,
    audio: { source: 'window.__events', music: 'bed', musicGain: 0.3, bed: { bpm: 136, root: 62 } } }, null, 2));
  writeFileSync(join(ex, 'meta.json'), JSON.stringify({ id, title, tagline, description: spec.description || tagline, tags: spec.tags || [...(reg ? [reg.title.toLowerCase(), ...reg.refs.slice(0, 1).map(x => x.toLowerCase() + ' like')] : []), recipe.replace('-', ' '), 'browser game', 'html5'], youtubeTitle: spec.youtubeTitle || spec.hook || tagline, category: spec.category || reg?.category || 'Viral Demos', price: 0, keys: R.keys, labels: {}, orientation: 'any' }, null, 2));
  // 3D recipes: suggest the img2threejs start-from-image workflow by default
  // (demos need hero assets, not placeholder primitives — docs/IMG2THREEJS-WORKFLOW.md).
  const imageHint = reg?.engine === '3d'
    ? { image: `3D recipe — generate the hero asset with img2threejs instead of placeholder primitives: gamepress auto "${title}" --from-image --image-mode describe --image-desc "<what the hero looks like>" (see docs/IMG2THREEJS-WORKFLOW.md)` }
    : {};
  return { game: join(dir, 'index.html'), plan: join(ex, 'hook.drive.json'), next: `gamepress all ${id} --track demo`, ...imageHint };
}

/** doctor: every tool the pipeline needs, with the command that installs a missing one. */
export function doctor() {
  // F4: strict status check — a broken install that prints an error to stderr is NOT "installed".
  const has = (c, a = ['-version']) => { const r = spawnSync(c, a, { encoding: 'utf8' }); return r.status === 0 && !r.error; };
  const row = (name, ok, fix, opt = false) => ({ name, ok: !!ok, ...(ok ? {} : { fix }), ...(opt ? { optional: true } : {}) });
  let chrome = true; try { findChrome(); } catch { chrome = false; }
  const rows = [row('node >= 22', +process.versions.node.split('.')[0] >= 22, 'brew install node'), row('ffmpeg', has('ffmpeg'), 'brew install ffmpeg'), row('ffprobe', has('ffprobe'), 'brew install ffmpeg'), row('chrome', chrome, 'install Google Chrome or set CHROME=/path'),
    row('zip', has('zip', ['-v']), 'brew install zip'), row('cwebp (thumbnails)', has('cwebp', ['-version']), 'brew install webp', true), row('rojo (roblox build)', has('rojo', ['--version']), 'brew install rojo', true),
    row('ollama (optional local AI)', has('ollama', ['--version']), 'optional: brew install ollama; ollama pull qwen2.5-coder:14b', true), row('butler (itch upload)', has('butler', ['-V']), 'brew install --cask itch (or itch.io/docs/butler)', true),
    row('gh (GitHub CLI: cloud runners + repo ops)', has('gh', ['--version']), 'brew install gh (or: apt install gh / dnf install gh); then: gh auth login', true)];
  return { ok: rows.filter(r => !r.optional).every(r => r.ok), rows };
}

/** lint <id>: things that must never ship: personal paths/secrets, external requests (stores run games offline/sandboxed), huge bundles. */
export function lint(id, games) {
  const dir = join(games, id), problems = [], home = homedir();
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  if (!existsSync(dir)) return { ok: false, problems: [`no game at ${dir}`] };
  let bytes = 0;
  for (const f of walk(dir)) { const st = statSync(f); bytes += st.size; if (!/\.(html|js|json|css|txt|md)$/.test(f) || st.size > 3e6) continue; const t = readFileSync(f, 'utf8'), rel = relative(dir, f);
    // F3: only flag the username in path-like contexts (/home/<user>, /Users/<user>); a bare
    // word match false-positives on short usernames (e.g. "hatch", "mac", "dev" in game text).
    if (t.includes(home) || /\/Users\/[A-Za-z][\w.-]*\//.test(t) || /\/home\/[a-z][\w.-]*\//.test(t)) problems.push(`${rel}: personal path (use relative paths)`);
    if (/(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}/i.test(t)) problems.push(`${rel}: looks like a secret`);
    for (const m of t.matchAll(/(?:src|href|from|import\()\s*=?\s*['"](https?:)?\/\/(?!www\.w3\.org)[^'"]+/g)) problems.push(`${rel}: external request ${m[0].slice(0, 60)} (stores run games sandboxed: vendor it)`); }
  if (!existsSync(join(dir, 'index.html'))) problems.push('no index.html at the game root');
  if (bytes > 40e6) problems.push(`bundle is ${(bytes / 1e6).toFixed(0)} MB (CrazyGames/itch prefer < 50 MB zipped; vendor adds ~1 MB)`);
  return { ok: !problems.length, problems, bytes };
}

const QUESTIONS = ['Is there a clearly visible main subject (character, crowd, hole or vehicle) that is not tiny?', 'Is the scene colourful and clean, with no large empty or black areas except intentional ones?', 'Is any on-screen text readable?', 'Does it look like a polished mobile game rather than a prototype?'];
/** vision <stills...>: ask a local Ollama vision model fixed yes/no questions. Returns per-still answers; never blocks if Ollama is absent. */
export async function vision(stills, { model = process.env.GP_VISION, host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' } = {}) {
  const probe = await probeLocalAi({ host });
  const chosenVision = model || probe.visionModel;
  if (!probe.available || !chosenVision) {
    return {
      available: false,
      optional: true,
      codeModelAvailable: probe.model || null,
      reason: probe.available
        ? `no vision model installed in Ollama (found: ${probe.models.join(', ')}); vision check is optional`
        : `ollama not running (optional); skip or run: ollama pull qwen3-vl:4b-instruct`,
    };
  }
  const out = [];
  for (const f of stills) { const images = [readFileSync(f).toString('base64')], answers = [];
    for (const q of QUESTIONS) { try { const r = await fetch(`${host}/api/chat`, { method: 'POST', body: JSON.stringify({ model: chosenVision, stream: false, options: { temperature: 0 }, messages: [{ role: 'user', content: q + ' Answer only YES or NO.', images }] }) }); if (!r.ok) throw new Error(String(r.status)); answers.push({ q, yes: /^\s*yes/i.test((await r.json()).message?.content || '') }); } catch { return { available: false, optional: true, reason: `vision model ${chosenVision} failed or unreachable` }; } }
    out.push({ still: f, answers }); }
  const total = out.flatMap(o => o.answers), yes = total.filter(a => a.yes).length;
  return { available: true, model: chosenVision, score: Math.round(100 * yes / total.length), failed: [...new Set(total.filter(a => !a.yes).map(a => a.q))] };
}

/**
 * context [--2d|--3d|--lego|--recipe <name>]: Ultra-compact (~400 token) AI reference digest.
 * Saves an AI agent from reading 6 separate markdown files (~15,000 tokens).
 */
export function contextDigest({ mode = 'all', recipe = null } = {}) {
  if (recipe && RECIPES[recipe]) {
    const r = RECIPES[recipe];
    return {
      recipe,
      doc: r.doc,
      seconds: r.seconds,
      dontBuild: r.reg?.dontBuild || [],
      command: `gamepress make <id> --recipe ${recipe} --spec '{"title":"...","hook":"..."}'`,
      next: `gamepress all <id> --track web-store --heal`,
    };
  }
  const base = {
    workflow: [
      '1. Fastest (0 code tokens): `gamepress auto "<idea>" [--local-ai]` or `gamepress lego <id> --idea "<idea>" [--local-ai]`',
      '2. From recipe: `gamepress make <id> --recipe <name> --spec \'{"title":"...","hook":"..."}\'`',
      '3. Verify & render: `gamepress all <id> --track hook|demo|web-store [--heal] [--vo]`',
      '4. Publish: `gamepress host <itch|crazygames|steam|youtube|cloudflare|github> <id> [--live]`',
    ],
    recipes: Object.keys(RECIPES),
    legoBlocks: LEGO_SCHEMA,
    rubricFloor80pts: [
      'shell: createGame() (2D), runLegoGame() (Lego), or st.shell()+st.end() (3D)',
      'feel: >=3 of hitstop(), slowmo(), popup(), flash(), shake(), kick()',
      'characters: drawChar/cat/dog/zombie (2D) or catGeo/zombieGeo/carGeo + walkClock (3D)',
      'particles & audio: burst()/particles() + >=4 sfx() types + ?auto=1 lose-first-then-win bot',
      'video: 1080x1920 @ 30fps, 15-59s, -14 LUFS audio, hook caption at t<=1s, cta caption at end',
    ],
  };
  if (mode === '2d' || mode === 'all') {
    base.gp2d = 'import { createGame, sfx, comboPitch, rand, clamp, dist, lerp } from "../_vendor/gp2d.js"; import { drawChar, coin, star, heart } from "../_vendor/gpsprites.js"; const g = createGame({id,title,sub,bg,hook}); g.onReset=()=>{}; g.run(dt=>{ /* g.dumb() true on attempt 0 */ }, ctx=>{});';
  }
  if (mode === '3d' || mode === 'all') {
    base.gp3d = 'import { THREE, createStage, sfx, rand, clamp } from "../_vendor/gp3d.js"; import { toon, sky, groundTex, catGeo, zombieGeo, carGeo, crowd, hero, particles, blobs, walkClock } from "../_vendor/gpkit.js"; const st = createStage({bg,fov,fitWidth}); st.light(); st.shell({id,title,onReset}); st.cine([{t:0,p:[0,2,4]},{t:2,p:[0,0,0]}]); st.run(dt=>{ walkClock.value=st.t; });';
  }
  if (mode === 'lego' || mode === 'all') {
    base.gplego = 'import { runLegoGame } from "../_vendor/gplego.js"; runLegoGame({ id, title, hookText, controller, spawner, hook, progression });';
  }
  return base;
}

