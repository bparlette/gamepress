// gplego: Composable "Lego" mechanic engine for gamepress.
// Lets an AI invent brand-new hybrid games in a 15-line JSON spec by mixing:
//   controller:  'topdown' | 'swerve' | 'aim-flick' | 'tap-drop' | 'orbit'
//   spawner:     'wave-horde' | 'falling' | 'gate-lanes' | 'clusters'
//   hook:        'vacuum-collect' | 'chain-explode' | 'merge-tier' | 'knockback-brawl' | 'slice-split'
//   progression: 'xp-3-choice' | 'size-grow' | 'multiplier-gates' | 'combo-fever'
// Includes a built-in ?auto=1 bot that loses on attempt 0 (~6s) and wins on attempt 1 (~18s).
import { createGame, sfx, comboPitch, rand, clamp, dist, lerp } from './gp2d.js';
import { drawChar, coin, star, heart } from './gpsprites.js';

export const LEGO_BLOCKS = {
  controllers: ['topdown', 'swerve', 'aim-flick', 'tap-drop', 'orbit'],
  spawners: ['wave-horde', 'falling', 'gate-lanes', 'clusters'],
  hooks: ['vacuum-collect', 'chain-explode', 'merge-tier', 'knockback-brawl', 'slice-split'],
  progressions: ['xp-3-choice', 'size-grow', 'multiplier-gates', 'combo-fever'],
};

const TIERS = ['#4aa8ff', '#7dff7d', '#ffd34d', '#ff9a3c', '#ff4d6d', '#c77dff'];

export function runLegoGame(spec = {}) {
  const {
    id = 'lego-game',
    title = 'HYBRID RUSH',
    sub = 'Drag or WASD to play',
    hookText = '99% PICK THE WRONG GATE',
    bg = '#182238',
    accent = '#ffd34d',
    heroKind = 'cat',
    heroColor = '#ff9a3c',
    enemyKind = 'zombie',
    enemyColor = '#8fcf7a',
    controller = 'topdown',
    spawner = 'wave-horde',
    hook = 'knockback-brawl',
    progression = 'size-grow',
    winScore = 250,
    roundSec = 14,
  } = spec;

  const g = createGame({ id, title, sub, bg, hook: hookText });
  const P = { x: 270, y: 700, vx: 0, vy: 0, r: 28, hp: 3, maxHp: 3, size: 1, mult: 1, xp: 0, lvl: 1, combo: 0, angle: 0, cd: 0 };
  let ents = [], gems = [], gates = [], bullets = [], spawnT = 0, gateT = 0, wave = 1;

  g.onReset = () => {
    Object.assign(P, { x: 270, y: controller === 'topdown' ? 520 : 740, vx: 0, vy: 0, r: 28, hp: 3, maxHp: 3, size: 1, mult: 1, xp: 0, lvl: 1, combo: 0, angle: 0, cd: 0 });
    ents = []; gems = []; gates = []; bullets = []; spawnT = 0; gateT = 0; wave = 1;
    // Seed initial cluster so frame 0 has immediate visual contrast & action
    for (let i = 0; i < 8; i++) spawnEntity(true);
    if (spawner === 'gate-lanes' || progression === 'multiplier-gates') spawnGatePair(260);
  };

  function spawnGatePair(y = -60) {
    const dumb = g.dumb();
    gates.push(
      { x: 145, y, w: 210, h: 68, op: dumb ? 'bad' : 'good', label: 'x2 POWER', val: 2, color: '#38d39f' },
      { x: 395, y, w: 210, h: 68, op: dumb ? 'good' : 'bad', label: '-50% SIZE', val: 0.5, color: '#ff4d6d' },
    );
  }

  function spawnEntity(initial = false) {
    const tier = Math.floor(rand(0, 3));
    if (spawner === 'falling') {
      ents.push({ x: rand(60, 480), y: initial ? rand(100, 420) : -30, vx: rand(-30, 30), vy: rand(140, 230), r: 24 + tier * 6, hp: 1 + tier, tier, kind: enemyKind, color: TIERS[tier] || enemyColor });
    } else if (spawner === 'clusters') {
      const cx = rand(90, 450), cy = initial ? rand(140, 400) : rand(80, 260);
      for (let k = 0; k < 3; k++) ents.push({ x: cx + rand(-35, 35), y: cy + rand(-35, 35), vx: 0, vy: rand(35, 70), r: 22 + tier * 5, hp: 1 + tier, tier, kind: enemyKind, color: TIERS[tier] || enemyColor });
    } else {
      const side = Math.floor(rand(0, 4));
      const x = initial ? rand(60, 480) : (side === 0 ? -20 : side === 1 ? 560 : rand(40, 500));
      const y = initial ? rand(80, 340) : (side < 2 ? rand(100, 600) : -30);
      ents.push({ x, y, vx: 0, vy: 0, r: 24 + tier * 5, hp: 1 + tier, tier, kind: enemyKind, color: enemyColor });
    }
  }

  function triggerHook(e, idx) {
    P.combo++;
    const pts = Math.round(15 * P.mult * (1 + P.combo * 0.1));
    g.score += pts;
    sfx(hook === 'merge-tier' ? 'merge' : hook === 'chain-explode' ? 'boom' : 'coin', { pitch: comboPitch(P.combo) });
    g.burst(e.x, e.y, 14, { color: [accent, e.color, '#ffffff'], speed: 260 });
    g.popup(`+${pts}`, e.x, e.y - 20, accent, 34);
    g.hitstop(0.03);
    g.shake(5);

    if (hook === 'chain-explode') {
      for (const o of ents) {
        if (o !== e && dist(e.x, e.y, o.x, o.y) < 110) {
          o.hp -= 2;
          g.burst(o.x, o.y, 8, { color: '#ff6b6b' });
        }
      }
    } else if (hook === 'merge-tier' && e.tier < TIERS.length - 1) {
      const mate = ents.find(o => o !== e && o.tier === e.tier && dist(e.x, e.y, o.x, o.y) < 95);
      if (mate) {
        mate.tier++; mate.r += 8; mate.color = TIERS[mate.tier];
        g.popup(`TIER ${mate.tier + 1}!`, mate.x, mate.y, '#7dff7d', 40);
      }
    } else if (hook === 'slice-split' && !e.split && ents.length < 36) {
      for (const s of [-1, 1]) gems.push({ x: e.x + s * 18, y: e.y, vx: s * 90, vy: -120, r: 12, val: 10 });
    } else {
      gems.push({ x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-90, -20), r: 12, val: 12 });
    }

    // Progression reward
    P.xp += 1;
    if (progression === 'size-grow') P.size = clamp(P.size + 0.04, 0.7, 2.2);
    if (progression === 'combo-fever' && P.combo % 5 === 0) {
      P.mult += 0.5;
      g.flash(accent, 0.25);
      g.showBanner(`FEVER x${P.mult.toFixed(1)}!`, 0.8);
      sfx('powerup');
    }
    if (progression === 'xp-3-choice' && P.xp >= P.lvl * 5) {
      P.lvl++; P.mult += 0.4; P.size = clamp(P.size + 0.1, 1, 2);
      g.flash('#7dff7d', 0.3);
      g.showBanner(`LEVEL ${P.lvl}: +NOVA!`, 0.9);
      sfx('powerup');
    }
    ents.splice(idx, 1);
  }

  g.onReset();

  g.run(dt => {
    const dumb = g.dumb();
    // 1. Bot / Player Controller
    let tx = g.ptr.x, ty = g.ptr.y;
    if (g.auto) {
      if (dumb) {
        // Attempt 0: steer straight into red gate or nearest hazard to lose dramatically around t ~ 4.5s
        const badGate = gates.find(gt => gt.color === '#ff4d6d');
        const haz = badGate || ents[0] || { x: 270, y: 400 };
        tx = haz.x; ty = haz.y;
      } else {
        // Attempt 1: smart bot hits green gates, collects gems, kites enemies
        const goodGate = gates.find(gt => gt.color === '#38d39f' && gt.y < P.y);
        const gem = gems[0];
        const target = goodGate || gem || ents[0] || { x: 270 + Math.sin(g.t * 3) * 160, y: 520 };
        tx = target.x;
        ty = controller === 'topdown' ? clamp(target.y + 60, 220, 780) : P.y;
      }
    } else {
      const dx = (g.keys.KeyD || g.keys.ArrowRight ? 1 : 0) - (g.keys.KeyA || g.keys.ArrowLeft ? 1 : 0);
      const dy = (g.keys.KeyS || g.keys.ArrowDown ? 1 : 0) - (g.keys.KeyW || g.keys.ArrowUp ? 1 : 0);
      if (dx || dy) { tx = P.x + dx * 180; ty = P.y + dy * 180; }
    }

    if (controller === 'swerve' || controller === 'tap-drop') {
      P.x = lerp(P.x, clamp(tx, 55, 485), dt * 9);
      P.y = 740;
    } else {
      P.x = lerp(P.x, clamp(tx, 50, 490), dt * 7.5);
      P.y = lerp(P.y, clamp(ty, 140, 840), dt * 7.5);
    }
    P.angle += dt * 4.5 * P.mult;

    // Auto-fire pulses for aim-flick / topdown / orbit
    P.cd -= dt;
    if (P.cd <= 0 && ents.length) {
      P.cd = clamp(0.28 / P.mult, 0.07, 0.35);
      const nearest = ents.reduce((best, e) => (!best || dist(P.x, P.y, e.x, e.y) < dist(P.x, P.y, best.x, best.y) ? e : best), null);
      if (nearest) {
        const a = Math.atan2(nearest.y - P.y, nearest.x - P.x);
        bullets.push({ x: P.x, y: P.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 9 * P.size });
        sfx('shoot', { vol: 0.45 });
      }
    }

    // 2. Spawners
    spawnT -= dt;
    if (spawnT <= 0 && ents.length < 28) {
      spawnT = clamp(0.55 - g.t * 0.015, 0.18, 0.6);
      spawnEntity(false);
    }
    if (spawner === 'gate-lanes' || progression === 'multiplier-gates') {
      gateT -= dt;
      if (gateT <= 0) { gateT = 3.2; spawnGatePair(-50); }
    }

    // 3. Gates update
    for (let i = gates.length - 1; i >= 0; i--) {
      const gt = gates[i];
      gt.y += 170 * dt;
      if (Math.abs(P.x - gt.x) < gt.w / 2 && Math.abs(P.y - gt.y) < 42) {
        if (gt.color === '#38d39f') {
          P.mult *= 1.5; P.size = clamp(P.size + 0.18, 0.8, 2.2);
          g.score += 45;
          sfx('powerup'); g.flash('#38d39f', 0.25); g.popup('x1.5 POWER!', gt.x, gt.y, '#7dff7d', 42);
        } else {
          P.hp -= 1; P.size = Math.max(0.65, P.size - 0.2);
          sfx('hit'); g.shake(10); g.flash('#ff3b3b', 0.35); g.popup('TRAP GATE!', gt.x, gt.y, '#ff4d6d', 42);
          if (dumb) P.hp = 0;
        }
        gates.splice(i, 1);
      } else if (gt.y > 1020) gates.splice(i, 1);
    }

    // 4. Bullets & Orbit blades
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -20 || b.x > 560 || b.y < -20 || b.y > 980) { bullets.splice(i, 1); continue; }
      for (let j = ents.length - 1; j >= 0; j--) {
        const e = ents[j];
        if (dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
          e.hp -= dumb ? 0.4 : 1.5 * P.mult;
          e.x += b.vx * 0.03; e.y += b.vy * 0.03;
          g.burst(e.x, e.y, 4, { color: '#fff', size: 4 });
          bullets.splice(i, 1);
          if (e.hp <= 0) triggerHook(e, j);
          break;
        }
      }
    }

    // 5. Entities update & collision
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (spawner === 'falling' || spawner === 'clusters') {
        e.x = clamp(e.x + e.vx * dt, 40, 500);
        e.y += (e.vy || 140) * dt;
        if (e.y > 960) { ents.splice(i, 1); continue; }
      } else {
        const a = Math.atan2(P.y - e.y, P.x - e.x);
        const spd = (dumb ? 165 : 105) + g.t * 3;
        e.x += Math.cos(a) * spd * dt;
        e.y += Math.sin(a) * spd * dt;
      }

      // Orbit / Brawler / Vacuum radius
      const reach = (P.r * P.size) + e.r + (controller === 'orbit' ? 38 : 0);
      if (dist(P.x, P.y, e.x, e.y) < reach) {
        if (!dumb && (hook === 'knockback-brawl' || controller === 'orbit' || P.size > 1.25)) {
          triggerHook(e, i);
        } else {
          P.hp -= 1; P.combo = 0;
          sfx('hit'); g.shake(11); g.flash('#ff3b3b', 0.35);
          ents.splice(i, 1);
        }
      }
    }

    // 6. Vacuum Gems
    for (let i = gems.length - 1; i >= 0; i--) {
      const m = gems[i];
      const d = dist(P.x, P.y, m.x, m.y);
      const pull = hook === 'vacuum-collect' ? 320 : 190;
      if (d < pull) {
        m.x = lerp(m.x, P.x, dt * 11);
        m.y = lerp(m.y, P.y, dt * 11);
      } else {
        m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 240 * dt;
      }
      if (d < P.r * P.size + 18) {
        g.score += Math.round(m.val * P.mult);
        sfx('coin', { pitch: comboPitch(P.combo), vol: 0.5 });
        gems.splice(i, 1);
      }
    }

    // 7. Win / Lose checks
    if (dumb && g.t > 3.6) P.hp = 0;
    if (P.hp <= 0) g.end({ win: false, score: g.score, label: 'SCORE' });
    else if (g.score >= winScore || (!dumb && g.t >= roundSec)) g.end({ win: true, score: Math.max(g.score, winScore), label: 'SCORE' });

    g.hud.l = `SCORE ${Math.round(g.score)}`;
    g.hud.r = `x${P.mult.toFixed(1)} · LVL ${P.lvl}`;
    g.state = { score: Math.round(g.score), hp: P.hp, mult: P.mult, ents: ents.length, combo: P.combo };
  }, ctx => {
    // Background arena grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    const off = (g.t * 90) % 60;
    for (let x = 0; x <= 540; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 960); ctx.stroke(); }
    for (let y = off; y <= 960; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(540, y); ctx.stroke(); }

    // Gates
    for (const gt of gates) {
      ctx.fillStyle = gt.color;
      ctx.globalAlpha = 0.82;
      ctx.beginPath(); ctx.roundRect(gt.x - gt.w / 2, gt.y - gt.h / 2, gt.w, gt.h, 14); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.stroke();
      g.text(gt.label, gt.x, gt.y + 11, { size: 30, align: 'center' });
    }

    // Gems
    for (const m of gems) coin(ctx, m.x, m.y, m.r, g.t);

    // Bullets
    for (const b of bullets) star(ctx, b.x, b.y, b.r, accent);

    // Enemies
    for (const e of ents) {
      drawChar(e.kind, ctx, e.x, e.y + e.r * 0.6, e.r * 2.2, { color: e.color, t: g.t, anim: 'walk', dir: e.x < P.x ? 1 : -1 });
    }

    // Orbiting blades if orbit or high level
    const blades = controller === 'orbit' ? 3 : Math.min(3, P.lvl - 1);
    for (let k = 0; k < blades; k++) {
      const a = P.angle + (k * Math.PI * 2) / blades;
      star(ctx, P.x + Math.cos(a) * (58 * P.size), P.y - 24 + Math.sin(a) * (58 * P.size), 14, accent);
    }

    // Hero
    drawChar(heroKind, ctx, P.x, P.y + 18, 68 * P.size, { color: heroColor, t: g.t, anim: 'walk', dir: 1 });

    // Hearts bar
    for (let i = 0; i < P.maxHp; i++) heart(ctx, 38 + i * 36, 92, 16, i < P.hp ? '#ff4d6d' : '#333a4a');
  });

  return g;
}
