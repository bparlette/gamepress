// gpphys: the physics shared by the recipes. Circle World (merge sandbox, peggle, breakout balls), destructible Terrain (artillery),
// and axis-separated tile movement for platformers (platformer, metroidvania, run-and-gun, dungeon).
import { clamp } from './gpmath.js';
/** Circles with gravity, walls, circle-circle impulses. Bodies: {x,y,r,vx,vy,m,static,bounce,data}.
 *
 * NOTE (feel upgrade path): World.step already sub-steps (sub=3) but has no
 * input forgiveness. For character controllers needing coyote time / jump
 * buffering, see gpfeel.characterStep() + gpfeel.RetroController in kit/gpfeel.js.
 */
export function World({ gx = 0, gy = 1400, x0 = 0, y0 = 0, x1 = 540, y1 = 960, damp = .9995, bounce = .5, sub = 3, walls = { l: 1, r: 1, b: 1, t: 0 } } = {}) {
  const w = { bodies: [], gx, gy, x0, y0, x1, y1, onHit: null, onWall: null, onDrain: null,
    add(b) { b.vx ??= 0; b.vy ??= 0; b.m ??= b.r * b.r; b.bounce ??= bounce; this.bodies.push(b); return b; }, remove(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); },
    step(dt) { const h = dt / sub, B = this.bodies;
      for (let s = 0; s < sub; s++) {
        for (const b of B) { if (b.static) continue; b.vx += this.gx * h; b.vy += this.gy * h; b.vx *= damp; b.vy *= damp; b.x += b.vx * h; b.y += b.vy * h;
          if (walls.l && b.x - b.r < x0) { b.x = x0 + b.r; b.vx = Math.abs(b.vx) * b.bounce; this.onWall?.(b, 'l'); } if (walls.r && b.x + b.r > x1) { b.x = x1 - b.r; b.vx = -Math.abs(b.vx) * b.bounce; this.onWall?.(b, 'r'); }
          if (walls.t && b.y - b.r < y0) { b.y = y0 + b.r; b.vy = Math.abs(b.vy) * b.bounce; this.onWall?.(b, 't'); }
          if (walls.b && b.y + b.r > y1) { b.y = y1 - b.r; b.vy = -Math.abs(b.vy) * b.bounce * .8; b.vx *= .98; this.onWall?.(b, 'b'); } else if (!walls.b && b.y - b.r > y1 + 40) this.onDrain?.(b); }
        for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], c = B[j]; if (a.static && c.static) continue; const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, R = a.r + c.r; if (d2 >= R * R || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = R - d, ia = a.static ? 0 : 1 / a.m, ic = c.static ? 0 : 1 / c.m, tot = ia + ic; a.x -= nx * ov * ia / tot; a.y -= ny * ov * ia / tot; c.x += nx * ov * ic / tot; c.y += ny * ov * ic / tot;
          const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny; if (rv < 0) { const e = Math.min(a.bounce, c.bounce), j2 = -(1 + e) * rv / tot; a.vx -= j2 * nx * ia; a.vy -= j2 * ny * ia; c.vx += j2 * nx * ic; c.vy += j2 * ny * ic; this.onHit?.(a, c, -rv); } } } } };
  return w;
}
/** Destructible heightfield. top[i] = surface y of column i (columns are `step` px wide). */
export function Terrain({ w = 540, h = 960, step = 3, height = x => 640 } = {}) {
  const n = Math.ceil(w / step) + 1, top = Array.from({ length: n }, (_, i) => height(i * step));
  return { w, h, step, top, y(x) { const f = clamp(x / step, 0, n - 1), i = Math.floor(f), j = Math.min(n - 1, i + 1); return top[i] + (top[j] - top[i]) * (f - i); }, solid(x, y) { return y >= this.y(x); },
    carve(cx, cy, r) { for (let i = 0; i < n; i++) { const dx = i * step - cx; if (Math.abs(dx) > r) continue; const dy = Math.sqrt(r * r - dx * dx); if (cy - dy <= top[i] + 2) top[i] = Math.max(top[i], cy + dy * .9); } },
    draw(c, fill = '#6bbf59', edge = '#3f8f3a', under = '#7a5a3a') { c.beginPath(); c.moveTo(0, h); for (let i = 0; i < n; i++) c.lineTo(i * step, top[i]); c.lineTo(w, h); c.closePath(); c.fillStyle = under; c.fill(); c.beginPath(); for (let i = 0; i < n; i++) c.lineTo(i * step, top[i]); c.strokeStyle = edge; c.lineWidth = 10; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = fill; c.lineWidth = 5; c.stroke(); } };
}
/** Move a box {x,y,w,h,vx,vy} through a tile grid. solid(tx,ty) says which tiles block. Returns {x:bool,y:bool,ground:bool,ceil:bool}.
 *
 * NOTE (feel upgrade path): moveBox is single-step axis-separated movement —
 * fine for simple recipes, but high-speed entities can tunnel and jumps feel
 * stiff. For Nintendo-grade feel, replace with gpfeel.characterStep() from
 * kit/gpfeel.js: 4x sub-stepping (no tunneling), 4-frame coyote time,
 * 5-frame jump input buffering, and SM64-derived accel curves.
 * See docs/NINTENDO-FEEL.md and each recipe's `feel.use` in presets/recipes.json.
 */
export function moveBox(b, solid, T, dt) {
  const hit = { x: false, y: false, ground: false, ceil: false }, hits = (x, y) => { for (let ty = Math.floor(y / T); ty <= Math.floor((y + b.h - .01) / T); ty++) for (let tx = Math.floor(x / T); tx <= Math.floor((x + b.w - .01) / T); tx++) if (solid(tx, ty)) return { tx, ty }; return null; };
  b.x += b.vx * dt; let o = hits(b.x, b.y); if (o) { b.x = b.vx > 0 ? o.tx * T - b.w : (o.tx + 1) * T; b.vx = 0; hit.x = true; }
  b.y += b.vy * dt; o = hits(b.x, b.y); if (o) { if (b.vy > 0) { b.y = o.ty * T - b.h; hit.ground = true; } else { b.y = (o.ty + 1) * T; hit.ceil = true; } b.vy = 0; hit.y = true; } return hit;
}
