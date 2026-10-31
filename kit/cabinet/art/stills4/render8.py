"""Style 1: 8-bit cabinet. 256x150 buffer (x3), one shared 22-colour palette, ordered (Bayer) dither for light, 2-band ramp shading + 1px outline per figure.
Characters are drawn fresh from the skeleton at buffer resolution: code-RENDERED, unlimited poses (not a downscale of another style)."""
import sys, os, math; import numpy as np
from PIL import Image, ImageDraw
import common as C, parts as PT
SC = 3; BW, BH = C.FW // SC, 150
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
def sh(m, dx, dy): return np.roll(np.roll(m, dy, 0), dx, 1)
def stage():
    img = Image.new('RGB', (BW, BH)); d = ImageDraw.Draw(img); fl = C.FLOOR_Y // SC
    d.rectangle([0, 0, BW, fl], fill=(28, 32, 44))
    for lx in C.LOCK_X:
        x0, x1, y0, y1 = lx // SC, (lx + C.LOCK_W) // SC, C.LOCK_Y0 // SC, C.LOCK_Y1 // SC
        d.rectangle([x0, y0, x1, y1], fill=(50, 60, 80)); d.line([(x0, y0), (x1, y0)], fill=(76, 88, 112)); d.line([(x1, y0), (x1, y1)], fill=(30, 36, 50))
        wx, wy = (lx + 38) // SC, (C.LOCK_Y0 + 20) // SC; d.rectangle([wx, wy, wx + 15, wy + 7], fill=(18, 24, 36), outline=(96, 110, 136))
    ry = C.RAIL_Y // SC; d.rectangle([0, ry, BW, ry + 1], fill=(96, 104, 124)); d.rectangle([0, fl, BW, BH], fill=(22, 24, 30)); d.rectangle([0, fl, BW, fl + 1], fill=(60, 66, 82))
    return img
def mask_of(shape, fn):
    im = Image.new('L', (BW, BH), 0); fn(ImageDraw.Draw(im)); return np.array(im) > 0
def draw_fig(base, kind, var, x, pose, face, flash=False):
    P, S, J = PT.parts(kind, var, pose, x, face); R = PT.ramp_of(kind, var)
    if kind == 'zombie':    # 8-bit gets punchier variant skins so three zombies read apart inside 22 colours
        from gen_cast import ramp as rp
        R['skin'] = R['bare'] = {'green': rp('#143c14', '#3c9a38', '#8ee05a'), 'grey': rp('#20262e', '#7a8896', '#c4d0da'), 'yellow': rp('#4a3c08', '#c8a82a', '#f4e47a')}[var]
    lay = np.zeros((BH, BW, 3), np.uint8); alpha = np.zeros((BH, BW), bool); k = 1 / SC
    for p in P:
        if p['t'] == 'seg':
            a, b, w1, w2 = p['a'], p['b'], p['w1'] * k, p['w2'] * k
            def fn(d, a=a, b=b, w1=w1, w2=w2): d.polygon([tuple(q * k for q in v) for v in PT.quad(a, b, w1 * SC, w2 * SC)], fill=255); [d.ellipse([c[0] * k - r, c[1] * k - r, c[0] * k + r, c[1] * k + r], fill=255) for c, r in ((a, w1), (b, w2))]
        elif p['t'] == 'circ':
            c, r = p['c'], p['r'] * k; fn = lambda d, c=c, r=r: d.ellipse([c[0] * k - r, c[1] * k - r, c[0] * k + r, c[1] * k + r], fill=255)
        else:
            pts = [(q[0] * k, q[1] * k) for q in p['pts']]; fn = lambda d, pts=pts: d.polygon(pts, fill=255)
        M = mask_of(None, fn); m, i = p['col']; ramp = R[m]; col = lambda j: np.array(ramp[max(0, min(3, j))][:3], np.uint8)
        lay[M] = col(i); hi = M & ~sh(M, 1, 1); lo = M & ~sh(M, -1, -1)
        yy, xx = np.mgrid[0:BH, 0:BW]; chk = ((xx + yy) % 2 == 0)
        if i < 3: lay[hi & chk] = col(i + 1); lay[(M & ~sh(M, 2, 2)) & hi] = col(i + 1)
        if i > 0: lay[lo] = col(i - 1)
        alpha |= M
    edge = (sh(alpha, 1, 0) | sh(alpha, -1, 0) | sh(alpha, 0, 1) | sh(alpha, 0, -1)) & ~alpha
    arr = np.array(base); arr[alpha] = lay[alpha]; arr[edge] = (10, 12, 18); return Image.fromarray(arr), S, J, P
def render(moment, path, pal=None):
    img = stage(); fx = C.FX.get(moment, {}); muz = None; hitp = None; shadows = []
    arr0 = np.array(img)
    for kind, var, x, pose, face in C.MOMENTS[moment]:     # contact shadows (dithered)
        w = 34 if pose != 'down' else 62; yy, xx = np.mgrid[0:BH, 0:BW]; e = ((xx - x / SC) / (w / 2 / SC)) ** 2 + ((yy - C.FEET_Y / SC) / 2.6) ** 2; msk = (e < 1) & (((xx + yy) % 2) == 0); arr0[msk] = (12, 13, 17)
    img = Image.fromarray(arr0)
    for kind, var, x, pose, face in C.MOMENTS[moment]:
        img, S, J, P = draw_fig(img, kind, var, x, pose, face)
        if kind == 'soldier' and pose == 'aim': muz = S['muzzle']
        if pose == 'hit': hitp = (S['sh'][0], S['sh'][1] + 8)
    arr = np.array(img).astype(np.float32); yy, xx = np.mgrid[0:BH, 0:BW]
    if muz:                                                   # muzzle light: threshold-dithered brightening with falloff
        mx, my = muz[0] / SC + 2, muz[1] / SC; r = np.hypot(xx - mx, (yy - my) * 1.3); f = np.clip(1 - r / 34, 0, 1); lit = f > BAYER[yy % 4, xx % 4] * 0.9
        arr[lit] = np.minimum(255, arr[lit] * 1.55 + np.array([40, 20, 0])); d = ImageDraw.Draw(img := Image.fromarray(arr.astype(np.uint8)))
        d.polygon([(mx, my - 2), (mx + 4, my - 6), (mx + 6, my - 2), (mx + 12, my), (mx + 6, my + 2), (mx + 4, my + 6), (mx, my + 2)], fill=(255, 214, 90)); d.polygon([(mx, my - 1), (mx + 7, my), (mx, my + 1)], fill=(255, 250, 230))
        if hitp: d.line([(mx + 10, my), (hitp[0] / SC - 3, hitp[1] / SC)], fill=(255, 240, 190))
        arr = np.array(img).astype(np.float32)
    img = Image.fromarray(arr.astype(np.uint8))
    if hitp:
        d = ImageDraw.Draw(img); cx, cy = hitp[0] / SC, hitp[1] / SC
        for k in range(8): a = k / 8 * 6.283; r = 10 if k % 2 else 5; d.line([(cx, cy), (cx + r * math.cos(a), cy + r * math.sin(a))], fill=(255, 226, 120))
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 235))
    return img
def finish(imgs, out):
    """shared 22-colour palette over all three moments, Bayer-dithered mapping, then x3 nearest."""
    cat = Image.new('RGB', (BW, BH * len(imgs) + 40)); [cat.paste(im, (0, i * BH)) for i, im in enumerate(imgs)]
    cols = {}   # equal-weight swatches of every distinct colour on screen, so small but important colours (zombie skin variants, flash) are not merged away
    for im in imgs:
        for n, c in im.getcolors(1 << 20):
            if n > 6: cols[c] = 1
    for c in [(255, 214, 90), (255, 250, 230), (255, 226, 120)]: cols[c] = 1
    L = sorted(cols); sw = ImageDraw.Draw(cat)
    for i, c in enumerate(L): sw.rectangle([(i * 4) % BW, BH * len(imgs) + ((i * 4) // BW) * 4, (i * 4) % BW + 3, BH * len(imgs) + ((i * 4) // BW) * 4 + 3], fill=c)
    pal = cat.quantize(colors=22, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE); P = np.array(pal.getpalette()[:66]).reshape(-1, 3)
    yy, xx = np.mgrid[0:BH, 0:BW]; res = []
    for n, im in zip(out, imgs):
        a = np.array(im).astype(np.float32) + ((BAYER[yy % 4, xx % 4] - .5) * 14)[..., None]
        idx = np.argmin(((a[:, :, None, :] - P[None, None]) ** 2).sum(-1), -1); q = Image.fromarray(P[idx].astype(np.uint8)); res.append(q)
        q.resize((C.FW, BH * SC), Image.NEAREST).crop((0, 0, C.FW, C.FH)).save(n)
    return len(np.unique(np.concatenate([np.array(r).reshape(-1, 3) for r in res]), axis=0))
if __name__ == '__main__':
    ms = list(C.MOMENTS); n = finish([render(m, None) for m in ms], [f'out/8bit_{m}.png' for m in ms]); print('8-bit colours used:', n)
