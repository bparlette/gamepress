import sys, os
base = os.path.dirname(os.path.abspath(__file__))
GAMES = {
  'g1': dict(title='Block Commando', la='JUMP', lb='FIRE',
             keys='<b>Keys:</b> arrows move and aim up, Z or Space jumps, X fires, Enter starts, M mutes. Shoot the falling blocks to break them, clear rows to delete the floor, and do not get crushed.'),
  'g2': dict(title='Disc Fighters', la='THROW', lb='LOB',
             keys='<b>Keys:</b> arrows move, Z or Space throws, X lobs, Enter starts, M mutes. Catch the disc, then tap down, forward, A for a fireball super when the meter is full. Hold B when a super hits to parry it.'),
  'g3': dict(title='Paper Rash', la='PAPER', lb='PUNCH',
             keys='<b>Keys:</b> up and down change lanes, left and right ride slower or faster, Z or Space throws a paper, X punches an adjacent rival, Enter starts, M mutes. Hit the mailboxes, dodge the cars.'),
  'g4': dict(title='Boom Balloons', la='FLAP', lb='BOMB',
             keys='<b>Keys:</b> left and right steer, Z or Space flaps, X drops a bomb, Enter starts, M mutes. Pop every enemy balloon, but keep clear of the blast.'),
  'g5': dict(title='Grapple Ninja', la='GRAPPLE', lb='SLASH',
             keys='<b>Keys:</b> arrows move, hold Z or Space to fire the grapple at a ring ahead and above you and swing, release to launch, X slashes, Enter starts, M mutes.'),
  'g6': dict(title='Kung Fu Knockout', la='PUNCH', lb='KICK',
             keys='<b>Keys:</b> arrows move, up jumps, Z or Space punches, X kicks. In the boss fight, left and right dodge, down blocks, Z jabs and X hooks when the boss is stunned. Enter starts, M mutes.'),
  'g7': dict(title='Maze Wrecker', la='SMASH', lb='DASH',
             keys='<b>Keys:</b> arrows move, Z or Space swings the hammer (smash the wall in front of you or stun a patrol bot), X dashes, Enter starts, M mutes. Wrecked walls reveal dots; collect 20 before the timer seals the maze. Walls grow back.'),
  'g8': dict(title='Morph Climb', la='JUMP', lb='FIRE',
             keys='<b>Keys:</b> left and right move, Z or Space jumps (wings: hold to flap), X fires the beam, B or Shift changes form, Enter starts, M mutes. Grab a form on each floor before the layer that needs it. Lava rises from below.'),
  'g9': dict(title='Dig Up', la='DIG', lb='PUMP',
             keys='<b>Keys:</b> left and right walk and face, up and down climb your tunnel, Z or Space digs the tile in front, up plus Z digs the tile above you, X pumps an enemy to stun it, Enter starts, M mutes. Dirt you dig above you falls on enemies below.'),
  'g10': dict(title='Gridlock Grand Prix', la='LANE', lb='NITRO',
             keys='<b>Keys:</b> left and right change lane (one tap each), up accelerates, down brakes, Z or Space uses your one nitro, Enter starts, M mutes. Pass cars in the next lane for near misses. One crash ends the run.'),
  'g11': dict(title='Hop Fight', la='UP-L', lb='UP-R',
             keys='<b>Keys:</b> Left and Right hop down the pyramid, Z (A) hops up-left, X (B) hops up-right. Diagonals (Up or Down plus Left or Right) also work. Land on cubes to claim them, hop onto your rival to knock them off. Enter starts, M mutes. Most cubes at the end wins.'),
}
def build(g, local_font=False, outdir=None):
    m = GAMES[g]
    head = open(f'{base}/head.html').read()
    font = '<style>@font-face{font-family:"Press Start 2P";src:url("press.woff2") format("woff2")}</style>' if local_font else \
           '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">'
    html = (head.replace('%%TITLE%%', m['title']).replace('%%LA%%', m['la']).replace('%%LB%%', m['lb'])
            .replace('%%KEYS%%', m['keys']).replace('%%FONT%%', font)
            .replace('%%CORE%%', open(f'{base}/core.js').read())
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
