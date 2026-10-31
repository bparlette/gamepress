#!/usr/bin/env python3
"""Compose /tmp/montage clips (video/montage.cjs) into one mp4: per game 3 clips x 3.33 s = 10 s, 3x nearest upscale, caption strip (game, GAME k/N, clip dots), short white flash at each cut.  python3 video/montage.py out.mp4"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
OUT = os.environ.get('OUT', '/tmp/montage'); dst = sys.argv[1] if len(sys.argv) > 1 else '/tmp/montage.mp4'; here = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(OUT + '/meta.json')); font = ImageFont.truetype(here + '/press.ttf', 22); small = ImageFont.truetype(here + '/press.ttf', 14)
games = []; [games.append(m['g']) for m in meta if m['g'] not in games]
fr = OUT + '/all'; os.system(f'rm -rf {fr}'); os.makedirs(fr); n = 0
for m in meta:
    d = f"{OUT}/c{m['n']:02d}"; gi = games.index(m['g'])
    for k, f in enumerate(sorted(os.listdir(d))):
        im = Image.open(f'{d}/{f}').convert('RGB').resize((768, 672), Image.NEAREST)
        if k < 3: im = Image.blend(im, Image.new('RGB', im.size, 'white'), .6 - .2 * k)
        dr = ImageDraw.Draw(im); dr.rectangle([0, 622, 768, 672], fill=(8, 10, 24)); dr.text((16, 636), m['title'], font=font, fill=(255, 220, 60)); dr.text((752, 626), f"GAME {gi + 1}/{len(games)}", font=small, fill=(255, 255, 255), anchor='ra')
        for c in range(3): dr.rectangle([752 - 3 * 22 + c * 22, 650, 752 - 3 * 22 + c * 22 + 16, 658], fill=(255, 220, 60) if c == m['clip'] else (60, 64, 90))
        im.save(f'{fr}/{n:04d}.png'); n += 1
print('frames', n, 'seconds', n / 30)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', fr + '/%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', dst], check=True); print('wrote', dst)
