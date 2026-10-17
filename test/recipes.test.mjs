// Syntax guard for the kit and every recipe template (a stray `//` inside a one-line statement once broke every 2D game).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), tmp = mkdtempSync(join(tmpdir(), 'gp-syntax-'));
const check = (name, code) => { const f = join(tmp, name + '.mjs'); writeFileSync(f, code); execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); };
test('kit files parse', () => { for (const f of readdirSync(join(ROOT, 'kit')).filter(f => f.endsWith('.js') && !f.includes('three'))) assert.doesNotThrow(() => check('kit-' + f, readFileSync(join(ROOT, 'kit', f), 'utf8')), f); });
test('recipe templates parse and are registered', () => {
  const reg = JSON.parse(readFileSync(join(ROOT, 'presets', 'recipes.json'), 'utf8')).recipes.map(r => r.id);
  for (const f of readdirSync(join(ROOT, 'templates', 'recipes')).filter(f => f.endsWith('.html'))) { const html = readFileSync(join(ROOT, 'templates', 'recipes', f), 'utf8'), m = html.match(/<script type="module">([\s\S]*?)<\/script>/); assert.ok(m, f + ' has a module script'); assert.doesNotThrow(() => check('tpl-' + f, m[1]), f); assert.ok(html.includes('/*SPEC*/ ...{} /*END*/'), f + ' has the SPEC marker'); }
  for (const id of reg) assert.ok(readdirSync(join(ROOT, 'templates', 'recipes')).includes(id + '.html'), 'registry recipe has a template: ' + id);
});
