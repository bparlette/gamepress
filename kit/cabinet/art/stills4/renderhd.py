"""Style 3: HD art. Smooth vector rig (SVG: per-part gradients, rim light, tapered limbs, reflections, bloom, soft shadows, glass, metal) rasterised by Chromium.
Drawn from the same skeleton as styles 1/4 but NOT from the pixel cast frames: this is a rig render, unlimited poses."""
import math, os, sys
import common as C, parts as PT
def rgb(c): return 'rgb(%d,%d,%d)' % tuple(c[:3])
def esc(f): return ('%.1f' % f)
def hd_fig(kind, var, x, pose, face, uid, light_x=None):
    P, S, J = PT.parts(kind, var, pose, x, face); R = PT.ramp_of(kind, var); defs = []; body = []; cache = {}
    def grad(col):
        m, i = col; k = (m, i)
        if k in cache: return cache[k]
        r = R[m]; g = f'g{uid}_{m}{i}'; hi, ba, lo = r[min(3, i + 1)], r[i], r[max(0, i - 1)]
        defs.append(f'<linearGradient id="{g}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="{rgb(hi)}"/><stop offset=".5" stop-color="{rgb(ba)}"/><stop offset="1" stop-color="{rgb(lo)}"/></linearGradient>'); cache[k] = f'url(#{g})'; return cache[k]
    for p in P:
        fill = grad(p['col']); dark = rgb(R[p['col'][0]][0]); hi = rgb(R[p['col'][0]][3])
        if p['t'] == 'seg':
            a, b, w1, w2 = p['a'], p['b'], p['w1'], p['w2']; q = PT.quad(a, b, w1, w2)
            body.append(f'<g><polygon points="{" ".join(esc(v[0]) + "," + esc(v[1]) for v in q)}" fill="{fill}" stroke="{dark}" stroke-width="1.2" stroke-linejoin="round"/>'
                        f'<circle cx="{esc(a[0])}" cy="{esc(a[1])}" r="{w1}" fill="{fill}"/><circle cx="{esc(b[0])}" cy="{esc(b[1])}" r="{w2}" fill="{fill}"/>'
                        f'<line x1="{esc(a[0])}" y1="{esc(a[1])}" x2="{esc(b[0])}" y2="{esc(b[1])}" stroke="{hi}" stroke-opacity=".35" stroke-width="{w1 * .6:.1f}" stroke-linecap="round" transform="translate({-w1 * .25:.1f},{-w1 * .3:.1f})"/></g>')
        elif p['t'] == 'circ':
            c = p['c']; body.append(f'<circle cx="{esc(c[0])}" cy="{esc(c[1])}" r="{p["r"]}" fill="{fill}" stroke="{dark}" stroke-width="1.2"/><ellipse cx="{c[0] - p["r"] * .3:.1f}" cy="{c[1] - p["r"] * .35:.1f}" rx="{p["r"] * .45:.1f}" ry="{p["r"] * .3:.1f}" fill="{hi}" fill-opacity=".28"/>')
        else:
            body.append(f'<polygon points="{" ".join(esc(v[0]) + "," + esc(v[1]) for v in p["pts"])}" fill="{fill}" stroke="{dark}" stroke-width="1.2" stroke-linejoin="round"/>')
    ex = []; hd = S['head']; f = lambda dx, dy, b=hd: (b[0] + face * dx, b[1] + dy)
    if kind == 'soldier':
        e = f(6, -2); ex.append(f'<ellipse cx="{e[0]:.1f}" cy="{e[1]:.1f}" rx="2.6" ry="2" fill="#f4f0e4"/><circle cx="{f(7, -2)[0]:.1f}" cy="{e[1]:.1f}" r="1.1" fill="#1a1410"/>')
        m1, m2 = f(5, 6), f(10, 6); ex.append(f'<line x1="{m1[0]:.1f}" y1="{m1[1]:.1f}" x2="{m2[0]:.1f}" y2="{m2[1]:.1f}" stroke="#5a2c20" stroke-width="1.4" stroke-linecap="round"/>')
        c1, c2 = f(-8, 6), f(3, 12); ex.append(f'<path d="M{c1[0]:.1f},{c1[1]:.1f} Q{f(-4, 14)[0]:.1f},{f(-4, 14)[1]:.1f} {c2[0]:.1f},{c2[1]:.1f}" stroke="#2a2a1a" stroke-width="1.4" fill="none"/>')
        h1, h2 = f(-9, -9), f(7, -10); ex.append(f'<path d="M{h1[0]:.1f},{h1[1]:.1f} Q{f(0, -16)[0]:.1f},{f(0, -16)[1]:.1f} {h2[0]:.1f},{h2[1]:.1f}" stroke="#a8d48a" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>')
        for t in (.25, .55):   # vest pockets + belt
            a = (S['hip'][0] + (S['sh'][0] - S['hip'][0]) * t, S['hip'][1] + (S['sh'][1] - S['hip'][1]) * t); ex.append(f'<rect x="{a[0] - 5 * (1 if True else 0):.1f}" y="{a[1] - 3:.1f}" width="10" height="7" rx="1.5" fill="#000" fill-opacity=".18" stroke="#1a1a10" stroke-opacity=".5"/>')
        b = S['hip']; ex.append(f'<rect x="{b[0] - 11:.1f}" y="{b[1] - 3:.1f}" width="22" height="5" fill="#2a1c10" stroke="#10100a" stroke-width=".8"/><rect x="{b[0] - 2:.1f}" y="{b[1] - 3:.1f}" width="4" height="5" fill="#c8b050"/>' if pose != 'down' else '')
    else:
        eye = f(8, -4); ex.append(f'<circle cx="{eye[0]:.1f}" cy="{eye[1]:.1f}" r="9" fill="url(#glow{uid})"/>')
        ex.append(f'<ellipse cx="{f(3, -3)[0]:.1f}" cy="{f(3, -3)[1]:.1f}" rx="4" ry="3.4" fill="#05060a" fill-opacity=".85"/>')
        for k in range(5):   # hair strands
            a = f(-12 + k * 4, -14); b = f(-18 + k * 3, -20 - k % 2 * 3); ex.append(f'<path d="M{a[0]:.1f},{a[1]:.1f} Q{(a[0] + b[0]) / 2 + 2:.1f},{a[1] - 8:.1f} {b[0]:.1f},{b[1]:.1f}" stroke="#14141a" stroke-width="2" fill="none" stroke-linecap="round"/>')
        for k in range(4):   # vein/crack lines on skin + wound
            a = f(-4 + k * 3, 6); b = f(-2 + k * 3, 14); ex.append(f'<path d="M{a[0]:.1f},{a[1]:.1f} q{face * 2},4 0,8" stroke="{rgb(R["skin"][0])}" stroke-width="1" fill="none" stroke-opacity=".8"/>')
        w = (S['sh'][0] + face * 3, S['sh'][1] + 14); ex.append(f'<ellipse cx="{w[0]:.1f}" cy="{w[1]:.1f}" rx="5" ry="3" fill="#5a0a10" fill-opacity=".85"/><ellipse cx="{w[0]:.1f}" cy="{w[1]:.1f}" rx="2.4" ry="1.4" fill="#a01820"/>')
    gid = f'fig{uid}'; return ''.join(defs), f'<g id="{gid}">' + ''.join(body) + ''.join(ex) + '</g>', S, J, f'<radialGradient id="glow{uid}"><stop offset="0" stop-color="{rgb(R["eye"][0]) if kind == "zombie" else "#fff"}" stop-opacity=".9"/><stop offset="1" stop-color="{rgb(R["eye"][0]) if kind == "zombie" else "#fff"}" stop-opacity="0"/></radialGradient>' if kind == 'zombie' else ''
def svg(moment):
    fx = C.FX.get(moment, {}); defs = []; world = []; refl = []; shadows = []; overlays = []; muz = None; hitp = None; figs = C.MOMENTS[moment]
    for n, (kind, var, x, pose, face) in enumerate(figs):
        d, g, S, J, extra = hd_fig(kind, var, x, pose, face, n); defs += [d, extra]; world.append(g); refl.append(f'<use href="#fig{n}"/>')
        w = 44 if pose != 'down' else 90; shadows.append(f'<ellipse cx="{x + (face * 30 if pose == "down" else 0)}" cy="{C.FEET_Y + 2}" rx="{w * .5}" ry="6" fill="#000" fill-opacity=".55" filter="url(#blur6)"/>')
        if kind == 'soldier' and pose == 'aim': muz = S['muzzle']
        if pose == 'hit': hitp = (S['sh'][0], S['sh'][1] + 8)
    L = C.LOCK_X; lock = []
    for lx in L:
        y0, y1 = C.LOCK_Y0, C.LOCK_Y1
        lock.append(f'<rect x="{lx}" y="{y0}" width="{C.LOCK_W}" height="{y1 - y0}" rx="3" fill="url(#locker)" stroke="#1a2030" stroke-width="2"/><rect x="{lx + 3}" y="{y0 + 3}" width="{C.LOCK_W - 6}" height="{y1 - y0 - 6}" rx="2" fill="none" stroke="#8a9ac0" stroke-opacity=".25"/>'
                    f'<rect x="{lx + 38}" y="{y0 + 20}" width="48" height="22" rx="2" fill="url(#glass)" stroke="#a8bad8" stroke-width="2"/><path d="M{lx + 42},{y0 + 40} L{lx + 56},{y0 + 22} L{lx + 64},{y0 + 22} L{lx + 50},{y0 + 40}Z" fill="#fff" fill-opacity=".14"/>'
                    + ''.join(f'<rect x="{lx + 14}" y="{y1 - 72 + k * 8}" width="{C.LOCK_W - 28}" height="3" rx="1.5" fill="#0e1422" fill-opacity=".7"/>' for k in range(7)) +
                    f'<rect x="{lx + C.LOCK_W - 26}" y="{y0 + 102}" width="7" height="22" rx="3" fill="url(#chrome)" stroke="#000" stroke-opacity=".4"/>')
    flare = ''
    if muz:
        mx, my = muz; flare = (f'<circle cx="{mx:.0f}" cy="{my:.0f}" r="150" fill="url(#mlight)" style="mix-blend-mode:screen"/><ellipse cx="{mx + 160:.0f}" cy="{C.FLOOR_Y + 40}" rx="260" ry="70" fill="url(#mfloor)" style="mix-blend-mode:screen"/>'
                f'<polygon points="{mx:.0f},{my - 4:.0f} {mx + 16:.0f},{my - 14:.0f} {mx + 22:.0f},{my - 3:.0f} {mx + 46:.0f},{my:.0f} {mx + 22:.0f},{my + 4:.0f} {mx + 16:.0f},{my + 13:.0f} {mx:.0f},{my + 4:.0f}" fill="#ffd36a" filter="url(#bloom)"/><polygon points="{mx:.0f},{my - 2:.0f} {mx + 26:.0f},{my:.0f} {mx:.0f},{my + 2:.0f}" fill="#fffbe8"/>')
        if hitp: flare += f'<line x1="{mx + 30:.0f}" y1="{my:.0f}" x2="{hitp[0] - 4:.0f}" y2="{hitp[1]:.0f}" stroke="#fff4c0" stroke-width="2.5" filter="url(#bloom)"/>'
    if hitp:
        hx, hy = hitp; flare += f'<circle cx="{hx}" cy="{hy}" r="30" fill="url(#burst)" style="mix-blend-mode:screen"/>' + ''.join(f'<line x1="{hx}" y1="{hy}" x2="{hx + math.cos(a) * r:.0f}" y2="{hy + math.sin(a) * r:.0f}" stroke="#ffe890" stroke-width="2" stroke-linecap="round" filter="url(#bloom)"/>' for a, r in [(k / 11 * 6.283, 26 if k % 2 else 14) for k in range(11)])
        flare += ''.join(f'<circle cx="{hx + math.cos(a) * r:.0f}" cy="{hy + math.sin(a) * r:.0f}" r="2.2" fill="#c8e870"/>' for a, r in [(.4 + k * .9, 22 + k * 5) for k in range(7)])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{C.FW}" height="{C.FH}" viewBox="0 0 {C.FW} {C.FH}">
<defs>{"".join(defs)}
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1e2c"/><stop offset="1" stop-color="#2a3044"/></linearGradient>
<linearGradient id="locker" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4e5c7c"/><stop offset=".5" stop-color="#3c4864"/><stop offset="1" stop-color="#2a3450"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a4468"/><stop offset="1" stop-color="#0e1a30"/></linearGradient>
<linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dfe4ee"/><stop offset=".5" stop-color="#8a92a4"/><stop offset="1" stop-color="#4a5062"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c313e"/><stop offset=".12" stop-color="#1a1d26"/><stop offset="1" stop-color="#0c0d12"/></linearGradient>
<linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4dae8"/><stop offset=".4" stop-color="#8a92a8"/><stop offset="1" stop-color="#3a4054"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="rmask"><rect x="0" y="{C.FEET_Y}" width="{C.FW}" height="{C.FH - C.FEET_Y}" fill="url(#fade)"/></mask>
<radialGradient id="mlight"><stop offset="0" stop-color="#ffb050" stop-opacity=".75"/><stop offset=".4" stop-color="#ff8a30" stop-opacity=".25"/><stop offset="1" stop-color="#ff7020" stop-opacity="0"/></radialGradient>
<radialGradient id="mfloor"><stop offset="0" stop-color="#ffa040" stop-opacity=".4"/><stop offset="1" stop-color="#ff7020" stop-opacity="0"/></radialGradient>
<radialGradient id="burst"><stop offset="0" stop-color="#fff6c0" stop-opacity=".95"/><stop offset="1" stop-color="#ffb030" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<filter id="blur6" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="6"/></filter><filter id="bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="{C.FW}" height="{C.FLOOR_Y}" fill="url(#wall)"/>{"".join(lock)}
<rect x="0" y="{C.RAIL_Y}" width="{C.FW}" height="6" fill="url(#rail)"/><rect x="0" y="{C.RAIL_Y + 6}" width="{C.FW}" height="10" fill="#000" fill-opacity=".3" filter="url(#blur6)"/>
<rect x="0" y="{C.FLOOR_Y}" width="{C.FW}" height="{C.FH - C.FLOOR_Y}" fill="url(#floor)"/><rect x="0" y="{C.FLOOR_Y}" width="{C.FW}" height="5" fill="#5a6278"/><rect x="0" y="{C.FLOOR_Y + 5}" width="{C.FW}" height="4" fill="#fff" fill-opacity=".05"/>
{"".join(f'<line x1="{C.FW / 2 + (i - 7) * 20:.0f}" y1="{C.FLOOR_Y + 9}" x2="{C.FW / 2 + (i - 7) * 150:.0f}" y2="{C.FH}" stroke="#fff" stroke-opacity=".035"/>' for i in range(15))}
{"".join(shadows)}
<g mask="url(#rmask)" transform="translate(0,{2 * C.FEET_Y}) scale(1,-1)" opacity=".9">{"".join(refl)}</g>
{"".join(world)}
{flare}<rect width="{C.FW}" height="{C.FH}" fill="url(#vig)"/></svg>'''
def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': C.FW, 'height': C.FH}, device_scale_factor=2)
        for m in C.MOMENTS:
            s = svg(m); open(f'out/hd_{m}.svg', 'w').write(s); pg.set_content(f'<body style="margin:0;background:#000">{s}</body>'); pg.screenshot(path=f'out/hd_{m}@2x.png')
            from PIL import Image; Image.open(f'out/hd_{m}@2x.png').resize((C.FW, C.FH), Image.LANCZOS).save(f'out/hd_{m}.png')
        b.close()
if __name__ == '__main__': main()
