// Render rig parts to PNG and pack an atlas: node build-art.cjs  ->  art/atlas.json { "hero.legB": {url, w, h}, ... }
// Each *_rig.svg has <g data-p="part"> groups; every part is rendered alone (same viewBox, transparent) so parts overlay exactly and rotate about pivots.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SETS = { hero:'hero_rig.svg', zombie:'zombie_rig.svg', elite:'elite_rig.svg', queen:'queen.svg', gun:'gun.svg', envF:'env_floor.svg', envW:'env_wall.svg', envP:'env_props.svg' };
(async () => { const b = await chromium.launch(), pg = await b.newPage({ deviceScaleFactor: 1 }), atlas = {};
  for (const [name, f] of Object.entries(SETS)) {
    const svg = fs.readFileSync(path.resolve(__dirname, f), 'utf8'), vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/), w = +vb[1], h = +vb[2], S = 4;
    const parts = [...svg.matchAll(/data-p="(\w+)"/g)].map(m => m[1]); const list = parts.length ? parts : ['all'];
    for (const p of list) {
      const css = parts.length ? `g[data-p]{display:none} g[data-p="${p}"]{display:inline}` : '';
      const html = `<body style="margin:0;background:transparent"><style>${css} svg{width:${w * S}px;height:${h * S}px;display:block}</style>${svg.replace(/width="\d+" height="\d+"/, '')}</body>`;
      await pg.setViewportSize({ width: w * S, height: h * S }); await pg.setContent(html);
      const buf = await pg.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w * S, height: h * S } });
      atlas[`${name}.${p}`] = { url: 'data:image/png;base64,' + buf.toString('base64'), w, h };
    } }
  fs.writeFileSync(path.resolve(__dirname, 'atlas.json'), JSON.stringify(atlas)); console.log(Object.keys(atlas).length, 'parts,', (fs.statSync(path.resolve(__dirname, 'atlas.json')).size / 1024) | 0, 'KB'); await b.close(); })();
