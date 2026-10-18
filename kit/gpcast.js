// gpcast: a "cast" swaps the hero for a character image and adds voice barks (see docs/CAST.md, lib/cast.mjs).
// Hero kind string: cast:<castId>:<factionId>. Files live in <games>/_cast/<castId>/ (this file sits in <games>/_vendor/).
// Voices play only when the hero is a cast kind and the page is not a capture run (?auto / ?clean) or ?mute.
const BASE = new URL('../_cast/', import.meta.url).href;
const Q = (() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(''); } })();
export const isCast = k => typeof k === 'string' && k.startsWith('cast:');
const parse = k => { const [, cast, f] = k.split(':'); return { cast, f }; };

const art = {}; // kind -> { img, box, ready }
export function castArt(kind) {
  if (art[kind]) return art[kind];
  const { cast, f } = parse(kind), a = art[kind] = { img: new Image(), box: null, ready: false, cb: [] };
  a.img.onload = () => { // tight alpha bounds so the figure fills the requested height
    const w = a.img.naturalWidth, h = a.img.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(a.img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    a.box = x1 > x0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : { x: 0, y: 0, w, h }; a.ready = true; a.cb.splice(0).forEach(fn => fn(a));
  };
  a.img.src = `${BASE}${cast}/img/${f}.png`; return a;
}
export const onArt = (kind, fn) => { const a = castArt(kind); a.ready ? fn(a) : a.cb.push(fn); };

/** 2D: feet at (x,y), `h` px tall, facing o.dir; o.anim 'walk' bobs. Same signature as the gpsprites characters. */
export function drawCast(c, kind, x, y, h, o = {}) {
  const a = castArt(kind); if (!a.ready) return; const s = h / a.box.h, bob = o.anim === 'walk' ? Math.abs(Math.sin((o.t || 0) * 14)) * h * .04 : 0;
  c.save(); c.translate(x, y - bob); c.scale((o.dir || 1) * s, s); if (o.anim === 'walk') c.rotate(Math.sin((o.t || 0) * 14) * .05);
  c.drawImage(a.img, a.box.x, a.box.y, a.box.w, a.box.h, -a.box.w / 2, -a.box.h, a.box.w, a.box.h); c.restore();
}
/** Round portrait (head crop) centred at (x,y), radius r. */
export function faceCast(c, kind, x, y, r) {
  const a = castArt(kind); c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#ffffffcc'; c.fill(); c.clip();
  if (a.ready) { const side = Math.min(a.box.w, a.box.h * .34); c.drawImage(a.img, a.box.x + (a.box.w - side) / 2, a.box.y, side, side, x - r, y - r, r * 2, r * 2); }
  c.restore(); c.beginPath(); c.arc(x, y, r, 0, 7); c.lineWidth = Math.max(2, r / 8); c.strokeStyle = '#151515'; c.stroke();
}

// ---- voices
const KIND = Q.get('hero'), ON = isCast(KIND) && !Q.has('mute') && !Q.has('auto') && !Q.has('clean');
let manifest = null, last = 0, lastFile = '', cur = null;
if (ON) fetch(`${BASE}${parse(KIND).cast}/cast.json`).then(r => r.json()).then(m => { manifest = m; }).catch(() => {});

const SKEY = 'gp_cast_bag';
function clipsFor(f, ev) {
  if (!f?.vo) return [];
  const target = manifest?.events?.[ev] || ev;
  const keys = Array.isArray(target) ? target : [target];
  const out = [];
  for (const k of keys) { if (Array.isArray(f.vo[k])) out.push(...f.vo[k]); }
  if (!out.length && Array.isArray(f.vo[ev])) out.push(...f.vo[ev]);
  return out;
}
function pickClip(fId, ev, files) {
  if (!files || !files.length) return null;
  if (files.length === 1) return files[0];
  let bags = {};
  try { bags = JSON.parse(sessionStorage.getItem(SKEY) || '{}'); } catch {}
  const key = `${fId}:${ev}`;
  let pool = bags[key];
  if (!Array.isArray(pool) || !pool.length) {
    pool = [...files];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const prev = bags[`${key}:last`];
    if (pool.length > 1 && pool[0] === prev) { const s = Math.floor(Math.random() * (pool.length - 1)) + 1; [pool[0], pool[s]] = [pool[s], pool[0]]; }
  }
  const pick = pool.shift();
  bags[key] = pool; bags[`${key}:last`] = pick;
  try { sessionStorage.setItem(SKEY, JSON.stringify(bags)); } catch {}
  return pick;
}

/** bark('start'|'kill'|'combo'|'power'|'low'|'miss'|'win'|'lose'|'spot'); throttled to one every ~3.5 s unless force. */
export function bark(ev, force = false) {
  if (!ON || !manifest) return; const now = performance.now(); if (!force && (now - last < 3500 || (cur && !cur.ended && !cur.paused))) return;
  const f = manifest.factions[parse(KIND).f];
  const files = clipsFor(f, ev); if (!files?.length) return;
  const pick = pickClip(parse(KIND).f, ev, files); if (!pick) return;
  lastFile = pick; last = now; try { cur?.pause(); cur = new Audio(`${BASE}${parse(KIND).cast}/vo/${pick}`); cur.volume = .9; cur.play().catch(() => {}); } catch {}
}
const SFX_EV = { coin: 'kill', ding: 'kill', pop: 'kill', boom: 'kill', hit: 'kill', slash: 'kill', powerup: 'power' };
/** Called by the kit's sfx(): sound effects become barks. */
export const castSfx = type => { const ev = SFX_EV[type]; if (ev) bark(ev, ev === 'win' || ev === 'lose'); };
export const castEnd = win => bark(win ? 'win' : 'lose', true);
if (ON) { addEventListener('pointerdown', () => bark('start', true), { once: true, capture: true }); window.__castBark = bark; }

