// qa-all.mjs — run the full quality gate over every Cat Arcade v2 game, N shards wide.
//   node scripts/qa-all.mjs              # every game found on disk
//   node scripts/qa-all.mjs --par 4      # 4 Chrome instances in parallel (default 3)
//   node scripts/qa-all.mjs id1 id2      # just these
// Prints a per-game line and a final scoreboard, exits non-zero if anything fails.
import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = resolve(HERE, '../../hawk-main/brad-demos/g/_v2');
const argv = process.argv.slice(2);
const parIdx = argv.indexOf('--par');
const PAR = parIdx >= 0 ? +argv[parIdx + 1] : 3;
const ids = argv.filter((a, i) => !a.startsWith('--') && i !== parIdx + 1);

const all = ids.length ? ids : readdirSync(V2, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js')))
  .map(d => d.name).sort();
if (!all.length) { console.error('no games found'); process.exit(2); }

const shards = Array.from({ length: Math.min(PAR, all.length) }, (_, i) => all.filter((_, j) => j % PAR === i));
console.log(`running ${all.length} games across ${shards.length} shards…\n`);

const run = list => new Promise(res => {
  const p = spawn(process.execPath, [resolve(HERE, 'qa.mjs'), ...list], {
    cwd: resolve(HERE, '..'), env: { ...process.env, BOTSECS: process.env.BOTSECS || '45' },
  });
  let out = '';
  const grab = d => {
    const t = String(d); out += t;
    for (const l of t.split('\n')) if (/^(PASS|FAIL|\s+err:)/.test(l)) console.log(l);   // stream results as they land
  };
  p.stdout.on('data', grab);
  p.stderr.on('data', grab);
  p.on('close', () => res(out));
});

const outs = await Promise.all(shards.map(run));
const lines = [];
for (const o of outs) for (const l of o.split('\n')) if (/^(PASS|FAIL)/.test(l)) lines.push(l);
lines.sort();
lines.forEach(l => console.log(l));
const fails = lines.filter(l => l.startsWith('FAIL'));
console.log(`\n${lines.length - fails.length}/${lines.length} pass`);
if (fails.length) { console.log('\nneeds work: ' + fails.map(l => l.slice(6, 28).trim()).join(', ')); process.exit(1); }
