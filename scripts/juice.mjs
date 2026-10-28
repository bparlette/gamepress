// juice.mjs — a feel audit. Games that "look cheap" usually have thin feedback: few particles,
// one sound, no camera work, no tween. This scores every v2 game on the things a player feels.
//   node scripts/juice.mjs            # scoreboard, thinnest first
//   node scripts/juice.mjs --json     # machine readable
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = resolve(HERE, '../../hawk-main/brad-demos/g/_v2');

const count = (src, re) => (src.match(re) || []).length;
const uniq = (src, re) => new Set([...src.matchAll(re)].map(m => m[1]));

/* what a player actually feels, weighted */
const SIGNALS = [
  ['particles',  /g\.fx\.burst\(|g\.fx\.blast\(|g\.fx\.emit\(|g\.burst\(|g\.impact\(|g\.fx\.text\(/g, 3],
  ['camera',     /g\.shake\(|g\.punch\(|g\.cam\.scale|g\.impact\(/g,    3],
  ['hitstop',    /g\.hitstop\(|g\.slowmo\(/g,                        2],
  ['flash',      /g\.flash\(|g\.fx\.dust\(/g,                              1],
  ['popups',     /g\.popup\(|g\.showBanner\(/g,                      2],
  ['combo',      /g\.combo\.(hit|miss)|comboPitch/g,                 2],
  ['tweens',     /g\.tween\(|gsap\./g,                               1],
  ['parallax',   /parallax|skies|land/i,                             1],
];

const rows = [];
for (const d of readdirSync(V2, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const f = resolve(V2, d.name, 'game.js');
  if (!existsSync(f)) continue;
  const src = readFileSync(f, 'utf8');
  const kb = +(statSync(f).size / 1024).toFixed(1);

  const sig = {};
  let score = 0;
  for (const [name, re, w] of SIGNALS) {
    const n = name === 'parallax' ? (re.test(src) ? 1 : 0) : count(src, re);
    sig[name] = n;
    // log-ish so a game with 200 particles doesn't drown out the one with zero
    score += w * Math.min(6, Math.log2(1 + n));
  }

  const sfx = uniq(src, /sfx\(\s*'([a-z0-9_-]+)'/gi);
  const hasMusic = /music\(\s*'/.test(src);
  const hasBot = /isAuto|auto\b/.test(src);
  const hasTitle = /makeGame\(\{[\s\S]{0,400}?(title|hook):/.test(src);
  score += Math.min(6, sfx.size) * .8 + (hasMusic ? 1.5 : 0) + (hasBot ? 1 : 0) + (hasTitle ? 1 : 0);
  if (kb < 8) score -= 3;                       // a 6KB "game" is a prototype
  else if (kb < 14) score -= 1;

  rows.push({ id: d.name, kb, score: +score.toFixed(1), sfx: sfx.size, music: hasMusic, sig });
}

rows.sort((a, b) => a.score - b.score);
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

const AVG = rows.reduce((s, r) => s + r.score, 0) / (rows.length || 1);
for (const r of rows) {
  const flag = r.score < AVG * .72 ? 'THIN ' : r.score < AVG * .9 ? 'ok-  ' : 'RICH ';
  const s = r.sig;
  console.log(
    `${flag}${r.id.padEnd(22)} score=${String(r.score).padStart(5)} kb=${String(r.kb).padStart(5)} ` +
    `sfx=${String(r.sfx).padStart(2)}${r.music ? '+mus' : '    '} ` +
    `burst=${String(s.particles).padStart(3)} cam=${String(s.camera).padStart(2)} ` +
    `stop=${String(s.hitstop).padStart(2)} pop=${String(s.popups).padStart(2)} combo=${String(s.combo).padStart(2)}`);
}
console.log(`\n${rows.length} games, average ${AVG.toFixed(1)}`);
const thin = rows.filter(r => r.score < AVG * .72).map(r => r.id);
if (thin.length) console.log(`thinnest (fix these first): ${thin.join(', ')}`);
