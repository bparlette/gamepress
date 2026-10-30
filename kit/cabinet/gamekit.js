/* gamekit.js: shared helpers so a game file is only its rules. Appended after core.js.
   GAME = kit({id,t1,t2,sub,music,secs,seed,setup(S,att),step(S,dt,inp,att),draw(S),hud(S,mode),bot(S),info(S)})
   S is the per-run state object (made fresh by setup, so nothing leaks). S.rng = seeded rng, S.T = seconds, S.pops, S.score. */
const NI = () => ({ l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 });
const MUS = (bpm, root, minor) => ({ bpm, lead:'square', chords:[{ root, tones:minor ? [0, 3, 7] : [0, 4, 7] }, { root:root + 3, tones:[0, 4, 7] }, { root:root + 5, tones:minor ? [0, 3, 7] : [0, 4, 7] }, { root:root - 2, tones:[0, 4, 7] }],
  arp:[0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 3, 2, 1, 0, 1], bass:[0, 4, 8, 12], snare:[4, 12], kick:[0, 8], hat:true });
function popup(S, s, x, y, col) { S.pops.push({ s, x, y, col: col || Y, t:0 }); if (S.pops.length > 4) S.pops.shift(); }
function drawPops(S) { for (const p of S.pops) txt(p.s, clamp(Math.round(p.x), 24, 232), Math.round(p.y - p.t * 12), p.col, 8, 'center'); }
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rint = (S, n) => Math.floor(S.rng() * n);
const pick = (S, arr) => arr[rint(S, arr.length)];
/* grid BFS: pass(x,y)->bool, goal(x,y)->bool. returns {dx,dy,d} first step toward nearest goal, or null */
function bfs(w, h, pass, sx, sy, goal) {
  const seen = new Uint8Array(w * h), q = [[sx, sy, 0, 0, 0]]; seen[sy * w + sx] = 1;
  for (let i = 0; i < q.length; i++) {
    const [x, y, d, fx, fy] = q[i];
    if (d > 0 && goal(x, y)) return { dx:fx, dy:fy, d };
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + a, ny = y + b;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || !pass(nx, ny)) continue;
      seen[ny * w + nx] = 1; q.push([nx, ny, d + 1, d ? fx : a, d ? fy : b]);
    }
  }
  return null;
}
/* bot input from a direction vector (dx,dy) */
function dirInp(i, dx, dy) { if (dx > 0) i.r = 1; if (dx < 0) i.l = 1; if (dy > 0) i.d = 1; if (dy < 0) i.u = 1; return i; }
/* edge-detect helper: S.edge(inp,'a') true only on the frame a button goes down */
function mkEdge() { const p = {}; return (inp, k) => { const v = !!inp[k], r = v && !p[k]; p[k] = v; return r; }; }
function kit(c) {
  let S = null;
  const fresh = att => { S = { att:!!att, T:0, score:0, pops:[], rng:mkRng(runSeed(att ? c.seed : null, c.off || 7)), edge:mkEdge() }; c.setup(S, !!att); };
  return {
    id:c.id, t1:c.t1, t2:c.t2, sub:c.sub, music:c.music,
    init(att) { fresh(att); },
    update(dt, inp, mode) {
      S.att = mode === 'title'; S.T += dt;
      if (S.att && S.T > (c.secs || 60)) { fresh(true); return; }
      for (let i = S.pops.length - 1; i >= 0; i--) { S.pops[i].t += dt; if (S.pops[i].t > 1.1) S.pops.splice(i, 1); }
      if (S.inv > 0) S.inv -= dt;
      if (S.parts) for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.t <= 0) S.parts.splice(i, 1); }
      if (c.step(S, dt, inp, S.att) === 'reset') fresh(true);
    },
    renderHD(g, mode) { if (c.drawHD) c.drawHD(S, g, mode); },
    render() { c.draw(S); drawParts(S); if (c.ui) c.ui(S); },
    hud(mode) { c.hud && c.hud(S, mode); drawPops(S); },
    info() { return Object.assign({ score:Math.round(S.score), t:+S.T.toFixed(1) }, c.info ? c.info(S) : {}); },
    bot() { return c.bot(S, NI()) || NI(); },
  };
}
/* finish helper: attract loops, real play ends. */
function finish(S, msg, bonus) { if (S.att) return 'reset'; endGame(S.score + (bonus || 0), msg); }
/* ---- added after the 20-game batch: the things most games re-wrote ---- */
const lerp = (a, b, t) => a + (b - a) * t;
function bar(x, y, w, h, v, max, col, bg) { rect(x, y, w, h, bg || DG); rect(x, y, Math.round(w * clamp(v / max, 0, 1)), h, col); }
/* timed on-screen hint: hint(S,'JUMP OVER GAPS',8) in hud(); shows only while S.T < secs in real play */
function hintS(S, s, secs, y) { if (!S.att && S.T < (secs || 8)) txt(s, 128, y || 214, W, 8, 'center'); }
/* particles: burst(S,x,y,col,n) in step; drawParts(S) at end of draw(); updated automatically by kit() */
function burst(S, x, y, col, n) { S.parts = S.parts || []; for (let k = 0; k < (n || 8); k++) { const a = S.rng() * 6.283, v = 20 + S.rng() * 50; S.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 20, t:0.5 + S.rng() * 0.4, col }); } }
function drawParts(S) { for (const p of S.parts || []) rect(Math.round(p.x), Math.round(p.y), 2, 2, p.col); }
/* damage with invulnerability: hurtS(S,1) -> true if it landed. Needs S.hp; uses S.inv (seconds). */
function hurtS(S, n, fx) { if (S.inv > 0) return false; S.hp -= n || 1; S.inv = 1.2; sfx('hurt'); if (fx) burst(S, fx[0], fx[1], R, 8); return true; }
