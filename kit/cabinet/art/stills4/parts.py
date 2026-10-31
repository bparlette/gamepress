"""Skeleton -> drawable primitives in screen px (back to front). Shared by styles 1, 3 (and read by 4 for colours). Colours are ramp keys: (material, 0..3 dark->bright)."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'cast'))
import gen_cast as gc, common as C
def ramp_of(kind, var):
    if kind == 'soldier': m = gc.SOLDIERS['OLIVE']; return {'cloth': m['cloth'], 'vest': m['vest'], 'helm': m['helm'], 'skin': gc.ramp('#5a3a2a', '#c48a62', '#e8b48c'), 'gun': gc.ramp('#0c0e12', '#2a2e38', '#5a6070'), 'boot': gc.ramp('#140c08', '#3a2616', '#5a3c22'), 'pack': gc.ramp('#1a1408', '#4a3a1c', '#7a6030')}
    m = gc.ZOMBIES[{'green': 'A', 'grey': 'B', 'yellow': 'C'}[var]]; return {'skin': m['skin'], 'shirt': m['shirt'], 'pants': m['pants'], 'hair': gc.ramp('#050506', '#14141a', '#2a2a34'), 'mouth': gc.ramp('#1a0408', '#3a0a10', '#601820'), 'teeth': gc.ramp('#8a8470', '#c8c4a8', '#f0ecd0'), 'eye': [m['eye'] + (255,)] * 4, 'bare': m['skin']}
def seg(a, b, w1, w2, col, hi=0): return dict(t='seg', a=a, b=b, w1=w1, w2=w2, col=col)
def circ(c, r, col): return dict(t='circ', c=c, r=r, col=col)
def poly(pts, col): return dict(t='poly', pts=pts, col=col)
def quad(a, b, w1, w2):
    dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1; nx, ny = -dy / n, dx / n
    return [(a[0] + nx * w1, a[1] + ny * w1), (b[0] + nx * w2, b[1] + ny * w2), (b[0] - nx * w2, b[1] - ny * w2), (a[0] - nx * w1, a[1] - ny * w1)]
def parts(kind, var, pose, x, face):
    J = C.skeleton(kind, pose); S = C.place(J, x, face); lying = J['lying']; P = []
    f = lambda dx, dy, base: (base[0] + face * dx, base[1] + dy)     # screen offset in facing frame (dy down)
    if kind == 'soldier':
        P += [seg(S['sh'], S['elbB'], 6, 5, ('cloth', 1)), seg(S['elbB'], S['handB'], 5, 4, ('cloth', 1))]
        P += [seg(S['hip'], S['kneeB'], 7, 6, ('cloth', 0)), seg(S['kneeB'], S['footB'], 6, 5, ('cloth', 0)), seg(S['footB'], f(12, 0, S['footB']), 4, 5, ('boot', 1))]
        P += [poly(quad(f(-4, 0, S['hip']), f(-4, 0, S['sh']), 12, 13), ('pack', 1)) if not lying else poly(quad(f(0, 4, S['hip']), f(0, 4, S['sh']), 9, 11), ('pack', 1))]
        P += [poly(quad(S['hip'], S['sh'], 11, 12), ('cloth', 2)), poly(quad(S['hip'], S['sh'], 8, 11), ('vest', 2)), seg(f(0, 0, S['sh']), f(0, 0, S['hip']), 11, 10, ('vest', 2))]
        P += [seg(S['hip'], S['kneeA'], 7, 6.5, ('cloth', 1)), seg(S['kneeA'], S['footA'], 6.5, 5.5, ('cloth', 1)), seg(S['footA'], f(12, 0, S['footA']), 4, 5, ('boot', 1))]
        P += [seg(f(0, 7, S['head']), S['sh'], 4, 5, ('skin', 1)), circ(S['head'], 12, ('skin', 2)), poly([f(-13, -2, S['head']), f(-8, -14, S['head']), f(8, -14, S['head']), f(13, -2, S['head']), f(14, 1, S['head']), f(-13, 1, S['head'])], ('helm', 2)), seg(f(2, -1, S['head']), f(16, 1, S['head']), 2, 2, ('helm', 1)), circ(f(6, 3, S['head']), 1.4, ('gun', 0))]
        P += [seg(S['stock'], S['muzzle'], 3.5, 2.5, ('gun', 1)), seg(f(2, 0, S['handA']), f(30, 0, S['handA']), 2.5, 2.5, ('gun', 0)), seg(S['stock'], f(-2, 0, S['handB']), 5, 4, ('boot', 1))]
        P += [seg(S['sh'], S['elbA'], 6.5, 5.5, ('cloth', 2)), seg(S['elbA'], S['handA'], 5.5, 4.5, ('cloth', 2)), circ(S['handA'], 4.5, ('skin', 2)), circ(S['handB'], 4, ('skin', 2))]
    else:
        P += [seg(S['sh'], S['elbB'], 5, 4, ('skin', 0)), seg(S['elbB'], S['handB'], 4, 3.5, ('skin', 0)), circ(S['handB'], 4, ('skin', 0))]
        P += [seg(S['hip'], S['kneeB'], 7, 6, ('pants', 0)), seg(S['kneeB'], S['footB'], 6, 4, ('skin', 1)), seg(S['footB'], f(10, 0, S['footB']), 3.5, 4, ('bare', 1))]
        P += [poly(quad(S['hip'], S['sh'], 10, 12), ('shirt', 1)), poly([f(-9, 0, S['hip']), f(-12, 12, S['hip']), f(-4, 8, S['hip']), f(0, 16, S['hip']), f(5, 8, S['hip']), f(10, 14, S['hip']), f(10, 0, S['hip'])], ('shirt', 1))]
        P += [seg(S['hip'], S['kneeA'], 7, 6.5, ('pants', 1)), seg(S['kneeA'], S['footA'], 6.5, 5, ('pants', 1)), seg(S['footA'], f(11, 0, S['footA']), 4, 5, ('boot', 0) if False else ('pants', 0))]
        hd = S['head']
        P += [seg(f(0, 6, hd), S['sh'], 4.5, 5.5, ('skin', 1)), circ(hd, 13, ('skin', 2)), poly([f(-15, 4, hd), f(-13, -12, hd), f(-2, -17, hd), f(8, -13, hd), f(2, -6, hd), f(-6, -4, hd), f(-10, 6, hd)], ('hair', 1)), poly([f(-14, -10, hd), f(-18, -17, hd), f(-8, -15, hd)], ('hair', 2))]
        P += [poly([f(3, 4, hd), f(12, 3, hd), f(11, 11, hd), f(4, 12, hd)], ('mouth', 0)), poly([f(4, 4, hd), f(6, 4, hd), f(5, 7, hd)], ('teeth', 2)), poly([f(8, 4, hd), f(10, 4, hd), f(9, 7, hd)], ('teeth', 2)), circ(f(3, -3, hd), 3.2, ('hair', 0)), circ(f(8, -4, hd), 2.6, ('eye', 0)), circ(f(8, -4, hd), 1.2, ('teeth', 3))]
        P += [seg(S['sh'], S['elbA'], 5.5, 4.5, ('skin', 2)), seg(S['elbA'], S['handA'], 4.5, 3.5, ('skin', 2)), circ(S['handA'], 4.5, ('skin', 2))]
        for i in (-1, 0, 1): P.append(seg(S['handA'], f(9, i * 3, S['handA']), 1.4, .8, ('teeth', 1)))
    return P, S, J
