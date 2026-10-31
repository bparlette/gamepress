#!/usr/bin/env python3
"""Compose /tmp/montage frames (from video/montage.cjs) into a 10 s 30 fps mp4: 8 clips, 3x nearest upscale, title strip + clip counter, white flash cut.  python3 video/montage.py out.mp4"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
OUT = os.environ.get('OUT', '/tmp/montage'); dst = sys.argv[1] if len(sys.argv) > 1 else '/tmp/montage.mp4'
meta = json.load(open(OUT + '/meta.json')); font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), 'press.ttf'), 22); small = ImageFont.truetype(os.path.join(os.path.dirname(__file__), 'press.ttf'), 14)
fr = OUT + '/all'; os.makedirs(fr, exist_ok=True); n = 0
for m in meta:
    c = m['clip']; files = sorted(os.listdir(f'{OUT}/c{c}'))
    for k, f in enumerate(files):
        im = Image.open(f'{OUT}/c{c}/{f}').convert('RGB').resize((768, 672), Image.NEAREST); d = ImageDraw.Draw(im)
        if k < 2: im = Image.blend(im, Image.new('RGB', im.size, 'white'), .55 - .25 * k); d = ImageDraw.Draw(im)
        d.rectangle([0, 622, 768, 672], fill=(8, 10, 24)); d.text((16, 636), m['title'], font=font, fill=(255, 220, 60)); d.text((752, 640), f"{c + 1}/{len(meta)}", font=small, fill=(255, 255, 255), anchor='ra')
        im.save(f'{fr}/{n:04d}.png'); n += 1
print('frames', n, 'seconds', n / 30)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', fr + '/%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', dst], check=True)
print('wrote', dst)
