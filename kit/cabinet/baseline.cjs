// Whole-cabinet health baseline: node baseline.cjs [ids...]  -> markdown table rows (bot outcome at up to 180 s of game time, page errors).
// Complements seedcheck.cjs (determinism/seed sensitivity) and tiers.cjs (tier parity). Pages: out/<id>.html (art-only games: pass gNN.art).
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const ids = process.argv.slice(2); const b = await chromium.launch(); const rows = [];
  for (const g of ids) { const pg = await b.newPage({ viewport: { width: 400, height: 760 } }), errs = []; pg.on('pageerror', e => errs.push(e.message.split('\n')[0]));
    try { await pg.goto('file://' + __dirname + '/out/' + g + '.html?seed=1'); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => { const s = window.__shell; s.start(); s.bot(true); let t = 0; try { for (; t < 10800; t += 60) { if (s.info().mode !== 'play') break; s.ff(60); } } catch (e) { return { err: String(e.message), t }; } const i = s.info(); return { mode: i.mode, msg: i.result && i.result.msg, score: i.score, t: +(t / 60).toFixed(0) }; });
      rows.push({ g, ...r, errs: errs.slice(0, 1) }); } catch (e) { rows.push({ g, err: String(e.message).split('\n')[0] }); }
    await pg.close(); }
  await b.close(); console.log(JSON.stringify(rows)); })();
