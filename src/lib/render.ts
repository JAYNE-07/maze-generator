import { hasWall, solvePath, type Maze } from './maze';
import type { MarkerImg, Markers } from './markers';

/** Empty cells kept around the shape so edge markers aren't clipped. */
export const MARGIN_CELLS = 3;

export interface RenderOpts {
  cell: number;
  wall?: string;
  bg?: string;
  lineWidth?: number;
  solution?: number[] | null;
  userPath?: number[] | null;
  markers?: Markers | null;
}

// direction (0=N 1=E 2=S 3=W) -> outward unit vector in screen space
const ODX = [0, 1, 0, -1];
const ODY = [-1, 0, 1, 0];

export function mazePixelSize(maze: Maze, cell: number) {
  const { bbox } = maze;
  const m = MARGIN_CELLS * 2;
  return {
    width: (bbox.maxC - bbox.minC + 1 + m) * cell,
    height: (bbox.maxR - bbox.minR + 1 + m) * cell,
  };
}

function cellXY(maze: Maze, idx: number, cell: number) {
  const { cols, bbox } = maze;
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  return {
    x: (c - bbox.minC + MARGIN_CELLS) * cell,
    y: (r - bbox.minR + MARGIN_CELLS) * cell,
  };
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  maze: Maze,
  path: number[],
  cell: number,
  color: string,
  width: number,
) {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  path.forEach((idx, i) => {
    const { x, y } = cellXY(maze, idx, cell);
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();
  ctx.restore();
}

/** Centre + half-size of the marker. The finish marker is intentionally
 *  larger than the start so the goal stands out clearly. */
function markerGeom(
  maze: Maze,
  idx: number,
  openDir: number,
  cell: number,
  finish: boolean,
) {
  const { x, y } = cellXY(maze, idx, cell);
  const r = finish
    ? Math.max(cell * 1.05, 8) // ~2 cells: goal pops
    : Math.max(cell * 0.62, 4); // ~1.25 cells: tunnel-sized start
  const off = openDir >= 0 ? cell * 0.5 + r + cell * 0.1 : 0;
  const d = openDir >= 0 ? openDir : 0;
  return {
    cx: x + cell / 2 + ODX[d] * off,
    cy: y + cell / 2 + ODY[d] * off,
    r,
  };
}

/** Vector fallback when no cartoon was generated. Start = circle,
 *  finish = checkered flag. */
function drawFlag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  finish: boolean,
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (finish) {
    const poleX = cx - r * 0.55;
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(poleX, cy - r);
    ctx.lineTo(poleX, cy + r);
    ctx.stroke();
    const n = 3;
    const s = (r * 1.3) / n;
    for (let yy = 0; yy < n; yy++)
      for (let xx = 0; xx < n; xx++) {
        ctx.fillStyle = (xx + yy) % 2 ? '#0b1220' : '#ffffff';
        ctx.fillRect(poleX + xx * s, cy - r + yy * s, s, s);
      }
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.strokeRect(poleX, cy - r, r * 1.3, r * 1.3);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  maze: Maze,
  idx: number,
  openDir: number,
  m: MarkerImg | null,
  cell: number,
  accent: string,
  finish: boolean,
) {
  const { cx, cy, r } = markerGeom(maze, idx, openDir, cell, finish);
  // Warm halo behind the finish marker so the goal reads immediately.
  if (finish) {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.55);
    halo.addColorStop(0, 'rgba(255, 196, 56, 0.55)');
    halo.addColorStop(1, 'rgba(255, 196, 56, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (m && m.img.complete && m.img.naturalWidth) {
    const iw = m.img.naturalWidth;
    const ih = m.img.naturalHeight;
    const s = Math.min((2 * r) / iw, (2 * r) / ih);
    const w = iw * s;
    const h = ih * s;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.max(2, r * (finish ? 0.32 : 0.22));
    ctx.drawImage(m.img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    drawFlag(ctx, cx, cy, r, accent, finish);
  }
}

export function drawMaze(
  ctx: CanvasRenderingContext2D,
  maze: Maze,
  opts: RenderOpts,
) {
  const cell = opts.cell;
  const { width, height } = mazePixelSize(maze, cell);
  ctx.clearRect(0, 0, width, height);
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, width, height);
  }

  if (opts.solution && opts.solution.length > 1) {
    strokePath(ctx, maze, opts.solution, cell, 'rgba(56,189,248,0.55)', Math.max(2, cell * 0.5));
  }
  if (opts.userPath && opts.userPath.length > 1) {
    strokePath(ctx, maze, opts.userPath, cell, 'rgba(34,197,94,0.6)', Math.max(2, cell * 0.5));
  }

  ctx.strokeStyle = opts.wall ?? '#0b1220';
  // Bump line weight for printable-book legibility.
  ctx.lineWidth = opts.lineWidth ?? Math.max(1.5, cell * 0.26);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < maze.cells.length; i++) {
    if (!maze.cells[i]) continue;
    const { x, y } = cellXY(maze, i, cell);
    if (hasWall(maze, i, 0)) (ctx.moveTo(x, y), ctx.lineTo(x + cell, y)); // N
    if (hasWall(maze, i, 3)) (ctx.moveTo(x, y), ctx.lineTo(x, y + cell)); // W
    if (hasWall(maze, i, 1)) (ctx.moveTo(x + cell, y), ctx.lineTo(x + cell, y + cell)); // E
    if (hasWall(maze, i, 2)) (ctx.moveTo(x, y + cell), ctx.lineTo(x + cell, y + cell)); // S
  }
  ctx.stroke();

  const mk = opts.markers ?? null;
  drawMarker(ctx, maze, maze.start, maze.startOpen, mk?.start ?? null, cell, '#22c55e', false);
  drawMarker(ctx, maze, maze.end, maze.endOpen, mk?.end ?? null, cell, '#ef4444', true);
}

/** Render to a fresh white canvas (for image / PDF export).
 *  Pass `title` to bake a heading above the maze. */
export function renderToCanvas(
  maze: Maze,
  cell: number,
  withSolution: boolean,
  markers: Markers | null,
  title?: string,
): HTMLCanvasElement {
  const { width: mw, height: mh } = mazePixelSize(maze, cell);
  const titleH = title ? Math.max(48, cell * 3) : 0;
  const canvas = document.createElement('canvas');
  canvas.width = mw;
  canvas.height = mh + titleH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (title) {
    const fs = Math.max(22, Math.min(48, cell * 2.2));
    ctx.fillStyle = '#0b1220';
    ctx.font =
      `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, mw / 2, titleH * 0.55);
  }
  ctx.translate(0, titleH);
  drawMaze(ctx, maze, {
    cell,
    wall: '#0b1220',
    solution: withSolution ? solvePath(maze) : null,
    markers,
  });
  return canvas;
}

export function mazeToSVG(
  maze: Maze,
  cell: number,
  markers: Markers | null,
): string {
  const { width, height } = mazePixelSize(maze, cell);
  const lines: string[] = [];
  const seg = (x1: number, y1: number, x2: number, y2: number) =>
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  for (let i = 0; i < maze.cells.length; i++) {
    if (!maze.cells[i]) continue;
    const { x, y } = cellXY(maze, i, cell);
    if (hasWall(maze, i, 0)) seg(x, y, x + cell, y);
    if (hasWall(maze, i, 3)) seg(x, y, x, y + cell);
    if (hasWall(maze, i, 1)) seg(x + cell, y, x + cell, y + cell);
    if (hasWall(maze, i, 2)) seg(x, y + cell, x + cell, y + cell);
  }

  const stamp = (
    idx: number,
    openDir: number,
    m: MarkerImg | null,
    color: string,
    finish: boolean,
  ) => {
    const g = markerGeom(maze, idx, openDir, cell, finish);
    const halo = finish
      ? `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r * 1.55}" fill="rgba(255,196,56,0.45)"/>`
      : '';
    if (m) {
      return `${halo}<image href="${m.url}" x="${g.cx - g.r}" y="${g.cy - g.r}" width="${
        g.r * 2
      }" height="${g.r * 2}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    if (!finish) {
      return `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="${color}" stroke="#0b1220" stroke-width="${Math.max(
        1.5,
        g.r * 0.14,
      )}"/>`;
    }
    const poleX = g.cx - g.r * 0.55;
    const s = (g.r * 1.3) / 3;
    const sq: string[] = [];
    for (let yy = 0; yy < 3; yy++)
      for (let xx = 0; xx < 3; xx++)
        if ((xx + yy) % 2 === 0)
          sq.push(
            `<rect x="${poleX + xx * s}" y="${g.cy - g.r + yy * s}" width="${s}" height="${s}" fill="#0b1220"/>`,
          );
    return `${halo}<line x1="${poleX}" y1="${g.cy - g.r}" x2="${poleX}" y2="${
      g.cy + g.r
    }" stroke="#0b1220" stroke-width="${Math.max(2, g.r * 0.16)}" stroke-linecap="round"/>
<rect x="${poleX}" y="${g.cy - g.r}" width="${g.r * 1.3}" height="${
      g.r * 1.3
    }" fill="#ffffff" stroke="#0b1220" stroke-width="${Math.max(1, g.r * 0.08)}"/>
${sq.join('')}`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
<g stroke="#0b1220" stroke-width="${Math.max(1.5, cell * 0.26)}" stroke-linecap="round" fill="none">
${lines.join('\n')}
</g>
${stamp(maze.start, maze.startOpen, markers?.start ?? null, '#22c55e', false)}
${stamp(maze.end, maze.endOpen, markers?.end ?? null, '#ef4444', true)}
</svg>`;
}
