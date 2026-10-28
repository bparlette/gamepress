// integrate.mjs — regenerate Cat Arcade v2 catalogue entries + the v2 hub page.
// Idempotent: run it as often as you like, it reads what actually exists on disk.
//
//   node scripts/integrate.mjs            # update games.json + g/_v2/index.html
//   node scripts/integrate.mjs --dry      # show what it would do
//
// Titles/subs/hooks are lifted straight out of each game's makeGame({ title, sub, hook })
// so the catalogue can never drift out of sync with the games themselves.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const V2 = resolve(DEMOS, 'g/_v2');
const DRY = process.argv.includes('--dry');

/* the canonical 30, in arcade order (cat-runner is our v2 bonus game, listed last) */
const ORDER = [
  'one-tap-reflex', 'stack-timing', 'bullet-heaven', 'card-roguelite', 'grid-chaser', 'hide-and-seek',
  'falling-blocks', 'ballistic-bouncer', 'arena-brawler', 'footsies-duel', 'slice-swipe', 'run-and-gun',
  'scrolling-shmup', 'precision-platformer', 'mini-metroidvania', 'mini-zelda', 'trajectory-artillery',
  'turn-based-3v3', 'micro-tower-defense', 'merge-sandbox', 'plinko-drop', 'ragdoll-launch', 'rope-cut',
  'obby-gauntlet', 'kart-racer', 'rail-runner', 'sort-puzzle', 'idle-tycoon', 'cozy-farm', 'daily-deduction',
  'cat-runner',
];

/* card art accents (emoji + gradient) — purely cosmetic, keyed by id */
const ART = {
  'one-tap-reflex': ['🐱', '#ff3b8d,#2a1b4d'], 'stack-timing': ['🏗️', '#ffd34d,#5a2668'],
  'bullet-heaven': ['💥', '#ff4d6d,#2a0f3a'], 'card-roguelite': ['🃏', '#b06bff,#141033'],
  'grid-chaser': ['🐍', '#7df9ff,#0b1f3a'], 'hide-and-seek': ['🙈', '#a6ff8f,#12321f'],
  'falling-blocks': ['🧱', '#ffd34d,#20223f'], 'ballistic-bouncer': ['🔴', '#ff3b5c,#27102a'],
  'arena-brawler': ['⚔️', '#ff8f3c,#2a1210'], 'footsies-duel': ['🥋', '#ff3b8d,#1b1338'],
  'slice-swipe': ['🍉', '#ff6b6b,#2a1b12'], 'run-and-gun': ['🔫', '#ffb347,#26140a'],
  'scrolling-shmup': ['🚀', '#7df9ff,#100a2e'], 'precision-platformer': ['🧗', '#8ef6ff,#1a2340'],
  'mini-metroidvania': ['🗝️', '#c08bff,#140f2e'], 'mini-zelda': ['🛡️', '#a6ff8f,#132a1c'],
  'trajectory-artillery': ['🎯', '#ffd34d,#2c1a10'], 'turn-based-3v3': ['🎲', '#ff9ad0,#1e1030'],
  'micro-tower-defense': ['🏰', '#7df9ff,#161a38'], 'merge-sandbox': ['🔀', '#ffd34d,#233014'],
  'plinko-drop': ['🪙', '#ffd34d,#2a1030'], 'ragdoll-launch': ['🦴', '#ff9a3c,#22101c'],
  'rope-cut': ['✂️', '#a6ff8f,#102a24'], 'obby-gauntlet': ['🔥', '#ff6b3c,#2a0f0f'],
  'kart-racer': ['🏎️', '#ff3b8d,#0c1440'], 'rail-runner': ['🚄', '#7df9ff,#0a1a3c'],
  'sort-puzzle': ['🧩', '#b06bff,#181033'], 'idle-tycoon': ['💰', '#ffd34d,#20300f'],
  'cozy-farm': ['🌱', '#a6ff8f,#1b3320'], 'daily-deduction': ['🔎', '#8fb8ff,#141b33'],
  'cat-runner': ['🏃', '#7df9ff,#1b2a6b'],
};

const meta = id => {
  const f = resolve(V2, id, 'game.js');
  let title = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), sub = '', hook = '';
  if (existsSync(f)) {
    const s = readFileSync(f, 'utf8');
    const grab = k => (s.match(new RegExp(`${k}:\\s*['"\`]([^'"\`]+)['"\`]`)) || [, ''])[1];
    title = grab('title') || title;
    sub = grab('sub'); hook = grab('hook');
  }
  return { title, sub, hook };
};

const built = readdirSync(V2, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js')))
  .map(d => d.name);
const ids = ORDER.filter(id => built.includes(id));
const missing = ORDER.filter(id => !built.includes(id));
const extra = built.filter(id => !ORDER.includes(id));

const stamp = id => {
  const t = resolve(DEMOS, 'thumbs', `${id}-v2.webp`);
  return existsSync(t) ? Math.floor(statSync(t).mtimeMs / 1000) : 0;
};

/* ---------------------------------------------------------------- games.json */
const gjPath = resolve(DEMOS, 'games.json');
const gj = JSON.parse(readFileSync(gjPath, 'utf8'));
const kept = gj.games.filter(g => g.category !== 'Cat Arcade v2');

const entries = ids.map(id => {
  const m = meta(id);
  const st = stamp(id);
  const isBonus = id === 'cat-runner';
  const note = m.hook
    ? `Cat Arcade v2${isBonus ? ' original' : ' rebuild'}: ${m.hook}. New engine — bloom, impact ripples, particle debris, camera punch, combo meter, layered synth audio.${isBonus ? '' : ` The untouched original is kept at g/_v1/${id}/.`}`
    : `Cat Arcade v2${isBonus ? ' original' : ' rebuild'} of ${id}.${isBonus ? '' : ` Original v1 kept at g/_v1/${id}/.`}`;
  return {
    id, title: `${m.title}${m.sub ? ' — ' + m.sub.toLowerCase().replace(/^tap\b/i, 'tap') : ''} (v2)`,
    category: 'Cat Arcade v2', keys: {}, labels: {}, autostart: [], orientation: 'portrait',
    path: `g/_v2/${id}/index.html`,
    thumb: st ? `thumbs/${id}-v2.webp?v=${st}` : `thumbs/${id}.webp`,
    note,
  };
});
/* the hub entry stays first in its category so it reads as the front door */
const hubIdx = gj.games.findIndex(g => g.category === 'Cat Arcade v2');
const hub = {
  id: 'cat-arcade-v2', title: 'CAT ARCADE V2 — v1 vs v2 comparison', category: 'Cat Arcade v2',
  keys: {}, labels: {}, autostart: [], orientation: 'portrait', path: 'g/_v2/index.html',
  thumb: `thumbs/${ids[0]}-v2.webp?v=${stamp(ids[0])}`,
  note: `Hub for the Cat Arcade v2 rebuild — ${ids.length} games on one shared runtime. Every card links to the rebuilt game and to the untouched original in g/_v1/ so you can A/B them.`,
};
const at = hubIdx < 0 ? gj.games.length : gj.games.filter(g => g.category !== 'Cat Arcade v2' && gj.games.indexOf(g) < hubIdx).length;
gj.games = [...kept.slice(0, at), hub, ...entries, ...kept.slice(at)];

/* ---------------------------------------------------------------- hub page */
/* The hub is hand-designed; this script must not clobber it. It only refreshes the
   built list and merges catalogue entries (keeping each game's genre + hook). */
const hubPath = resolve(V2, 'index.html');
let html = readFileSync(hubPath, 'utf8');
html = html.replace(/const V2_IDS = \[[\s\S]*?\];/, `const V2_IDS = ${JSON.stringify(ids)};`);

let cat = {};
const catM = html.match(/const META = (\{[\s\S]*?\n\};)/);
if (catM) { try { cat = JSON.parse(catM[1].slice(0, -1)); } catch (e) { console.log('⚠ could not parse the catalogue — entries left alone'); } }
for (const id of ids) {
  const m = meta(id), art = ART[id] || ['🐱', '#2a1b4d,#120c2c'];
  const prev = cat[id];
  cat[id] = prev
    ? [m.title, m.sub || m.hook || prev[1], art[0], art[1], prev[4] || 'Arcade', prev[5] || '']
    : [m.title, m.sub || m.hook || '', art[0], art[1], 'Arcade', ''];
}
const lines = Object.keys(cat).map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(cat[k])}`);
html = html.replace(/const META = \{[\s\S]*?\n\};/, `const META = {\n${lines.join(',\n')}\n};`);

console.log(`v2 games found: ${ids.length}/31${missing.length ? '\n  missing: ' + missing.join(', ') : ''}${extra.length ? '\n  extra:   ' + extra.join(', ') : ''}`);
for (const id of ids) { const m = meta(id); console.log(`  ${id.padEnd(22)} ${m.title}${m.sub ? ' · ' + m.sub : ''}${stamp(id) ? '' : '  (no thumbnail)'}`); }
if (DRY) { console.log('\n--dry: nothing written'); process.exit(0); }
writeFileSync(gjPath, JSON.stringify(gj, null, 2) + '\n');
writeFileSync(hubPath, html);
console.log(`\nwrote games.json (${entries.length} v2 entries + hub) and g/_v2/index.html`);
