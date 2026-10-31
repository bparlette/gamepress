"""Shared definition of the four-style stills: frame, stage geometry, the three moments, and ONE skeleton solver (side view, local px, figure 150 px tall).
Styles 1/3/4 draw from the skeleton; style 2 uses the code-generated cast frames (art/cast/gen_cast.py) at the matching pose."""
import math
FW, FH = 768, 448
FLOOR_Y = 300          # wall base / floor line, identical in every style
FEET_Y = 392           # character feet baseline, identical in every style
FIG_H = 150
LOCK_X = [42 + i * 140 for i in range(5)]; LOCK_W = 124; LOCK_Y0, LOCK_Y1 = 70, 290; RAIL_Y = 215
# moments: list of (kind, variant, feet_x, pose, facing)  kind soldier|zombie ; facing +1 right, -1 left
MOMENTS = {
 'walk':  [('soldier', 'olive', 250, 'walk', 1), ('zombie', 'green', 690, 'walk', -1)],
 'shoot': [('zombie', 'yellow', 735, 'walk', -1), ('zombie', 'grey', 590, 'walk', -1), ('zombie', 'green', 470, 'hit', -1), ('soldier', 'olive', 190, 'aim', 1)],
 'down':  [('soldier', 'olive', 290, 'down', 1), ('zombie', 'yellow', 440, 'attack', -1)],
}
FX = {'shoot': dict(muzzle=True, impact_on=470)}
def rot(p, c, a):
    s, k = math.sin(a), math.cos(a); x, y = p[0] - c[0], p[1] - c[1]; return (c[0] + x * k - y * s, c[1] + x * s + y * k)
def limb(root, a1, l1, a2, l2):
    """angles measured from straight down, + = forward (+x). returns mid, end (y up)"""
    m = (root[0] + l1 * math.sin(math.radians(a1)), root[1] - l1 * math.cos(math.radians(a1)))
    e = (m[0] + l2 * math.sin(math.radians(a2)), m[1] - l2 * math.cos(math.radians(a2))); return m, e
def skeleton(kind, pose):
    """local coords, +x forward, y up, feet at y=0. returns dict of joints (+ 'lying')."""
    sol = kind == 'soldier'; J = {}; lean = 0; bob = 0
    if sol:
        P = {'walk':  dict(lean=3, ta=(24, -8), tb=(-22, -45), sa=((38, 6), (50, 60)), aa=((20, 70), (28, 80)), ab=((-12, 30), (-20, 40))),
             'aim':   dict(lean=-4, ta=(8, 6), tb=(-6, -2), sa=None, aa=((82, 88), (88, 88)), ab=((58, 100), (64, 150))),
             'down':  dict(lean=0, ta=(4, 0), tb=(-5, 0), sa=None, aa=((20, 40), (40, 40)), ab=((-30, 10), (-20, 10)))}[pose]
        hipy = 66
    else:
        P = {'walk':  dict(lean=24, ta=(18, -10), tb=(-6, -30), aa=((70, 80), (86, 88)), ab=((52, 76), (80, 84))),
             'hit':   dict(lean=-6, ta=(2, 0), tb=(-8, 0), aa=((-30, -50), (-20, -10)), ab=((10, 30), (0, 10))),
             'attack': dict(lean=34, ta=(24, 4), tb=(-14, -20), aa=((74, 40), (100, 30)), ab=((60, 60), (84, 40)))}[pose]
        hipy = 62 if pose != 'attack' else 58
    lean = P['lean']; hip = (0, hipy); J['hip'] = hip
    tl = 46 if sol else 42
    J['sh'] = (hip[0] + tl * math.sin(math.radians(lean)), hip[1] + tl * math.cos(math.radians(lean)))
    hd = 20 if sol else 16; hl = lean + (0 if sol else 14)
    J['head'] = (J['sh'][0] + hd * math.sin(math.radians(hl)), J['sh'][1] + hd * math.cos(math.radians(hl)))
    J['kneeA'], J['footA'] = limb(hip, P['ta'][0], 33, P['ta'][1], 33); J['kneeB'], J['footB'] = limb(hip, P['tb'][0], 33, P['tb'][1], 33)
    if sol and pose == 'walk':
        J['kneeA'], J['footA'] = limb(hip, 26, 33, -6, 33); J['kneeB'], J['footB'] = limb(hip, -22, 33, -50, 33)
    J['elbA'], J['handA'] = limb(J['sh'], P['aa'][0][0], 27, P['aa'][0][1], 26) if True else (None, None)
    J['elbB'], J['handB'] = limb(J['sh'], P['ab'][0][0], 27, P['ab'][1][0] if False else P['ab'][0][1], 26)
    if sol and pose == 'aim':   # rifle shouldered: front hand out along the barrel, back hand near cheek
        J['handA'] = (J['sh'][0] + 40, J['sh'][1] - 5); J['elbA'] = (J['sh'][0] + 20, J['sh'][1] - 16)
        J['handB'] = (J['sh'][0] + 6, J['sh'][1] - 2); J['elbB'] = (J['sh'][0] - 6, J['sh'][1] - 20)
    if sol and pose == 'walk':   # rifle carried low across the body
        J['handA'] = (J['sh'][0] + 30, J['sh'][1] - 40); J['elbA'] = (J['sh'][0] + 14, J['sh'][1] - 26)
        J['handB'] = (J['sh'][0] + 8, J['sh'][1] - 42); J['elbB'] = (J['sh'][0] - 6, J['sh'][1] - 28)
    J['lying'] = pose == 'down' and sol
    # ground: lowest foot to y=0
    low = min(J[k][1] for k in ('footA', 'footB'))
    for k in list(J):
        if k != 'lying': J[k] = (J[k][0], J[k][1] - low)
    if sol:   # rifle line: stock -> muzzle
        a, b = J['handB'], J['handA']; d = (b[0] - a[0], b[1] - a[1]); n = math.hypot(*d) or 1; d = (d[0] / n, d[1] / n)
        J['stock'] = (a[0] - d[0] * 14, a[1] - d[1] * 14); J['muzzle'] = (b[0] + d[0] * (46 if pose == 'aim' else 30), b[1] + d[1] * (46 if pose == 'aim' else 30))
    if J['lying']:   # fall backwards: flat on the back, head to the rear; body line rests ~12 px above the floor, rifle dropped beside
        c = J['hip']
        for k in list(J):
            if k != 'lying': J[k] = rot(J[k], c, math.radians(90))
        my = sum(J[k][1] for k in ('hip', 'sh', 'head', 'footA', 'footB')) / 5
        for k in list(J):
            if k != 'lying': J[k] = (J[k][0] - 4, J[k][1] - my + 12)
        J['elbA'] = (J['sh'][0] + 18, 8); J['handA'] = (J['sh'][0] + 36, 5); J['elbB'] = (J['sh'][0] - 6, 22); J['handB'] = (J['sh'][0] + 4, 30)
        J['stock'] = (J['hip'][0] + 40, 3); J['muzzle'] = (J['hip'][0] + 120, 5)
    return J
def place(J, x, face):
    """local -> screen px (x flips with facing), feet at FEET_Y."""
    return {k: (x + face * v[0], FEET_Y - v[1]) for k, v in J.items() if k != 'lying'}
