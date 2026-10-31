#!/usr/bin/env python3
"""Generates the Critter Clash rigs (original art): critter0..3 (evolution forms) and troopG/S/H (grunt/soldier/heavy) as *_rig.svg
with <g data-p=part> groups, then add them to SETS in build-art.cjs and run `node art/build-art.cjs`. Edit PALETTES to restyle."""
import os
here = os.path.dirname(os.path.abspath(__file__))
OL = '#15171d'
CRIT = [  # body light, body dark, petal light, petal dark, belly
    ('#9be86a', '#3f9a3a', '#ff7a9a', '#b82a58', '#f4f2b0'),
    ('#ffb060', '#c0601a', '#ffe070', '#c08a10', '#fff0c0'),
    ('#c08cff', '#6a3aa8', '#6ae8ff', '#1a7aa8', '#f0dcff'),
    ('#ffe070', '#d09010', '#ff5a50', '#a01818', '#fff8d0')]
def critter(i):
    bl, bd, pl, pd, bel = CRIT[i]
    petals = ''.join(f'<ellipse cx="50" cy="11" rx="6" ry="11" transform="rotate({a} 50 24)" fill="url(#p)"/>' for a in (-80, -40, 0, 40, 80))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bl}"/><stop offset="1" stop-color="{bd}"/></linearGradient>
<linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pl}"/><stop offset="1" stop-color="{pd}"/></linearGradient>
<radialGradient id="e" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d8e0ee"/></radialGradient></defs>
<g stroke="{OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
<g data-p="legB"><path d="M32 74 q-6 14 -2 19 q6 4 14 0 q2 -9 -1 -19z" fill="{bd}"/></g>
<g data-p="legF"><path d="M56 74 q-1 10 2 19 q8 4 14 0 q4 -6 -2 -19z" fill="{bd}"/></g>
<g data-p="body"><ellipse cx="50" cy="62" rx="25" ry="21" fill="url(#b)"/><ellipse cx="50" cy="68" rx="14" ry="11" fill="{bel}" stroke="none" opacity=".92"/><path d="M30 56 q4 -10 14 -12" stroke="#fff" stroke-width="2.4" opacity=".35" fill="none"/></g>
<g data-p="head">{petals}<ellipse cx="50" cy="38" rx="23" ry="19" fill="url(#b)"/><circle cx="50" cy="22" r="6" fill="{pl}"/>
<circle cx="39" cy="36" r="7.5" fill="url(#e)"/><circle cx="61" cy="36" r="7.5" fill="url(#e)"/><circle cx="41" cy="37" r="3.4" fill="{OL}" stroke="none"/><circle cx="63" cy="37" r="3.4" fill="{OL}" stroke="none"/><circle cx="42" cy="35.5" r="1.2" fill="#fff" stroke="none"/><circle cx="64" cy="35.5" r="1.2" fill="#fff" stroke="none"/>
<path d="M42 47 q8 6 16 0" fill="none" stroke-width="2.6"/><circle cx="30" cy="44" r="3.2" fill="#ff8aa0" stroke="none" opacity=".6"/><circle cx="70" cy="44" r="3.2" fill="#ff8aa0" stroke="none" opacity=".6"/></g>
<g data-p="arm"><path d="M66 60 q12 0 20 6 l-3 7 q-10 -3 -19 -3z" fill="{bd}"/><circle cx="86" cy="68" r="5.5" fill="{bl}"/></g>
</g></svg>'''
TROOP = {  # name: (cloth light, cloth dark, helmet light, helmet dark, skin, extra)
    'G': ('#a88060', '#5a3e28', '#c8c8d0', '#6a6a78', '#e8c090', 0),
    'S': ('#8a5a38', '#4a2c18', '#d8a040', '#8a5a10', '#e8c090', 1),
    'H': ('#6a8ee0', '#26408a', '#b8c8f0', '#4a5a9a', '#e8c090', 2)}
def troop(k):
    cl, cd, hl, hd, sk, ex = TROOP[k]
    horns = '<path d="M30 22 q-12 -2 -12 -16 q10 4 16 12z M70 22 q12 -2 12 -16 q-10 4 -16 12z" fill="#f4f0e0"/>' if ex == 2 else ''
    crest = '<path d="M50 6 q-4 -6 0 -6 q4 0 0 6z" fill="#d03030"/><rect x="47" y="2" width="6" height="14" rx="2" fill="#d03030"/>' if ex == 1 else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="400" height="480">
<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{cl}"/><stop offset="1" stop-color="{cd}"/></linearGradient>
<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{hl}"/><stop offset="1" stop-color="{hd}"/></linearGradient></defs>
<g stroke="{OL}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">
<g data-p="legB"><path d="M36 74 l-3 26 l14 1 l3 -27z" fill="{cd}"/><path d="M30 100 q-2 0 -2 5 q0 5 8 5 l14 0 q4 0 4 -5 l-2 -5z" fill="#2a2a32"/></g>
<g data-p="legF"><path d="M54 74 l3 27 l14 -1 l-4 -26z" fill="{cd}"/><path d="M54 101 q-4 0 -4 5 q0 5 8 5 l16 0 q5 0 5 -5 l-2 -5z" fill="#33333c"/></g>
<g data-p="torso"><path d="M30 46 q-4 0 -4 8 l2 24 q22 8 44 0 l2 -24 q0 -8 -4 -8z" fill="url(#c)"/><rect x="28" y="66" width="44" height="6" rx="2" fill="#3a2a1a"/><rect x="46" y="65" width="8" height="8" rx="1" fill="#e8c850"/>{'<path d="M30 50 l40 0" stroke="#fff" stroke-width="2" opacity=".35" fill="none"/>' if ex == 2 else ''}</g>
<g data-p="head">{horns}<ellipse cx="50" cy="32" rx="21" ry="19" fill="{sk}"/><path d="M29 30 q0 -20 21 -20 q21 0 21 20 q-10 -5 -21 -5 q-11 0 -21 5z" fill="url(#h)"/>{crest}
<rect x="36" y="31" width="9" height="6" rx="2" fill="#fff"/><rect x="55" y="31" width="9" height="6" rx="2" fill="#fff"/><circle cx="42" cy="34" r="2.2" fill="{OL}" stroke="none"/><circle cx="58" cy="34" r="2.2" fill="{OL}" stroke="none"/><path d="M34 28 l10 3 M66 28 l-10 3" stroke-width="2.6" fill="none"/><path d="M42 44 q8 -4 16 0" fill="none" stroke-width="2.4"/></g>
<g data-p="arm"><path d="M66 50 q14 0 22 8 l-4 7 q-10 -4 -20 -3z" fill="url(#c)"/><circle cx="88" cy="62" r="5.5" fill="{sk}"/><rect x="86" y="30" width="5" height="40" rx="2" fill="#7a5a30"/><circle cx="88.5" cy="28" r="6" fill="#5a5a68"/></g>
</g></svg>'''
for i in range(4): open(f'{here}/critter{i}_rig.svg', 'w').write(critter(i))
for k in TROOP: open(f'{here}/troop{k}_rig.svg', 'w').write(troop(k))
print('wrote critter0-3 and troopG/S/H rigs')
