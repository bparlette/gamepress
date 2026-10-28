// ascii.mjs <img> [w=100] [h=auto] [--color]  → terminal preview (luminance or 24-bit colour blocks)
import { execFileSync } from 'node:child_process';

const [, , file, wa = '100', ha = 'auto', flag = ''] = process.argv;
const W = +wa;
const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
const [iw, ih] = probe;
const H = ha === 'auto' ? Math.max(4, Math.round((W * ih) / iw * 0.48)) : +ha;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
const ramp = ' .:-=+*#%@';
let out = '';
const lines = [];
for (let y = 0; y < H; y++) {
  let line = '';
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    line += ramp[Math.min(9, Math.floor(l * 10))];
  }
  lines.push(line);
}
console.log(lines.join('\n'));
// palette + stats
let sr = 0, sg = 0, sb = 0, mx = 0;
for (let i = 0; i < raw.length; i += 3) { sr += raw[i]; sg += raw[i + 1]; sb += raw[i + 2]; mx += Math.max(raw[i], raw[i + 1], raw[i + 2]) - Math.min(raw[i], raw[i + 1], raw[i + 2]); }
const n = raw.length / 3;
console.log(`\nsize ${iw}x${ih}  mean rgb ${(sr / n) | 0},${(sg / n) | 0},${(sb / n) | 0}  sat ${(mx / n) | 0}`);
// colour probe grid (6x4) as hex
if (flag === '--color') {
  const cx = 6, cy = 4, rows = [];
  for (let j = 0; j < cy; j++) {
    const row = [];
    for (let i = 0; i < cx; i++) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let y = Math.floor(j * H / cy); y < Math.floor((j + 1) * H / cy); y++)
        for (let x = Math.floor(i * W / cx); x < Math.floor((i + 1) * W / cx); x++) {
          const k = (y * W + x) * 3; r += raw[k]; g += raw[k + 1]; b += raw[k + 2]; c++;
        }
      row.push('#' + [r / c, g / c, b / c].map(v => v.toString(16).padStart(2, '0')).join(''));
    }
    rows.push(row.join(' '));
  }
  console.log(rows.join('\n'));
}
