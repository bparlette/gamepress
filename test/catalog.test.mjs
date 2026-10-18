// Every registered recipe needs a template and a row in the generated catalog (regenerate: node bin/gamepress.mjs recipes --md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(readFileSync(join(ROOT, 'presets', 'recipes.json'), 'utf8')).recipes;
const catalog = readFileSync(join(ROOT, 'docs', 'RECIPES-CATALOG.md'), 'utf8');
test('every registry recipe has a template and a catalog row', () => {
  for (const { id } of reg) {
    assert.ok(existsSync(join(ROOT, 'templates', 'recipes', id + '.html')), 'missing template: ' + id);
    assert.ok(catalog.includes('| `' + id + '`'), 'missing catalog row (run: node bin/gamepress.mjs recipes --md): ' + id);
  }
});
