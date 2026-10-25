// Kit for the "best of" viral cuts: turns a list of scenes (who shoots whom, which recorded line plays) into a
// director shot script. Video tooling only; nothing in web/ imports it.
//
// A scene is { killer, victim, line, head?, loadout?, caption?, map?, grenade? }:
//   killer / victim: faction ids   line: voice line id the killer says after the kill
// Each scene gets its own open duel spot on the map so a whole compilation runs in ONE sim.
//
// HOA_LANDSCAPE=1 renders 1920x1080 (long YouTube cut); default is vertical 1080x1920 (Shorts).
import { readFileSync } from 'node:fs';
import { buildMap, segmentClear } from '../../../../web/src/engine/map.js';

const root = new URL('../../../../', import.meta.url);
export const spec = JSON.parse(readFileSync(new URL('cuts.json', import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL(spec.paths.manifest, root))).lines;
const content = JSON.parse(readFileSync(new URL(spec.paths.content, root)));
export const FACTION_NAME = Object.fromEntries(Object.entries(content.factions).map(([k, f]) => [k, f.name]));
export const landscape = !!process.env.HOA_LANDSCAPE;
export const CTA = spec.cta;

const lineDur = id => manifest[id]?.duration ?? 1.6;
const hash = n => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };

/** Open duel spots on a map: [{ a: [x, z], b: [x, z] }], spread out, deterministic. */
export function duelSpots(mapId, count, gap = 7) {
  const map = buildMap(mapId), B = map.boxes;
  const free = (x, z) => !B.some(b => x > b.minX - 1.6 && x < b.maxX + 1.6 && z > b.minZ - 1.6 && z < b.maxZ + 1.6);
  const cands = [];
  for (let x = -36; x <= 36; x += 4) for (let z = -40; z <= 40; z += 4) {
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const bx = x + dx * gap, bz = z + dz * gap;
      if (free(x, z) && free(bx, bz) && free(x + dx * gap / 2, z + dz * gap / 2) && segmentClear(B, x, z, bx, bz, 0.5)) cands.push({ a: [x, z], b: [bx, bz] });
    }
  }
  cands.sort((p, q) => hash(p.a[0] * 131 + p.a[1] * 17 + p.b[0]) - hash(q.a[0] * 131 + q.a[1] * 17 + q.b[0]));
  const out = [];
  for (let sep = 22; sep >= 6 && out.length < count; sep -= 4) {
    for (const c of cands) {
      if (out.length >= count) break;
      if (out.every(o => Math.hypot(o.a[0] - c.a[0], o.a[1] - c.a[1]) >= sep)) out.push(c);
    }
  }
  if (out.length < count) throw new Error(`only ${out.length} duel spots on ${mapId}, need ${count}`);
  return out;
}

/** Build one script from scenes. opts: { name, map, hook, outro, seed, gapAfter } */
export function build(scenes, opts = {}) {
  const map = opts.map || 'culdesac';
  const spots = duelSpots(map, scenes.length);
  const actors = [], cues = [];
  let t = 0;
  if (opts.hook) cues.push({ t: 0, caption: opts.hook, style: 'center', for: opts.hookFor ?? 1.6 });
  scenes.forEach((s, i) => {
    let sp = spots[i];
    const k = `k${i}`, v = `v${i}`;
    if (s.grenade) { // the briefcase flies ~12.4 units before its fuse runs out: put the victim where it lands
      const dx = sp.b[0] - sp.a[0], dz = sp.b[1] - sp.a[1], n = Math.hypot(dx, dz);
      sp = { a: sp.a, b: [sp.a[0] + dx / n * 12.4, sp.a[1] + dz / n * 12.4] };
    }
    actors.push({ id: k, name: FACTION_NAME[s.killer], faction: s.killer, team: 0, pos: sp.a, face: sp.b, loadout: s.loadout || spec.defaultLoadout || 'default', hp: 500 });
    actors.push({ id: v, name: FACTION_NAME[s.victim], faction: s.victim, team: 1, pos: sp.b, face: sp.a, ...(s.victimHp ? { hp: s.victimHp } : {}) });
    const L = lineDur(s.line);
    const lead = s.hook ? 0 : 0.0;
    const side = i % 2 ? -1.5 : 1.5;
    const wide = landscape ? { back: 6.5, up: 3.4, side: side * 1.2 } : { back: 5.6, up: 3.3, side: side * 0.7 };
    cues.push({ t: t + lead, camera: { follow: k, ...wide, lookAt: v }, blend: i ? 0.25 : 0 });
    cues.push({ t: t + lead, caption: s.caption || `${FACTION_NAME[s.killer].toUpperCase()}`, for: 1.5 });
    cues.push({ t: t + 0.2, actor: k, aim: v });
    cues.push({ t: t + 0.55, camera: { follow: k, back: landscape ? 4.4 : 3.8, up: 2.5, side: side * 0.8, lookAt: v }, blend: 0.35 });
    if (s.grenade) cues.push({ t: t + 0.7, actor: k, grenade: true });
    else cues.push({ t: t + 0.8, actor: k, fire: v, head: !!s.head });
    const sayAt = t + (s.grenade ? 2.7 : s.sayDelay ?? 1.35);
    cues.push({ t: sayAt, actor: k, say: s.line });
    t = Math.max(t + 3.0, sayAt + L + 0.7);
  });
  if (opts.outro) cues.push({ t: t - 0.2, caption: opts.outro, style: 'center', for: opts.outroFor ?? 3.0 });
  const duration = Math.ceil((t + (opts.outro ? (opts.outroFor ?? 3.0) - 0.2 : 0.3)) * 2) / 2;
  return {
    name: opts.name, map, seed: opts.seed ?? 7, duration, fps: 30, actors, cues,
    ...(landscape ? { size: [1920, 1080] } : {}),
  };
}
