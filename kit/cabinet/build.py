import sys, os, re
base = os.path.dirname(os.path.abspath(__file__))
import json
GAMES = {m['id']: m for m in json.load(open(f'{base}/games.json'))}
def build(g, local_font=False, outdir=None, hd=False, art=False):
    m = dict(GAMES[g]); src = open(f'{base}/games/{g}.js').read()
    k = re.search(r'^// KEYS: (.*)$', src, re.M)
    if k: m['keys'] = '<b>Keys:</b> ' + k.group(1) + ' Enter starts, M mutes.'
    head = open(f'{base}/head.html').read()
    font = '<style>@font-face{font-family:"Press Start 2P";src:url("press.woff2") format("woff2")}</style>' if local_font else \
           '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">'
    html = (head.replace('%%TITLE%%', m['title']).replace('%%LA%%', m['la']).replace('%%LB%%', m['lb'])
            .replace('%%KEYS%%', m['keys']).replace('%%FONT%%', font)
            .replace('%%CORE%%', open(f'{base}/core.js').read() + open(f'{base}/gamekit.js').read() + open(f'{base}/artkit.js').read() + open(f'{base}/hdkit.js').read() + open(f'{base}/glpost.js').read() + open(f'{base}/rigkit.js').read())
            .replace('%%GAME%%', open(f'{base}/games/{g}.js').read())
            .replace('%%LOOP%%', open(f'{base}/loop.js').read()))
    if hd or art:
        html = html.replace('width="256" height="224"', 'width="768" height="672"').replace('image-rendering:pixelated;image-rendering:crisp-edges;', '').replace('<script>', '<script>window.HD_MODE=true;' + ('window.GLPOST_ON=true;window.ATLAS=' + open(f'{base}/art/atlas.json').read() + ';' if art else ''), 1)
    outdir = outdir or f'{base}/out'
    os.makedirs(outdir, exist_ok=True)
    out = f'{outdir}/{g}.art.html' if art else f'{outdir}/{g}.hd.html' if hd else f'{outdir}/{g}.html'
    open(out, 'w').write(html)
    return out
if __name__ == '__main__':
    # usage: python3 build.py [g1 g2 ...] [--out DIR] [--local-font]   (local font expects press.woff2 next to the page)
    a = sys.argv[1:]; out = None; lf = '--local-font' in a
    if '--out' in a: out = a[a.index('--out') + 1]
    names = [x for x in a if x in GAMES] or list(GAMES)
    for g in names:
        print(build(g, lf, out, '--hd' in a, '--art' in a))
