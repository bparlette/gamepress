#!/usr/bin/env python3
"""Cut Yeet a Pet throw footage into Shorts + a long video. Usage: build.py <name>   (see CUTS below)"""
import subprocess, sys, wave, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

D = os.path.expanduser('~/RobloxWork/yeet_capture/cut'); OUT = os.path.expanduser('~/RobloxWork/yeet_capture/out')
SFX = os.path.expanduser('~/roblox-work/main/assets/sfx')
T0, STEP, THROW = 23.5, 4.5, 0.9         # first pet's card appears at T0; one pet every STEP s; the throw lands THROW s after its card
FONT = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
CTA = 'YEET A PET\nPLAY FREE ON ROBLOX'

def base(i): return T0 + STEP * i

# (pets, window relative to the pet's card, title). Windows: fast = quick cuts, full = whole throw.
FAST, FULL = (0.5, 2.7), (0.3, 4.2)
CUTS = {
  'short-all20':   dict(pets=range(20),   win=FAST, title='FLING ALL\n20 PETS', vertical=True),
  'short-commons': dict(pets=range(0, 10), win=FULL, title='COMMON TO RARE\nFLING THEM ALL', vertical=True),
  'short-rarest':  dict(pets=range(10, 20), win=FULL, title='THE RAREST PETS\nEPIC TO DIVINE', vertical=True),
  'long-roster':   dict(pets=range(20),   win=FULL, title='YEET A PET', vertical=False),
}

def font(size): return ImageFont.truetype(FONT, size)
def draw_block(d, text, cx, y, size, fill, maxw):
    f = font(size)
    lines = text.split('\n')
    while max(d.textlength(l, font=f) for l in lines) > maxw and size > 30:
        size -= 4; f = font(size)
    for i, l in enumerate(lines):
        w = d.textlength(l, font=f)
        d.text((cx - w / 2, y + i * size * 1.15), l, font=f, fill=fill, stroke_width=max(6, size // 9), stroke_fill=(20, 10, 30))

def overlay_png(path, W, H, title, cta):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    draw_block(d, title, W / 2, H * 0.06, 104, (255, 236, 39), W - 100)
    draw_block(d, cta, W / 2, H * 0.80, 84, (255, 255, 255), W - 100)
    im.save(path)

def card_png(path, W, H, title, sub):
    im = Image.new('RGBA', (W, H), (40, 20, 90, 255)); d = ImageDraw.Draw(im)
    for y in range(H): d.line([(0, y), (W, y)], fill=(40 + y * 40 // H, 20, 90 + y * 70 // H))
    draw_block(d, title, W / 2, H * 0.30, 190, (255, 236, 39), W - 200)
    draw_block(d, sub, W / 2, H * 0.62, 80, (255, 255, 255), W - 200)
    im.save(path)

def load(name, sr=48000):
    w = wave.open(f'{SFX}/{name}.wav'); n = w.getnframes(); raw = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if w.getnchannels() > 1: raw = raw.reshape(-1, w.getnchannels()).mean(1)
    x = np.linspace(0, len(raw) - 1, int(len(raw) * sr / w.getframerate())); return np.interp(x, np.arange(len(raw)), raw)

def audio(events, dur, path, sr=48000):
    out = np.zeros(int(dur * sr) + sr); cache = {}
    for t, name, vol in events:
        if name not in cache: cache[name] = load(name)
        s = cache[name]; i = int(t * sr)
        if 0 <= i < len(out): out[i:i + len(s)] += (s * vol)[:len(out) - i]
    out = np.clip(out, -1, 1); w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()

def run(*a): subprocess.run(a, check=True)

def build(name):
    c = CUTS[name]; v = c['vertical']; W, H = (1080, 1920) if v else (1920, 1080)
    master = f'{D}/master_{"v" if v else "h"}.mp4'; os.makedirs(OUT, exist_ok=True)
    a, b = c['win']; segs, events, t = [], [], 0.0
    intro = 0 if v else 3.0
    if not v: t = intro
    for i in c['pets']:
        s0 = base(i) + a; s1 = base(i) + b
        segs.append((s0, s1)); th = t + (THROW - a)
        events += [(th, 'pet_launch', 0.9), (th, 'fling_whoosh', 0.7), (th + 1.1, 'pet_bounce', 0.5), (th + 2.0, 'coin_pickup', 0.4)] if b - a > 3 else [(th, 'pet_launch', 0.9), (th, 'fling_whoosh', 0.7), (th + 1.0, 'pet_bounce', 0.5)]
        t += s1 - s0
    body = t - (intro if not v else 0); total = t + (0 if v else 4.0)
    fc = []
    for k, (s0, s1) in enumerate(segs): fc.append(f'[0:v]trim=start={s0:.3f}:end={s1:.3f},setpts=PTS-STARTPTS[s{k}]')
    fc.append(''.join(f'[s{k}]' for k in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0[cat]')
    if v:
        overlay_png(f'{D}/ov_{name}.png', W, H, c['title'], CTA)
        fc.append('[cat]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:4,eq=brightness=-0.2[bg];[bg][b]overlay=0:(H-h)/2[c];[c][1:v]overlay=0:0[outv]')
        inputs = ['-i', master, '-loop', '1', '-framerate', '30', '-i', f'{D}/ov_{name}.png']
        aidx = 2
    else:
        card_png(f'{D}/intro.png', W, H, c['title'], '20 PETS  ·  1 FLING EACH'); card_png(f'{D}/outro.png', W, H, 'YEET A PET', 'PLAY FREE ON ROBLOX')
        fc.append('[cat]split[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:4,eq=brightness=-0.2[bg];[bg][b]overlay=(W-w)/2:0[body]')
        fc.append('[1:v]fps=30,format=yuv420p,setsar=1[intro];[2:v]fps=30,format=yuv420p,setsar=1[outro];[body]format=yuv420p,setsar=1[bd];[intro][bd][outro]concat=n=3:v=1:a=0[outv]')
        inputs = ['-i', master, '-loop', '1', '-t', '3', '-i', f'{D}/intro.png', '-loop', '1', '-t', '4', '-i', f'{D}/outro.png']
        aidx = 3
        events.append((total - 3.6, 'tutorial_done', 0.6))
    audio(events, total, f'{D}/{name}.wav')
    out = f'{OUT}/{name}.mp4'
    run('ffmpeg', '-y', '-loglevel', 'error', *inputs, '-i', f'{D}/{name}.wav', '-filter_complex', ';'.join(fc), '-map', '[outv]', '-map', f'{aidx}:a',
        '-t', f'{total:.2f}', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out)
    print(out, f'{total:.1f}s')

if __name__ == '__main__':
    for n in (sys.argv[1:] or CUTS): build(n)
