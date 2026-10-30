#!/usr/bin/env python3
"""Compose a Short from 4 recorded games: python3 mk2.py out.mp4 g20 g13 g17 g14   (frames/json in $FR, default /tmp/frames)
Per game: 2 s 'X meets Y' title over dimmed gameplay, then the best 10 s window (most action) with live chiptune + sfx."""
import json, sys, os, subprocess, wave, numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); FR = os.environ.get('FR', '/tmp/frames')
out, ids = sys.argv[1], sys.argv[2:]
GM = {x['id']: x for x in json.load(open(here + '/../games.json'))}
SR = 44100; TF, GF = 120, 600; W, H = 1080, 1920; GX, GY = 28, 420
YEL, RED, CYN, WHT = (248, 184, 0), (216, 40, 0), (60, 188, 252), (252, 252, 252)
F = lambda s: ImageFont.truetype(here + '/press.ttf', s)
def wv(k, ph):
    if k == 'square': return np.sign(np.sin(2 * np.pi * ph))
    if k == 'triangle': return 2 / np.pi * np.arcsin(np.sin(2 * np.pi * ph))
    if k == 'sawtooth': return 2 * (ph % 1) - 1
    return np.sin(2 * np.pi * ph)
rng = np.random.default_rng(3)
def tone(buf, t, f, d, k='square', v=.5, sl=0):
    n = int(d * SR); i0 = int(t * SR)
    if n <= 0 or i0 >= len(buf) or i0 < 0: return
    x = np.arange(n) / SR; f1 = max(30., f + sl) if sl else f
    ff = f * (f1 / f) ** (x / d) if sl else np.full(n, f)
    y = wv(k, np.cumsum(ff) / SR) * v * (0.002) ** (x / d) * np.minimum(1, x / .003); e = min(len(buf), i0 + n); buf[i0:e] += y[:e - i0]
def noi(buf, t, d, v):
    n = int(d * SR); i0 = int(t * SR)
    if n <= 0 or i0 >= len(buf) or i0 < 0: return
    y = (rng.random(n) * 2 - 1) * (1 - np.arange(n) / n) * v; e = min(len(buf), i0 + n); buf[i0:e] += y[:e - i0]
hz = lambda s: 440 * 2 ** (s / 12)
def audio(m, f0, nfr, title):
    dur = nfr / 60; bm = np.zeros(int(SR * (dur + 1))); bs = np.zeros_like(bm); mu = m['music']; six = 60 / mu['bpm'] / 4; t = 0.02; st = 0
    while t < dur:
        ch = mu['chords'][(st // 16) % len(mu['chords'])]; s = st % 16; a = mu['arp'][s]
        if a >= 0: tone(bm, t, hz(ch['tones'][a % len(ch['tones'])] + (12 if a >= len(ch['tones']) else 0) + 12), six * 1.7, mu.get('lead', 'square'), .15)
        if s in mu['bass']: tone(bm, t, hz(ch['root'] + (12 if s % 8 == 6 else 0)), six * 1.8, 'triangle', .5)
        if s in mu['snare']: noi(bm, t, .07, .3)
        if s % 2 == 1 and mu.get('hat'): noi(bm, t, .02, .06)
        if s in mu['kick']: tone(bm, t, 90, .09, 'sine', .7, -50)
        t += six; st += 1
    if title: tone(bs, 0.05, 523, .12, 'square', .3); tone(bs, 0.9, 784, .25, 'square', .3)
    else:
        for e in m['sfx']:
            at = e['t'] + e['delay'] - f0 / 60
            if 0 <= at < dur:
                if e['k'] == 'tone': tone(bs, at, e['freq'], e['dur'], e['type'], e['vol'], e['slide'])
                else: noi(bs, at, e['dur'], e['vol'])
    nz = lambda x: x / (np.max(np.abs(x)) + 1e-9); mix = .5 * nz(bm) + .85 * nz(bs) if np.max(np.abs(bs)) > 0 else .5 * nz(bm)
    mix = mix[:int(dur * SR)]; fd = int(.15 * SR); mix[:fd] *= np.linspace(0, 1, fd); mix[-fd:] *= np.linspace(1, 0, fd); return np.tanh(mix * 1.3)
def best_window(m):
    meta, ev = m['meta'], m['sfx']; n = len(meta); play = [i for i, x in enumerate(meta) if x['m'] == 'play']
    if not play: return 0
    p0, p1 = play[0], min(n, (m['overAt'] if m['overAt'] > 0 else n) + 40); cnt = np.zeros(n + 1)
    for e in ev:
        if e['k'] == 'noise' or e.get('vol', 0) > .15:
            fi = int((e['t'] + e['delay']) * 60)
            if 0 <= fi < n: cnt[fi] += 1
    cs = np.cumsum(cnt); sc = np.array([x['s'] for x in meta], float); best, bv = p0, -1
    for s in range(p0, max(p0 + 1, p1 - GF + 1), 15):
        e = min(n - 1, s + GF); v = (cs[e] - cs[s]) * 10 + (sc[e] - sc[s]) * .1 + (s > p0 + 120) * 5
        if v > bv: bv, best = v, s
    return best
def card(d, s, y, size, col, sh=None):
    f = F(size); x = (W - d.textlength(s, font=f)) / 2
    if sh: d.text((x + size // 8, y + size // 8), s, font=f, fill=sh)
    d.text((x, y), s, font=f, fill=col)
def tpl(title):
    t = Image.new('RGB', (W, H), (13, 14, 19)); d = ImageDraw.Draw(t); d.fontmode = '1'
    for i, c in enumerate([RED, (248, 120, 88), YEL]): d.rectangle([0, i * 8, W, i * 8 + 8], fill=c); d.rectangle([0, H - 24 + (2 - i) * 8, W, H - 16 + (2 - i) * 8], fill=c)
    card(d, title, 130, 48 if len(title) < 16 else 38, YEL, RED)
    d.rectangle([GX - 6, GY - 6, GX + 1029, GY + 901], fill=WHT); d.rectangle([GX - 3, GY - 3, GX + 1026, GY + 898], fill=(0, 0, 0)); return np.array(t)
ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '60', '-i', '-', '-i', out + '.wav', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE) if False else None
wavs, frames_cmd = [], []
# pass 1: audio
for g in ids:
    m = json.load(open(f'{FR}/{g}.json')); s0 = best_window(m); m['_s0'] = s0
    wavs += [audio(m, s0, TF, True), audio(m, s0, GF, False)]; json.dump(m, open(f'{FR}/{g}.win.json', 'w'))
mix = np.concatenate(wavs); mix = mix / np.max(np.abs(mix)) * .8
w = wave.open(out + '.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '60', '-i', '-', '-i', out + '.wav', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
for gi, g in enumerate(ids):
    m = json.load(open(f'{FR}/{g}.win.json')); s0 = m['_s0']; meta = m['meta']; info = GM[g]; a, _, b = info['mashup'].partition(' x '); T = tpl(info['title'].upper())
    def put(i, dim):
        gm = np.array(Image.open(f'{FR}/f_{g}/f{min(i, len(meta) - 1):05d}.png').convert('RGB')); gm = np.repeat(np.repeat(gm, 4, 0), 4, 1)
        if dim: gm = (gm * .35).astype(np.uint8)
        fr = T.copy(); fr[GY:GY + 896, GX:GX + 1024] = gm; return fr
    for k in range(TF):  # title card: X meets Y over dimmed gameplay
        fr = put(s0 + k, True); im = Image.fromarray(fr); d = ImageDraw.Draw(im); d.fontmode = '1'
        sx = 1 + .0 * k
        card(d, a.upper(), GY + 190, 54 if len(a) < 14 else 40, WHT, (0, 0, 0)); card(d, 'MEETS', GY + 400, 60, YEL, RED); card(d, b.upper(), GY + 560, 54 if len(b) < 14 else 40, CYN, (0, 0, 0))
        ff.stdin.write(np.asarray(im).tobytes())
    for k in range(GF):
        fr = put(s0 + k, False); im = Image.fromarray(fr); d = ImageDraw.Draw(im); d.fontmode = '1'
        card(d, 'SCORE %05d' % meta[min(s0 + k, len(meta) - 1)]['s'], 1420, 40, YEL, RED); card(d, '%d / %d' % (gi + 1, len(ids)), 1520, 24, WHT)
        card(d, info['mashup'].upper().replace(' X ', ' x '), 1600, 20, CYN); card(d, 'PLAY FREE  LINK IN BIO', 1700, 24, WHT)
        ff.stdin.write(np.asarray(im).tobytes())
ff.stdin.close(); ff.wait(); os.remove(out + '.wav'); print('wrote', out)
