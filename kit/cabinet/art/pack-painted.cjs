// Drop AI-painted raster parts into the game:  node art/pack-painted.cjs
// Looks for art/painted/<set>/<part>.png (set = hero|zombie|elite|zombieR|zombieT|queen|gun|envF|envW|envP, part per docs/ART-CONVENTIONS.md; single images use all.png)
// and OVERRIDES the matching atlas keys "<set>.<part>" in art/atlas.json (run build-art.cjs first so every other key still exists).
// Every PNG must be transparent and have the SAME aspect as the set's SVG viewBox (character 120:150, queen 160:140, floor 1:1, wall 32:18, props 10:3, gun 3:1),
// all parts of one character at the same pixel size (e.g. 960x1200), drawn in the neutral pose exactly where the part sits on the full body.
const fs = require('fs'), path = require('path');
const VB = { hero:[120, 150], zombie:[120, 150], elite:[120, 150], zombieR:[120, 150], zombieT:[120, 150], queen:[160, 140], gun:[90, 30], envF:[32, 32], envW:[32, 18], envP:[160, 48] };
const A = path.resolve(__dirname, 'atlas.json'), atlas = JSON.parse(fs.readFileSync(A, 'utf8')), root = path.resolve(__dirname, 'painted'); let n = 0;
if (!fs.existsSync(root)) { console.log('no art/painted folder'); process.exit(0); }
for (const set of fs.readdirSync(root)) { const dir = path.join(root, set); if (!fs.statSync(dir).isDirectory()) continue; if (!VB[set]) { console.log('unknown set', set); continue; }
  for (const f of fs.readdirSync(dir)) { if (!f.endsWith('.png')) continue; const buf = fs.readFileSync(path.join(dir, f)), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), [vw, vh] = VB[set];
    if (Math.abs(w / h - vw / vh) > 0.02) { console.log(`SKIP ${set}/${f}: ${w}x${h} aspect != ${vw}:${vh}`); continue; }
    atlas[`${set}.${f.replace('.png', '')}`] = { url: 'data:image/png;base64,' + buf.toString('base64'), w: vw, h: vh }; n++; } }
fs.writeFileSync(A, JSON.stringify(atlas)); console.log('packed', n, 'painted parts into atlas.json');
