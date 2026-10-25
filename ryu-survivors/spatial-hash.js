// spatial-hash.js — reusable uniform-grid spatial hash for dense, swap-packed entity arrays.
// No dependencies, zero allocations after construction. Rebuilt every sim step with a counting sort.
//
//   const H = new SpatialHash(1.0, 96, 96, 4096);  // cell size (world units), grid cols/rows, max items
//   H.build(centerX, centerY, n, xs, ys);           // grid window is re-centred on (centerX, centerY) each build
//   const k = H.query(x, y, r, outInt32Array);      // candidate ids within the cells touching the circle (caller tests exact distance)
//   H.cellOf(x, y) / H.start / H.items              // raw access for tight neighbour loops (see Horde.separate)
//
// Items outside the window clamp to the border cells, so queries stay correct, just slower out there.
export class SpatialHash {
  constructor(cellSize = 1, cols = 96, rows = 96, maxItems = 4096) {
    this.cs = cellSize; this.inv = 1 / cellSize; this.cols = cols; this.rows = rows;
    this.ox = 0; this.oy = 0; this.n = 0;
    this.start = new Int32Array(cols * rows + 1);
    this.cursor = new Int32Array(cols * rows);
    this.items = new Int32Array(maxItems);
    this.cell = new Int32Array(maxItems);
  }
  cx(x) { let c = Math.floor((x - this.ox) * this.inv); return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c; }
  cy(y) { let c = Math.floor((y - this.oy) * this.inv); return c < 0 ? 0 : c >= this.rows ? this.rows - 1 : c; }
  cellOf(x, y) { return this.cy(y) * this.cols + this.cx(x); }
  build(centerX, centerY, n, xs, ys) {
    this.ox = centerX - this.cols * this.cs * 0.5; this.oy = centerY - this.rows * this.cs * 0.5;
    const nc = this.cols * this.rows, cur = this.cursor, st = this.start, cell = this.cell;
    if (n > this.items.length) n = this.items.length;
    this.n = n; cur.fill(0);
    for (let i = 0; i < n; i++) { const c = this.cellOf(xs[i], ys[i]); cell[i] = c; cur[c]++; }
    st[0] = 0; for (let c = 0; c < nc; c++) { st[c + 1] = st[c] + cur[c]; cur[c] = st[c]; }
    const it = this.items; for (let i = 0; i < n; i++) it[cur[cell[i]]++] = i;
  }
  // candidates in every cell overlapped by the circle; returns count written to out (capped at out.length)
  query(x, y, r, out) {
    const x0 = this.cx(x - r), x1 = this.cx(x + r), y0 = this.cy(y - r), y1 = this.cy(y + r);
    const st = this.start, it = this.items, cap = out.length; let k = 0;
    for (let cy = y0; cy <= y1; cy++) {
      const row = cy * this.cols;
      for (let cx = x0; cx <= x1; cx++) {
        const c = row + cx; for (let j = st[c], e = st[c + 1]; j < e; j++) { if (k >= cap) return k; out[k++] = it[j]; }
      }
    }
    return k;
  }
  // nearest id to (x,y) within maxR whose test(id) passes (test optional); -1 if none. Searches outward ring by ring.
  nearest(x, y, maxR, xs, ys, test) {
    const ccx = this.cx(x), ccy = this.cy(y), maxRing = Math.ceil(maxR * this.inv) + 1;
    let best = -1, bd = maxR * maxR;
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let cy = ccy - ring; cy <= ccy + ring; cy++) {
        if (cy < 0 || cy >= this.rows) continue;
        for (let cx = ccx - ring; cx <= ccx + ring; cx++) {
          if (cx < 0 || cx >= this.cols) continue;
          if (ring > 0 && cy !== ccy - ring && cy !== ccy + ring && cx !== ccx - ring && cx !== ccx + ring) continue;
          const c = cy * this.cols + cx;
          for (let j = this.start[c], e = this.start[c + 1]; j < e; j++) {
            const id = this.items[j]; const dx = xs[id] - x, dy = ys[id] - y, d = dx * dx + dy * dy;
            if (d < bd && (!test || test(id))) { bd = d; best = id; }
          }
        }
      }
      // a hit inside this ring can't be beaten by a farther ring once the ring's inner distance exceeds it
      if (best >= 0 && (ring * this.cs) * (ring * this.cs) > bd) break;
    }
    return best;
  }
}
