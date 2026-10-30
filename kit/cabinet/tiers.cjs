// Parity check: do all tiers of a game play out identically?  node tiers.cjs g17 g17.hd g17b.hd g17c.art g17d.art [--seeds 1,2,3] [--frames 3600]
// Each arg is out/<arg>.html (build first: python3 build.py g17 [--hd|--art]). Runs the bot on a fixed seed and compares the sim state at checkpoints.
// Tiers that intentionally change rules (e.g. g17e: no pause menu, analog move) must be listed under --expect-diff so the difference is stated, not hidden.
const { chromium } = require('playwright'); const path = require('path');
const A = process.argv.slice(2); const val = k => { const i = A.indexOf(k); return i < 0 ? null : A.splice(i, 2)[1]; };
const seeds = (val('--seeds') || '1,2,3').split(',').map(Number), frames = +(val('--frames') || 3600), diff = (val('--expect-diff') || '').split(',').filter(Boolean);
const keys = A, CP = [600, 1800, frames];
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const seed of seeds) { const rows = {};
    for (const k of keys) { const pg = await b.newPage({ viewport: { width: 400, height: 760 } }), errs = []; pg.on('pageerror', e => errs.push(e.message));
      await pg.addInitScript(() => { window.__norun = true; window.__now = 0; });
      await pg.goto('file://' + path.resolve(__dirname, 'out', k + '.html') + '?seed=' + seed); await pg.waitForTimeout(200);
      await pg.evaluate(() => { window.__shell.start(); window.__shell.bot(true); });
      const out = []; let done = 0;
      for (const c of CP) { await pg.evaluate(n => { for (let i = 0; i < n; i++) { window.__shell.step(); if (i % 20 === 0) window.__shell.render(); } }, c - done); done = c;
        const i = await pg.evaluate(() => window.__shell.info()); out.push(`${i.mode}|lvl${i.lvl}|hp${i.hp}|sc${i.score}|k${i.kills ?? ''}`); }
      rows[k] = { sig: out.join(' > '), errs }; await pg.close(); }
    const base = rows[keys[0]].sig; console.log(`seed ${seed}`);
    for (const k of keys) { const r = rows[k], same = r.sig === base, ex = diff.includes(k.split('.')[0]), tag = r.errs.length ? 'ERROR ' + r.errs[0] : same ? 'same' : ex ? 'differs (expected)' : 'DIFFERS';
      if (r.errs.length || (!same && !ex)) bad++; console.log(`  ${k.padEnd(10)} ${tag.padEnd(20)} ${r.sig}`); } }
  await b.close(); console.log(bad ? `FAIL: ${bad} unexpected mismatch(es)` : 'OK: tiers match'); process.exit(bad ? 1 : 0); })();
