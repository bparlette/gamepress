// gpmath: seeded RNG + the small math every recipe needs. Use R()/rnd()/pick() instead of Math.random so the same ?seed= always plays the same.
let s = 1;
export const setSeed = n => { s = (n >>> 0) || 1; };
export const SEED = +(new URLSearchParams(location.search).get('seed') || 1); setSeed(SEED);
export const R = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const rnd = (a = 0, b = 1) => a + R() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(R() * a.length)], chance = p => R() < p;
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sign = v => (v < 0 ? -1 : 1);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const smooth = t => t * t * (3 - 2 * t);
export const ease = { outCubic: t => 1 - (1 - t) ** 3, outBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, inOut: t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2), outBounce: t => { const n = 7.5625, d = 2.75; return t < 1 / d ? n * t * t : t < 2 / d ? n * (t -= 1.5 / d) * t + .75 : t < 2.5 / d ? n * (t -= 2.25 / d) * t + .9375 : n * (t -= 2.625 / d) * t + .984375; } };
export const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const circ = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.r + b.r) ** 2;
export const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => clamp(Math.round(c * k), 0, 255); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
/** Tiny tween list: tw.add(obj,'x',to,secs,easeFn); tw.update(dt). */
export const tweens = () => { const L = []; return { add(o, k, to, d = .3, e = ease.outCubic, then) { L.push({ o, k, a: o[k], to, d, t: 0, e, then }); }, update(dt) { for (let i = L.length - 1; i >= 0; i--) { const w = L[i]; w.t += dt; const u = Math.min(1, w.t / w.d); w.o[w.k] = w.a + (w.to - w.a) * w.e(u); if (u >= 1) { L.splice(i, 1); w.then?.(); } } }, clear() { L.length = 0; } }; };
