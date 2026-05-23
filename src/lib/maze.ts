// Maze carved inside an arbitrary silhouette mask.

export interface Maze {
  cols: number;
  rows: number;
  /** true = cell belongs to the largest connected region of the shape */
  cells: boolean[];
  /** carved passages, keyed by edgeKey(a, b) */
  passages: Set<number>;
  start: number;
  end: number;
  /** direction (0..3) of the boundary opening for start/end, or -1 */
  startOpen: number;
  endOpen: number;
  bbox: { minR: number; maxR: number; minC: number; maxC: number };
}

// directions: 0=N 1=E 2=S 3=W
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

export function edgeKey(a: number, b: number): number {
  return a < b ? a * 1e7 + b : b * 1e7 + a;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neighbor(idx: number, dir: number, cols: number, rows: number): number {
  const r = Math.floor(idx / cols) + DR[dir];
  const c = (idx % cols) + DC[dir];
  if (r < 0 || c < 0 || r >= rows || c >= cols) return -1;
  return r * cols + c;
}

/** Keep only the largest 4-connected region of the mask. */
function largestRegion(inside: boolean[], cols: number, rows: number): boolean[] {
  const seen = new Int8Array(inside.length);
  let best: number[] = [];
  for (let i = 0; i < inside.length; i++) {
    if (!inside[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    const region: number[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      region.push(cur);
      for (let d = 0; d < 4; d++) {
        const nb = neighbor(cur, d, cols, rows);
        if (nb >= 0 && inside[nb] && !seen[nb]) {
          seen[nb] = 1;
          stack.push(nb);
        }
      }
    }
    if (region.length > best.length) best = region;
  }
  const cells = new Array<boolean>(inside.length).fill(false);
  for (const i of best) cells[i] = true;
  return cells;
}

/** BFS over carved passages; returns dist[] and parent[] from `src`. */
function bfs(
  src: number,
  maze: Pick<Maze, 'cols' | 'rows' | 'passages'>,
): { dist: Int32Array; parent: Int32Array } {
  const { cols, rows, passages } = maze;
  const dist = new Int32Array(cols * rows).fill(-1);
  const parent = new Int32Array(cols * rows).fill(-1);
  const q = [src];
  dist[src] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    for (let d = 0; d < 4; d++) {
      const nb = neighbor(cur, d, cols, rows);
      if (nb >= 0 && dist[nb] < 0 && passages.has(edgeKey(cur, nb))) {
        dist[nb] = dist[cur] + 1;
        parent[nb] = cur;
        q.push(nb);
      }
    }
  }
  return { dist, parent };
}

/** Cells in the silhouette that touch the OUTER background (off-grid or
 *  the flood-filled exterior), so start/end never end up against an
 *  interior hole that visually sits "inside" the maze. */
function outerBoundaryCells(
  cells: boolean[],
  cols: number,
  rows: number,
): number[] {
  // Flood fill the exterior — any non-cell square reachable from the grid border.
  const exterior = new Uint8Array(cells.length);
  const stack: number[] = [];
  const visit = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    const i = r * cols + c;
    if (cells[i] || exterior[i]) return;
    exterior[i] = 1;
    stack.push(i);
  };
  for (let c = 0; c < cols; c++) {
    visit(0, c);
    visit(rows - 1, c);
  }
  for (let r = 0; r < rows; r++) {
    visit(r, 0);
    visit(r, cols - 1);
  }
  while (stack.length) {
    const cur = stack.pop()!;
    const r = Math.floor(cur / cols);
    const c = cur % cols;
    visit(r - 1, c);
    visit(r + 1, c);
    visit(r, c - 1);
    visit(r, c + 1);
  }
  const out: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (
      r === 0 || r === rows - 1 || c === 0 || c === cols - 1 ||
      exterior[(r - 1) * cols + c] ||
      exterior[(r + 1) * cols + c] ||
      exterior[r * cols + (c - 1)] ||
      exterior[r * cols + (c + 1)]
    ) {
      out.push(i);
    }
  }
  return out;
}

/** Spatially farthest pair of cells (Euclidean²), so start/end sit on
 *  opposite sides of the shape rather than wherever graph-diameter lands. */
function farthestPair(
  candidates: number[],
  cols: number,
): { a: number; b: number } {
  if (candidates.length < 2) {
    return { a: candidates[0], b: candidates[0] };
  }
  let bestA = candidates[0];
  let bestB = candidates[1];
  let bestD = -1;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const ar = Math.floor(a / cols);
      const ac = a % cols;
      const br = Math.floor(b / cols);
      const bc = b % cols;
      const dr = ar - br;
      const dc = ac - bc;
      const d = dr * dr + dc * dc;
      if (d > bestD) {
        bestD = d;
        bestA = a;
        bestB = b;
      }
    }
  }
  return { a: bestA, b: bestB };
}

/** Find a direction whose neighbor leaves the shape (for an entrance gap). */
function openingDir(idx: number, maze: Maze): number {
  for (let d = 0; d < 4; d++) {
    const nb = neighbor(idx, d, maze.cols, maze.rows);
    if (nb < 0 || !maze.cells[nb]) return d;
  }
  return -1;
}

export function generateMaze(
  inside: boolean[],
  cols: number,
  rows: number,
  seed: number,
): Maze {
  const cells = largestRegion(inside, cols, rows);
  const count = cells.reduce((a, b) => a + (b ? 1 : 0), 0);
  const total = cols * rows;
  // Keep the maze-fillable area within a tight band so complexity stays
  // consistent across the book — reject too-thin and too-blobby shapes.
  const minCells = Math.max(12, Math.floor(total * 0.12));
  const maxCells = Math.floor(total * 0.55);
  if (count < minCells || count > maxCells) {
    throw new Error(
      'The shape area is out of range for the book — caller will rotate to another subject.',
    );
  }

  const rng = mulberry32(seed);
  const passages = new Set<number>();
  const visited = new Int8Array(cols * rows);

  const root = cells.indexOf(true);
  const stack = [root];
  visited[root] = 1;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [0, 1, 2, 3];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let advanced = false;
    for (const d of dirs) {
      const nb = neighbor(cur, d, cols, rows);
      if (nb >= 0 && cells[nb] && !visited[nb]) {
        visited[nb] = 1;
        passages.add(edgeKey(cur, nb));
        stack.push(nb);
        advanced = true;
        break;
      }
    }
    if (!advanced) stack.pop();
  }

  const bbox = { minR: rows, maxR: 0, minC: cols, maxC: 0 };
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
    bbox.minR = Math.min(bbox.minR, r);
    bbox.maxR = Math.max(bbox.maxR, r);
    bbox.minC = Math.min(bbox.minC, c);
    bbox.maxC = Math.max(bbox.maxC, c);
  }

  const maze: Maze = {
    cols,
    rows,
    cells,
    passages,
    start: root,
    end: root,
    startOpen: -1,
    endOpen: -1,
    bbox,
  };

  // Entrance and exit must sit on the OUTER edge of the silhouette and be
  // on opposite sides of the shape. Spatial farthest pair, not graph
  // diameter, so they always read as "across from each other".
  const outer = outerBoundaryCells(cells, cols, rows);
  if (outer.length < 2) {
    throw new Error('shape has no outer boundary cells');
  }
  const { a, b } = farthestPair(outer, cols);
  maze.start = a;
  maze.end = b;
  maze.startOpen = openingDir(a, maze);
  maze.endOpen = openingDir(b, maze);
  return maze;
}

export function solvePath(maze: Maze): number[] {
  const { parent } = bfs(maze.start, maze);
  const path: number[] = [];
  let cur = maze.end;
  while (cur >= 0) {
    path.push(cur);
    cur = parent[cur];
  }
  return path.reverse();
}

/** Is there a wall on side `dir` of `idx`? (used by renderer + input) */
export function hasWall(maze: Maze, idx: number, dir: number): boolean {
  if (idx === maze.start && dir === maze.startOpen) return false;
  if (idx === maze.end && dir === maze.endOpen) return false;
  const nb = neighbor(idx, dir, maze.cols, maze.rows);
  if (nb < 0 || !maze.cells[nb]) return true;
  return !maze.passages.has(edgeKey(idx, nb));
}

export { neighbor };
