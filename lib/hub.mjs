// gamepress hub: build the Arcade Hub (one app containing every mini-game, hero select, coin wallet) from built recipe games.
// See docs/HUB.md. The hub is a static page at <games>/<hub-id>/index.html that iframes ../<game>/index.html?pack=1&hero=..&heroColor=..
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addToCatalog, loadPacks } from './packs.mjs';

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
export function buildHub({ name, games, catalog, demo = false, only, world } = {}) {
  const hub = loadHub(), chars = loadCharacters();
  const list = only?.length ? only : defaultGames(hub);
  const missing = [...new Set([...list, ...hub.demoGames])].filter(g => !existsSync(join(games, g, 'index.html')));
  if (missing.length) throw new Error(`hub: build these first (gamepress make/all): ${missing.join(', ')}`);
  const reg = readJson(join(ROOT, 'presets', 'recipes.json'));
  const names = Object.fromEntries((Array.isArray(reg) ? reg : Object.values(reg.recipes || reg)).filter(r => r && r.id).map(r => [r.id, r.title]));
  const id = (name || hub.name) + (demo ? '-demo' : '');
  const title = hub.title + (demo ? ' (FREE DEMO)' : '');
  const cfg = { id, games: list, fullGames: list.length, demoGames: hub.demoGames, names, base: '../', demo, buyUrl: hub.buyUrl || '', price: hub.price || '', world: world || '', allAccess: chars.allAccess, heroes: chars.heroes };
  const html = readFileSync(join(ROOT, 'templates', 'hub', 'hub.html'), 'utf8')
    .replace(/__TITLE__/g, () => esc(title)).replace(/__TAGLINE__/g, () => esc(hub.tagline)).replace(/__ACCENT__/g, hub.accent || '#ffd34d')
    .replace('__CONFIG__', () => JSON.stringify(cfg).replace(/</g, '\\u003c'));
  const dir = join(games, id); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html);
  if (catalog) addToCatalog(id, { title, games: demo ? hub.demoGames : list, demo, price: hub.price }, catalog, 'Arcade Hub');
  return { id, games: demo ? hub.demoGames.length : list.length, demo, heroes: chars.heroes.length, path: join(dir, 'index.html') };
}
