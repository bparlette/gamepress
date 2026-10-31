// Screenshot regression: node shots.cjs update|check <id>...   (art-only games: gNN.art)
// Captures the game canvas at fixed sim times (title, 3 s, 20 s bot, 60 s bot) with ?seed=1 and compares to shots/<id>_<n>.png.
// check FAILS when >0.6% of pixels differ by >24/255 in any channel, or the frame is blank / single colour (catches "builds fine, renders black").
// Baselines are committed (kit/cabinet/shots/); after an intended visual change run `update` and eyeball the PNGs before committing.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const [cmd, ...ids] = process.argv.slice(2); const dir = path.join(__dirname, 'shots'); fs.mkdirSync(dir, { recursive: true });
const STOPS = [['title', 0], ['t3', 180], ['t20', 1020], ['t60', 2400]], TOL = 24, MAXFRAC = 0.006;
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const g of ids) { const pg = await b.newPage({ viewport: { width: 400, height: 760 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message.split('\n')[0]));
    await pg.goto('file://' + __dirname + '/out/' + g + '.html?seed=1'); await pg.waitForTimeout(300); await pg.evaluate(() => document.fonts.ready);
    const shots = await pg.evaluate(async stops => { const s = window.__shell, out = {}; const grab = () => { s.render(); const c = document.getElementById('gl') && document.getElementById('gl').width ? document.getElementById('gl') : document.getElementById('screen'); return c.toDataURL('image/png'); };
      out.title = grab(); s.start(); s.bot(true); let t = 0; for (const [n, f] of stops.slice(1)) { while (t < f && s.info().mode === 'play') { s.ff(Math.min(60, f - t)); t += Math.min(60, f - t); } out[n] = grab(); } return out; }, STOPS);
    for (const [n] of STOPS) { const f = path.join(dir, g + '_' + n + '.png'), cur = shots[n];
      if (cmd === 'update') { fs.writeFileSync(f, Buffer.from(cur.split(',')[1], 'base64')); continue; }
      if (!fs.existsSync(f)) { console.log(g, n, 'NO BASELINE'); bad++; continue; }
      const base = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
      const r = await pg.evaluate(async ([a, c, tol]) => { const ld = u => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = u; }); const [A, B] = await Promise.all([ld(a), ld(c)]);
        const cv = (im, w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; const x = k.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
        if (A.width !== B.width || A.height !== B.height) return { size: [A.width, A.height, B.width, B.height] }; const da = cv(A, A.width, A.height), db = cv(B, A.width, A.height); let diff = 0; const cols = new Set();
        for (let i = 0; i < da.length; i += 4) { if (Math.abs(da[i] - db[i]) > tol || Math.abs(da[i + 1] - db[i + 1]) > tol || Math.abs(da[i + 2] - db[i + 2]) > tol) diff++; if (cols.size < 3) cols.add(db[i] + ',' + db[i + 1] + ',' + db[i + 2]); }
        return { frac: diff / (da.length / 4), flat: cols.size < 3 }; }, [base, cur, TOL]);
      const ok = !r.size && r.frac <= MAXFRAC && !r.flat; if (!ok) bad++; console.log(g, n, ok ? 'ok' : 'FAIL', r.size ? 'size changed ' + r.size : (r.frac * 100).toFixed(2) + '% differ' + (r.flat ? ' BLANK' : '')); }
    if (errs.length) { bad++; console.log(g, 'page errors:', errs[0]); } await pg.close(); }
  await b.close(); if (cmd === 'update') console.log('baselines written to', dir); process.exit(bad ? 1 : 0); })();
