// gamepress catalog: add or update one game in a demo-page catalog (games.json with {categories, games[]}),
// and turn a still into the thumbnail the page shows. Generic: the field names match brad-demos/games.json but
// any JSON catalog with a `games` array works (use --thumbdir / --fields to adapt).
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
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

/** still (png/jpg) -> 16:9-ish webp thumbnail. Uses cwebp if present, otherwise ffmpeg's libwebp (many ffmpeg builds lack it). */
export function makeThumb(still, out, { width = 480, height = 270, focus = [0.5, 0.5] } = {}) {
  mkdirSync(dirname(out), { recursive: true });
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-${width})*${focus[0]}:(ih-${height})*${focus[1]}`;
  try { // cwebp reads PNG/JPEG/WebP; scale+crop to a PNG first, then encode (ffmpeg builds often lack libwebp)
    const tmp = out + '.tmp.png';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, '-vf', vf, tmp]);
    execFileSync('cwebp', ['-quiet', '-q', '80', tmp, '-o', out]);
    unlinkSync(tmp);
  } catch (e) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, '-vf', vf, '-c:v', 'libwebp', '-quality', '80', out]);
  }
}

export function catalogCommand({ catalogPath, entry, still, thumbDir = 'thumbs', video }) {
  const file = resolve(catalogPath);
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  if (still) {
    const rel = join(thumbDir, `${entry.id}.webp`);
    makeThumb(still, join(dirname(file), rel), { focus: [0.5, 0.45] });
    entry.thumb = `${rel}?v=${Math.floor(Date.now() / 1000)}`;
  }
  if (video) {
    const rel = join('videos', `${entry.id}-hook.mp4`);
    makeVideoPreview(video, join(dirname(file), rel));
    entry.video = `${rel}?v=${Math.floor(Date.now() / 1000)}`;
  }
  upsertGame(catalog, entry);
  // escape non-ASCII like Python's json.dump(ensure_ascii=True), which this catalog was written with: keeps diffs small
  writeFileSync(file, JSON.stringify(catalog, null, 1).replace(/[\u0080-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '\n');
  return catalog;
}

/** hook mp4 -> small muted preview for the demo page (480px wide, ~800kbps, no audio). */
export function makeVideoPreview(src, out) {
  mkdirSync(dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=480:-2', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '800k', '-maxrate', '1000k', '-bufsize', '2000k',
    '-movflags', '+faststart', out]);
}

/** Remove a game (e.g. a renamed id) and its thumbnail file from a catalog. */
export function removeGame(catalogPath, id, thumbDir = 'thumbs') {
  const file = resolve(catalogPath), c = JSON.parse(readFileSync(file, 'utf8')); c.games = (c.games || []).filter(g => g.id !== id);
  writeFileSync(file, JSON.stringify(c, null, 1).replace(/[\u0080-\uffff]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')) + '\n');
  try { unlinkSync(join(dirname(file), thumbDir, `${id}.webp`)); } catch {}
  try { unlinkSync(join(dirname(file), 'videos', `${id}-hook.mp4`)); } catch {}
}
