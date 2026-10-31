#!/usr/bin/env python3
"""Scaffold a game: python3 new.py g12 "Blade Punch" JAB DODGE "keys text" "Punch-Out x Blade Ball"
Adds the manifest entry and writes games/g12.js from a kit() template. Edit the template, then run check.sh g12."""
import sys, json, os, re, subprocess
base = os.path.dirname(os.path.abspath(__file__))
STARTERS = {'arena':'s1', 'platformer':'s2', 'tower':'s3', 'racer':'s4', 'dungeon':'s5'}      # genre -> starter game (all pass check.sh + 3-tier parity)
if '--starter' in sys.argv:
    """ONE COMMAND:  python3 new.py --starter arena g40 "My Game Title"   -> games/g40.js (copy of the starter, ids/seed renamed), manifest entry, build, check.sh.
    The result is green and playable immediately; then edit TUNE (numbers), draw/drawHD (look), step (rules)."""
    i = sys.argv.index('--starter'); genre, g, title = sys.argv[i + 1:i + 4]
    if genre not in STARTERS: sys.exit(f'unknown genre {genre!r}; choose from {sorted(STARTERS)}')
    sid = STARTERS[genre]; n = int(re.sub(r'\D', '', g)); src = open(f'{base}/games/{sid}.js').read(); t1, _, t2 = title.upper().partition(' ')
    src = re.sub(r"id:'%s'" % sid, f"id:'{g}'", src); src = re.sub(r"t1:'[^']*', t2:'[^']*'", f"t1:'{t1}', t2:'{t2 or ' '}'", src, 1)
    src = re.sub(r"seed:\d+, off:\d+", f"seed:{900 + n}, off:{n}", src, 1); src = src.replace('TUNE' + sid[1], 'TUNE' + str(n)).replace('track' + sid[1], 'track' + str(n)).replace('nearest' + sid[1], 'nearest' + str(n)).replace('room' + sid[1], 'room' + str(n)).replace('PATH' + sid[1], 'PATH' + str(n)).replace('SPOTS' + sid[1], 'SPOTS' + str(n)).replace('onPath' + sid[1], 'onPath' + str(n)).replace('level' + sid[1], 'level' + str(n)).replace('respawn' + sid[1], 'respawn' + str(n))
    src = re.sub(r'===== S\d [^.]*\.', f'===== {g.upper()} {title.upper()}: started from the {genre} starter.', src, 1)
    open(f'{base}/games/{g}.js', 'w').write(src)
    m = [x for x in json.load(open(f'{base}/games.json')) if x['id'] != g]; o = next(x for x in json.load(open(f'{base}/games.json')) if x['id'] == sid)
    m.append(dict(o, id=g, title=title, mashup=f'{genre} starter')); json.dump(m, open(f'{base}/games.json', 'w'), indent=1)
    print(f'scaffolded {g} from {sid} ({genre}); running check.sh ...'); sys.exit(subprocess.call(['bash', f'{base}/check.sh', g, '45']))
g, title, la, lb, keys, mash = sys.argv[1:7]
m = json.load(open(f'{base}/games.json'))
m = [x for x in m if x['id'] != g] + [dict(id=g, title=title, la=la, lb=lb, keys='<b>Keys:</b> ' + keys + ' Enter starts, M mutes.', mashup=mash)]
json.dump(m, open(f'{base}/games.json', 'w'), indent=1)
n = g[1:]
t1, _, t2 = title.upper().partition(' ')
open(f'{base}/games/{g}.js', 'w').write(f"""/* ===== {title.upper()}: {mash}. ===== */
const GAME = kit({{
  id:'{g}', t1:'{t1}', t2:'{t2 or " "}', sub:'ONE LINE HOOK.', secs:45, seed:{100 + int(n)}, off:{int(n)},
  music:MUS(150, -24, true),
  setup(S, att) {{ S.lives = 3; /* all state lives on S */ }},
  step(S, dt, inp, att) {{ /* update; end with: return finish(S, 'CLEAR!') or endGame via finish */ }},
  draw(S) {{ ART.bg('{g}', () => {{ ART.floor(); ART.brick(0, 16, 4); ART.brick(208, 16, 3); }});  /* static room baked once */
    /* ART.depth([{{y, draw}}]) for sprites, ART.fog(x,y), ART.bar(...)  (all pixel drawing here, none in hud) */ }},
  hud(S, mode) {{ txt('SCORE ' + pad5(S.score), 4, 4, W, 8); hintS(S, 'ARROWS MOVE  Z ACTION', 8, 200); }},  /* text only */
  info(S) {{ return {{ lives:S.lives }}; }},
  bot(S, i) {{ return i; }},
}});
""")
print('scaffolded', g)
