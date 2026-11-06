#!/usr/bin/env python3
"""
slice_spritesheet.py — Slice a labeled sprite-sheet image into clean game-ready frames.

Takes a sprite sheet with a labeled grid layout (like AI-generated production
sheets), auto-detects grid cells, keys the background to transparent, removes
labels and grid lines, tight-crops each frame, and outputs:

  - Individual RGBA PNGs (transparent)
  - An assembled uniform-grid spritesheet PNG (feet bottom-aligned)
  - A JSON manifest: {"char": {"action": [x,y,w,h] | [[x,y,w,h],...]}}

Only deps: PIL (Pillow) + numpy. No other packages.

Example:
    slice_spritesheet.py sheet.jpg --rows 2 --cols 8 --title-h 60 --label-h 30 \\
        --bg auto --out-dir ./sprites/ --manifest spritesheet.json \\
        --layout "spike:idle,run1,run2,run3,swing,strike,dink,smash;ace:idle,run1,run2,run3,swing,strike,dink,smash"

Techniques (from gamepress docs/SPRITE-ATLAS.md):
  - Grid detection counts LONG continuous bright runs (not single rows) so
    character pixels (red/yellow paddles) don't create false line detections.
  - Background + grid lines keyed separately; grid keying uses a desaturation
    guard so character blues aren't eaten.
  - Label text excluded by cropping --label-h px off the bottom of each cell.
"""

import argparse
import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required: pip install pillow")
try:
    import numpy as np
except ImportError:
    sys.exit("numpy required: pip install numpy")


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def parse_hex(s):
    s = s.lstrip('#')
    if len(s) == 3:
        s = ''.join(c * 2 for c in s)
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def color_dist(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def sample_bg_color(img, n=12):
    """Sample background from image edges (avoids center content).

    Samples a ring of points inset from the edges and takes the most common
    quantized color — sprite sheets are mostly background.
    """
    rgb = img.convert('RGB')
    w, h = rgb.size
    pts = []
    # ring inset ~2% from edges, plus mid-edge points
    ix, iy = max(4, w // 50), max(4, h // 50)
    for i in range(n):
        t = i / max(n - 1, 1)
        ex = ix + int((w - 2 * ix) * t)
        ey = iy + int((h - 2 * iy) * t)
        pts += [(ex, iy), (ex, h - 1 - iy), (ix, ey), (w - 1 - ix, ey)]
    from collections import Counter
    # quantize to reduce noise, take most common color
    colors = Counter()
    for x, y in pts:
        p = rgb.getpixel((x, y))
        q = (p[0] // 8 * 8, p[1] // 8 * 8, p[2] // 8 * 8)
        colors[q] += 1
    best = colors.most_common(1)[0][0]
    return best


def detect_grid_lines(img, axis, min_run_frac=0.6, bright_thresh=18):
    """
    Detect grid lines along an axis by counting LONG continuous bright runs.

    axis='x' -> returns sorted x positions of vertical lines
    axis='y' -> returns sorted y positions of horizontal lines

    Uses brightness *difference* from local background so character pixels
    (bright paddles etc.) don't create false detections — only lines that run
    across most of the image count.
    """
    g = np.asarray(img.convert('L'), dtype=np.int16)
    h, w = g.shape
    lines = []
    if axis == 'x':
        # scan each column: count rows where column is brighter than neighbors
        for x in range(2, w - 2):
            col = g[:, x]
            left = g[:, x - 2:x].mean(axis=1)
            right = g[:, x + 1:x + 3].mean(axis=1)
            bright = (col - left > bright_thresh) & (col - right > bright_thresh)
            if bright.mean() > min_run_frac:
                lines.append(x)
    else:
        for y in range(2, h - 2):
            row = g[y, :]
            up = g[y - 2:y, :].mean(axis=0)
            down = g[y + 1:y + 3, :].mean(axis=0)
            bright = (row - up > bright_thresh) & (row - down > bright_thresh)
            if bright.mean() > min_run_frac:
                lines.append(y)
    # merge adjacent detections into single line positions
    merged = []
    for p in lines:
        if merged and p - merged[-1] <= 3:
            continue
        merged.append(p)
    return merged


def key_background(rgba, bg, tol, grid_color=None, grid_tol=40):
    """
    Key background (and optional grid lines) to transparent.

    Grid keying uses a desaturation guard: grid lines on these sheets are
    greyish, so we only key pixels whose saturation is low — this protects
    saturated character colors (blues, reds) that might be near the grid
    color in Manhattan distance.
    """
    arr = np.asarray(rgba).astype(np.int16)
    rgb = arr[:, :, :3]
    d = (np.abs(rgb[:, :, 0] - bg[0]) +
         np.abs(rgb[:, :, 1] - bg[1]) +
         np.abs(rgb[:, :, 2] - bg[2]))
    mask = d < tol
    if grid_color is not None:
        gd = (np.abs(rgb[:, :, 0] - grid_color[0]) +
              np.abs(rgb[:, :, 1] - grid_color[1]) +
              np.abs(rgb[:, :, 2] - grid_color[2]))
        mx = rgb.max(axis=2)
        mn = rgb.min(axis=2)
        saturation = mx - mn
        # only key desaturated pixels (grey grid lines, not blue clothing)
        mask |= (gd < grid_tol) & (saturation < 60)
    out = rgba.copy()
    out_arr = np.array(out)  # writable copy (asarray is read-only)
    out_arr[mask, 3] = 0
    return Image.fromarray(out_arr, 'RGBA')


def clear_corners(img, n=2):
    """Clear n×n corner blocks (removes 1px grid-line remnants)."""
    w, h = img.size
    arr = np.array(img)  # writable copy
    arr[:n, :n, 3] = 0
    arr[:n, w - n:, 3] = 0
    arr[h - n:, :n, 3] = 0
    arr[h - n:, w - n:, 3] = 0
    return Image.fromarray(arr, 'RGBA')


def tight_crop(img, pad=1):
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.size[0], x1 + pad)
    y1 = min(img.size[1], y1 + pad)
    return img.crop((x0, y0, x1, y1))


def parse_layout(s):
    """'spike:idle,run,walk;ace:idle,walk' -> [('spike', ['idle','run','walk']), ...]"""
    rows = []
    for part in s.split(';'):
        part = part.strip()
        if not part:
            continue
        char, actions = part.split(':', 1)
        rows.append((char.strip(), [a.strip() for a in actions.split(',')]))
    return rows


# ---------------------------------------------------------------------------
# main pipeline
# ---------------------------------------------------------------------------

def slice_sheet(args):
    img = Image.open(args.input).convert('RGB')
    W, H = img.size

    # background color
    if args.bg == 'auto':
        bg = sample_bg_color(img)
    else:
        bg = parse_hex(args.bg)
    print(f"background: rgb{bg} (tolerance {args.bg_tolerance})", file=sys.stderr)

    grid_color = parse_hex(args.grid_color) if args.grid_color else None
    if grid_color:
        print(f"grid color: rgb{grid_color}", file=sys.stderr)

    # grid geometry
    y0 = args.title_h
    y1 = y0 + args.grid_h if args.grid_h else H
    if args.rows and args.cols:
        rows, cols = args.rows, args.cols
        grid_h = y1 - y0
        cell_w = W / cols
        cell_h = grid_h / rows
        xs = [int(i * cell_w) for i in range(cols + 1)]
        ys = [int(y0 + i * cell_h) for i in range(rows + 1)]
        # clamp last to grid edge
        xs[-1], ys[-1] = W, y1
    elif args.cell_w and args.cell_h:
        xs = list(range(0, W + 1, args.cell_w))
        ys = list(range(y0, H + 1, args.cell_h))
        if xs[-1] != W:
            xs.append(W)
        if ys[-1] != H:
            ys.append(H)
        cols, rows = len(xs) - 1, len(ys) - 1
    else:
        # auto-detect grid lines
        print("auto-detecting grid lines...", file=sys.stderr)
        crop = img.crop((0, y0, W, H))
        xs_rel = detect_grid_lines(crop, 'x')
        ys_rel = detect_grid_lines(crop, 'y')
        xs = [0] + xs_rel + [W]
        ys = [y0] + [y + y0 for y in ys_rel] + [H]
        cols, rows = len(xs) - 1, len(ys) - 1
        print(f"detected {cols}x{rows} grid", file=sys.stderr)

    print(f"grid: {cols} cols x {rows} rows, title_h={y0}", file=sys.stderr)

    layout = parse_layout(args.layout) if args.layout else []
    if layout and len(layout) != rows:
        print(f"warning: layout has {len(layout)} rows but grid has {rows}",
              file=sys.stderr)

    os.makedirs(args.out_dir, exist_ok=True)

    frames = []  # (char, action, index, image)
    for r in range(rows):
        char = layout[r][0] if r < len(layout) else f"row{r}"
        actions = layout[r][1] if r < len(layout) else []
        for c in range(cols):
            x0c, x1c = xs[c], xs[c + 1]
            y0c, y1c = ys[r], ys[r + 1]
            # cut label strip off the bottom of the cell
            if args.label_h:
                y1c = max(y0c + 1, y1c - args.label_h)
            cell = img.crop((x0c, y0c, x1c, y1c)).convert('RGBA')
            cell = key_background(cell, bg, args.bg_tolerance,
                                  grid_color, args.grid_tolerance)
            cell = clear_corners(cell, args.corner_clear)
            cell = tight_crop(cell, args.pad)

            action = actions[c] if c < len(actions) else f"frame{c}"
            # count how many times this (char, action) appeared for _i suffix
            idx = sum(1 for f in frames if f[0] == char and f[1] == action)
            frames.append((char, action, idx, cell))

    # name + save individual frames
    manifest = {}
    saved = []
    for char, action, idx, cell in frames:
        name = args.pattern.format(char=char, action=action, i=idx)
        path = os.path.join(args.out_dir, name)
        cell.save(path)
        saved.append((name, cell.size))
        key = f"{char}/{action}"
        rect = None  # filled in after assembly
        manifest.setdefault(char, {}).setdefault(action, []).append(
            {"_file": name, "_size": list(cell.size)})

    # assemble uniform-grid sheet (bottom-aligned feet)
    cell_w = max(w for _, (w, h) in saved) + args.sheet_pad * 2
    # group by char for row layout: one row per character
    chars = []
    for char, action, idx, cell in frames:
        if char not in chars:
            chars.append(char)
    # columns = max actions per char
    max_cols = 0
    by_char = {}
    for char, action, idx, cell in frames:
        by_char.setdefault(char, []).append((action, idx, cell))
    max_cols = max(len(v) for v in by_char.values())
    max_h = max(h for _, (w, h) in saved)
    cell_h = max_h + args.sheet_pad * 2

    sheet_w = max_cols * cell_w
    sheet_h = len(chars) * cell_h
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))

    final_manifest = {}
    for ri, char in enumerate(chars):
        final_manifest[char] = {}
        for ci, (action, idx, cell) in enumerate(by_char[char]):
            dx = ci * cell_w + (cell_w - cell.size[0]) // 2
            dy = ri * cell_h + (cell_h - cell.size[1])  # bottom-aligned
            sheet.paste(cell, (dx, dy), cell)
            rect = [dx, dy, cell.size[0], cell.size[1]]
            final_manifest[char].setdefault(action, []).append(rect)

    # simplify single-frame actions to [x,y,w,h] instead of [[x,y,w,h]]
    for char in final_manifest:
        for action in final_manifest[char]:
            if len(final_manifest[char][action]) == 1:
                final_manifest[char][action] = final_manifest[char][action][0]

    sheet_path = os.path.join(args.out_dir, args.sheet_name)
    sheet.save(sheet_path)
    print(f"sheet: {sheet_path} {sheet.size}", file=sys.stderr)

    man_path = args.manifest or os.path.join(args.out_dir, 'spritesheet.json')
    with open(man_path, 'w') as f:
        json.dump(final_manifest, f, indent=2)
    print(f"manifest: {man_path}", file=sys.stderr)

    return saved, sheet_path, man_path, final_manifest


def verify(args, saved, sheet_path, man_path, manifest):
    """Verification mode: transparency, non-empty, rects in-bounds."""
    errors = []
    sheet = Image.open(sheet_path)
    sw, sh = sheet.size
    for name, (w, h) in saved:
        p = os.path.join(args.out_dir, name)
        im = Image.open(p)
        if im.mode != 'RGBA':
            errors.append(f"{name}: not RGBA ({im.mode})")
            continue
        alpha = np.asarray(im.split()[3])
        transparent = (alpha < 128).mean()
        if transparent < 0.05:
            errors.append(f"{name}: only {transparent*100:.1f}% transparent "
                          f"(bg keying may have failed)")
        if (alpha > 128).sum() == 0:
            errors.append(f"{name}: fully transparent (empty frame)")
    # manifest rects in bounds
    def check_rects(node, path=""):
        if isinstance(node, list) and node and isinstance(node[0], int):
            x, y, w, h = node
            if x < 0 or y < 0 or x + w > sw or y + h > sh:
                errors.append(f"manifest {path}: rect {node} out of "
                              f"sheet bounds {sw}x{sh}")
        elif isinstance(node, list):
            for i, sub in enumerate(node):
                check_rects(sub, f"{path}[{i}]")
        elif isinstance(node, dict):
            for k, v in node.items():
                check_rects(v, f"{path}/{k}")
    check_rects(manifest)
    if errors:
        print("VERIFY FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return False
    print(f"VERIFY OK: {len(saved)} frames, all RGBA, transparency present, "
          f"manifest rects in bounds.", file=sys.stderr)
    return True


def main():
    ap = argparse.ArgumentParser(
        description="Slice a labeled sprite-sheet into game-ready frames.")
    ap.add_argument('input', help='sprite sheet image (jpg/png/webp)')
    ap.add_argument('--rows', type=int, default=None)
    ap.add_argument('--cols', type=int, default=None)
    ap.add_argument('--cell-w', type=int, default=None,
                    help='cell width px (alt to --rows/--cols)')
    ap.add_argument('--cell-h', type=int, default=None,
                    help='cell height px (alt to --rows/--cols)')
    ap.add_argument('--title-h', type=int, default=0,
                    help='px to skip at top (title bar)')
    ap.add_argument('--grid-h', type=int, default=None,
                    help='grid height px (default: to image bottom)')
    ap.add_argument('--label-h', type=int, default=0,
                    help='px to crop off bottom of each cell (text labels)')
    ap.add_argument('--bg', default='auto',
                    help="'auto' (sample corners) or hex like #22252a")
    ap.add_argument('--bg-tolerance', type=int, default=60,
                    help='Manhattan color distance for bg keying')
    ap.add_argument('--grid-color', default=None,
                    help='hex of grid lines to key out (with desat guard)')
    ap.add_argument('--grid-tolerance', type=int, default=40)
    ap.add_argument('--corner-clear', type=int, default=2,
                    help='clear NxN corners (grid remnants)')
    ap.add_argument('--pad', type=int, default=1,
                    help='tight-crop padding px')
    ap.add_argument('--sheet-pad', type=int, default=8,
                    help='padding inside assembled sheet cells')
    ap.add_argument('--out-dir', default='./sprites',
                    help='output directory for frames')
    ap.add_argument('--sheet-name', default='spritesheet.png')
    ap.add_argument('--manifest', default=None,
                    help='manifest path (default: <out-dir>/spritesheet.json)')
    ap.add_argument('--pattern', default='{char}_{action}_{i}.png',
                    help='frame filename pattern')
    ap.add_argument('--layout', default=None,
                    help='"char:col0,col1..;char2:..." action names per column')
    ap.add_argument('--verify', action='store_true',
                    help='run verification checks after slicing')
    ap.add_argument('--no-verify', dest='verify', action='store_false')
    ap.set_defaults(verify=True)
    args = ap.parse_args()

    if not args.input or not os.path.exists(args.input):
        sys.exit(f"input not found: {args.input}")

    saved, sheet_path, man_path, manifest = slice_sheet(args)
    ok = True
    if args.verify:
        ok = verify(args, saved, sheet_path, man_path, manifest)
    print(f"done: {len(saved)} frames -> {args.out_dir}")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
