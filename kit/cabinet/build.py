import sys, os, re
base = os.path.dirname(os.path.abspath(__file__))
import json
GAMES = {m['id']: m for m in json.load(open(f'{base}/games.json'))}
def build(g, local_font=False, outdir=None):
    m = dict(GAMES[g]); src = open(f'{base}/games/{g}.js').read()
    k = re.search(r'^// KEYS: (.*)$', src, re.M)
    if k: m['keys'] = '<b>Keys:</b> ' + k.group(1) + ' Enter starts, M mutes.'
    head = open(f'{base}/head.html').read()
    font = '<style>@font-face{font-family:"Press Start 2P";src:url("press.woff2") format("woff2")}</style>' if local_font else \
           '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">'
    html = (head.replace('%%TITLE%%', m['title']).replace('%%LA%%', m['la']).replace('%%LB%%', m['lb'])
            .replace('%%KEYS%%', m['keys']).replace('%%FONT%%', font)
            .replace('%%CORE%%', open(f'{base}/core.js').read() + open(f'{base}/gamekit.js').read() + open(f'{base}/artkit.js').read())
            .replace('%%GAME%%', open(f'{base}/games/{g}.js').read())
            .replace('%%LOOP%%', open(f'{base}/loop.js').read()))
    outdir = outdir or f'{base}/out'
    os.makedirs(outdir, exist_ok=True)
    out = f'{outdir}/{g}.html'
    open(out, 'w').write(html)
    return out
if __name__ == '__main__':
    # usage: python3 build.py [g1 g2 ...] [--out DIR] [--local-font]   (local font expects press.woff2 next to the page)
    a = sys.argv[1:]; out = None; lf = '--local-font' in a
    if '--out' in a: out = a[a.index('--out') + 1]
    names = [x for x in a if x in GAMES] or list(GAMES)
    for g in names:
        print(build(g, lf, out))
