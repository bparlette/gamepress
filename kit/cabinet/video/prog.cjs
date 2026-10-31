// Progression reel recorder: node video/prog.cjs <out-dir> <seed>
// Per edition (same fixed-seed bot run => similar play): seg_N = gameplay window, zoom_N = 1 s crop around the hero (+ nearby enemies) from a sharper capture.
// finale = long run of the best edition at K=4 with a per-frame track of hero/boss screen positions for the cinematic camera in prog.py.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '../out/frames/prog')), SEED = process.argv[3] || '7';
const SEGS = [['g17', 0], ['g17.hd', 0], ['g17b.hd', 1.045], ['g17c.art', 1.045], ['g17d.art', 0], ['g17e.art', 0], ['g17f.art', 0]]; // [file, fixed zoom for editions without a published camera]
const START = +(process.env.START || 30), LEN = +(process.env.LEN || 170), ZSTART = +(process.env.ZSTART || 330), FIN = process.env.FIN_START ? +process.env.FIN_START : 0, FIN2 = +(process.env.FIN2 || 1250), FINLEN = +(process.env.FINLEN || 600);  // frames are sim steps; hero is centred until ~250 and the first level-up pause is at ~248
const HERO = `(i, fz) => { const HH = i.hh || 224; let z = 1, cx = 128, cy = HH / 2, ox = 0, oy = 0, wx = i.px, wy = i.py;
  if (i.cam) { z = i.cam.z; cx = i.cam.cx; cy = i.cam.cy; ox = i.cam.ox; oy = i.cam.oy; return { sx: (wx - cx) * z + 128 + ox, sy: (wy - cy) * z + HH / 2 + oy, z }; }
  if (fz) { const ccx = 128 + (wx - 128) * 0.035, ccy = 112 + (wy - 112) * 0.035; return { sx: (wx - ccx) * fz + 128, sy: (wy - ccy) * fz + 112, z: fz }; }
  return { sx: wx, sy: wy, z: 1 }; }`;
async function open(name, K) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  await pg.addInitScript(k => { window.__norun = true; window.__log = []; window.__now = 0; if (k) window.HD_K = k; }, K || 0);
  await pg.goto('file://' + path.resolve(__dirname, '../out', name + '.html') + '?seed=' + SEED); await pg.evaluate(() => document.fonts.load('8px "Press Start 2P"')); await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__shell.start(); window.__shell.bot(true); }); return [b, pg]; }
const GRAB = `(s) => { for (let i = 0; i < s; i++) window.__shell.step(); window.__shell.render(); return (document.getElementById('gl') || document.getElementById('screen')).toDataURL('image/jpeg', 0.92); }`;
async function seg(name, fz, n) {
  const dir = `${OUT}/seg_${n}`, zdir = `${OUT}/zoom_${n}`; for (const d of [dir, zdir]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
  let [b, pg] = await open(name, 0);
  await pg.evaluate(k => { for (let i = 0; i < k; i++) window.__shell.step(); window.__shell.render(); }, START);
  let c = 0; for (let f = 0; f < LEN; f += 2) { const u = await pg.evaluate(`(${GRAB})(2)`); fs.writeFileSync(`${dir}/${String(c++).padStart(5, '0')}.jpg`, Buffer.from(u.split(',')[1], 'base64')); }
  const o = await pg.evaluate(() => ({ sfx: window.__log, music: window.__shell.music() })); await b.close();
  const art = name.includes('.art'); [b, pg] = await open(name, art ? 6 : 0);
  await pg.evaluate(k => { for (let i = 0; i < k; i++) window.__shell.step(); window.__shell.render(); }, ZSTART);
  let z = 0; for (let f = 0; f < 60; f += 2) {   // 1 s of crops, hero centred
    const u = await pg.evaluate(`(() => { const hero = ${HERO}; for (let i = 0; i < 2; i++) window.__shell.step(); window.__shell.render(); const inf = window.__shell.info(), h = hero(inf, ${fz}), src = document.getElementById('gl') || document.getElementById('screen'), K = src.width / 256, side = 68 * h.z * K, o = document.createElement('canvas'); o.width = o.height = 720; const x = o.getContext('2d'); x.imageSmoothingEnabled = ${art || name.includes('hd') ? 'true' : 'false'}; x.imageSmoothingQuality = 'high'; x.drawImage(src, h.sx * K - side / 2, h.sy * K - side / 2, side, side, 0, 0, 720, 720); return o.toDataURL('image/jpeg', 0.93); })()`);
    fs.writeFileSync(`${zdir}/${String(z++).padStart(5, '0')}.jpg`, Buffer.from(u.split(',')[1], 'base64')); }
  fs.writeFileSync(`${OUT}/seg_${n}.json`, JSON.stringify({ sfx: o.sfx, music: o.music, start: START, len: LEN })); console.log('seg', n, name, c, 'frames', z, 'zoom'); await b.close(); }
async function finale(name) {
  const dir = `${OUT}/finale`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const [b, pg] = await open(name, 4); await pg.evaluate(k => { for (let i = 0; i < k; i++) window.__shell.step(); window.__shell.render(); }, FIN);
  const track = []; let c = 0, sfx = [];
  const part = async (len) => { for (let f = 0; f < len; f += 2) { const r = await pg.evaluate(`(() => { const u = (${GRAB})(2), i = window.__shell.info(); return { u, i: { px: i.px, py: i.py, bx: i.bx, by: i.by, cam: i.cam, hh: i.hh, boss: i.boss, mode: i.mode } }; })()`);
    fs.writeFileSync(`${dir}/${String(c++).padStart(5, '0')}.jpg`, Buffer.from(r.u.split(',')[1], 'base64')); track.push(r.i); } };
  await part(FINLEN); const gap = FIN2 - FIN - FINLEN; await pg.evaluate(k => { for (let i = 0; i < k; i++) window.__shell.step(); }, gap); const cut = c; await part(FINLEN);
  const o = await pg.evaluate(() => ({ sfx: window.__log, music: window.__shell.music() })); fs.writeFileSync(`${OUT}/finale.json`, JSON.stringify({ sfx: o.sfx, music: o.music, start: FIN, len: FINLEN, cut, gap, track })); console.log('finale', c, 'frames, cut at', cut); await b.close(); }
(async () => { fs.mkdirSync(OUT, { recursive: true }); for (let i = 0; i < SEGS.length; i++) await seg(SEGS[i][0], SEGS[i][1], i + 1); if (FIN) await finale('g17f.art'); })();
