// gphero3d: one entry point for the 3D hero character. buildHero(kind, color, opts) -> THREE.Group, feet at y=0,
// ~1.2 tall (cat-sized, so recipes keep their own scale), facing +z. Every hero kind builds something (no throws):
// cat/dog/zombie/person/car use the gpkit merged geos, bunny uses the gpchar rig, the rest are small merged-part
// figures with a distinguishing accessory. White parts take `color`; fixed parts keep their own colour.
import { THREE as T } from './gp3d.js';
import { build, hero, catGeo, dogGeo, zombieGeo, personGeo, carGeo } from './gpkit.js';
import { buildBunny, updateCritter } from './gpchar.js';

const D = 0x151515, W = 0xffffff, ORANGE = 0xffa21a, PINK = 0xff9fb0;
const eyes = (y, z, x = .13, s = .1, c = D) => [-1, 1].map(k => ({ g: 'sphere', s: [s, s * 1.3, s * .6], p: [k * x, y, z], c }));
const legs4 = (x, zf, zb, h = .35, w = .16, c) => [[-x, zf], [x, zf], [-x, zb], [x, zb]].map(([a, z]) => ({ g: 'cyl', s: [w, h, w], p: [a, h / 2, z], c }));
const legs2 = (x, h, w, c) => [-1, 1].map(k => ({ g: 'cyl', s: [w, h, w], p: [k * x, h / 2, 0], c }));

/** part lists per kind (colour undefined = tinted). Each returns { parts, size } where size scales the group. */
const KINDS = {
  robot: () => ({ def: 0x9aa3ad, k: .72, parts: [
    { g: 'box', s: [.6, .72, .4], p: [0, 1.15, 0] }, { g: 'box', s: [.5, .46, .44], p: [0, 1.72, 0], c: 0xc4cbd3 }, { g: 'box', s: [.42, .12, .06], p: [0, 1.74, .24], c: 0x35e0ff },
    { g: 'cyl', s: [.04, .4, .04], p: [0, 2.15, 0], c: 0x555b66 }, { g: 'sphere', s: [.13, .13, .13], p: [0, 2.38, 0], c: 0xff3b3b },
    { g: 'box', s: [.14, .6, .14], p: [-.4, 1.2, 0], c: 0x555b66 }, { g: 'box', s: [.14, .6, .14], p: [.4, 1.2, 0], c: 0x555b66 }, { g: 'box', s: [.2, .12, .06], p: [0, 1.2, .21], c: 0xffd34d },
    ...legs2(.16, .78, .2, 0x555b66)] }),
  alien: () => ({ def: 0x7fe07a, k: .78, parts: [
    { g: 'sphere', s: [.5, .62, .36], p: [0, 1.0, 0] }, { g: 'sphere', s: [.8, .72, .7], p: [0, 1.65, 0] },
    ...[-1, 1].map(k => ({ g: 'sphere', s: [.26, .38, .12], p: [k * .22, 1.68, .3], r: [0, 0, k * .4], c: D })),
    ...[-1, 1].flatMap(k => [{ g: 'cyl', s: [.03, .4, .03], p: [k * .2, 2.15, 0], r: [0, 0, -k * .35] }, { g: 'sphere', s: [.1, .1, .1], p: [k * .3, 2.35, 0], c: 0xffe14d }]),
    { g: 'cyl', s: [.08, .6, .08], p: [-.34, .95, 0] }, { g: 'cyl', s: [.08, .6, .08], p: [.34, .95, 0] }, ...legs2(.13, .6, .12)] }),
  ghost: () => ({ def: 0xf4f7ff, k: .8, parts: [
    { g: 'sphere', s: [.95, .95, .95], p: [0, 1.25, 0] }, { g: 'cyl', s: [.9, .8, .9], p: [0, .6, 0] },
    ...[-.3, 0, .3].map(x => ({ g: 'sphere', s: [.3, .28, .3], p: [x, .2, 0] })),
    ...eyes(1.35, .42, .2, .16), { g: 'sphere', s: [.14, .1, .06], p: [0, 1.1, .44], c: D }, ...[-1, 1].map(k => ({ g: 'sphere', s: [.18, .1, .06], p: [k * .3, 1.2, .43], c: PINK }))] }),
  shark: () => ({ def: 0x6aa6c8, k: .7, parts: [
    { g: 'sphere', s: [.8, .8, 1.7], p: [0, .6, 0] }, { g: 'sphere', s: [.62, .3, 1.3], p: [0, .38, .1], c: 0xf0f6fa },
    { g: 'cone', s: [.3, .75, .5], p: [0, 1.3, -.05], r: [-.25, 0, 0] }, { g: 'cone', s: [.22, .8, .4], p: [0, .85, -.95], r: [.5, 0, 0] },
    ...[-1, 1].flatMap(k => [{ g: 'cone', s: [.1, .5, .3], p: [k * .5, .4, .3], r: [0, 0, k * 1.2] }, ...eyes(.82, .62, .27, .08)].slice(0, 1)), ...eyes(.82, .62, .27, .09),
    ...[-.2, -.07, .07, .2].map(x => ({ g: 'cone', s: [.07, .12, .05], p: [x, .42, .86], r: [Math.PI, 0, 0], c: 0xffffff })), { g: 'box', s: [.5, .06, .05], p: [0, .46, .84], c: 0x7a1f2b }] }),
  dino: () => ({ def: 0x56c271, k: .75, parts: [
    { g: 'sphere', s: [.8, .85, 1.2], p: [0, .85, 0] }, { g: 'sphere', s: [.6, .55, .8], p: [0, 1.5, .55] }, { g: 'box', s: [.4, .28, .45], p: [0, 1.42, 1.0] },
    ...eyes(1.62, .8, .22, .1), ...[-1, 1].map(k => ({ g: 'sphere', s: [.04, .05, .03], p: [k * .08, 1.5, 1.24], c: D })),
    { g: 'cone', s: [.5, 1.4, .5], p: [0, .78, -1.0], r: [Math.PI / 2 + .25, 0, 0] },
    ...[0, 1, 2, 3].map(i => ({ g: 'cone', s: [.2, .3, .2], p: [0, 1.4 - i * .03, .3 - i * .35], c: 0xffb23c })),
    { g: 'box', s: [.1, .3, .1], p: [-.4, .95, .5], c: 0x3d9a55 }, { g: 'box', s: [.1, .3, .1], p: [.4, .95, .5], c: 0x3d9a55 }, ...legs2(.25, .5, .25)] }),
  frog: () => ({ def: 0x5fd35a, k: .9, parts: [
    { g: 'sphere', s: [.9, .65, 1.0], p: [0, .42, 0] }, { g: 'sphere', s: [.85, .5, .7], p: [0, .5, .35] },
    ...[-1, 1].flatMap(k => [{ g: 'sphere', s: [.3, .3, .3], p: [k * .27, .85, .45] }, { g: 'sphere', s: [.16, .16, .1], p: [k * .27, .88, .6], c: D }, { g: 'sphere', s: [.12, .2, .45], p: [k * .5, .17, -.2] }, { g: 'sphere', s: [.18, .1, .3], p: [k * .35, .06, .6] }]),
    { g: 'box', s: [.6, .05, .06], p: [0, .45, .7], c: 0x2c6e2c }, { g: 'sphere', s: [.5, .12, .4], p: [0, .12, .1], c: 0xdff7c4 }] }),
  duck: () => ({ def: 0xffe14d, k: .9, parts: [
    { g: 'sphere', s: [.8, .65, 1.0], p: [0, .5, 0] }, { g: 'sphere', s: [.5, .5, .5], p: [0, 1.05, .3] }, { g: 'box', s: [.3, .1, .36], p: [0, 1.0, .62], c: ORANGE }, ...eyes(1.12, .5, .15, .08),
    { g: 'sphere', s: [.2, .25, .45], p: [-.4, .55, -.05], r: [0, 0, .3] }, { g: 'sphere', s: [.2, .25, .45], p: [.4, .55, -.05], r: [0, 0, -.3] }, { g: 'cone', s: [.25, .3, .2], p: [0, .7, -.55], r: [-1.1, 0, 0] },
    ...[-1, 1].map(k => ({ g: 'box', s: [.2, .06, .3], p: [k * .18, .03, .08], c: ORANGE }))] }),
  penguin: () => ({ def: 0x2a3550, k: .85, parts: [
    { g: 'sphere', s: [.85, 1.05, .7], p: [0, .7, 0] }, { g: 'sphere', s: [.6, .85, .4], p: [0, .66, .22], c: 0xffffff }, { g: 'sphere', s: [.58, .55, .55], p: [0, 1.3, .03] },
    { g: 'cone', s: [.16, .24, .16], p: [0, 1.25, .36], r: [Math.PI / 2, 0, 0], c: ORANGE }, ...eyes(1.38, .27, .14, .09, 0xffffff), ...eyes(1.38, .31, .14, .05),
    ...[-1, 1].map(k => ({ g: 'sphere', s: [.12, .55, .3], p: [k * .48, .75, 0], r: [0, 0, k * .3] })), ...[-1, 1].map(k => ({ g: 'box', s: [.24, .06, .34], p: [k * .2, .03, .1], c: ORANGE }))] }),
  capybara: () => ({ def: 0xa87a4c, k: .85, parts: [
    { g: 'sphere', s: [.8, .7, 1.4], p: [0, .55, -.05] }, { g: 'box', s: [.5, .46, .55], p: [0, .8, .72] }, { g: 'sphere', s: [.46, .4, .5], p: [0, .78, .75] },
    { g: 'sphere', s: [.16, .12, .1], p: [0, .78, 1.02], c: D }, ...eyes(.95, .88, .2, .07), ...[-1, 1].map(k => ({ g: 'sphere', s: [.12, .12, .08], p: [k * .2, 1.06, .55], c: 0x7a5530 })),
    ...legs4(.25, .45, -.45, .3, .2, 0x8a6238)] }),
  axolotl: () => ({ def: 0xff9fc0, k: .85, parts: [
    { g: 'sphere', s: [.7, .6, 1.2], p: [0, .4, 0] }, { g: 'sphere', s: [.7, .55, .6], p: [0, .5, .6] }, ...eyes(.62, .85, .26, .09),
    ...[-1, 1].flatMap(k => [-1, 0, 1].map(i => ({ g: 'cone', s: [.1, .4, .1], p: [k * .46, .6 + i * .14, .6], r: [0, 0, -k * (1.1 + i * .25)], c: 0xff5d8f }))),
    { g: 'sphere', s: [.3, .04, .06], p: [0, .38, .88], c: 0xb0405f }, { g: 'sphere', s: [.18, .5, 1.2], p: [0, .45, -.9], c: 0xff7aa8 },
    ...legs4(.3, .35, -.35, .22, .14)] }),
  panda: () => ({ def: 0xffffff, k: .85, parts: [
    { g: 'sphere', s: [.9, .8, 1.0], p: [0, .6, 0] }, { g: 'sphere', s: [.7, .6, .6], p: [0, 1.2, .25] },
    ...[-1, 1].flatMap(k => [{ g: 'sphere', s: [.24, .24, .16], p: [k * .3, 1.55, .15], c: D }, { g: 'sphere', s: [.2, .24, .1], p: [k * .18, 1.28, .52], c: D }, { g: 'sphere', s: [.07, .07, .05], p: [k * .18, 1.3, .56], c: W }]),
    { g: 'sphere', s: [.12, .08, .08], p: [0, 1.16, .58], c: D }, { g: 'sphere', s: [.9, .22, .4], p: [0, .75, .05], c: D },
    ...legs4(.3, .35, -.3, .32, .24, D)] }),
};

const KIND_ALIAS = { human: 'person', man: 'person', kid: 'person', boy: 'person', girl: 'person', hero: 'person', kitten: 'cat', puppy: 'dog', rabbit: 'bunny', auto: 'car', truck: 'car', racecar: 'car', droid: 'robot', bot: 'robot', dinosaur: 'dino', trex: 'dino', fish: 'shark', duckling: 'duck', bird: 'duck' };
const DEFAULT_COLOR = { cat: 0xff9a3c, dog: 0xc98a4b, bunny: 0xf5f0e8, person: 0x3a6ea5, zombie: 0x8fcf7a, car: 0xe63946 };
export const HERO_KINDS = ['cat', 'dog', 'bunny', 'person', 'zombie', 'car', ...Object.keys(KINDS)];

const toHex = c => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
const carParts = () => [
  { g: 'box', s: [1.9, .55, 4.2], p: [0, .7, 0] }, { g: 'box', s: [1.7, .5, 2.2], p: [0, 1.2, -.2] }, { g: 'box', s: [1.55, .36, 1.9], p: [0, 1.22, -.2], c: 0x20303f },
  { g: 'box', s: [1.95, .12, .5], p: [0, .5, 2.05], c: 0x222222 }, { g: 'box', s: [.45, .22, .08], p: [-.62, .8, 2.11], c: 0xfff3a0 }, { g: 'box', s: [.45, .22, .08], p: [.62, .8, 2.11], c: 0xfff3a0 },
  { g: 'box', s: [.45, .2, .08], p: [-.62, .8, -2.11], c: 0xff2b2b }, { g: 'box', s: [.45, .2, .08], p: [.62, .8, -2.11], c: 0xff2b2b },
  ...[[-1, 1.35], [1, 1.35], [-1, -1.35], [1, -1.35]].flatMap(([x, z]) => [{ g: 'cyl', s: [.85, .45, .85], p: [x * .98, .42, z], r: [0, 0, Math.PI / 2], c: 0x141414 }, { g: 'cyl', s: [.45, .5, .45], p: [x * 1.0, .42, z], r: [0, 0, Math.PI / 2], c: 0xcfd6dd }])];

/** buildHero(kind, color, opts): THREE.Group (feet at origin, ~1.2 tall, faces +z). opts.outline = hull thickness (default .03). userData.kind = resolved kind. */
export function buildHero(kind = 'cat', color, opts = {}) {
  let k = String(kind || 'cat').toLowerCase().trim(); k = KIND_ALIAS[k] || k;
  const outline = opts.outline ?? .03, g = new T.Group(); let col = color == null ? undefined : toHex(color);
  try {
    if (k === 'bunny') { const b = buildBunny({ fur: col ?? DEFAULT_COLOR.bunny }); g.add(b.group); g.userData.rig = b; }
    else {
      let geo, sc = 1, def = DEFAULT_COLOR[k];
      if (k === 'cat') geo = catGeo(); else if (k === 'dog') geo = dogGeo(); else if (k === 'zombie') { geo = zombieGeo(); sc = .68; } else if (k === 'person') { geo = personGeo(); sc = .7; }
      else if (k === 'car') { geo = build(carParts()); sc = .4; } else { const spec = (KINDS[k] || KINDS.robot)(); geo = build(spec.parts); sc = spec.k; def = spec.def; if (!KINDS[k]) k = 'robot'; }
      const m = hero(geo, col ?? def ?? 0xffffff, outline); m.scale.setScalar(sc); g.add(m);
      if (k === 'ghost') g.userData.float = true;
    }
  } catch (e) { const m = hero(catGeo(), col ?? 0xff9a3c, outline); g.add(m); k = 'cat'; }
  g.userData.kind = k; g.userData.t = 0; return g;
}

/** animate(hero, dt, mode): optional life. mode 'idle' | 'run' | 'hop'. Bunny uses the gpchar rig; others bob/squash their body. Visual only. */
export function animate(h, dt, mode = 'idle') {
  const u = h.userData; u.t += dt;
  if (u.rig) { updateCritter(u.rig, dt, mode === 'run' ? 'hop' : mode); return h; }
  const b = h.children[0]; if (!b) return h; const s0 = b.userData.s0 ?? (b.userData.s0 = b.scale.x);
  const run = mode === 'run' || mode === 'hop'; b.position.y = u.float ? .15 + Math.sin(u.t * 3) * .12 : run ? Math.abs(Math.sin(u.t * 12)) * .06 : 0;
  b.scale.set(s0 * (1 + Math.sin(u.t * (run ? 12 : 2.2)) * .02), s0 * (1 - Math.sin(u.t * (run ? 12 : 2.2)) * .02), s0); return h;
}

// Runtime hero override (hub pages): ?hero=<kind>&heroColor=<#rrggbb>. Unknown kind / bad colour are ignored.
const _q = () => { try { return new URLSearchParams(globalThis.location?.search || ''); } catch (e) { return new URLSearchParams(''); } };
export const urlHero = (specKind) => { const k = _q().get('hero'); return k && HERO_KINDS.includes(k) ? k : (specKind || 'cat'); };
export const urlHeroColor = (specColor) => { const v = _q().get('heroColor'); return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : specColor; };
