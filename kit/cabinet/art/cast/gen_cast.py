#!/usr/bin/env python3
"""Code-drawn pixel cast: SOLDIER + ZOMBIE as parametric generators (no baked frames, no asset files).
  python3 gen_cast.py OUTDIR      -> sheet.png (contact sheet), still.png (action still), light.png (light layer of the still), selftest hash
Design rules (from the brief): (1) palette RAMPS: every material = 4-step dark->bright ramp, variants are ramp swaps; (2) seeded details in LOCAL
coordinates so any frame reproduces exactly; (3) two buffers: colour + additive LIGHT layer (eyes, muzzle flash); (4) full frame sets by parameters:
idle4 walk8 attack5 hit2 down4; (5) one grid + one palette discipline. Skeleton -> 2-bone IK limbs -> polygons -> ramp-shaded masks."""
import sys, os, math, random, hashlib
from PIL import Image, ImageDraw, ImageChops, ImageFont
W, H, GY = 56, 44, 41                                  # frame grid and ground line
OUTL = (10, 12, 18, 255)
def hx(s): return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def ramp(dark, base, hi): d, b, h = hx(dark), hx(base), hx(hi); return [d + (255,), lerp(d, b, .5) + (255,), b + (255,), h + (255,)]
# ---------------- materials (ramps) ----------------
SKIN = ramp('#5a3420', '#d99a6c', '#f6c9a0'); METAL = ramp('#14161c', '#4a4e5c', '#8a90a4'); LEATH = ramp('#1a120c', '#4a3220', '#7a5436'); WOOD = ramp('#2a1a0e', '#6a4420', '#a06a38')
SOLDIERS = {
  'OLIVE': dict(cloth=ramp('#1e2a14', '#4f7a38', '#7fae58'), vest=ramp('#2a2a1a', '#6a6a40', '#9a9a62'), helm=ramp('#16200f', '#3d5f2c', '#68944a')),
  'DESERT': dict(cloth=ramp('#4a3a20', '#b89a62', '#e0c88a'), vest=ramp('#3a2e1a', '#8a7040', '#b89a62'), helm=ramp('#4a3a20', '#a88a52', '#d0b878')),
  'BLACKOPS': dict(cloth=ramp('#101420', '#2c3446', '#4a5670'), vest=ramp('#0c0e14', '#1c2030', '#343c54'), helm=ramp('#0c0e14', '#242a3c', '#3c465e'))}
ZOMBIES = {
  'A': dict(skin=ramp('#1c3418', '#5a9a46', '#9ad070'), shirt=ramp('#2a1c14', '#6a4a34', '#9a7a58'), pants=ramp('#14161c', '#343848', '#58607a'), eye=(232, 255, 112), seed=11),
  'B': dict(skin=ramp('#1c2430', '#5a7a8c', '#9ab8c8'), shirt=ramp('#1c1c22', '#54545e', '#82828e'), pants=ramp('#241812', '#5a4030', '#8a6a50'), eye=(255, 120, 90), seed=23),
  'C': dict(skin=ramp('#2a2a1e', '#9a9a6a', '#d0d0a0'), shirt=ramp('#2a1620', '#7a3a4a', '#b06a78'), pants=ramp('#101a24', '#2a4058', '#48688a'), eye=(120, 240, 255), seed=37),
  'D': dict(skin=ramp('#2c1a34', '#8a6a9a', '#c8a0d8'), shirt=ramp('#1e2418', '#4a5a34', '#76885a'), pants=ramp('#1a1814', '#403a30', '#6a6254'), eye=(255, 230, 90), seed=51)}
HAIR = ramp('#0a0a0e', '#1c1a22', '#34303e'); BLOOD = ramp('#2a0808', '#7a1414', '#b02a2a'); BONE = ramp('#6a6450', '#d8d2b8', '#f4efe0')
# ---------------- drawing core ----------------
class G:
    def __init__(s, T): s.img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s.lt = Image.new('RGBA', (W, H), (0, 0, 0, 0)); s.T = T
    def P(s, x, y): return s.T(x, y)
    def mask(s, fn): m = Image.new('L', (W, H), 0); fn(ImageDraw.Draw(m)); return m
    def poly(s, pts): return s.mask(lambda d: d.polygon([s.P(*p) for p in pts], fill=255))
    def cap(s, a, b, w):
        A, B = s.P(*a), s.P(*b); return s.mask(lambda d: (d.line([A, B], fill=255, width=max(1, round(w))), d.ellipse([A[0] - w / 2, A[1] - w / 2, A[0] + w / 2 - .5, A[1] + w / 2 - .5], fill=255), d.ellipse([B[0] - w / 2, B[1] - w / 2, B[0] + w / 2 - .5, B[1] + w / 2 - .5], fill=255)))
    def ell(s, c, rx, ry, ang=0):
        pts = [(c[0] + rx * math.cos(t) * math.cos(ang) - ry * math.sin(t) * math.sin(ang), c[1] + rx * math.cos(t) * math.sin(ang) + ry * math.sin(t) * math.cos(ang)) for t in [i / 20 * 6.2832 for i in range(20)]]
        return s.poly(pts)
    def paint(s, m, rp, hi=.5, ring=True):
        px = m.load(); ip = s.img.load(); bb = m.getbbox()
        if not bb: return
        x0, y0, x1, y1 = bb; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; ex = .5 * (.55 * (x1 - x0) + .83 * (y1 - y0)) or 1
        if ring:                                           # contour over earlier parts only (inner lines); silhouette outline comes last
            for y in range(max(0, y0 - 1), min(H, y1 + 1)):
                for x in range(max(0, x0 - 1), min(W, x1 + 1)):
                    if px[x, y] == 0 and ip[x, y][3] and any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): ip[x, y] = rp[0]
        for y in range(y0, y1):
            for x in range(x0, x1):
                if px[x, y]:
                    u = -((x - cx) * -.55 + (y - cy) * -.83) / ex          # >0 lit side (light from upper left)
                    ip[x, y] = rp[3] if u > hi + .12 else rp[2] if u > -.18 else rp[1]
    def dot(s, x, y, c, m=None):
        X, Y = s.P(x, y); X, Y = round(X), round(Y)
        if 0 <= X < W and 0 <= Y < H and (m is None or m.load()[X, Y]): s.img.putpixel((X, Y), c)
    def glow(s, x, y, r, col, a=1.0, steps=3):             # blocky additive light disc on the LIGHT layer
        d = ImageDraw.Draw(s.lt)
        for i in range(steps):
            rr = r * (1 - i / steps); al = round(255 * a * (.18 + .30 * i / steps)); d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col + (al,))
    def finish(s, flash=0, flash_col=(255, 255, 255)):
        ip = s.img.load()
        if flash:
            for y in range(H):
                for x in range(W):
                    p = ip[x, y]
                    if p[3] and p[:3] != OUTL[:3]: ip[x, y] = lerp(p[:3], flash_col, .8) + (255,)
        out = s.img.copy(); op = out.load()
        for y in range(H):
            for x in range(W):
                if ip[x, y][3] == 0 and any(0 <= x + dx < W and 0 <= y + dy < H and ip[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): op[x, y] = OUTL
        s.img = out; return s
def ik(a, b, l1, l2, bend):
    dx, dy = b[0] - a[0], b[1] - a[1]; d = max(.01, min(math.hypot(dx, dy), l1 + l2 - .02)); ux, uy = dx / d, dy / d; a1 = (l1 * l1 - l2 * l2 + d * d) / (2 * d); h = math.sqrt(max(0, l1 * l1 - a1 * a1))
    return (a[0] + ux * a1 - uy * h * bend, a[1] + uy * a1 + ux * h * bend), (a[0] + ux * d, a[1] + uy * d)
def mk_T(fall, px, py):
    th = -fall * math.pi / 2; c, s_ = math.cos(th), math.sin(th); pyy = py - 5 * fall
    return lambda x, y: (px + (x - px) * c - (y - py) * s_ + 9 * fall, pyy + (x - px) * s_ + (y - py) * c)
def lp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
DEF = dict(bob=0, lean=0, hdx=0, hdy=0, fa=(5, 0), fb=(-4, 0), aim=0, recoil=0, flash=0, sway=0, fall=0, limp=0, hit=0, jaw=0, reach=0, drag=1, sw2=0)
# ---------------- SOLDIER ----------------
def soldier(p, mats=SOLDIERS['OLIVE']):
    q = dict(DEF); q.update(p); cx = 30; hip = (cx + q['lean'] * .3, 25 + q['bob']); fall = q['fall']
    g = G(mk_T(fall, cx + 3, GY)); neck = (hip[0] + q['lean'], hip[1] - 11); head = (neck[0] + 1 + q['hdx'], neck[1] - 5 + q['hdy']); sh = (neck[0] - .5, neck[1] + 2)
    cloth, vest, helm = mats['cloth'], mats['vest'], mats['helm']
    ft = lambda d: (hip[0] + d[0], GY - d[1] - (1 if fall else 0))
    kA, fA = ik((hip[0] + 1, hip[1] + 1), ft(q['fa']), 8, 8.4, -1); kB, fB = ik((hip[0] - 1, hip[1] + 1), ft(q['fb']), 8, 8.4, -1)
    aim, rec = q['aim'], q['recoil']; sway = q['sway']
    butt = lp((hip[0] - 6, hip[1] + 1 + sway * .5), (neck[0] + 1 - rec * 2.4, neck[1] + 2.5), aim); muz = lp((hip[0] + 16, hip[1] + 9 + sway), (neck[0] + 21 - rec * 2.4, neck[1] + 1 - rec * .8), aim)
    if q['limp'] > .3: butt = (butt[0] + 8 * q['limp'], butt[1] + 6 * q['limp']); muz = (muz[0] + 8 * q['limp'], muz[1] + 2 * q['limp'])
    along = lambda t: lp(butt, muz, t)
    relax = (sh[0] + 3 - q['limp'] * 6, sh[1] + 9 - q['limp'] * 2)
    hN = lp(along(.3), relax, q['limp']); hF = lp(along(.62), (sh[0] + 6, sh[1] + 8), q['limp'])
    eN, hN = ik(sh, hN, 5, 5.4, 1); eF, hF = ik(sh, hF, 5, 5.4, 1)
    g.paint(g.ell((neck[0] - 5, neck[1] + 5), 3.6, 6.2, .2), LEATH)                                   # backpack
    g.paint(g.cap(hip, fB, 3.8), cloth); g.paint(g.cap(hip, kB, 4.2), cloth); g.paint(g.cap(kB, fB, 3.6), cloth)  # far leg
    g.paint(g.poly([(fB[0] - 2.5, fB[1] - 2), (fB[0] + 4.5, fB[1] - 1.5), (fB[0] + 4.5, fB[1] + 1.6), (fB[0] - 2.5, fB[1] + 1.6)]), LEATH)
    g.paint(g.cap(sh, eF, 3.0), cloth); g.paint(g.cap(eF, hF, 2.8), cloth)                             # far arm
    g.paint(g.poly([(hip[0] - 4.2, hip[1] + 1), (hip[0] - 4.8, neck[1] + 1), (neck[0] + 3, neck[1] + 1), (hip[0] + 4.2, hip[1] + 1)]), cloth)   # torso
    g.paint(g.poly([(hip[0] - 4, hip[1] - 1.5), (hip[0] - 4.5, neck[1] + 2), (neck[0] + 2.8, neck[1] + 2), (hip[0] + 4, hip[1] - 1.5)]), vest)    # vest
    for k in (.35, .65):
        c = lp(hip, neck, k); g.dot(c[0] - 1.5, c[1], vest[0]); g.dot(c[0] - .5, c[1], vest[0])         # pocket seams
    g.paint(g.poly([(hip[0] - 4.4, hip[1] + .8), (hip[0] + 4.4, hip[1] + .8), (hip[0] + 4.4, hip[1] + 2.6), (hip[0] - 4.4, hip[1] + 2.6)]), LEATH); g.dot(hip[0] + 1, hip[1] + 1.4, METAL[3])   # belt
    g.paint(g.cap(hip, kA, 4.2), cloth); g.paint(g.cap(kA, fA, 3.8), cloth)                            # near leg
    g.paint(g.poly([(fA[0] - 2.5, fA[1] - 2), (fA[0] + 4.8, fA[1] - 1.5), (fA[0] + 4.8, fA[1] + 1.6), (fA[0] - 2.5, fA[1] + 1.6)]), LEATH)
    g.paint(g.cap(neck, (neck[0] + .5, neck[1] - 2.5), 2.6), SKIN)                                     # neck
    g.paint(g.ell(head, 3.9, 4.3), SKIN); g.dot(head[0] + 2.2, head[1] + .4, METAL[0]); g.dot(head[0] + 2.2, head[1] - .6, SKIN[3]); g.dot(head[0] + 1, head[1] + 2.6, SKIN[1])
    g.paint(g.ell((head[0] - .3, head[1] - 1.8), 5.2, 3.9), helm); g.paint(g.poly([(head[0] - 1, head[1] - .6), (head[0] + 7.2, head[1] - .2), (head[0] + 6.4, head[1] + 1.4), (head[0] - 1, head[1] + 1)]), helm, hi=.3)    # helmet + brim
    g.dot(head[0] - 2, head[1] - 3.6, helm[3]); g.dot(head[0] - 3, head[1] - 2.6, helm[3])
    g.paint(g.cap(butt, along(.2), 2.8), WOOD); g.paint(g.cap(along(.15), muz, 2.4), METAL, ring=False); g.paint(g.cap(along(.4), (along(.42)[0] + 1, along(.42)[1] + 3), 1.6), METAL, ring=False)  # rifle: stock, body/barrel, magazine
    g.paint(g.cap(sh, eN, 3.2), cloth); g.paint(g.cap(eN, hN, 3.0), cloth); g.paint(g.ell(hN, 1.8, 1.8), SKIN)                       # near arm + hand
    if q['flash'] > 0:
        f = q['flash']; mx, my = g.P(*muz); L = 5 + 6 * f; star = [(mx, my - 1 * f), (mx + L * .5, my - L * .5), (mx + L, my), (mx + L * .5, my + L * .5), (mx, my + 1 * f), (mx + 1, my)]
        d = ImageDraw.Draw(g.lt); d.polygon(star, fill=(255, 226, 120, 255)); d.ellipse([mx + 1, my - 1.5, mx + 4 * f + 1, my + 1.5], fill=(255, 255, 230, 255)); g.glow(mx + 3, my, 13 * f, (255, 150, 50), .9)
        dd = ImageDraw.Draw(g.img); dd.polygon([(mx - .5, my - 1), (mx + L * .45, my - L * .35), (mx + L * .8, my), (mx + L * .45, my + L * .35), (mx - .5, my + 1)], fill=(255, 224, 120, 255))
    return g.finish(q['hit'], (255, 255, 255)), muz
# ---------------- ZOMBIE ----------------
def zombie(p, mats=ZOMBIES['A']):
    q = dict(DEF); q.update(p); cx = 22; rng = random.Random(mats['seed']); fall = q['fall']
    skin, shirt, pants = mats['skin'], mats['shirt'], mats['pants']
    spikes = [(rng.uniform(-2.8, 1.5), rng.uniform(2, 4.6), rng.uniform(-.9, .3)) for _ in range(5)]
    stains = [(rng.uniform(.15, .9), rng.uniform(.1, .9), rng.randint(1, 3)) for _ in range(6)]; tears = [rng.uniform(1.5, 4.2) for _ in range(5)]; wound = (rng.uniform(-2, 1), rng.uniform(-.6, 1.6))
    hip = (cx - 2 + q['lean'] * .35, 25 + q['bob']); g = G(mk_T(fall, cx + 2, GY)); neck = (hip[0] + 5 + q['lean'], hip[1] - 9); head = (neck[0] + 3 + q['hdx'], neck[1] - 2.5 + q['hdy'] + 1); sh = (neck[0] - 1, neck[1] + 2)
    ft = lambda d: (hip[0] + d[0], GY - d[1] - (1 if fall else 0))
    kA, fA = ik((hip[0] + 1, hip[1] + 1), ft(q['fa']), 8, 8.4, -1); kB, fB = ik((hip[0] - 1, hip[1] + 1), ft(q['fb']), 8, 8.4, -1)
    r = q['reach']; tgtN = (neck[0] + 10 + r, neck[1] + 1 + q['sway']); tgtF = (neck[0] + 8 + r * .8, neck[1] + 4 - q['sway'] * .6); relax = (sh[0] + 2, sh[1] + 9)
    tgtN = lp(tgtN, relax, q['limp']); tgtF = lp(tgtF, (sh[0] - 3, sh[1] + 8), q['limp']); eN, hN = ik(sh, tgtN, 5.2, 5.4, 1); eF, hF = ik(sh, tgtF, 5.2, 5.4, 1)
    def leg(k, f, back, bare):
        g.paint(g.cap(hip, k, 4.3), pants); g.paint(g.cap(k, f, 3.9), pants if not bare else skin)
        if bare: g.paint(g.poly([(f[0] - 2.2, f[1] - 1.8), (f[0] + 4, f[1] - 1.2), (f[0] + 4.2, f[1] + 1.6), (f[0] - 2.2, f[1] + 1.6)]), skin); g.dot(f[0] + 4, f[1] + .8, skin[0]); g.dot(f[0] + 2.4, f[1] + 1.2, skin[0])
        else: g.paint(g.poly([(f[0] - 2.5, f[1] - 2), (f[0] + 4.5, f[1] - 1.5), (f[0] + 4.5, f[1] + 1.6), (f[0] - 2.5, f[1] + 1.6)]), LEATH)
    leg(kB, fB, 1, True)                                                                                 # far leg: bare dragging foot
    g.paint(g.cap(sh, eF, 3.0), shirt); g.paint(g.cap(eF, hF, 2.7), skin); g.paint(g.ell(hF, 1.8, 1.7), skin)
    tm = g.poly([(hip[0] - 4.6, hip[1] + 1), (hip[0] - 5.2, neck[1] + 1), (neck[0] + 3.2, neck[1] + .5), (hip[0] + 4.4, hip[1] + 1)])
    g.paint(tm, shirt)
    for i, t in enumerate(tears):                                                                         # ragged hem
        x = hip[0] - 4.4 + i * 1.9; g.paint(g.poly([(x, hip[1] + 1), (x + 1.9, hip[1] + 1), (x + 1.0, hip[1] + 1 + t * .8)]), shirt, ring=False)
    tp = tm.load()
    for u, v, n in stains:                                                                                # seeded stains, clamped inside shirt
        c = lp(hip, neck, u); X, Y = g.P(c[0] - 2.4 + v * 4.6, c[1])
        for k in range(n):
            xx, yy = round(X) + k, round(Y) + (k & 1)
            if 0 <= xx < W and 0 <= yy < H and tp[xx, yy]: g.img.putpixel((xx, yy), BLOOD[1 + (k & 1)])
    leg(kA, fA, 0, False)
    g.paint(g.poly([(kA[0] - 2.4, kA[1] + 1), (kA[0] + 2.4, kA[1] + 1), (kA[0] + 1.6, kA[1] + 3.4), (kA[0] - 0.4, kA[1] + 2.2), (kA[0] - 2.4, kA[1] + 3.8)]), skin, ring=False)  # torn knee shows skin
    g.paint(g.cap(neck, (neck[0] + 1.5, neck[1] - 2.2), 3.2), skin)
    g.paint(g.ell((head[0] - 1.8, head[1] - 2.3), 5.6, 4.2, -.2), HAIR)                                    # hair mass (behind face)
    for dx, h_, a in spikes:
        x0, y0 = head[0] + dx - 2.5, head[1] - 4.6; g.paint(g.poly([(x0 - 1, y0 + 1), (x0 + math.sin(a) * h_ - .5, y0 - math.cos(a) * h_), (x0 + 1.4, y0 + 1)]), HAIR, ring=False)
    jaw = q['jaw']; g.paint(g.ell((head[0] + .8, head[1] + .6), 4.7, 4.3), skin, hi=.62)                    # skull / face
    mouth = [(head[0] + .5, head[1] + 2.4), (head[0] + 5, head[1] + 2.4), (head[0] + 4.6, head[1] + 2.9 + 3.2 * jaw), (head[0] + .8, head[1] + 2.9 + 3.2 * jaw)]
    g.paint(g.poly(mouth), ramp('#0a0608', '#1a0a0c', '#2a1014'), ring=False)
    for i in range(3): g.dot(head[0] + 1.2 + i * 1.3, head[1] + 2.6, BONE[3])                                  # upper teeth
    if jaw > .3:
        for i in range(2): g.dot(head[0] + 1.8 + i * 1.6, head[1] + 2.9 + 3.2 * jaw - .5, BONE[2])           # lower teeth
    g.paint(g.poly([(head[0] + 1, head[1] + 3 + 3.2 * jaw), (head[0] + 4.6, head[1] + 3 + 3.2 * jaw), (head[0] + 4, head[1] + 4.4 + 3.2 * jaw), (head[0] + 1.4, head[1] + 4.4 + 3.2 * jaw)]), skin, ring=False)   # lower jaw
    g.dot(head[0] + wound[0] + 1, head[1] + wound[1] + 1.4, BLOOD[1]); g.dot(head[0] + wound[0] + 2, head[1] + wound[1] + 1.4, BLOOD[2])
    g.paint(g.poly([(head[0] - .5, head[1] - 1.2), (head[0] + 1.6, head[1] - 1.2), (head[0] + 1.6, head[1] + .6), (head[0] - .5, head[1] + .6)]), ramp('#04040a', '#0e0a12', '#1a1220'), ring=False)   # sunken socket
    ex, ey = g.P(head[0] + 4, head[1] - .6); g.dot(head[0] + 3.2, head[1] - 1.2, METAL[0]); g.dot(head[0] + 3.2, head[1] - .4, METAL[0])
    ex, ey = round(ex), round(ey); g.lt.putpixel((ex, ey), mats['eye'] + (255,)); g.lt.putpixel((ex + 1, ey), mats['eye'] + (255,)); g.glow(ex + .5, ey, 4, mats['eye'], .8, 2)          # lit eye on LIGHT layer
    g.paint(g.cap(sh, eN, 3.2), shirt); g.paint(g.cap(eN, hN, 2.8), skin); g.paint(g.ell(hN, 1.9, 1.8), skin); g.dot(hN[0] + 1.6, hN[1] + 1.2, skin[0]); g.dot(hN[0] + 1.8, hN[1] - .8, skin[0])
    return g.finish(q['hit'], (255, 205, 225))
# ---------------- frame sets (pure parameter lists) ----------------
def sset(name):
    S = []
    if name == 'idle': S = [dict(bob=b, hdy=b * .5, sway=s, lean=l, fa=(4, 0), fb=(-4, 0)) for b, s, l in [(0, 0, 0), (-.8, .8, .3), (-1.3, 1.4, .6), (-.6, .6, .3)]]
    if name == 'walk':
        for i in range(8):
            ph = i / 8 * 6.2832; S.append(dict(bob=-2.6 * abs(math.sin(ph)), lean=1.6, fa=(10 * math.sin(ph), 6.5 * max(0, math.cos(ph))), fb=(-10 * math.sin(ph), 6.5 * max(0, -math.cos(ph))), sway=3 * math.cos(2 * ph), hdy=-1 * abs(math.sin(ph))))
    if name == 'attack': S = [dict(aim=a, recoil=r, flash=f, fa=(6, 0), fb=(-5, 0), lean=l, bob=b) for a, r, f, l, b in [(.6, 0, 0, 0, 0), (1, 1, 1, -.8, 0), (1, .6, .55, -.5, 0), (1, .2, 0, 0, 0), (.8, 0, 0, 0, 0)]]
    if name == 'hit': S = [dict(hit=1, lean=-3, hdx=-2, hdy=-1, fa=(3, 0), fb=(-5, 0)), dict(lean=-2, hdx=-1, bob=1.4, fa=(2, 0), fb=(-5, 0))]
    if name == 'down': S = [dict(fall=f, limp=l, bob=b, fa=(3, 0), fb=(-5, 0)) for f, l, b in [(.22, .3, 1.5), (.5, .65, 2), (.82, 1, 1), (1, 1, 0)]]
    return S
def zset(name):
    S = []
    if name == 'idle': S = [dict(bob=b, hdy=b * .7, sway=s, lean=2 + l, jaw=j, fa=(3, 0), fb=(-5, 0)) for b, s, l, j in [(0, 0, 0, .1), (.8, .8, .3, .25), (1.4, 1.4, .6, .4), (.7, .6, .3, .25)]]
    if name == 'walk':
        for i in range(8):
            ph = i / 8 * 6.2832; S.append(dict(bob=-2.3 * abs(math.sin(ph)), lean=3, fa=(9.5 * math.sin(ph), 6 * max(0, math.cos(ph))), fb=(-7 + 3 * math.sin(ph + 1.2), 0), sway=3.2 * math.sin(ph), reach=2.2 * math.sin(ph), jaw=.2 + .25 * abs(math.sin(ph)), hdy=-.9 * abs(math.sin(ph)) + 1))
    if name == 'attack': S = [dict(lean=l, hdx=h, reach=r, jaw=j, fa=(a, 0), fb=(-6, 0), sway=s) for l, h, r, j, a, s in [(3, 0, 1, .3, 3, -1), (6, 1.5, 3, .6, 5, -2), (8, 4, 5, 1, 8, -3), (6, 3, 4, 1, 6, 0), (4, 0, 2, .4, 3, 1)]]
    if name == 'hit': S = [dict(hit=1, lean=-2, hdx=-3, hdy=-1, jaw=.8, reach=-2, fa=(1, 0), fb=(-6, 0)), dict(lean=0, hdx=-2, hdy=1, jaw=.5, reach=0, fa=(2, 0), fb=(-6, 0))]
    if name == 'down': S = [dict(fall=f, limp=l, bob=b, jaw=.7, fa=(2, 0), fb=(-5, 0)) for f, l, b in [(.22, .3, 1.5), (.5, .65, 2), (.82, 1, 1), (1, 1, 0)]]
    return S
SETS = ['idle', 'walk', 'attack', 'hit', 'down']
# ---------------- sheets ----------------
def comp(g, bg=(46, 50, 62)):
    base = Image.new('RGBA', (W, H), bg + (255,)); d = ImageDraw.Draw(base); d.line([(0, GY + 1), (W, GY + 1)], fill=(30, 33, 42, 255)); d.rectangle([0, GY + 2, W, H], fill=(36, 39, 50, 255))
    base.alpha_composite(g.img); lit = Image.new('RGBA', (W, H), (0, 0, 0, 255)); lit.alpha_composite(g.lt); r = ImageChops.add(base.convert('RGB'), lit.convert('RGB')); return r
def sheet(path):
    S = 3; cw, ch = W * S, H * S; font = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../video/press.ttf'), 14); fs = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../video/press.ttf'), 10)
    rows = [('SOLDIER', 'idle x4  hit x2  down x4', [('soldier', k) for k in ('idle', 'hit', 'down')]), ('SOLDIER', 'walk x8', [('soldier', 'walk')]), ('SOLDIER', 'attack x5 (muzzle flash on light layer)', [('soldier', 'attack')]),
            ('ZOMBIE', 'idle x4  hit x2  down x4', [('zombie', k) for k in ('idle', 'hit', 'down')]), ('ZOMBIE', 'walk x8 (dragging foot)', [('zombie', 'walk')]), ('ZOMBIE', 'attack x5 (lunge, jaw)', [('zombie', 'attack')])]
    var = [('VARIANTS', 'soldier ramp swaps: OLIVE / DESERT / BLACKOPS (idle + fire)', 'S'), ('VARIANTS', 'zombie seeds + ramp swaps: A B C D (idle + lunge)', 'Z')]
    Wd = 150 + 10 * cw; Ht = 70 + (len(rows) + len(var)) * (ch + 34); im = Image.new('RGB', (Wd, Ht), (20, 22, 28)); d = ImageDraw.Draw(im); d.text((20, 20), 'CODE-DRAWN CAST  -  soldier + zombie, 56x44 grid, parametric, seeded', font=font, fill=(250, 190, 40)); y = 60
    for name, sub, sets in rows:
        d.text((20, y + 4), name, font=font, fill=(255, 255, 255)); d.text((150, y + 6), sub, font=fs, fill=(150, 200, 255)); x = 150; y += 30
        for who, k in sets:
            for pr in (sset(k) if who == 'soldier' else zset(k)):
                g = soldier(pr)[0] if who == 'soldier' else zombie(pr); im.paste(comp(g).resize((cw, ch), Image.NEAREST), (x, y)); x += cw
        y += ch + 4
    for name, sub, who in var:
        d.text((20, y + 4), name, font=font, fill=(255, 255, 255)); d.text((150, y + 6), sub, font=fs, fill=(150, 200, 255)); x = 150; y += 30
        if who == 'S':
            for nm, mt in SOLDIERS.items():
                for pr in (sset('idle')[0], sset('attack')[1]): im.paste(comp(soldier(pr, mt)[0]).resize((cw, ch), Image.NEAREST), (x, y)); x += cw
        else:
            for nm, mt in ZOMBIES.items():
                for pr in (zset('idle')[1], zset('attack')[2]): im.paste(comp(zombie(pr, mt)).resize((cw, ch), Image.NEAREST), (x, y)); x += cw
        y += ch + 4
    im.save(path); return im
def still(path, lpath):
    SW, SH, SC = 160, 90, 8; fl = 72; img = Image.new('RGBA', (SW, SH)); d = ImageDraw.Draw(img); rng = random.Random(5)
    bands = [(10, 14, 32), (16, 20, 44), (24, 28, 58), (34, 38, 72), (46, 50, 86), (60, 62, 100)]
    for i, c in enumerate(bands): d.rectangle([0, i * 12, SW, i * 12 + 12], fill=c + (255,))
    d.ellipse([118, 8, 134, 24], fill=(238, 232, 200, 255)); d.ellipse([122, 10, 134, 22], fill=(255, 250, 225, 255))
    for i in range(34): d.point((rng.randint(0, SW - 1), rng.randint(0, 40)), fill=(200, 205, 230, 255))
    for tx in (14, 70, 148):                                                                               # dead trees
        d.line([(tx, fl - 2), (tx, fl - 26)], fill=(14, 16, 26, 255), width=2)
        for a in (-1, 1): d.line([(tx, fl - 16), (tx + a * 7, fl - 24)], fill=(14, 16, 26, 255), width=1); d.line([(tx, fl - 22), (tx + a * 5, fl - 30)], fill=(14, 16, 26, 255), width=1)
    for i in range(0, SW, 4): d.rectangle([i, fl - 6 + (i // 4 % 3 == 0) * -1, i + 3, fl - 4], fill=(18, 20, 32, 255))     # far fence
    d.rectangle([0, fl, SW, SH], fill=(42, 48, 56, 255)); d.rectangle([0, fl + 4, SW, SH], fill=(34, 38, 46, 255))
    for i in range(70): x = rng.randint(0, SW - 1); y = rng.randint(fl + 1, SH - 1); d.line([(x, y), (x + rng.randint(2, 6), y)], fill=(28, 31, 40, 255))
    lt = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    def put(g_, x, y, dark=1.0, light_off=(0, 0)):                                                          # paste a 56x44 frame with feet at (x, y)
        sp = g_.img.copy()
        if dark < 1: sp = Image.merge('RGBA', [c.point(lambda v: int(v * dark)) for c in sp.split()[:3]] + [sp.split()[3]])
        img.alpha_composite(sp, (x - 28, y - GY - 1)); lt.alpha_composite(g_.lt, (x - 28, y - GY - 1))
    zb = zombie(zset('walk')[2], ZOMBIES['C']); put(zb, 136, fl + 1, .72)                                        # second variant, further back
    sf, muz = soldier(sset('attack')[1], SOLDIERS['OLIVE']); put(sf, 34, fl + 8)                               # soldier firing
    zf = zombie(zset('attack')[2], ZOMBIES['A']); put(zf, 98, fl + 8)                                          # lunging zombie
    mx, my = 34 - 28 + muz[0], fl + 8 - GY - 1 + muz[1]
    for i, (rx, ry, al) in enumerate([(34, 20, 14), (26, 15, 18), (18, 10, 22), (10, 6, 30)]):                    # stepped additive glow (composited, not overwritten)
        gl = Image.new('RGBA', (SW, SH), (0, 0, 0, 0)); ImageDraw.Draw(gl).ellipse([mx + 6 - rx, my - ry, mx + 6 + rx, my + ry], fill=(255, 150 + 12 * i, 60, al)); lt.alpha_composite(gl)
    ImageDraw.Draw(lt).line([(mx + 8, my), (96, my + 1)], fill=(255, 240, 190, 255), width=1)                                     # tracer
    out = ImageChops.add(img.convert('RGB'), Image.alpha_composite(Image.new('RGBA', (SW, SH), (0, 0, 0, 255)), lt).convert('RGB'))
    out.resize((SW * SC, SH * SC), Image.NEAREST).save(path); Image.alpha_composite(Image.new('RGBA', (SW, SH), (0, 0, 0, 255)), lt).resize((SW * SC, SH * SC), Image.NEAREST).convert('RGB').save(lpath); return out
def digest(): 
    h = hashlib.sha256()
    for who, fn in (('s', soldier), ('z', zombie)):
        for k in SETS:
            for pr in (sset(k) if who == 's' else zset(k)):
                r = fn(pr); g = r[0] if who == 's' else r; h.update(g.img.tobytes()); h.update(g.lt.tobytes())
    return h.hexdigest()[:16]
if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'; os.makedirs(out, exist_ok=True)
    d1, d2 = digest(), digest(); print('determinism: run1', d1, 'run2', d2, 'IDENTICAL' if d1 == d2 else 'DIFFERENT')
    n = 0; cs = {'soldier': set(), 'zombie': set()}
    for who, fn in (('soldier', soldier), ('zombie', zombie)):
        for k in SETS:
            for pr in (sset(k) if who == 'soldier' else zset(k)):
                r = fn(pr); g = r[0] if who == 'soldier' else r; n += 1
                if pr.get('hit'): continue
                for px in g.img.getdata():
                    if px[3]: cs[who].add(px[:3])
    print('frames', n, 'unique colours per character (one ramp set, excl. white hit-flash):', {k: len(v) for k, v in cs.items()})
    sheet(out + '/sheet.png'); still(out + '/still.png', out + '/light.png'); print('wrote sheet.png still.png light.png in', out)
