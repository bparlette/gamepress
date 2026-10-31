/* engine.js: shared, game-agnostic engines. Appended after gamekit.js. Deterministic (uses S.rng only), no drawing, no DOM.
   RULE: engines own spawn/update/expire. kit() calls ENG.tick(S,dt) every sim step BEFORE c.step, so effects/projectiles/knockback
   age in the simulation, never in a renderer; every tier (pixel/HD/art/3D) just reads S.efx / S.eproj / S.swarm.list.
   API (all state lives on S):
     ENG.move(e, solid, dx, dy)            axis-separated AABB move. e={x,y,w,h}; solid(px,py)->bool in world px. returns {hx,hy} hit flags
     ENG.grid(w,h,ts,fill) -> G            G.get/set(tx,ty), G.solidAt(px,py), G.rect(x,y,w,h) overlaps solid; G.w,G.h,G.ts; G.t[] flat tiles (1=solid)
     ENG.fx.add(S,kind,x,y,life,o)         (stored in S.efx) timed effect {kind,x,y,t,life,...o}; aged+expired by tick. fx.each(S,kind,fn(f,p01))
     ENG.proj.fire(S,x,y,vx,vy,o)          (S.eproj) projectile {x,y,vx,vy,life,r,dmg,pierce,team}; moved+expired by tick; o.bounds=[x0,y0,x1,y1]
     ENG.imp.push(e,dx,dy,force)           impulse knockback on any entity with vx,vy,ix,iy; decays via ENG.imp.step(e,dt[,solid]); pass a solid fn and knockback stops at walls
     ENG.swarm.init(S,cfg)                 S.swarm={list,cfg}; cfg={cap,spawn:(S)=>interval s,kinds:{k:{hp,sp,r,dmg,score}},pick:(S)=>kind,ring:[min,max],bounds}
     ENG.swarm.step(S,dt,tx,ty)            spawn on the curve, chase (tx,ty), separate, expire dead. returns array of kills this step
     ENG.swarm.hurt(S,e,dmg,kx,ky)         damage + knockback; marks e.dead when hp<=0 (removed next step, kills reported once)
     ENG.hits(S,fn)                        projectile vs swarm collisions in one place: fn(proj,enemy) per hit (handles pierce/consume)
     ENG.path(pts) -> P                    polyline P.len, P.at(d)->{x,y,a}
     ENG.cam(S,tx,ty,vw,vh,ww,wh,k)        follow camera with lerp k and world clamp -> S.ecam={x,y,sh}; ENG.shake(S,amount)
   */
const ENG = (() => {
  const move = (e, solid, dx, dy) => {
    const hit = { hx:false, hy:false }, ov = (x, y) => solid(x, y) || solid(x + e.w - 1, y) || solid(x, y + e.h - 1) || solid(x + e.w - 1, y + e.h - 1);
    let n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)), sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) { if (sx) { if (ov(e.x + sx, e.y)) hit.hx = true; else e.x += sx; } if (sy) { if (ov(e.x, e.y + sy)) hit.hy = true; else e.y += sy; } }
    return hit;
  };
  const grid = (w, h, ts, fill) => { const G = { w, h, ts, t:new Uint8Array(w * h).fill(fill || 0) };
    G.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 1 : G.t[y * w + x]; G.set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) G.t[y * w + x] = v; };
    G.solidAt = (px, py) => G.get(Math.floor(px / ts), Math.floor(py / ts)) === 1;
    G.rect = (x, y, rw, rh) => G.solidAt(x, y) || G.solidAt(x + rw - 1, y) || G.solidAt(x, y + rh - 1) || G.solidAt(x + rw - 1, y + rh - 1); return G; };
  const fx = { add(S, kind, x, y, life, o) { (S.efx = S.efx || []).push(Object.assign({ kind, x, y, t:0, life }, o)); },
    each(S, kind, fn) { for (const f of S.efx || []) if (!kind || f.kind === kind) fn(f, Math.min(1, f.t / f.life)); } };
  const proj = { fire(S, x, y, vx, vy, o) { (S.eproj = S.eproj || []).push(Object.assign({ x, y, vx, vy, life:1.2, r:2, dmg:1, pierce:0, team:'p' }, o)); } };
  const imp = { push(e, dx, dy, force) { const l = Math.hypot(dx, dy) || 1; e.ix = (e.ix || 0) + dx / l * force; e.iy = (e.iy || 0) + dy / l * force; },
    step(e, dt, solid) { if (e.ix || e.iy) { if (solid) move(e, solid, e.ix * dt, e.iy * dt); else { e.x += e.ix * dt; e.y += e.iy * dt; } const d = Math.exp(-8 * dt); e.ix *= d; e.iy *= d; if (Math.abs(e.ix) < 1 && Math.abs(e.iy) < 1) e.ix = e.iy = 0; } } };
  /* swarm cfg: {cap, spawn:(S)=>interval s, pick:(S)=>kind, kinds:{k:{hp, sp:number|[lo,hi], r, ...extra copied onto the entity}},
       ring:[min,max] OR spawnAt:(S)=>{x,y} (custom spawn points e.g. screen edges), bounds, separate:false to disable crowding push}.
     per-entity e.slow (default 1) scales chase speed for one step (auras, freeze). ENG.swarm.add(S,kind,x,y) places one by hand (bosses). */
  const swarm = {
    init(S, cfg) { S.swarm = { list:[], cfg, acc:0, kills:0, id:0 }; },
    add(S, k, x, y) { const W_ = S.swarm, K_ = W_.cfg.kinds[k], sp = Array.isArray(K_.sp) ? K_.sp[0] + S.rng() * (K_.sp[1] - K_.sp[0]) : K_.sp * (0.9 + S.rng() * 0.2);
      const e = Object.assign({}, K_, { id:W_.id++, k, x, y, hp:K_.hp, hpMax:K_.hp, sp, r:K_.r, ix:0, iy:0, dead:false, t:0, slow:1 }); W_.list.push(e); return e; },
    step(S, dt, tx, ty) {
      const W_ = S.swarm, c = W_.cfg, L = W_.list, dead = [];
      W_.acc += dt; const iv = c.spawn(S);
      while (W_.acc >= iv && L.length < c.cap) { W_.acc -= iv;
        if (c.spawnAt) { const q = c.spawnAt(S); swarm.add(S, c.pick(S), q.x, q.y); continue; }
        const k = c.pick(S), a = S.rng() * 6.283, d = c.ring[0] + S.rng() * (c.ring[1] - c.ring[0]);
        let x = tx + Math.cos(a) * d, y = ty + Math.sin(a) * d; if (c.bounds) { x = clamp(x, c.bounds[0], c.bounds[2]); y = clamp(y, c.bounds[1], c.bounds[3]); }
        swarm.add(S, k, x, y); }
      if (L.length >= c.cap) W_.acc = Math.min(W_.acc, iv);
      for (let i = L.length - 1; i >= 0; i--) { const e = L[i]; if (e.dead) { dead.push(e); L.splice(i, 1); continue; } e.t += dt;
        let dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, sl = e.slow === undefined ? 1 : e.slow; e.x += dx / d * e.sp * sl * dt; e.y += dy / d * e.sp * sl * dt; e.slow = 1; imp.step(e, dt); }
      if (c.separate !== false) { /* separation: 12 px spatial hash so a 150-strong horde stays cheap */
      const cell = 12, hh = new Map(); for (const e of L) { const key = Math.floor(e.x / cell) + ',' + Math.floor(e.y / cell); (hh.get(key) || hh.set(key, []).get(key)).push(e); }
      for (const e of L) { const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const o of hh.get((cx + a) + ',' + (cy + b)) || []) { if (o.id <= e.id) continue; const ox = e.x - o.x, oy = e.y - o.y, dd = Math.hypot(ox, oy), m = e.r + o.r;
        if (dd > 0 && dd < m) { const p = (m - dd) / 2 / dd; e.x += ox * p; e.y += oy * p; o.x -= ox * p; o.y -= oy * p; } } } }
      if (c.bounds) for (const e of L) { e.x = clamp(e.x, c.bounds[0], c.bounds[2]); e.y = clamp(e.y, c.bounds[1], c.bounds[3]); }
      W_.kills += dead.length; return dead; },
    hurt(S, e, dmg, kx, ky) { e.hp -= dmg; e.hit = 0.1; if (kx !== undefined) imp.push(e, e.x - kx, e.y - ky, 70); if (e.hp <= 0) e.dead = true; return e.dead; },
  };
  const hits = (S, fn) => { const L = S.swarm ? S.swarm.list : []; for (const p of S.eproj || []) { if (p.dead || p.team !== 'p') continue;
    for (const e of L) { if (e.dead) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { fn(p, e); if (p.pierce-- <= 0) { p.dead = true; break; } } } } };
  const cam = (S, tx, ty, vw, vh, ww, wh, k) => { const c = S.ecam = S.ecam || { x:tx - vw / 2, y:ty - vh / 2, sh:0 };
    c.x += (clamp(tx - vw / 2, 0, Math.max(0, ww - vw)) - c.x) * (k || 0.12); c.y += (clamp(ty - vh / 2, 0, Math.max(0, wh - vh)) - c.y) * (k || 0.12); return c; };
  const shake = (S, a) => { const c = S.ecam = S.ecam || { x:0, y:0, sh:0 }; c.sh = Math.max(c.sh, a); };
  /* the lifecycle owner: called by kit() every sim step */
  const tick = (S, dt) => {
    if (S.efx) for (let i = S.efx.length - 1; i >= 0; i--) { const f = S.efx[i]; f.t += dt; if (f.t >= f.life) S.efx.splice(i, 1); }
    if (S.eproj) for (let i = S.eproj.length - 1; i >= 0; i--) { const p = S.eproj[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; const b = p.bounds;
      if (p.dead || p.life <= 0 || (b && (p.x < b[0] || p.y < b[1] || p.x > b[2] || p.y > b[3]))) S.eproj.splice(i, 1); }
    if (S.swarm) for (const e of S.swarm.list) if (e.hit > 0) e.hit -= dt;
    if (S.ecam && S.ecam.sh > 0) S.ecam.sh = Math.max(0, S.ecam.sh - dt * 30);
  };
  /* polyline path: P=ENG.path([[x,y],...]); P.len; P.at(d)->{x,y,a} point + heading at distance d along it (tower-defense creeps, rails, race tracks) */
  const path = pts => { const seg = [], cum = [0]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); cum.push(cum[i - 1] + l); }
    const len = cum[cum.length - 1]; return { len, pts, at(d) { d = clamp(d, 0, len); let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const a = pts[i - 1], b = pts[i], t = (d - cum[i - 1]) / (seg[i - 1] || 1);
      return { x:a[0] + (b[0] - a[0]) * t, y:a[1] + (b[1] - a[1]) * t, a:Math.atan2(b[1] - a[1], b[0] - a[0]) }; } }; };
  return { path, move, grid, fx, proj, imp, swarm, hits, cam, shake, tick };
})();
