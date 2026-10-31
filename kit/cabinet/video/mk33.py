#!/usr/bin/env python3
"""Compose the Trick or Treat House promo (1080x1920, 30 fps): python3 video/mk33.py out.mp4  (needs /tmp/g33vid from rec33.cjs). Captions react to events in meta.json."""
import json, sys, os, subprocess, wave, bisect, numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); OUTD = os.environ.get('OUT', '/tmp/g33vid'); out = sys.argv[1]
src = open(here + '/mk2.py').read(); src = src[:src.index('def best_window')]
sys.argv = ['mk2', 'x', 'g33']; ns = {'__file__': here + '/mk2.py'}; exec(src, ns)           # reuse the chiptune synth (tone, noi, audio)
tone, noi, audio, SR = ns['tone'], ns['noi'], ns['audio'], ns['SR']
M = json.load(open(OUTD + '/meta.json')); meta = M['meta']; N = len(meta); FPS = 30; W, H = 1080, 1920
F = lambda s: ImageFont.truetype(here + '/press.ttf', s)
ORG, YEL, RED, WHT, CYN, PUR = (255, 150, 30), (255, 220, 60), (235, 50, 50), (255, 255, 255), (90, 220, 255), (150, 90, 230)
cum = np.cumsum([m['tpf'] for m in meta]) / 60.0                       # game seconds at the end of each video frame
# ---- events from meta
joins = [(i, meta[i]['fam']) for i in range(1, N) if meta[i]['fam'] > meta[i - 1]['fam']]
steals = [i for i in range(1, N) if meta[i]['stash'] < meta[i - 1]['stash']]
mega0 = next((i for i in range(N) if meta[i]['mega'] >= 0), None); megaEnd = next((i for i in range(mega0 or 0, N) if mega0 is not None and meta[i]['mega'] < 0), None)
start = next((i for i in range(N) if meta[i]['m'] == 'play'), 45)
NAMES = {1: 'BIG SISTER JOINS!', 2: 'MOM JOINS!', 3: 'DAD JOINS!', 4: 'BABY JOINS!'}
# ---- audio: music for the whole video, sfx only where the game runs in real time
dur = N / FPS + 0.5; mus = dict(M); mus['sfx'] = []
bm = audio(mus, 0, int(dur * 60), False); bs = np.zeros(len(bm) + SR)
for e in M['sfx']:
    t = e['t'] + e['delay']; fi = bisect.bisect_left(cum, t)
    if fi >= N or meta[fi]['tpf'] > 2: continue
    at = fi / FPS
    if e['k'] == 'tone': tone(bs, at, e['freq'], e['dur'], e['type'], e['vol'], e['slide'])
    else: noi(bs, at, e['dur'], e['vol'])
for i in steals: tone(bs, i / FPS, 220, .25, 'sawtooth', .5, -140); tone(bs, i / FPS + .12, 165, .3, 'sawtooth', .5, -90)
for i, k in joins:
    for j, s in enumerate([0, 4, 7, 12, 16]): tone(bs, i / FPS + j * .09, 523 * 2 ** (s / 12), .2, 'square', .4)
if mega0 is not None: [tone(bs, mega0 / FPS + j * .22, 90 - j * 8, .4, 'sawtooth', .6, -30) for j in range(4)]
if megaEnd is not None:
    for j, s in enumerate([0, 4, 7, 12, 16, 19, 24]): tone(bs, megaEnd / FPS + j * .1, 523 * 2 ** (s / 12), .3, 'square', .45)
nz = lambda x: x / (np.max(np.abs(x)) + 1e-9); n = int(dur * SR); mix = (.42 * nz(bm[:n]) + .9 * nz(bs[:n])) if np.max(np.abs(bs)) > 0 else .5 * nz(bm[:n])
mix[:SR // 10] *= np.linspace(0, 1, SR // 10); mix[-SR // 3:] *= np.linspace(1, 0, SR // 3); mix = np.tanh(mix * 1.3) * .85
wv = out + '.wav'; w = wave.open(wv, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
# ---- video
def center(d, s, y, size, col, sh=(0, 0, 0), maxw=1020):
    f = F(size)
    while d.textlength(s, font=f) > maxw and size > 20: size -= 2; f = F(size)
    x = (W - d.textlength(s, font=f)) / 2; o = max(3, size // 9)
    for dx, dy in ((o, o), (-o, o), (o, -o), (-o, -o), (0, o), (0, -o), (o, 0), (-o, 0)): d.text((x + dx, y + dy), s, font=f, fill=sh)
    d.text((x, y), s, font=f, fill=col)
im0 = Image.open(f'{OUTD}/frames/f00000.jpg'); gw, gh = im0.size; sc = min(W / gw, 1640 / gh); GW, GH = int(gw * sc), int(gh * sc); GX, GY = (W - GW) // 2, 160 + (1640 - GH) // 2
bg = Image.new('RGB', (W, H), (14, 10, 24)); bd = ImageDraw.Draw(bg)
for y in range(H): bd.line([(0, y), (W, y)], fill=(14 + y // 90, 8 + y // 160, 28 + y // 60))
PV = [int(x) for x in os.environ.get('PREVIEW', '').split(',') if x]
ff = None if PV else subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wv, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out + '.tmp.mp4'], stdin=subprocess.PIPE)
def hook(i):
    if i < start: return ('THEY\'RE COMING', 'FOR OUR CANDY...')
    if megaEnd is not None and i >= megaEnd: return ('WE DID IT!!', 'MEGA DINO DOWN')
    if mega0 is not None and i >= mega0: return ('MEGA DINO', '135 HITS TO KILL')
    if joins and i >= joins[-1][0]: return ('WHOLE FAMILY', 'DEFENDS THE HOUSE')
    if joins and i >= joins[0][0] - 20: return ('THE FAMILY', 'FIGHTS BACK')
    if steals and i >= steals[0] - 10 and i < (joins[0][0] if joins else N): return ('THEY STOLE', 'OUR CANDY!!')
    return ('TRICK OR TREAT', 'HOUSE DEFENSE')
for i in range(N):
    if PV and i not in PV: continue
    fr = bg.copy(); g = Image.open(f'{OUTD}/frames/f{i:05d}.jpg').convert('RGB').resize((GW, GH), Image.LANCZOS)
    pop = None
    for j, k in joins:
        if 0 <= i - j < 80: pop = (NAMES[k], i - j, (YEL, ORG))
    if pop is None and mega0 is not None and 0 <= i - mega0 < 75: pop = ('MEGA DINO APPEARS!', i - mega0, (RED, YEL))
    if megaEnd is not None and 0 <= i - megaEnd < 90: pop = ('135 HITS! DEFEATED!', i - megaEnd, (CYN, WHT))
    shake = 0
    for s in steals:
        if 0 <= i - s < 14: shake = (14 - (i - s)) // 2
    fr.paste(g, (GX + (shake if (i // 2) % 2 else -shake), GY)); d = ImageDraw.Draw(fr); d.fontmode = '1'
    a, b2 = hook(i); center(d, a, 28, 76, YEL, (110, 30, 0)); center(d, b2, 112, 52, WHT, (0, 0, 0))
    if any(0 <= i - s < 40 for s in steals):
        k = [s for s in steals if 0 <= i - s < 40][-1]; q = (i - k) / 40
        if int(q * 12) % 2 == 0: center(d, 'CANDY STOLEN!', GY + 120, 80, RED, (0, 0, 0))
        center(d, '-%d CANDY' % (meta[k - 1]['stash'] - meta[k]['stash']), GY + 250, 44, ORG)
    if pop:
        name, t, (c1, c2) = pop; z = min(1, t / 8); yy = GY + GH - 330 - int(10 * np.sin(t / 3)); center(d, name, yy, int(86 * (0.6 + 0.4 * z)), c1 if (t // 4) % 2 else c2, (0, 0, 0))
    m = meta[i]
    if m['mega'] >= 0: center(d, 'MEGA DINO  %d / 135' % (135 - m['mega']), 1832, 44, YEL if (i // 6) % 2 else RED); bw = 900; d.rectangle([90, 1810, 90 + bw, 1824], fill=(40, 20, 20)); d.rectangle([90, 1810, 90 + int(bw * (135 - m['mega']) / 135), 1824], fill=RED)
    else: center(d, 'CANDY STASH  ' + str(m['stash']), 1832, 44, ORG if m['stash'] > 4 else RED)
    if m['tpf'] >= 4 and m['m'] == 'play' and i < N - 100: center(d, 'FAST FORWARD >>', GY + GH - 70, 36, CYN)
    if i >= N - 90: center(d, 'PLAY FREE - LINK IN DESCRIPTION', 1760, 34, WHT)
    if PV: fr.save(f'{OUTD}/pv_{i}.png'); continue
    ff.stdin.write(np.asarray(fr).tobytes())
if PV: sys.exit(0)
ff.stdin.close(); ff.wait(); os.rename(out + '.tmp.mp4', out); os.remove(wv); print('wrote', out, N / FPS, 's')
