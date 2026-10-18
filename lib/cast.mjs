// gamepress cast <id>: copy a cast (characters + voice barks) into <games>/_cast/<id>/ and write its manifest.
// Presets live in presets/casts/<id>.json. Source art/voices are read from a repo path given by --source or $HOA_WARFARE_DIR (never committed here).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const loadCast = id => { const f = join(ROOT, 'presets', 'casts', id + '.json'); if (!existsSync(f)) throw new Error(`cast: no presets/casts/${id}.json`); return JSON.parse(readFileSync(f, 'utf8')); };

/** Copy art + clean voice clips for `factions` (default: all) into <games>/_cast/<id>/ and write cast.json. Returns counts. */
export function buildCast(id, { games, source = process.env.HOA_WARFARE_DIR, factions } = {}) {
  const cast = loadCast(id);
  if (!source || !existsSync(source)) throw new Error('cast: set HOA_WARFARE_DIR (or --source) to the folder with the character art and voice clips');
  const out = join(games, '_cast', id), img = join(out, 'img'), vo = join(out, 'vo'); mkdirSync(img, { recursive: true }); mkdirSync(vo, { recursive: true });
  const wanted = factions?.length ? cast.factions.filter(f => factions.includes(f.id)) : cast.factions;
  const voDir = dirname(join(source, cast.source.voices)), voFiles = existsSync(voDir) ? readdirSync(voDir) : [];
  const manifest = { id, label: cast.label, events: cast.events, factions: {} }; let clips = 0, silent = [];
  const allCats = new Set();
  for (const v of Object.values(cast.events)) {
    if (Array.isArray(v)) v.forEach(k => allCats.add(k));
    else allCats.add(v);
  }
  for (const f of wanted) {
    const png = join(source, cast.source.images.replace('{id}', f.id)); if (!existsSync(png)) { silent.push(f.id + ' (no art, skipped)'); continue; }
    copyFileSync(png, join(img, f.id + '.png'));
    const map = {}, prefix = f.vo || f.id;
    for (const cat of allCats) {
      const re = new RegExp(`^${prefix}_${cat}_c_\\d+\\.ogg$`), hit = voFiles.filter(x => re.test(x)).sort();
      for (const x of hit) copyFileSync(join(voDir, x), join(vo, x)); if (hit.length) { map[cat] = hit; clips += hit.length; }
    }
    if (!Object.keys(map).length) silent.push(f.id + ' (no voice)');
    manifest.factions[f.id] = { name: f.name, tier: f.tier, color: f.color, blurb: f.blurb, img: `img/${f.id}.png`, vo: map };
  }
  writeFileSync(join(out, 'cast.json'), JSON.stringify(manifest));
  return { cast: id, factions: Object.keys(manifest.factions).length, clips, silent, path: out };
}
