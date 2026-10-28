// hub.mjs — keep the Cat Arcade hub honest: the V2 list it shows is derived from what is
// actually built on disk, and every game gets a title/tagline/genre entry.
//   node scripts/hub.mjs            # sync the hub + report
//   node scripts/hub.mjs --check    # exit 1 if the hub is stale (for CI)
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = resolve(HERE, '../../hawk-main/brad-demos/g/_v2');
const HUB = resolve(V2, 'index.html');

const ids = readdirSync(V2, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js')))
  .map(d => d.name).sort();

let html = readFileSync(HUB, 'utf8');
const line = `const V2_IDS = [${ids.map(i => `"${i}"`).join(',')}];`;
const next = html.replace(/const V2_IDS = \[[^\]]*\];/, line);

if (next === html) console.log(`hub already current — ${ids.length} games`);
else { writeFileSync(HUB, next); console.log(`hub updated — ${ids.length} games: ${ids.join(', ')}`); }

// flag catalogue entries for games that shipped without a META line
const missing = ids.filter(id => !new RegExp(`"${id}"\\s*:\\s*\\[`).test(next));
if (missing.length) console.log(`⚠ no catalogue entry (they fall back to the raw id): ${missing.join(', ')}`);

if (process.argv.includes('--check')) process.exit(next === html ? 0 : 1);
