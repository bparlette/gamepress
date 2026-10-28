#!/usr/bin/env node
// tools/find_sprites.mjs: Search local workspace, cache, and repositories for sprite sheets & atlases.
// Usage: node tools/find_sprites.mjs [query]
import fs from 'node:fs';
import path from 'node:path';

const query = (process.argv[2] || '').toLowerCase();
const scratchDir = '/Users/braidpairlette/.gemini/antigravity/scratch';
const roots = [
  path.join(scratchDir, 'hawk-main/games'),
  path.join(scratchDir, 'hawk-pub/games'),
  path.join(scratchDir, 'gamepress/games'),
  path.join(scratchDir, 'street-fighter-arcade/assets'),
  path.join(scratchDir, 'hoa-warfare/web/assets')
];

const matches = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && !['node_modules', '.git'].includes(ent.name)) {
        scan(full);
      } else if (ent.isFile() && (ent.name.endsWith('.png') || ent.name.endsWith('.jpg'))) {
        const isSprite = ent.name.includes('sheet') || ent.name.includes('atlas') || ent.name.includes('sprite');
        if (isSprite || query) {
          if (!query || ent.name.toLowerCase().includes(query)) {
            matches.push({ name: ent.name, path: full, size: fs.statSync(full).size });
          }
        }
      }
    }
  } catch {}
}

for (const r of roots) scan(r);

console.log(`\n🔍 Found ${matches.length} matching sprite sheet(s)/atlas(es):`);
for (const m of matches.slice(0, 30)) {
  console.log(`  • ${m.name.padEnd(28)} ${(m.size / 1024).toFixed(1)} KB  -> ${m.path}`);
}
if (matches.length > 30) {
  console.log(`  ... and ${matches.length - 30} more.`);
}
