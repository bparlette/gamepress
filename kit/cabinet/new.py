#!/usr/bin/env python3
"""Scaffold a game: python3 new.py g12 "Blade Punch" JAB DODGE "keys text" "Punch-Out x Blade Ball"
Adds the manifest entry and writes games/g12.js from a kit() template. Edit the template, then run check.sh g12."""
import sys, json, os
base = os.path.dirname(os.path.abspath(__file__))
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
  draw(S) {{ clear(N); }},
  hud(S, mode) {{ txt('SCORE ' + pad5(S.score), 4, 4, W, 8); }},
  info(S) {{ return {{ lives:S.lives }}; }},
  bot(S, i) {{ return i; }},
}});
""")
print('scaffolded', g)
