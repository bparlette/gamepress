#!/usr/bin/env python3
"""Compose the progression reel recorded by video/prog.cjs:  python3 prog.py <prog-frames-dir> <out.mp4>
Part 1: 7 x 1 s zoom clips (hero + enemies, one per edition).  Part 2: 7 x ~2.8 s centred gameplay of the same run per edition.
Part 3: ~20 s finale of the best edition with a cinematic camera (starts centred on the hero, then roams: wide, pan to boss, punch-ins). 1080x1920, chiptune + sfx."""
import json, os, sys, subprocess, wave, math, shutil, numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.abspath(sys.argv[1]); OUT = os.path.abspath(sys.argv[2])
_a = sys.argv; sys.argv = ['mk2', 'x.mp4']; exec(open(here + '/mk2.py').read().split('def best_window')[0]); sys.argv = _a   # reuse audio() + helpers
FONT = here + '/press.ttf'
SEGS = [('PIXEL 8-BIT', '256x224 - 16 colors'), ('PAINTED HD', 'gradients - soft light'), ('GAME FEEL', 'shake - squash - juice'), ('SVG RIG + WEBGL', 'skeletal cast - bloom'), ('DYNAMIC LIGHTS', 'SVG world - live lights'), ('CLOSE CAMERA', 'full-screen tall - big cast'), ('FULL WORLD', 'variants - FX - depth')]
def dt(txt, size, y, col='white', en=None):
    t = txt.replace(':', '\\:').replace("'", '')
    return f"drawtext=fontfile={FONT}:text='{t}':fontsize={size}:fontcolor={col}:x=(w-text_w)/2:y={y}:borderw=6:bordercolor=black" + (f":enable='{en}'" if en else '')
def wavout(a, path):
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32000).astype(np.int16).tobytes()); w.close()
def enc(frames_pat, wavp, vf, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', frames_pat, '-i', wavp, '-vf', vf, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '21', '-c:a', 'aac', '-ar', '44100', '-ac', '1', '-shortest', out], check=True)
parts = []
m1 = json.load(open(f'{P}/seg_1.json')); mus = {'music': m1['music'], 'sfx': []}
# ---- part 1: zoom clips ----
for i, (name, sub) in enumerate(SEGS):
    n = i + 1; wavout(audio(mus, 0, 60, False), f'{P}/z{n}.wav')
    lab = [dt(f'{n} / 7', 34, 70, '#f8b800'), dt(name, 56, 130), dt('ZOOM: HERO + ENEMIES', 26, 1790, '#9fe8ff')]
    if i == 0: lab.append(dt('SAME GAME - 7 LEVELS OF POLISH', 28, 1700, 'white'))
    vf = f"scale=1080:1080:flags={'neighbor' if i == 0 else 'bicubic'},pad=1080:1920:0:(oh-ih)/2:black," + ','.join(lab)
    out = f'{P}/z{n}.mp4'; enc(f'{P}/zoom_{n}/%05d.jpg', f'{P}/z{n}.wav', vf, out); parts.append(out)
# ---- part 2: centred gameplay per edition ----
for i, (name, sub) in enumerate(SEGS):
    n = i + 1; m = json.load(open(f'{P}/seg_{n}.json')); nimg = len(os.listdir(f'{P}/seg_{n}')); wavout(audio(m, m['start'], nimg * 2, False), f'{P}/s{n}.wav')
    sc = 'scale=1080:1500:force_original_aspect_ratio=decrease:flags=' + ('neighbor' if i == 0 else 'bicubic')
    vf = f"{sc},pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black," + ','.join([dt(f'{n} / 7', 34, 70, '#f8b800'), dt(name, 56, 130), dt(sub, 28, 1790, '#9fe8ff')])
    out = f'{P}/s{n}.mp4'; enc(f'{P}/seg_{n}/%05d.jpg', f'{P}/s{n}.wav', vf, out); parts.append(out)
# ---- part 3: cinematic finale ----
F = json.load(open(f'{P}/finale.json')); tr = F['track']; N = len(tr); cut = F['cut']; fd = f'{P}/fin_out'; shutil.rmtree(fd, ignore_errors=True); os.makedirs(fd)
src0 = Image.open(f'{P}/finale/00000.jpg'); SW, SH = src0.size; K = SW / 256
def pos(i, which):
    t = tr[i]; cam = t.get('cam'); hh = t.get('hh') or 224; wx, wy = (t['px'], t['py']) if which == 'h' else (t['bx'], t['by'])
    if which == 'b' and wx < 0: wx, wy = t['px'], t['py']
    if cam: return ((wx - cam['cx']) * cam['z'] + 128 + cam['ox']) * K, ((wy - cam['cy']) * cam['z'] + hh / 2 + cam['oy']) * K
    return wx * K, wy * K
ease = lambda x: x * x * (3 - 2 * x); lerp = lambda a, b, x: a + (b - a) * x
for i in range(N):
    t = (i % cut) / 30.0 if False else i / 30.0; hx, hy = pos(i, 'h'); bx, by = pos(i, 'b'); mx, my = SW / 2, SH / 2
    if i < cut:   # part A: start centred on the hero, widen, orbit
        if t < 3: z, cx, cy = 1.8, hx, hy
        elif t < 7: k = ease((t - 3) / 4); z, cx, cy = lerp(1.8, 1.15, k), lerp(hx, mx, k), lerp(hy, my, k)
        else: k = ease((t - 7) / 3); z, cx, cy = lerp(1.15, 1.6, k), lerp(mx, hx, k) + 70 * math.sin(t * 1.3), lerp(my, hy, k) + 90 * math.cos(t * 1.1)
    else:         # part B: boss fight
        u = t - 10
        if u < 3: k = ease(u / 3); z, cx, cy = lerp(1.1, 1.5, k), lerp(mx, bx, k), lerp(my, by, k)
        elif u < 7: k = ease((u - 3) / 4); z, cx, cy = lerp(1.5, 1.7, k), lerp(bx, (hx + bx) / 2, k), lerp(by, (hy + by) / 2, k)
        else: k = ease((u - 7) / 3); z, cx, cy = lerp(1.7, 2.1, k), lerp((hx + bx) / 2, bx, k), lerp((hy + by) / 2, by, k)
    cx += 6 * math.sin(i * 0.7); cy += 6 * math.cos(i * 0.5)   # handheld
    cw = SW / z; ch = cw * 16 / 9; x0 = min(max(cx - cw / 2, 0), SW - cw); y0 = cy - ch / 2
    if ch <= SH: y0 = min(max(y0, 0), SH - ch)
    else: y0 = (SH - ch) / 2
    im = Image.open(f'{P}/finale/{i:05d}.jpg').crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((1080, 1920), Image.LANCZOS); im.save(f'{fd}/{i:05d}.jpg', quality=93)
mf = {'music': F['music'], 'sfx': F['sfx']}
aud = np.concatenate([audio(mf, F['start'], F['len'], False)[:int(SR * cut / 30)], audio(mf, F['start'] + F['len'] + F['gap'], F['len'], False)[:int(SR * (N - cut) / 30)]]); wavout(aud, f'{P}/fin.wav')
vf = ','.join([dt('BEST VERSION', 44, 90, '#f8b800', 'lt(t,1.8)'), dt('VAMPIRE METROID', 52, 1780, 'white', 'gt(t,17.8)')])
enc(f'{fd}/%05d.jpg', f'{P}/fin.wav', vf, f'{P}/finale.mp4'); parts.append(f'{P}/finale.mp4')
open(f'{P}/list.txt', 'w').write(''.join(f"file '{x}'\n" for x in parts))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{P}/list.txt', '-c', 'copy', OUT], check=True); print('wrote', OUT)
