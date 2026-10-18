// gamepress packs: build multi-game rotation packs (presets/packs.json) from built recipe games.
// A pack is one page that plays N games one level at a time, looping; demo packs end each cycle with an upsell to the full pack.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { catalogCommand } from './catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
export const loadPacks = () => readJson(join(ROOT, 'presets', 'packs.json'));

/** Build every pack (or only `only`) into <games>/<packId>/index.html and, if a catalog is given, add it to the demo page. */
export function buildPacks({ games, catalog, only, theme } = {}) {
  const T = theme && { prefix: '', label: 'Cat Arcade', ...theme }, pre = T ? T.prefix : '';
  const packs = loadPacks(), reg = readJson(join(ROOT, 'presets', 'recipes.json'));
  let names = Object.fromEntries((Array.isArray(reg) ? reg : Object.values(reg.recipes || reg)).filter(r => r && r.id).map(r => [r.id, r.title]));
  const tpl = readFileSync(join(ROOT, 'templates', 'packs', 'pack.html'), 'utf8'), out = [];
  for (const [id, p] of Object.entries(packs)) {
    if (id.startsWith('_') || (only && only !== id)) continue;
    const base = T ? { ...p, title: p.title.replace(/CAT ARCADE/, T.label.toUpperCase()), games: p.games.map(g => pre + g) } : p;
    if (T) names = { ...names, ...Object.fromEntries(p.games.map(g => [pre + g, T.names?.[g] || names[g]])) };
    const missing = base.games.filter(g => !existsSync(join(games, g, 'index.html')));
    if (missing.length) throw new Error(`pack ${id}: build these first (gamepress make/all): ${missing.join(', ')}`);
    const full = p.full && packs[p.full], pid = pre + id;
    const cfg = { id: pid, games: base.games, names, base: '../', demo: !!p.demo, buyUrl: (full ? full.buyUrl : p.buyUrl) || '' };
    const html = tpl.replace(/__TITLE__/g, base.title).replace(/__TAGLINE__/g, p.tagline).replace(/__ACCENT__/g, p.accent || '#ffd34d')
      .replace(/__DEMOCLASS__/g, p.demo ? 'demo' : '').replace(/__FULLN__/g, full ? full.games.length : p.games.length).replace(/__PRICE__/g, full && full.price ? `(${full.price})` : '').replace('__CONFIG__', JSON.stringify(cfg));
    const dir = join(games, pid); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html);
    if (catalog) addToCatalog(pid, base, catalog, T?.label);
    out.push({ id: pid, games: base.games.length, demo: !!p.demo, path: join(dir, 'index.html') });
  }
  return out;
}

function addToCatalog(id, p, catalog, category = 'Cat Arcade') {
  const cat = resolve(catalog), tdir = join(dirname(cat), 'thumbs'), pick = p.games.slice(0, 4).map(g => join(tdir, g + '.webp')).filter(existsSync);
  let still;
  if (pick.length === 4) {
    still = join(tmpdir(), `gp-pack-${id}.jpg`);
    const vf = pick.map((_, i) => `[${i}:v]scale=400:400:force_original_aspect_ratio=increase,crop=400:400[v${i}]`).join(';') + ';[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|400_0|0_400|400_400';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...pick.flatMap(f => ['-i', f]), '-filter_complex', vf, '-frames:v', '1', still]);
  }
  catalogCommand({ catalogPath: cat, still, entry: { id, title: p.title, category, keys: {}, labels: {}, autostart: [], orientation: 'portrait', path: `g/${id}/index.html`, note: p.demo ? 'Free 5-game taster' : `${p.games.length} games, one level each${p.price ? ', ' + p.price : ''}` } });
  const f = readJson(cat); if (!f.categories.includes(category)) { f.categories.unshift(category); writeFileSync(cat, JSON.stringify(f, null, 1).replace(/[\u0080-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '\n'); }
}
