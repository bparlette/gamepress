// Turns cuts.json chapters into director scripts. No content lives here: edit cuts.json.
// Chapter fields: scenes[], map, seed, hook / outro ({short, long} or a string; "cta" = spec.cta; null = none),
// hookFor; type "features" = orbit camera + caption cards (items[], stage[2 factions]).
import { build, spec, landscape, CTA } from './_kit.mjs';

const text = v => { if (v && typeof v === 'object') v = v[landscape ? 'long' : 'short']; return v === 'cta' ? CTA : v ?? null; };

function features(name, c) {
  const per = 2.4, hook = text(c.hook), cues = [{ t: 0, camera: { orbit: [0, 0], radius: 26, height: 12, speed: 0.12 } }];
  if (hook) cues.push({ t: 0, caption: hook, style: 'center', for: 2.2 });
  c.items.forEach((f, i) => cues.push({ t: 2.4 + i * per, caption: f, style: 'center', for: per - 0.1 }));
  const t = 2.4 + c.items.length * per, outro = text(c.outro);
  if (outro) cues.push({ t, caption: outro, style: 'center', for: 3.2 });
  const [a, b] = c.stage || Object.keys(spec.chapters.hero.scenes[0] ? { [spec.chapters.hero.scenes[0].killer]: 1, [spec.chapters.hero.scenes[0].victim]: 1 } : {});
  return {
    name, map: c.map || 'culdesac', seed: c.seed ?? 7, duration: Math.ceil(t + (outro ? 3.4 : 0.5)), fps: 30, subtitles: false,
    actors: [{ id: 'a', faction: a, team: 0, pos: [0, 30], face: [0, 0] }, { id: 'b', faction: b, team: 1, pos: [0, -30], face: [0, 0] }],
    cues, ...(landscape ? { size: [1920, 1080] } : {}),
  };
}

export const chapter = name => {
  const c = spec.chapters[name];
  if (!c) throw new Error(`unknown chapter "${name}" (have: ${Object.keys(spec.chapters).join(', ')})`);
  if (c.type === 'features') return features(name, c);
  return build(c.scenes, { name, map: c.map, seed: c.seed, hook: text(c.hook), hookFor: c.hookFor, outro: text(c.outro) });
};
