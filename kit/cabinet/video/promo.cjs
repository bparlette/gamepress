// Spec-driven promo capture (any cabinet game): node video/promo.cjs video/specs/<game>.json   -> $OUT/frames/*.jpg + meta.json
// The spec says WHEN things happen (JS expressions over i = info() now, p = info() last frame, f = frame, seen = events fired so far, botOn, slow, ticks).
// See video/specs/g33.json (every feature) and s1.json (minimal). Compose with: python3 video/promo.py <spec> out.mp4
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const OUT = process.env.OUT || '/tmp/promo_' + path.basename(process.argv[2], '.json'); const dir = OUT + '/frames';
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ex = src => new Function('i', 'p', 'f', 'seen', 'botOn', 'slow', 'ticks', 'd', 'return (' + src + ')');
  const E = (spec.events || []).map(e => ({ ...e, fn: ex(e.when) })), botFn = ex(spec.botWhen || 'false'), rateFn = ex(spec.rate || '2');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__norun = true; window.__log = []; window.__now = 0; });
  await pg.goto('file://' + path.resolve(__dirname, '../out/' + spec.game + '.html') + '?' + (spec.query || 'seed=1')); await pg.evaluate(() => document.fonts.load('8px "Press Start 2P"')); await pg.waitForTimeout(500);
  const meta = [], events = [], seen = {}; let started = false, botOn = false, slow = 0, ticks = 0, prev = null, endAt = -1, held = false;
  for (let f = 0; f < (spec.maxFrames || 2400); f++) {
    const i = await pg.evaluate(() => window.__shell.info()); const p = prev || i;
    if (f === (spec.titleFrames || 45) && !started) { started = true; await pg.evaluate(() => window.__shell.start()); if (spec.hold) { await pg.keyboard.down(spec.hold.key); held = true; } }
    let tpf = 2;
    if (started && i.mode === 'play') {
      for (const e of E) { let hit = false; try { hit = !!e.fn(i, p, f, seen, botOn, slow, ticks, { stash: p.stash - i.stash }); } catch (_) {}
        if (hit) { seen[e.name] = (seen[e.name] || 0) + 1; events.push({ f, name: e.name, pop: e.pop, sub: e.sub && e.sub.replace(/\{d\.(\w+)\}/g, (_, k) => ({ stash: p.stash - i.stash })[k]), shake: e.shake || 0, sound: e.sound, color: e.color }); if (e.slow) slow = Math.max(slow, e.slow); } }
      if (!botOn) { ticks += 2; if (held && spec.hold.releaseAfterTicks && ticks > spec.hold.releaseAfterTicks) { await pg.keyboard.up(spec.hold.key); held = false; } try { if (botFn(i, p, f, seen, botOn, slow, ticks, {})) { botOn = true; if (held) { await pg.keyboard.up(spec.hold.key); held = false; } await pg.evaluate(() => window.__shell.bot(true)); } } catch (_) {} }
      try { tpf = Math.max(1, Math.round(rateFn(i, p, f, seen, botOn, slow, ticks, {}))); } catch (_) {} if (slow > 0) { tpf = Math.min(tpf, 2); slow--; }
    }
    if (spec.end && endAt < 0) { if (spec.end.afterEvent && seen[spec.end.afterEvent]) endAt = f + spec.end.frames; if (spec.end.afterMode && i.mode === spec.end.afterMode) endAt = f + spec.end.frames; }
    const r = await pg.evaluate(t => { const s = window.__shell; for (let k = 0; k < t; k++) s.step(); s.render(); return { u: (document.getElementById('gl') || document.getElementById('screen')).toDataURL('image/jpeg', 0.88), i: s.info() }; }, tpf);
    fs.writeFileSync(`${dir}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(r.u.split(',')[1], 'base64')); meta.push({ tpf, i: r.i }); prev = i;
    if (endAt >= 0 && f >= endAt) break;
  }
  const o = await pg.evaluate(() => ({ sfx: window.__log, music: window.__shell.music() }));
  fs.writeFileSync(OUT + '/meta.json', JSON.stringify({ spec, meta, events, sfx: o.sfx, music: o.music }));
  console.log('frames', meta.length, 'events', JSON.stringify(Object.fromEntries(Object.entries(seen))), 'errs', JSON.stringify(errs.slice(0, 2))); await b.close();
})();
