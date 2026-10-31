#!/usr/bin/env python3
"""Generates quick g37 variants (g39 Training Dojo, g40 Tournament Ladder, g41 Boss Rush) from games/g37.js: same sim/moves/rig, different goal.  python3 variants37.py"""
import re
src = open('games/g37.js').read()
def need(a):
    assert a in src, a[:70]
def make(gid, t1, t2, sub, extra_setup, vstep, vend, hint, tweaks=()):
    s = src
    s = s.replace("id:'g37', t1:'RYU VS', t2:'GUILE', sub:'EVERY MOVE. ONE ROUND.', seed:937, off:37", f"id:'{gid}', t1:'{t1}', t2:'{t2}', sub:'{sub}', seed:9{gid[1:]}, off:{gid[1:]}")
    s = s.replace("return { x1:Math.round(S.p1.x)", "return { rd:S.round, x1:Math.round(S.p1.x)", 1)
    s = s.replace("think37(S, f, o, .5)", "think37(S, f, o, S.lvl || .5)")
    s = s.replace("S.dummy = !!new URLSearchParams(location.search).get('dummy'); },", "S.dummy = !!new URLSearchParams(location.search).get('dummy'); " + extra_setup + " },")
    s = s.replace("return finish(S, S.loser === B ? 'YOU WIN' : 'YOU LOSE', S.loser === B ? Math.round(A.hp) * 5 : 0); }", "return VEND(S, A, B); }")
    s = s.replace("/* ?dummy=1: CPU stands still and nobody dies (move-list test) */", "/* ?dummy=1: CPU stands still and nobody dies (move-list test) */\n    { const _r = VSTEP(S, A, B, dt); if (_r) return _r; }")
    s = s.replace("txt('ROUND 1', 128, 84", "txt('ROUND ' + (S.round || 1), 128, 84")
    s = s.replace("{ sc:C.sc, flash:", "{ sc:C.sc * (S.boss && f === S.p2 ? 1.2 : 1), alt:!!(S.boss && f === S.p2), flash:")
    s = s.replace("'UIO PUNCH  JKL KICK  623+P DP  236+P FIREBALL'", "'" + hint + "'")
    s = s.replace("const GAME = kit(", "function VSTEP(S, A, B, dt) {" + vstep + "}\nfunction VEND(S, A, B) {" + vend + "}\nconst GAME = kit(", 1)
    for a, b in tweaks: assert a in s, a; s = s.replace(a, b, 1)
    open(f'games/{gid}.js', 'w').write(s)
need("S.dummy = !!new URLSearchParams(location.search).get('dummy'); },"); need("think37(S, f, o, .5)"); need("txt('ROUND 1', 128, 84"); need("{ sc:C.sc, flash:")
DEF_END = "return finish(S, S.loser === B ? 'YOU WIN' : 'YOU LOSE', S.loser === B ? Math.round(A.hp) * 5 : 0);"
make('g39', 'TRAINING', 'DOJO', 'DEAL 150 DAMAGE IN 40 SECONDS', "S.dummy = true; S.tr = 0;",
     "S.tr += dt; if (S.score >= 1500) return finish(S, 'TRAINING CLEAR', 2000 + Math.round(Math.max(0, 40 - S.tr) * 40)); if (S.tr > 40) return finish(S, 'TIME', 0);", DEF_END,
     'TRAINING: DEAL 150 DAMAGE  UIO PUNCH  JKL KICK')
make('g40', 'TOURNAMENT', 'LADDER', 'THREE FIGHTS. NO REST.', "S.round = 1; S.lvl = .5; S.carry = 0;", "",
     "if (S.loser === B) { if (S.round < 3) { S.carry += Math.round(A.hp) * 5; S.round++; S.lvl = [.4, .5, .6][S.round - 1]; const me = A.ch; S.p1 = mk37(78, me); S.p2 = mk37(178, S.round === 2 ? me : (me === 'ryu' ? 'guile' : 'ryu')); S.p2.face = -1; S.p2.cpu = true; S.pr = []; S.spk = []; S.intro = 0; S.over = 0; S.loser = null; S.combo = 0; S.fight = false; S.timeLeft = TUNE37.time; return null; } return finish(S, 'YOU WIN', S.carry + Math.round(A.hp) * 5); } return finish(S, 'YOU LOSE', S.carry);",
     'WIN 3 FIGHTS IN A ROW  UIO PUNCH  JKL KICK', [("time:60", "time:30")])
make('g41', 'BOSS', 'RUSH', 'ONE ARMOURED BOSS.', "S.boss = 1; S.lvl = .5; S.bhp = 100; S.ahp = 100;",
     "if (B.hp < S.bhp) B.hp = S.bhp - (S.bhp - B.hp) * .75; S.bhp = B.hp; if (S.ahp === undefined) S.ahp = A.hp; if (A.hp < S.ahp) A.hp = S.ahp - (S.ahp - A.hp) * .5; S.ahp = A.hp; if (B.hp < 40) S.lvl = .75;", DEF_END,
     'BOSS: HE TAKES 75% DAMAGE', [("time:60", "time:90")])
print('wrote g39 g40 g41')
