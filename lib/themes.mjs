// gamepress theme <id>: re-skin all 30 recipe games (cats / dogs / people / cars ...) and build the 4 packs for that theme.
// A theme only swaps spec values (hero sprite, colour, title/hook noun); recipes, bots, hooks and packs are unchanged.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from './extras.mjs';
import { loadPacks, buildPacks } from './packs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const loadThemes = () => { const t = JSON.parse(readFileSync(join(ROOT, 'presets', 'themes.json'), 'utf8')); delete t._note; return t; };

/** The 30 recipe ids that make up a theme set (both 15-game packs). */
export const themeRecipeIds = () => { const p = loadPacks(); return [...p.action15.games, ...p.brains15.games]; };

const swap = (text, t) => String(text).replace(/\bCATS\b/g, t.plural).replace(/\bCAT\b/g, t.noun).replace(/\bcats\b/g, t.plural.toLowerCase()).replace(/\bcat\b/g, t.noun.toLowerCase()).replace(/\bCats\b/g, t.plural[0] + t.plural.slice(1).toLowerCase()).replace(/\bCat\b/g, t.noun[0] + t.noun.slice(1).toLowerCase());

/** Spec for one recipe under a theme: { title, hero, heroColor, hook }. */
export function themeSpec(recipeId, themeId) {
  const t = loadThemes()[themeId]; if (!t) throw new Error(`theme: ${Object.keys(loadThemes()).join(' | ')}`);
  const reg = Object.values(REGISTRY).find(r => r.id === recipeId); if (!reg) throw new Error(`unknown recipe ${recipeId}`);
  return { title: t.titles?.[recipeId] || swap(reg.title, t), hero: t.hero, heroColor: t.color, hook: swap(reg.hook, t) };
}

export const themedId = (recipeId, themeId) => (loadThemes()[themeId]?.prefix || '') + recipeId;

/** Write the 30 games for a theme with `make`, return what to render next. Rendering (videos/thumbs/catalog) is `gamepress all <id> --track demo`. */
export function buildTheme(themeId, { make, games, examples, force = true, only } = {}) {
  const t = loadThemes()[themeId]; if (!t) throw new Error(`theme: ${Object.keys(loadThemes()).join(' | ')}`);
  const ids = themeRecipeIds().filter(r => !only || only.includes(r)), built = [];
  for (const r of ids) { const id = themedId(r, themeId); make(id, { recipe: r, spec: themeSpec(r, themeId), games, examples, force }); built.push(id); }
  return { theme: themeId, games: built, next: `for each id: gamepress all <id> --track demo, then gamepress theme ${themeId} --packs` };
}

export const buildThemePacks = (themeId, { games, catalog } = {}) => { const t = loadThemes()[themeId]; return buildPacks({ games, catalog, theme: { ...t, names: Object.fromEntries(themeRecipeIds().map(r => [r, themeSpec(r, themeId).title])) } }); };
