#!/usr/bin/env python3
"""Compose a 1080x1920 30 fps promo from promo.cjs output: python3 video/promo.py <spec.json> out.mp4   (PREVIEW=12,300 dumps those frames as PNG instead)
Everything game-specific comes from the spec: hooks (headline by last event seen), event pops/sub-captions/shake, HUD format, CTA. Sound: game music + game sfx at real-time
frames + a small preset per event (hurt / jingle / boom)."""
import json, sys, os, subprocess, wave, bisect, numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); specf, out = sys.argv[1], sys.argv[2]
OUTD = os.environ.get('OUT', '/tmp/promo_' + os.path.basename(specf)[:-5])
src = open(here + '/mk2.py').read(); src = src[:src.index('def best_window')]
sys.argv = ['mk2', 'x', 'g1']; ns = {'__file__': here + '/mk2.py'}; exec(src, ns)
tone, noi, audio, SR = ns['tone'], ns['noi'], ns['audio'], ns['SR']
M = json.load(open(OUTD + '/meta.json')); spec = M['spec']; meta = M['meta']; EV = M['events']; N = len(meta); FPS = 30; W, H = 1080, 1920
F = lambda s: ImageFont.truetype(here + '/press.ttf', s)
COL = {'yel': (255, 220, 60), 'org': (255, 150, 30), 'red': (235, 50, 50), 'cyn': (90, 220, 255), 'wht': (255, 255, 255)}
cum = np.cumsum([m['tpf'] for m in meta]) / 60.0
start = next((i for i in range(N) if meta[i]['i']['mode'] == 'play'), 0)
dur = N / FPS + .5; mus = {'music': M['music'], 'sfx': []}; bm = audio(mus, 0, int(dur * 60), False); bs = np.zeros(len(bm) + SR)
for e in M['sfx']:
    fi = bisect.bisect_left(cum, e['t'] + e['delay'])
    if fi >= N or meta[fi]['tpf'] > 2: continue
    (tone(bs, fi / FPS, e['freq'], e['dur'], e['type'], e['vol'], e['slide']) if e['k'] == 'tone' else noi(bs, fi / FPS, e['dur'], e['vol']))
for e in EV:
    t = e['f'] / FPS; s = e.get('sound')
    if s == 'hurt': tone(bs, t, 220, .25, 'sawtooth', .5, -140); tone(bs, t + .12, 165, .3, 'sawtooth', .5, -90)
    elif s == 'jingle': [tone(bs, t + j * .09, 523 * 2 ** (n / 12), .2, 'square', .4) for j, n in enumerate([0, 4, 7, 12, 16])]
    elif s == 'boom': [tone(bs, t + j * .22, 90 - j * 8, .4, 'sawtooth', .6, -30) for j in range(4)]
nz = lambda x: x / (np.max(np.abs(x)) + 1e-9); n = int(dur * SR); mix = (.42 * nz(bm[:n]) + .9 * nz(bs[:n])) if np.max(np.abs(bs)) > 0 else .5 * nz(bm[:n])
mix[:SR // 10] *= np.linspace(0, 1, SR // 10); mix[-SR // 3:] *= np.linspace(1, 0, SR // 3); mix = np.tanh(mix * 1.3) * .85
wv = out + '.wav'; w = wave.open(wv, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
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
ff = None if PV else subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wv, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', out + '.tmp.mp4'], stdin=subprocess.PIPE)
last_ev = lambda i, name: max((e['f'] for e in EV if e['name'] == name and e['f'] <= i), default=None)
def hook(i):
    best = None
    for h in spec.get('hooks', []):
        if 'after' not in h: cand = (-1, h['text'])
        else:
            t = last_ev(i + (10 if h.get('lead') else 0), h['after']); cand = (t, h['text']) if t is not None else None
        if cand and (best is None or cand[0] >= best[0]): best = cand
    return best[1] if best else (spec.get('title', 'NEW GAME'), '')
for i in range(N):
    if PV and i not in PV: continue
    g = Image.open(f'{OUTD}/frames/f{i:05d}.jpg').convert('RGB').resize((GW, GH), Image.LANCZOS); fr = bg.copy()
    act = [e for e in EV if 0 <= i - e['f'] < 80]; shake = 0
    for e in act:
        if e.get('shake') and i - e['f'] < 14: shake = max(shake, (e['shake'] - (i - e['f'])) // 2 if e['shake'] > 14 else (14 - (i - e['f'])) // 2)
    fr.paste(g, (GX + (shake if (i // 2) % 2 else -shake), GY)); d = ImageDraw.Draw(fr); d.fontmode = '1'
    a, b2 = hook(i); center(d, a, 28, 76, COL['yel'], (110, 30, 0)); center(d, b2, 112, 52, COL['wht'])
    for e in act:
        if e.get('pop'):
            t = i - e['f']; z = min(1, t / 8); c1, c2 = COL.get(e.get('color', 'yel')), COL['wht']
            center(d, e['pop'], GY + GH - 330 - int(10 * np.sin(t / 3)), int(86 * (.6 + .4 * z)), c1 if (t // 4) % 2 else c2)
        if e.get('sub') and i - e['f'] < 40: center(d, e['sub'], GY + 250, 44, COL['org'])
    I = meta[i]['i']; hud = spec.get('hud')
    if hud:
        try: center(d, hud.format(**{k: v for k, v in I.items() if isinstance(v, (int, float, str))}), 1832, 44, COL['org'])
        except Exception: pass
    if meta[i]['tpf'] >= 4 and I['mode'] == 'play' and i < N - 100: center(d, 'FAST FORWARD >>', GY + GH - 70, 36, COL['cyn'])
    if i >= N - 90 and spec.get('cta'): center(d, spec['cta'], 1760, 34, COL['wht'])
    if PV: fr.save(f'{OUTD}/pv_{i}.png'); continue
    ff.stdin.write(np.asarray(fr).tobytes())
if PV: sys.exit(0)
ff.stdin.close(); ff.wait(); os.rename(out + '.tmp.mp4', out); os.remove(wv); print('wrote', out, round(N / FPS, 1), 's')
