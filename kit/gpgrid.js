// gpgrid: grid helpers shared by maze chaser, tetris, tower defense, farm, dungeon: ASCII maps, BFS paths, neighbours.
export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
/** Parse ASCII rows into {w,h,at(x,y),set(x,y,c),each(fn)}. Out-of-range reads return '#'. */
export const tileMap = rows => { const g = rows.map(r => [...r]); return { w: g[0].length, h: g.length, g, at: (x, y) => (g[y] && g[y][x] !== undefined ? g[y][x] : '#'), set(x, y, c) { if (g[y]) g[y][x] = c; }, each(fn) { g.forEach((r, y) => r.forEach((c, x) => fn(x, y, c))); }, find(ch) { const o = []; g.forEach((r, y) => r.forEach((c, x) => c === ch && o.push({ x, y }))); return o; } }; };
/** BFS shortest path from start to the first cell where isGoal(x,y) is true. passable(x,y) gates movement. Returns [{x,y}...] excluding start, or null. */
export function bfs(start, isGoal, passable, w = 99, h = 99) {
  const key = (x, y) => y * 1000 + x, prev = new Map([[key(start.x, start.y), null]]), q = [start];
  for (let i = 0; i < q.length; i++) { const c = q[i]; if (isGoal(c.x, c.y) && i > 0) { const path = []; for (let k = key(c.x, c.y); prev.get(k); k = key(prev.get(k).x, prev.get(k).y)) path.unshift({ x: Math.floor(k % 1000), y: Math.floor(k / 1000) }); return path; }
    for (const [dx, dy] of DIRS) { const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= w || y >= h || prev.has(key(x, y)) || !passable(x, y)) continue; prev.set(key(x, y), c); q.push({ x, y }); } }
  return null;
}
export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
