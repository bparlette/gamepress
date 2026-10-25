// `gamepress cuts`: best-of compilations (YouTube Shorts + one long video) from a game that has a scripted-clip
// director (tools/director) and a voice-line manifest. The AI only edits a JSON spec (cuts.json); this module
// finds lines, checks the spec, installs the kit and runs the render. Method + rationale: docs/GAME-VIRAL-CUTS.md.
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, chmodSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'cuts');
const KIT_REL = 'tools/director/scripts/viral';
const SHORT_MAX = 58;   // seconds: keep Shorts under a minute
const SHORT_MIN = 15;

const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
const kitDir = game => join(resolve(game), KIT_REL);

export function loadGame(game = '.') {
  const dir = kitDir(game), specFile = join(dir, 'cuts.json');
  if (!existsSync(specFile)) throw new Error(`no ${KIT_REL}/cuts.json in ${resolve(game)}: run "gamepress cuts init --game <dir>" first`);
  const spec = readJson(specFile), root = resolve(game);
  const manifest = readJson(join(root, spec.paths.manifest)).lines;
  const content = readJson(join(root, spec.paths.content));
  const weapons = spec.paths.weapons && existsSync(join(root, spec.paths.weapons)) ? readJson(join(root, spec.paths.weapons)) : null;
  return { root, dir, spec, manifest, content, weapons };
}

/** Search recorded lines (what was actually voiced). Sorted shortest-first so punchy lines surface. */
export function findLines(game, { q, faction, event, max = 40, variant = 'c' } = {}) {
  const { manifest } = loadGame(game);
  const needle = q ? q.toLowerCase() : null;
  const rows = [];
  for (const [id, e] of Object.entries(manifest)) {
    const [f, ev, v] = id.split('.');
    if (faction && f !== faction && !(f === 'rivalry' && id.split('.')[1].split('-').includes(faction))) continue;
    if (event && ev !== event && !(f === 'rivalry' && event === 'rivalry')) continue;
    if (variant !== 'any' && v !== variant && f !== 'rivalry') continue;
    if (needle && !e.text.toLowerCase().includes(needle)) continue;
    rows.push({ id, text: e.text, duration: Number((e.duration ?? 0).toFixed(2)) });
  }
  rows.sort((a, b) => a.duration - b.duration || a.id.localeCompare(b.id));
  return { total: rows.length, shown: Math.min(max, rows.length), lines: rows.slice(0, max) };
}

const suggest = (manifest, id) => {
  const prefix = id.split('.').slice(0, 2).join('.');
  const near = Object.keys(manifest).filter(k => k.startsWith(prefix + '.')).slice(0, 4).map(k => `${k} "${manifest[k].text}"`);
  return near.length ? `try ${near.join(' | ')}` : `no recorded line starts with "${prefix}": use "gamepress cuts lines --q <words>"`;
};

/** Validate cuts.json against the game's manifest/content. Returns { ok, errors[], warnings[], chapters[] }. */
export function lintCuts(game) {
  const { spec, manifest, content, weapons } = loadGame(game);
  const errors = [], warnings = [], chapters = [];
  const factions = new Set(Object.keys(content.factions));
  const loadouts = weapons ? new Set(Object.keys(weapons.loadouts || {})) : null;
  for (const list of ['shorts', 'long']) for (const n of spec[list] || []) if (!spec.chapters[n]) errors.push(`${list}: chapter "${n}" is not defined in chapters`);
  for (const [j, parts] of Object.entries(spec.joined || {})) for (const n of parts) if (!spec.chapters[n]) errors.push(`joined.${j}: chapter "${n}" is not defined`);
  const usedKillers = new Set();
  for (const [name, c] of Object.entries(spec.chapters)) {
    if (c.type === 'features') { chapters.push({ name, scenes: 0, seconds: Math.ceil(2.4 + (c.items?.length || 0) * 2.4 + 3.4) }); continue; }
    if (!Array.isArray(c.scenes) || !c.scenes.length) { errors.push(`${name}: no scenes`); continue; }
    let t = 0;
    c.scenes.forEach((s, i) => {
      const at = `${name}[${i}]`;
      for (const k of ['killer', 'victim']) if (!factions.has(s[k])) errors.push(`${at}: ${k} "${s[k]}" is not a faction (${[...factions].join(', ')})`);
      if (s.killer === s.victim) warnings.push(`${at}: killer and victim are the same faction`);
      usedKillers.add(s.killer);
      const e = manifest[s.line];
      if (!e) errors.push(`${at}: no recorded line "${s.line}" (${suggest(manifest, s.line)})`);
      if (s.loadout && loadouts && !loadouts.has(s.loadout)) errors.push(`${at}: loadout "${s.loadout}" unknown (${[...loadouts].join(', ')})`);
      if (s.grenade && !s.victimHp) warnings.push(`${at}: grenade scene needs victimHp (~25) or the victim survives`);
      if (e && /^[a-z]+\.[a-z]+\.s\./i.test(s.line)) warnings.push(`${at}: "${s.line}" is a mature "steam" variant: check it suits the platform`);
      const say = s.grenade ? 2.7 : 1.35;
      t += Math.max(3.0, say + (e?.duration ?? 1.6) + 0.7);
    });
    const outro = c.outro && typeof c.outro === 'object' ? c.outro.short : c.outro;
    if (outro) t += 3;
    const isShort = (spec.shorts || []).includes(name);
    chapters.push({ name, scenes: c.scenes.length, seconds: Math.round(t) });
    if (isShort && t > SHORT_MAX) errors.push(`${name}: ~${Math.round(t)}s is over ${SHORT_MAX}s for a Short: drop scenes or pick shorter lines`);
    if (isShort && t < SHORT_MIN) warnings.push(`${name}: ~${Math.round(t)}s is very short: add scenes`);
    if (isShort) {
      const hook = c.hook && typeof c.hook === 'object' ? c.hook.short : c.hook;
      if (!hook) warnings.push(`${name}: Short has no hook text (first 2 s decide a viral Short)`);
      if (!outro) warnings.push(`${name}: Short has no outro/CTA card`);
    }
  }
  const missing = [...factions].filter(f => !usedKillers.has(f));
  if (missing.length) warnings.push(`factions never shown as the killer: ${missing.join(', ')}`);
  return { ok: !errors.length, errors, warnings, chapters };
}

/** Install the kit (never overwrites an existing cuts.json). */
export function initCuts(game) {
  const root = resolve(game);
  if (!existsSync(join(root, 'tools/director/direct.mjs'))) throw new Error(`${root} has no tools/director/direct.mjs: this kit drives the game's scripted-clip director (see docs/GAME-VIRAL-CUTS.md)`);
  const dir = kitDir(game); mkdirSync(dir, { recursive: true });
  const wrote = [];
  for (const f of readdirSync(TEMPLATE)) {
    const dst = join(dir, f);
    if (existsSync(dst) && (f === 'cuts.json' || f === 'README.md')) continue;
    copyFileSync(join(TEMPLATE, f), dst); if (f.endsWith('.sh')) chmodSync(dst, 0o755); wrote.push(f);
  }
  return { dir, wrote, next: `edit ${KIT_REL}/cuts.json (paths, factions, scenes), then: gamepress cuts lint --game ${game}` };
}

/** Run make.sh: dry | still <chapter> | shorts | long. */
export function runMake(game, sub, chapter) {
  const { dir } = loadGame(game);
  const args = [sub, ...(chapter ? [chapter] : [])];
  execFileSync(join(dir, 'make.sh'), args, { stdio: 'inherit', cwd: resolve(game) });
  return { ran: `make.sh ${args.join(' ')}`, output: sub === 'still' ? `dist/director/viral/still/${chapter}.sheet.png` : 'dist/director/viral/' };
}
