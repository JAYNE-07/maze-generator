import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasWall, solvePath } from './lib/maze';
import {
  drawMaze,
  mazePixelSize,
  mazeToSVG,
  renderToCanvas,
  MARGIN_CELLS,
} from './lib/render';
import {
  exportBookPdf,
  exportBookZip,
  generateBatch,
  regenerateOne,
  type BookMaze,
  type PageSize,
  type SolutionMode,
} from './lib/book';
import { PRIMARY_KEYWORDS } from './lib/themes';

const LEVELS = [
  { name: 'Easy', cols: 36 },
  { name: 'Medium', cols: 52 },
  { name: 'Hard', cols: 72 },
  { name: 'Expert', cols: 96 },
  { name: 'Insane', cols: 124 },
];

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface Progress {
  label: string;
  done: number;
  total: number;
}

function dirBetween(a: number, b: number, cols: number): number {
  const ar = Math.floor(a / cols),
    ac = a % cols;
  const br = Math.floor(b / cols),
    bc = b % cols;
  if (br === ar - 1 && bc === ac) return 0;
  if (br === ar && bc === ac + 1) return 1;
  if (br === ar + 1 && bc === ac) return 2;
  if (br === ar && bc === ac - 1) return 3;
  return -1;
}

export default function App() {
  const [keyword, setKeyword] = useState('animals');
  const [level, setLevel] = useState(1);
  const [count, setCount] = useState(30);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [mazes, setMazes] = useState<BookMaze[]>([]);
  const [page, setPage] = useState(0);
  const [solMode, setSolMode] = useState<SolutionMode>('after-each');
  const [pageSize, setPageSize] = useState<PageSize>('6x9');
  const [showSolution, setShowSolution] = useState(false);
  const [userPath, setUserPath] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  const shapeSeedRef = useRef(1);
  const usedEverRef = useRef<Set<number>>(new Set());
  const mainRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const current = mazes[page] ?? null;
  const maze = current?.maze ?? null;
  const markers = current?.markers ?? null;
  const busy = progress !== null || status === 'loading';

  const cell = useMemo(() => {
    if (!maze) return 14;
    const m = MARGIN_CELLS * 2;
    const spanC = maze.bbox.maxC - maze.bbox.minC + 1 + m;
    const spanR = maze.bbox.maxR - maze.bbox.minR + 1 + m;
    return Math.max(5, Math.min(22, Math.floor(Math.min(900 / spanC, 680 / spanR))));
  }, [maze]);

  const runBatch = useCallback(
    async (kw: string, base: number) => {
      setProgress({ label: 'Generating unique shapes', done: 0, total: count });
      const { book: list, warning } = await generateBatch(
        kw,
        base,
        LEVELS[level].cols,
        count,
        (d, t) =>
          setProgress({ label: 'Generating unique shapes', done: d, total: t }),
      );
      setMazes(list);
      usedEverRef.current = new Set(list.map((b) => b.subjIdx));
      setPage(0);
      setUserPath([]);
      setSolved(false);
      setShowSolution(false);
      // Partial-success warning is non-fatal — book is still usable.
      setWarning(warning ?? '');
      setStatus('ready');
      setProgress(null);
    },
    [count, level],
  );

  const generate = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw || busy) return;
    setStatus('loading');
    setError('');
    setWarning('');
    setMazes([]);
    // Reroll the shape seed on every Generate so the same keyword yields a
    // different set of shapes (and a different order) each run.
    shapeSeedRef.current = Math.floor(Math.random() * 1e9);
    try {
      await runBatch(kw, shapeSeedRef.current);
    } catch (e) {
      setStatus('error');
      setProgress(null);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [keyword, busy, runBatch]);

  const regenSingle = useCallback(async () => {
    if (busy || !maze) return;
    setError('');
    setWarning('');
    setProgress({
      label: `Regenerating maze ${page + 1}`,
      done: 0,
      total: 1,
    });
    try {
      const salt = Math.floor(Math.random() * 1e9);
      // Skip every subject ever used in this book session, not just the
      // ones currently visible — otherwise a freed slot gets re-picked.
      const used = new Set<number>(usedEverRef.current);
      mazes.forEach((m) => used.add(m.subjIdx));
      const bm = await regenerateOne(
        keyword.trim(),
        shapeSeedRef.current,
        LEVELS[level].cols,
        salt,
        used,
      );
      if (!bm) throw new Error('Could not regenerate — try again.');
      usedEverRef.current.add(bm.subjIdx);
      setMazes((arr) => arr.map((m, i) => (i === page ? bm : m)));
      setUserPath([]);
      setSolved(false);
      setShowSolution(false);
      setProgress({
        label: `Regenerating maze ${page + 1}`,
        done: 1,
        total: 1,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not regenerate.');
    } finally {
      setProgress(null);
    }
  }, [busy, maze, keyword, page, level, mazes]);

  const newMazes = useCallback(async () => {
    const kw = keyword.trim();
    if (busy || !kw) return;
    shapeSeedRef.current = Math.floor(Math.random() * 1e9);
    try {
      await runBatch(kw, shapeSeedRef.current);
    } catch (e) {
      setStatus('error');
      setProgress(null);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [busy, keyword, runBatch]);

  // Draw the current maze.
  useEffect(() => {
    if (!maze || !mainRef.current) return;
    const { width, height } = mazePixelSize(maze, cell);
    const cv = mainRef.current;
    cv.width = width;
    cv.height = height;
    const ov = overlayRef.current!;
    ov.width = width;
    ov.height = height;
    drawMaze(cv.getContext('2d')!, maze, {
      cell,
      wall: '#e8edff',
      solution: showSolution ? solvePath(maze) : null,
      markers,
    });
  }, [maze, cell, showSolution, markers]);

  // Draw the traced path.
  useEffect(() => {
    const ov = overlayRef.current;
    if (!ov || !maze) return;
    const ctx = ov.getContext('2d')!;
    ctx.clearRect(0, 0, ov.width, ov.height);
    if (userPath.length < 2) return;
    ctx.strokeStyle = solved ? 'rgba(34,197,94,0.85)' : 'rgba(56,189,248,0.8)';
    ctx.lineWidth = Math.max(2, cell * 0.5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    userPath.forEach((idx, i) => {
      const r = Math.floor(idx / maze.cols) - maze.bbox.minR + MARGIN_CELLS;
      const c = (idx % maze.cols) - maze.bbox.minC + MARGIN_CELLS;
      const x = c * cell + cell / 2;
      const y = r * cell + cell / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [userPath, solved, maze, cell]);

  const cellAt = useCallback(
    (e: React.PointerEvent): number => {
      const ov = overlayRef.current!;
      const rect = ov.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (ov.width / rect.width);
      const py = (e.clientY - rect.top) * (ov.height / rect.height);
      const c = Math.floor(px / cell) + maze!.bbox.minC - MARGIN_CELLS;
      const r = Math.floor(py / cell) + maze!.bbox.minR - MARGIN_CELLS;
      if (r < 0 || c < 0 || r >= maze!.rows || c >= maze!.cols) return -1;
      return r * maze!.cols + c;
    },
    [cell, maze],
  );

  const onDown = (e: React.PointerEvent) => {
    if (!maze) return;
    if (cellAt(e) === maze.start) {
      drawing.current = true;
      setSolved(false);
      setUserPath([maze.start]);
      overlayRef.current!.setPointerCapture(e.pointerId);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !maze) return;
    const idx = cellAt(e);
    if (idx < 0 || !maze.cells[idx]) return;
    setUserPath((path) => {
      const last = path[path.length - 1];
      if (idx === last) return path;
      if (path.length >= 2 && idx === path[path.length - 2]) return path.slice(0, -1);
      const d = dirBetween(last, idx, maze.cols);
      if (d < 0 || hasWall(maze, last, d)) return path;
      if (idx === maze.end) {
        setSolved(true);
        drawing.current = false;
      }
      return [...path, idx];
    });
  };

  const onUp = () => {
    drawing.current = false;
  };

  const flip = (d: number) => {
    setPage((p) => Math.min(mazes.length - 1, Math.max(0, p + d)));
    setUserPath([]);
    setSolved(false);
    setShowSolution(false);
  };

  const download = (data: string, filename: string) => {
    const a = document.createElement('a');
    a.href = data;
    a.download = filename;
    a.click();
  };

  const runExport = async (kind: 'pdf' | 'zip') => {
    if (busy || !mazes.length) return;
    const label = kind === 'pdf' ? 'Building PDF book' : 'Zipping PNGs';
    setProgress({ label, done: 0, total: mazes.length });
    try {
      const cb = (d: number, t: number) => setProgress({ label, done: d, total: t });
      if (kind === 'pdf')
        await exportBookPdf(mazes, keyword, solMode, pageSize, cb);
      else await exportBookZip(mazes, keyword, cb);
    } finally {
      setProgress(null);
    }
  };

  const slug = keyword.trim().replace(/\s+/g, '-').toLowerCase() || 'maze';
  const pct = progress
    ? Math.round((progress.done / Math.max(1, progress.total)) * 100)
    : 0;
  const aiCartoons = mazes.filter(
    (b) => b.markers.start || b.markers.end,
  ).length;

  return (
    <div className="app">
      <header>
        <h1>Theme Maze Book Generator</h1>
        <p className="sub">
          One keyword → a whole book of mazes in that shape. Free AI art, no
          sign-up.
        </p>
      </header>

      <div className="panel">
        <div className="row">
          <select
            className="keyword-select"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          >
            {PRIMARY_KEYWORDS.map(({ label, key }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <label className="num">
            Mazes
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
              }
            />
          </label>
          <button className="primary" onClick={generate} disabled={busy}>
            {busy ? 'Working…' : 'Generate book'}
          </button>
        </div>

        <div className="row">
          <label className="diff">
            Difficulty: <strong>{LEVELS[level].name}</strong>
            <input
              type="range"
              min={0}
              max={LEVELS.length - 1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </label>
          <label className="sel">
            Solutions
            <select
              value={solMode}
              onChange={(e) => setSolMode(e.target.value as SolutionMode)}
            >
              <option value="after-each">after each maze</option>
              <option value="at-end">all at the back</option>
            </select>
          </label>
          <label className="sel">
            Page
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
            >
              <option value="6x9">6 × 9 in</option>
              <option value="5x8">5 × 8 in</option>
              <option value="a4">A4</option>
            </select>
          </label>
        </div>

        <p className="note">
          General words expand per maze (e.g. <em>animals</em> → cat, dog,
          rat…). Each maze = its own AI shape + start/end cartoons, ~
          {count * 3} image{count === 1 ? '' : 's'}
          {count > 25 ? '; large counts take several minutes.' : '.'}
        </p>

        {mazes.length > 0 && (
          <div className="row actions">
            <button onClick={newMazes} disabled={busy}>
              New shapes
            </button>
            <button onClick={regenSingle} disabled={busy}>
              Regenerate this maze
            </button>
            <button onClick={() => setShowSolution((s) => !s)} disabled={busy}>
              {showSolution ? 'Hide solution' : 'Show solution'}
            </button>
            <button
              onClick={() => {
                setUserPath([]);
                setSolved(false);
              }}
              disabled={busy}
            >
              Clear path
            </button>
            <span className="spacer" />
            <button onClick={() => runExport('pdf')} disabled={busy}>
              Download PDF book
            </button>
            <button onClick={() => runExport('zip')} disabled={busy}>
              Download PNGs (.zip)
            </button>
            <button
              disabled={busy}
              onClick={() =>
                maze &&
                download(
                  renderToCanvas(
                    maze,
                    22,
                    showSolution,
                    markers,
                    `Maze ${page + 1}${showSolution ? ' — Solution' : ''}`,
                  ).toDataURL('image/png'),
                  `${slug}-${page + 1}.png`,
                )
              }
            >
              This page PNG
            </button>
            <button
              disabled={busy}
              onClick={() =>
                maze &&
                download(
                  'data:image/svg+xml;charset=utf-8,' +
                    encodeURIComponent(mazeToSVG(maze, 22, markers)),
                  `${slug}-${page + 1}.svg`,
                )
              }
            >
              SVG
            </button>
          </div>
        )}
      </div>

      {progress && (
        <div className="progress">
          <div className="bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <small>
            {progress.label}: {progress.done} / {progress.total} ({pct}%)
          </small>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {warning && !error && (
        <div className="error" style={{ background: '#1d2540', borderColor: '#3b4d80', color: '#ffd58a' }}>
          {warning}
        </div>
      )}
      {mazes.length > 0 && (() => {
        const icon = mazes.filter((m) => m.source === 'icon').length;
        const proc = mazes.length - icon;
        const allProc = proc === mazes.length;
        return (
          <div className="error" style={{
            background: allProc ? '#3d1f1f' : '#1d3a1d',
            borderColor: allProc ? '#7a3a3a' : '#3a7a3a',
            color: allProc ? '#ffb3b3' : '#b3ffb3',
          }}>
            <strong>{icon}/{mazes.length}</strong> on-theme · <strong>{proc}/{mazes.length}</strong> procedural fallback
            {allProc && ' — Iconify isn\'t reaching your browser. Check Network tab in DevTools for failed api.iconify.design requests.'}
          </div>
        );
      })()}

      {status === 'loading' && !progress && (
        <div className="stage loadingbox">
          <div className="spinner" />
          <p>Drawing the “{keyword.trim()}” start &amp; goal characters…</p>
          <small>Then each maze gets its own shape.</small>
        </div>
      )}

      {maze && (
        <>
          <div className="pager">
            <button onClick={() => flip(-1)} disabled={page === 0 || busy}>
              ‹ Prev
            </button>
            <span>
              Maze <strong>{page + 1}</strong> of {mazes.length}
            </span>
            <button
              onClick={() => flip(1)}
              disabled={page === mazes.length - 1 || busy}
            >
              Next ›
            </button>
          </div>
          <div className="stage">
            <div
              className="page-frame"
              style={{
                aspectRatio:
                  pageSize === '5x8' ? '5 / 8' : pageSize === '6x9' ? '6 / 9' : '210 / 297',
              }}
            >
              <h2 className="maze-title">
                Maze {page + 1}
                {mazes[page] && (
                  <span style={{
                    marginLeft: 12, fontSize: '0.6em', fontWeight: 400,
                    color: mazes[page].source === 'icon' ? '#2e7d32' : '#c62828',
                  }}>
                    {mazes[page].subject} ·{' '}
                    {mazes[page].source === 'icon' ? '✓ on-theme' : '⚠ procedural fallback'}
                  </span>
                )}
              </h2>
              <div className="maze-fit">
                <div className="canvas-wrap">
                  <canvas ref={mainRef} className="maze" />
                  <canvas
                    ref={overlayRef}
                    className="overlay"
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={'status' + (solved ? ' win' : '')}>
            {solved ? (
              <strong>Solved! 🎉</strong>
            ) : (
              <>Drag from the start character to the goal to trace a path.</>
            )}
            <span className="src">
              {mazes.length} mazes · AI cartoons on {aiCartoons}/{mazes.length}
              {aiCartoons < mazes.length && ' (rest use flag markers)'}
            </span>
          </div>
        </>
      )}

      {status === 'idle' && (
        <div className="stage hint">
          <p>Pick a theme word and a count, then “Generate book”.</p>
        </div>
      )}
    </div>
  );
}
