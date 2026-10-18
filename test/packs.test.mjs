import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const J = f => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const packs = J('../presets/packs.json'), reg = J('../presets/recipes.json');
const ids = new Set((Array.isArray(reg) ? reg : Object.values(reg.recipes || reg)).filter(r => r && r.id).map(r => r.id));

test('packs: every game is a registered recipe with a template', () => {
  for (const [k, p] of Object.entries(packs)) { if (k.startsWith('_')) continue;
    for (const g of p.games) { assert.ok(ids.has(g), `${k}: ${g} not in recipes.json`); assert.ok(existsSync(new URL(`../templates/recipes/${g}.html`, import.meta.url)), `${k}: no template ${g}`); }
    assert.equal(new Set(p.games).size, p.games.length, `${k}: duplicate game`); }
});
test('packs: two 15-packs split distinct games; demos are 5 games taken from their full pack', () => {
  const [a, b] = [packs.action15.games, packs.brains15.games];
  assert.equal(a.length, 15); assert.equal(b.length, 15); assert.equal(new Set([...a, ...b]).size, 30);
  for (const k of ['action-demo', 'brains-demo']) { const d = packs[k]; assert.equal(d.games.length, 5); assert.ok(d.demo); for (const g of d.games) assert.ok(packs[d.full].games.includes(g), `${k}: ${g} not in ${d.full}`); }
});
