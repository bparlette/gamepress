"""Style 2: 16-bit, code-GENERATED sprites (gen_cast.py: palette ramps, seeded detail, finite frame set) on a code-drawn 192x112 stage, x4 nearest."""
import sys, os, random; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'cast'))
from PIL import Image, ImageDraw, ImageChops
import gen_cast as gc, common as C
SC = 4; GW, GH = C.FW // SC, C.FH // SC
def stage():
    img = Image.new('RGBA', (GW, GH)); d = ImageDraw.Draw(img); rng = random.Random(9); fl = C.FLOOR_Y // SC
    for y in range(fl):                                    # wall: banded vertical gradient with 2x2 ordered dither between bands
        t = y / fl; base = (int(26 + 8 * t), int(30 + 8 * t), int(42 + 10 * t))
        for x in range(GW): d.point((x, y), fill=base + (255,) if (x + y) % 4 else (base[0] - 3, base[1] - 3, base[2] - 4, 255))
    for lx in C.LOCK_X:
        x0, x1, y0, y1 = lx // SC, (lx + C.LOCK_W) // SC, C.LOCK_Y0 // SC, C.LOCK_Y1 // SC
        d.rectangle([x0, y0, x1, y1], fill=(44, 52, 70, 255)); d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=(52, 62, 82, 255))
        d.line([(x0, y0), (x1, y0)], fill=(78, 90, 114, 255)); d.line([(x0, y0), (x0, y1)], fill=(68, 80, 102, 255)); d.line([(x1, y0), (x1, y1)], fill=(30, 36, 50, 255)); d.line([(x0, y1), (x1, y1)], fill=(24, 28, 40, 255))
        for gx in range(x0 + 2, x1 - 1, 2):     # louvre slits
            for gy in range(y1 - 22, y1 - 4, 3): d.point((gx, gy), fill=(30, 36, 50, 255))
        wx, wy = (lx + 38) // SC, (C.LOCK_Y0 + 20) // SC; d.rectangle([wx, wy, wx + 11, wy + 5], fill=(18, 24, 36, 255), outline=(96, 110, 136, 255)); d.line([(wx + 1, wy + 1), (wx + 5, wy + 1)], fill=(60, 78, 104, 255))
        d.rectangle([x1 - 8, (C.LOCK_Y0 + 100) // SC, x1 - 6, (C.LOCK_Y0 + 108) // SC], fill=(120, 124, 132, 255))      # handle
    ry = C.RAIL_Y // SC; d.rectangle([0, ry, GW, ry + 1], fill=(96, 104, 124, 255)); d.line([(0, ry), (GW, ry)], fill=(132, 142, 164, 255)); d.line([(0, ry + 2), (GW, ry + 2)], fill=(20, 22, 30, 255))
    d.rectangle([0, fl, GW, GH], fill=(22, 24, 30, 255)); d.rectangle([0, fl, GW, fl + 1], fill=(60, 66, 82, 255)); d.line([(0, fl + 2), (GW, fl + 2)], fill=(40, 44, 56, 255))
    for i in range(160): x = rng.randint(0, GW - 1); y = rng.randint(fl + 3, GH - 1); d.line([(x, y), (x + rng.randint(2, 7), y)], fill=(30, 33, 42, 255) if rng.random() < .6 else (17, 19, 25, 255))
    return img
POSES = {('soldier', 'walk'): ('s', 'walk', 2), ('soldier', 'aim'): ('s', 'attack', 1), ('soldier', 'down'): ('s', 'down', 3),
         ('zombie', 'walk'): ('z', 'walk', 2), ('zombie', 'hit'): ('z', 'hit', 1), ('zombie', 'attack'): ('z', 'attack', 2)}
VAR = {'green': 'A', 'grey': 'B', 'yellow': 'C', 'olive': 'OLIVE'}
def render(moment, path):
    img = stage(); lt = Image.new('RGBA', (GW, GH), (0, 0, 0, 0)); muz = None; fy = C.FEET_Y // SC; hit_at = None
    for kind, var, x, pose, face in C.MOMENTS[moment]:
        who, st, i = POSES[(kind, pose)]; gx = x // SC
        sh = Image.new('RGBA', (GW, GH), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse([gx - 15 if pose != 'down' else gx - 30, fy - 2, gx + 15 if pose != 'down' else gx + 32, fy + 2], fill=(0, 0, 0, 120)); img.alpha_composite(sh)
        if who == 's': g, m = gc.soldier(gc.sset(st)[i], gc.SOLDIERS[VAR[var]]); mxy = m
        else: g = gc.zombie(gc.zset(st)[i], gc.ZOMBIES[VAR[var]]); mxy = None
        ox, oy = gx - 28, fy - gc.GY - 1; img.alpha_composite(g.img, (ox, oy)); lt.alpha_composite(g.lt, (ox, oy))
        if who == 's' and pose == 'aim': muz = (ox + mxy[0], oy + mxy[1])
        if pose == 'hit': hit_at = (gx, fy - 22)
    d = ImageDraw.Draw(lt)
    if muz:
        for rx, ry, al in [(34, 20, 14), (26, 15, 18), (18, 10, 22), (10, 6, 30)]:
            gl = Image.new('RGBA', (GW, GH), (0, 0, 0, 0)); ImageDraw.Draw(gl).ellipse([muz[0] + 6 - rx, muz[1] - ry, muz[0] + 6 + rx, muz[1] + ry], fill=(255, 170, 60, al)); lt.alpha_composite(gl)
        d.line([(muz[0] + 8, muz[1]), (hit_at[0] - 6, hit_at[1] + 4)], fill=(255, 240, 190, 255), width=1)
    if hit_at:    # impact burst: stepped starburst
        for k in range(10):
            import math; a = k / 10 * 6.283; r = 9 if k % 2 else 5; d.line([hit_at, (hit_at[0] + r * math.cos(a), hit_at[1] + r * math.sin(a))], fill=(255, 235, 150, 255))
        d.ellipse([hit_at[0] - 3, hit_at[1] - 3, hit_at[0] + 3, hit_at[1] + 3], fill=(255, 255, 230, 255))
    out = ImageChops.add(img.convert('RGB'), Image.alpha_composite(Image.new('RGBA', (GW, GH), (0, 0, 0, 255)), lt).convert('RGB'))
    out.resize((C.FW, C.FH), Image.NEAREST).save(path)
if __name__ == '__main__':
    for m in C.MOMENTS: render(m, f'out/16bit_{m}.png')
