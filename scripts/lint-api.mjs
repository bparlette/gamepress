// lint-api.mjs — catch invented engine APIs before the browser does.
// `g.onPoint is not a function` is a 30-second bug to fix and an hour to find;
// this finds it in milliseconds across every game.
//
//   node scripts/lint-api.mjs [id ...]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { lintFile, lintImports } from './_api.mjs';
import { resolve } from 'node:path';

const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const V2 = resolve(DEMOS, 'g/_v2');
const KIT = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/kit');

import { engineApi } from './_api.mjs';
const api = engineApi();

const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(V2, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js'))).map(d => d.name).sort();

let bad = 0;
for (const id of ids) {
  const src = readFileSync(resolve(V2, id, 'game.js'), 'utf8');
  /* the engine owns these globals with getters — assigning them throws at boot */
  const owned = [];
  for (const m of src.matchAll(/^\s*(window\.(?:__game))\s*=[^=]/gm))
    owned.push({ line: src.slice(0, m.index).split('\n').length, msg: `${m[1]} is owned by the engine — assigning it throws a TypeError` });
  const problems = lintFile(src, api).map(p => `${p.line}: ${p.msg}`)
    .concat(owned.map(p => `${p.line}: ${p.msg}`))
    .concat(lintImports(src).map(p => `${p.line}: ${p.msg}`));
  /* contract musts */
  if (!/\bg\.end\s*\(/.test(src)) problems.push('never calls g.end() — the round can never finish');
  if (!/\bonReset\b/.test(src)) problems.push('no g.onReset — a second attempt would inherit stale state');
  if (problems.length) {
    bad++;
    console.log(`✖ ${id}`);
    [...new Set(problems)].slice(0, 12).forEach(p => console.log('    ' + p));
  } else console.log(`✔ ${id}`);
}
console.log(`\n${ids.length - bad}/${ids.length} clean`);
process.exit(bad ? 1 : 0);
