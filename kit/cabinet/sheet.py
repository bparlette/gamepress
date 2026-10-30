#!/usr/bin/env python3
"""Contact sheet of every game's mid-run screenshot (out/gN_s1.png) -> out/sheet.png, for one-glance visual review."""
import glob, os, math
from PIL import Image
base = os.path.dirname(os.path.abspath(__file__)) + '/out'
fs = sorted(glob.glob(base + '/g*_s1.png'), key=lambda f: int(os.path.basename(f)[1:].split('_')[0]))
w, h, cols = 256, 224, 6
im = Image.new('RGB', (cols * w, math.ceil(len(fs) / cols) * h))
for i, f in enumerate(fs): im.paste(Image.open(f).convert('RGB').resize((w, h)), ((i % cols) * w, (i // cols) * h))
im.save(base + '/sheet.png'); print(len(fs), 'games ->', base + '/sheet.png')
