/* artkit.js: the "quality pass" in reusable form. One global, ART, so names never collide with game code.
   RULES: pixel drawing (rect/spr/fillCircle/ART.*) belongs in draw() or ui(); hud() is text only (it runs after the blit, rect there is lost).
   Typical game: bg = ART.bake('gN', () => { ART.floor(); ART.brick(0,16,4); ... }) ; in draw(): ART.bg('gN', fn); entities via ART.depth(list);
   then ART.fog(S.p.x,S.p.y); then bars/menus. See docs/GAMEKIT.md. */
const ART = (() => {
  const cache = {};
  const A = {
    /* static backgrounds: bake once (hash-based, deterministic), copy each frame */
    bake(key, fn) { if (!cache[key]) { clear(DG); fn(); cache[key] = buf.slice(); } return cache[key]; },
    bg(key, fn) { buf.set(A.bake(key, fn)); },
    /* tiled stone floor with bevels, mold and cracks between y0..y1 */
    floor(y0 = 16, y1 = 208, base = DG) {
      for (let y = y0; y < y1; y += 16) for (let x = 0; x < 256; x += 16) {
        rect(x, y, 16, 16, base); rect(x, y, 16, 1, K); rect(x, y, 1, 16, K);
        for (let k = 2; k < 15; k += 2) { px(x + k, y + 1, D); px(x + 1, y + k, D); }
        const h = hash(x, y);
        if (h < 0.18) for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) if (((i + j) & 1) && hash(x + i, y + j) < 0.8) px(x + 3 + i, y + 4 + j, F);
        if (h > 0.9) { rect(x + 3, y + 5, 6, 1, K); rect(x + 8, y + 6, 4, 1, K); rect(x + 11, y + 7, 2, 2, K); }
      }
    },
    /* brick band; down=true for a bottom wall */
    brick(y, h, rows, c1 = BRK, c2 = T) {
      rect(0, y, 256, h, M);
      for (let r = 0; r < rows; r++) for (let x = -(r & 1) * 8; x < 256; x += 16) { rect(x + 1, y + r * 4 + 1, 14, 3, c1); rect(x + 1, y + r * 4 + 1, 14, 1, c2); }
    },
    lockers(n, x0, gap, y = 2) { for (let i = 0; i < n; i++) { const x = x0 + i * gap; rect(x, y, 15, 13, DG); rect(x, y, 15, 1, L); rect(x, y, 1, 13, L); for (let k = 2; k < 9; k += 2) rect(x + 2, y + 2 + k, 11, 1, K); rect(x + 11, y + 9, 2, 2, Y); } },
    hazard(y) { for (let x = 0; x < 256; x += 8) { rect(x, y, 4, 3, Y); rect(x + 4, y, 4, 3, K); } },
    pipes(y0 = 16, y1 = 208) { for (const sx of [0, 250]) { rect(sx, y0, 6, y1 - y0, N); rect(sx + 2, y0, 3, y1 - y0, D); rect(sx + 2, y0, 1, y1 - y0, L); for (let y = y0 + 8; y < y1; y += 40) { rect(sx, y, 6, 3, L); rect(sx, y + 3, 6, 1, K); } } },
    table(x, y) { rect(x, y + 9, 3, 6, M); rect(x + 21, y + 9, 3, 6, M); rect(x, y + 4, 24, 6, M); rect(x, y, 24, 5, T); rect(x, y, 24, 1, S); rect(x + 3, y - 5, 3, 5, CY); rect(x + 4, y - 7, 1, 2, W); rect(x + 10, y - 4, 3, 4, E); rect(x + 16, y - 6, 3, 6, PK); px(x + 4, y - 3, W); px(x + 11, y - 2, V); },
    crate(x, y) { rect(x, y, 14, 14, BRK); rect(x, y, 14, 2, T); rect(x, y + 12, 14, 2, M); rect(x, y, 2, 14, M); rect(x + 12, y, 2, 14, M); rect(x + 3, y + 5, 8, 1, M); },
    barrel(x, y) { fillCircle(x, y, 6, T); fillCircle(x, y, 5, BRK); rect(x - 6, y - 2, 13, 1, M); rect(x - 6, y + 2, 13, 1, M); },
    blood(n = 8, c = R, c2 = M) { for (let k = 0; k < n; k++) { const x = 24 + hash(k, 3) * 208, y = 40 + hash(k, 5) * 150; for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) { const d = i * i / 36 + j * j / 25; if (d < 1 && (d < 0.45 || ((i + j) & 1))) px(x + i, y + j, d < 0.45 ? c : c2); } } },
    /* dynamic floor splat that stays where something died: d={x,y,k,el} */
    splat(d, c = GR, c2 = E, c3 = PU, c4 = PK) { const a = d.el ? c3 : c, b = d.el ? c4 : c2, x = Math.round(d.x), y = Math.round(d.y); fillCircle(x, y, 3, a); fillCircle(x - 1, y - 1, 1, b); for (let k = 0; k < 4; k++) px(x + Math.round((hash(d.k, k) - 0.5) * 14), y + Math.round((hash(k, d.k) - 0.5) * 10), a); },
    shadow(x, y, w = 9) { rect(Math.round(x - w / 2), Math.round(y), w, 2, K); },
    /* depth sort: list of {y, draw()} drawn back to front */
    depth(list) { list.sort((a, b) => a.y - b.y); for (const o of list) o.draw(); },
    /* fog of war: dithered darkness beyond r1 (25%) and r2 (50%) around cx,cy. call after entities, before UI */
    fog(cx, cy, r1 = 120, r2 = 165) { const a = r1 * r1, b = r2 * r2; for (let y = 0; y < 224; y++) for (let x = 0; x < 256; x++) { const dx = x - cx, dy = y - cy, d = dx * dx + dy * dy; if (d > a && (d > b ? (x + y) & 1 : (x & 1) & (y & 1))) buf[y * 256 + x] = K; } },
    dim() { for (let y = 0; y < 224; y++) for (let x = y & 1; x < 256; x += 2) buf[y * 256 + x] = K; },
    flash(c = R) { rect(0, 0, 256, 2, c); rect(0, 222, 256, 2, c); rect(0, 0, 2, 224, c); rect(254, 0, 2, 224, c); },
    /* framed bar: value 0..1 */
    bar(x, y, w, v, col = R, hi = PK) { rect(x - 1, y - 1, w + 2, 8, K); rect(x, y, w, 6, DG); const f = Math.round(w * Math.max(0, Math.min(1, v))); rect(x, y, f, 6, col); rect(x, y, f, 2, hi); },
    heart(x, y) { rect(x, y, 3, 3, PK); rect(x + 4, y, 3, 3, PK); rect(x + 1, y + 3, 5, 2, R); rect(x + 2, y + 5, 3, 1, R); },
    /* modal panel + selectable cards (draw cards' icons after); text goes in hud() */
    modal(x, y, w, h) { A.dim(); rect(x - 2, y - 2, w + 4, h + 4, W); rect(x, y, w, h, N); rect(x, y, w, 2, B); },
    card(x, y, w, h, on) { rect(x - 2, y - 2, w + 4, h + 4, on ? Y : DG); rect(x, y, w, h, on ? BRK : D); rect(x, y, w, 2, on ? Y : L); },
    /* effects */
    blast(x, y, r) { fillCircle(x, y, r, R); fillCircle(x, y, Math.max(1, r - 3), O); fillCircle(x, y, Math.max(1, r - 6), Y); if (r > 9) fillCircle(x, y, r - 9, W); },
    ring(cx, cy, r, T, c1 = CY, c2 = W, n = 90) { for (let k = 0; k < n; k++) { const a = k * 6.283 / n + T; px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, k % 3 ? c1 : c2); } },
    gem(x, y, T, c = CY) { const bob = Math.floor(T * 4 + x) & 1; rect(x - 2, y + 3, 5, 1, K); rect(x - 2, y - 2 - bob, 5, 5, c); rect(x - 1, y - 1 - bob, 2, 2, W); px(x + 1, y + 1 - bob, B); },
    bullet(s, c = Y) { rect(s.x - 1, s.y - 1, 3, 3, c); px(s.x - s.vx * 0.025, s.y - s.vy * 0.025, O); px(s.x - s.vx * 0.05, s.y - s.vy * 0.05, D); },
    marker(cx, cy, T) { for (let k = 0; k < 14; k++) px(cx + Math.cos(k * 0.449 + T * 2) * 9, cy + 4 + Math.sin(k * 0.449 + T * 2) * 4, SKY); },
    /* gun line + muzzle flash from (cx,cy) at angle ang; flash true while firing */
    gun(cx, cy, ang, flash) { for (let k = 3; k < 10; k++) px(cx + Math.cos(ang) * k, cy - 1 + Math.sin(ang) * k, k > 8 ? L : D); if (flash) { const gx = cx + Math.cos(ang) * 11, gy = cy - 1 + Math.sin(ang) * 11; fillCircle(gx, gy, 2, Y); px(gx, gy, W); } },
    /* shaded 8x11 sprites. pal remaps letters, e.g. {B:R} for a red-suit hero, {E:PK,L:PU} for an elite zombie */
    HERO: ['..BBBB..', '.BCCCCB.', '.BCWWCB.', '..BBBB..', '.YBBBBY.', 'YYBLLBYY', '.BBBBBB.', '.MMMMMM.', '.BB..BB.', '.NN..NN.', '.KK..KK.'],
    GRUNT: ['..EEEE..', '.EEEEEE.', '.EYEEYE.', '.EEKKEE.', '..EEEE..', '.LLLLLL.', 'ELLLLLLE', 'E.LLLL.E', '..DDDD..'],
    LEGS: [['..D..D..', '.DD..DD.'], ['..DD.D..', '.D...DD.']],
    hero(x, y, pal, flip) { A.shadow(x, y + 5); spr(A.HERO, x - 4, y - 6, flip, pal); },
    grunt(x, y, T, pal, flip) { const w = Math.floor(T * 6 + x) & 1; A.shadow(x, y + 5, 8); spr(A.GRUNT, x - 4, y - 5, flip, pal); spr(A.LEGS[w], x - 4, y + 4, flip, pal); },
    queen(x, y, T, hp, body = PU, hi = PK, dark = M) { const w = Math.floor(T * 6) & 1; rect(x - 14, y + 11, 29, 4, K);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const lx = x + sd * (8 + k * 3), ly = y + 2 + k * 4 + (w && k === 1 ? 1 : 0); rect(Math.min(lx, lx + sd * 6), ly, 7, 2, D); rect(lx + sd * 6, ly - 2, 2, 5, L); }
      fillCircle(x, y + 6, 7, dark); fillCircle(x, y, 12, dark); fillCircle(x, y - 1, 10, body); fillCircle(x - 3, y - 5, 4, hi); fillCircle(x + 4, y + 3, 4, dark);
      rect(x - 7, y - 5, 5, 5, Y); rect(x + 3, y - 5, 5, 5, Y); rect(x - 5, y - 4, 2, 3, R); rect(x + 5, y - 4, 2, 3, R); px(x - 6, y - 5, W); px(x + 4, y - 5, W);
      rect(x - 5, y + 3, 2, 5, W); rect(x + 4, y + 3, 2, 5, W); rect(x - 2, y + 6, 5, 1, K);
      for (const [dx, h] of [[-7, 4], [-1, 6], [5, 4]]) { rect(x + dx, y - 11 - h, 3, h + 2, body); rect(x + dx, y - 11 - h, 3, 2, Y); }
      if (hp < 100 && (Math.floor(T * 8) & 1)) for (let k = 0; k < 10; k++) px(x + Math.cos(k * 0.63) * 13, y + Math.sin(k * 0.63) * 13, R); },
  };
  return A;
})();
