#!/usr/bin/env python3
"""Register a built edition on the Hawk demo page:  python3 register-demo.py <out-file> <slug> "<Title>" "<subtitle>" [--hawk /path/to/Hawk] [--thumb out/snap.png]
Copies <out-file> to <hawk>/games/<slug>/index.html, writes thumbnail <hawk>/games/shorts/<slug>.png (400x380, from --thumb, default none = text card),
and appends/replaces ONE card in <hawk>/games/index.html:  <a class=c href=<slug>/><img src=shorts/<slug>.png alt=''><b>Title</b><span>subtitle</span></a>
slug rules: lowercase, [a-z0-9-], tier editions use <game>-<tier> (g17-hd, g17b-hd, g17c-art, g17d-lux, g17e-close). Title = "<Game name> <Tier>" (<=40 chars)."""
import sys, os, re, shutil
a = [x for x in sys.argv[1:]]
def opt(k, d=None):
    if k in a: i = a.index(k); v = a[i + 1]; del a[i:i + 2]; return v
    return d
hawk = opt('--hawk', os.path.expanduser('~/hawk')); thumb = opt('--thumb')
src, slug, title, sub = a[:4]
assert re.fullmatch(r'[a-z0-9-]+', slug), 'bad slug'
d = f'{hawk}/games/{slug}'; os.makedirs(d, exist_ok=True); shutil.copy(src, f'{d}/index.html')
img = ''
if thumb:
    from PIL import Image
    im = Image.open(thumb).convert('RGB'); im.thumbnail((400, 380)); os.makedirs(f'{hawk}/games/shorts', exist_ok=True); im.save(f'{hawk}/games/shorts/{slug}.png'); img = f"<img src=shorts/{slug}.png alt=''>"
card = f"<a class=c href={slug}/>{img}<b>{title}</b><span>{sub}</span></a>"
p = f'{hawk}/games/index.html'; h = open(p).read()
h = re.sub(rf"<a class=c href={re.escape(slug)}/>.*?</a>", '', h)
h = h.replace('</div></body>', card + '</div></body>', 1); open(p, 'w').write(h); print('registered', slug)
