// gamepress catalog: add or update one game in a demo-page catalog (games.json with {categories, games[]}),
// and turn a still into the thumbnail the page shows. Generic: the field names match brad-demos/games.json but
// any JSON catalog with a `games` array works (use --thumbdir / --fields to adapt).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';

/** Insert or replace (by id) a game entry; adds the category if new. Returns the updated catalog object. */
export function upsertGame(catalog, entry) {
  catalog.games = catalog.games || [];
  catalog.categories = catalog.categories || [];
  if (entry.category && !catalog.categories.includes(entry.category)) catalog.categories.push(entry.category);
  const i = catalog.games.findIndex(g => g.id === entry.id);
  if (i >= 0) catalog.games[i] = { ...catalog.games[i], ...entry }; else catalog.games.push(entry);
  return catalog;
}

/** still (png/jpg) -> 16:9-ish webp thumbnail. Uses cwebp if present, otherwise ffmpeg's libwebp. */
export function makeThumb(still, out, { width = 480, height = 270, focus = [0.5, 0.5] } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-${width})*${focus[0]}:(ih-${height})*${focus[1]}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, '-vf', vf, '-c:v', 'libwebp', '-quality', '80', out]);
}

export function catalogCommand({ catalogPath, entry, still, thumbDir = 'thumbs' }) {
  const file = resolve(catalogPath);
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  if (still) {
    const rel = join(thumbDir, `${entry.id}.webp`);
    makeThumb(still, join(dirname(file), rel), { focus: [0.5, 0.45] });
    entry.thumb = `${rel}?v=${Math.floor(Date.now() / 1000)}`;
  }
  upsertGame(catalog, entry);
  writeFileSync(file, JSON.stringify(catalog, null, 1) + '\n');
  return catalog;
}
