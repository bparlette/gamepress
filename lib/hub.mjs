// gamepress hub: build the Arcade Hub (one app containing every mini-game, hero select, coin wallet) from built recipe games.
// See docs/HUB.md. The hub is a static page at <games>/<hub-id>/index.html that iframes ../<game>/index.html?pack=1&hero=..&heroColor=..
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addToCatalog, loadPacks } from './packs.mjs';
import { loadCast } from './cast.mjs';
import { themedId, themeSpec, themeRecipeIds } from './themes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
export const loadCharacters = () => readJson(join(ROOT, 'presets', 'characters.json'));
export const loadHub = () => readJson(join(ROOT, 'presets', 'hub.json'));

/** The 30 recipe ids (the two full packs), unless presets/hub.json lists `games`. */
export function defaultGames(hub = loadHub()) {
  if (hub.games?.length) return hub.games;
  const p = loadPacks(); return [...new Set([...p.action15.games, ...p.brains15.games])];
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Build <games>/<hub-id>/index.html. Throws (one line) when games are missing. */
export function buildHub({ name, games, catalog, demo = false, only, world, cast } = {}) {
  let hub = loadHub(), chars = loadCharacters(), castCfg = null;
  if (cast) { // a cast replaces the heroes (characters with art + voices) and the game list (themed ids), see docs/CAST.md
    const c = loadCast(cast), th = c.theme, pick = c.hub.demoRecipes, T = { ...c };
    castCfg = c; chars = { heroes: c.factions.map(f => ({ id: f.id, name: f.name, kind: `cast:${cast}:${f.id}`, color: f.color, tier: f.tier, blurb: f.blurb })) };
    hub = { ...hub, name: c.hub.name, title: c.hub.title, tagline: c.hub.tagline, games: themeRecipeIds().map(r => themedId(r, th)), demoGames: pick.map(r => themedId(r, th)) };
    hub._names = Object.fromEntries(themeRecipeIds().map(r => [themedId(r, th), themeSpec(r, th).title]));
  }
  const list = only?.length ? only : defaultGames(hub);
  const missing = [...new Set(demo ? hub.demoGames : [...list, ...hub.demoGames])].filter(g => !existsSync(join(games, g, 'index.html')));
  if (missing.length) throw new Error(`hub: build these first (gamepress make/all): ${missing.join(', ')}`);
  const reg = readJson(join(ROOT, 'presets', 'recipes.json'));
  const names = hub._names || Object.fromEntries((Array.isArray(reg) ? reg : Object.values(reg.recipes || reg)).filter(r => r && r.id).map(r => [r.id, r.title]));
  const id = (name || hub.name) + (demo ? '-demo' : '');
  const title = hub.title + (demo ? ' (FREE DEMO)' : '');
  const cfg = { id, games: list, fullGames: list.length, demoGames: hub.demoGames, names, base: '../', demo, buyUrl: hub.buyUrl || '', world: world || '', heroes: chars.heroes, cast: cast || '' };
  const html = readFileSync(join(ROOT, 'templates', 'hub', 'hub.html'), 'utf8')
    .replace(/__TITLE__/g, () => esc(title)).replace(/__TAGLINE__/g, () => esc(hub.tagline)).replace(/__ACCENT__/g, hub.accent || '#ffd34d')
    .replace('__CONFIG__', () => JSON.stringify(cfg).replace(/</g, '\\u003c'));
  const dir = join(games, id); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html);
  if (catalog) addToCatalog(id, { title, games: demo ? hub.demoGames : list, demo }, catalog, 'Arcade Hub');
  return { id, games: demo ? hub.demoGames.length : list.length, demo, heroes: chars.heroes.length, path: join(dir, 'index.html') };
}
