import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { generateMaze, type Maze } from './maze';
import { renderToCanvas } from './render';
import { fetchMarkers, type Markers } from './markers';
import { fetchSilhouette, maskGrid } from './shape';
import { baseSubjectFor, displaySubjectFor, subjectFor } from './themes';

export type SolutionMode = 'after-each' | 'at-end';
export type PageSize = 'a4' | '5x8' | '6x9';

/** One puzzle: its own AI shape plus its own start/end cartoons. */
export interface BookMaze {
  maze: Maze;
  markers: Markers;
  subject: string;
  /** Internal pool index — used to keep books free of subject repeats. */
  subjIdx: number;
}

interface BuildOpts {
  skipAI?: boolean;
  noMarkers?: boolean;
  salt?: number;
}

/** Build a single maze at a fixed subject index. Caller picks the index so
 *  the whole book stays free of subject repeats. */
async function buildAt(
  keyword: string,
  baseSeed: number,
  subjIdx: number,
  cols: number,
  attempts: number,
  opts: BuildOpts = {},
): Promise<BookMaze | null> {
  const subject = subjectFor(keyword, subjIdx, baseSeed);
  const base = baseSubjectFor(keyword, subjIdx, baseSeed);
  const display = displaySubjectFor(keyword, subjIdx, baseSeed);
  const salt = opts.salt ?? 0;
  for (let a = 0; a < attempts; a++) {
    const seed = ((baseSeed + subjIdx * 131 + (a + salt) * 977) >>> 0) || 1;
    const markerSeed = ((seed * 2654435761) >>> 0) || 7;
    try {
      const [sil, markers] = await Promise.all([
        fetchSilhouette(subject, seed, {
          skipAI: opts.skipAI,
          iconSearch: base,
        }),
        opts.noMarkers
          ? Promise.resolve({ start: null, end: null })
          : fetchMarkers(subject, markerSeed),
      ]);
      const maze = generateMaze(
        maskGrid(sil, cols, cols),
        cols,
        cols,
        seed,
      );
      return { maze, markers, subject: display, subjIdx };
    } catch {
      /* same subject, new seed */
    }
  }
  return null;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const slugify = (s: string) =>
  s.trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '') ||
  'maze';

const titleCase = (s: string) =>
  s.trim().replace(/\b\w/g, (m) => m.toUpperCase());

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Re-roll a single slot — lands on a fresh subject index past everything
 *  already in use, plus a salt offset so repeated clicks keep moving. */
export async function regenerateOne(
  keyword: string,
  baseSeed: number,
  cols: number,
  salt: number,
  used: Set<number>,
): Promise<BookMaze | null> {
  let maxUsed = -1;
  for (const u of used) if (u > maxUsed) maxUsed = u;
  let candidate = maxUsed + 1 + (salt % 13);
  while (used.has(candidate)) candidate++;
  for (let rot = 0; rot < 10; rot++) {
    const bm = await buildAt(keyword, baseSeed, candidate, cols, 3, { salt });
    if (bm) return bm;
    do {
      candidate++;
    } while (used.has(candidate));
  }
  return null;
}

/**
 * Every maze gets its own freshly-generated AI silhouette of the keyword
 * AND its own start/end cartoon characters (all from different seeds), so
 * no two puzzles share a shape or a pair of symbols. Fetches run through a
 * small concurrency pool to stay reasonably fast.
 */
export async function generateBatch(
  keyword: string,
  baseSeed: number,
  cols: number,
  count: number,
  onProgress: (done: number, total: number) => void,
): Promise<BookMaze[]> {
  const CONCURRENCY = 3;
  const results: (BookMaze | null)[] = new Array(count).fill(null);
  let completed = 0;
  // Reserve the first `count` pool positions for the book; any rotations
  // pull from beyond so no two slots ever share a subject.
  const used = new Set<number>();
  for (let i = 0; i < count; i++) used.add(i);
  let nextFree = count;
  const slotIdx: number[] = Array.from({ length: count }, (_, i) => i);

  async function fillSlot(
    slot: number,
    attempts: number,
    slotCols: number,
    opts: BuildOpts,
  ) {
    for (let rot = 0; rot < 4; rot++) {
      const bm = await buildAt(
        keyword,
        baseSeed,
        slotIdx[slot],
        slotCols,
        attempts,
        opts,
      );
      if (bm) {
        results[slot] = bm;
        completed++;
        onProgress(completed, count);
        return;
      }
      // current subject couldn't render — rotate to a fresh unused index
      const fresh = nextFree++;
      used.add(fresh);
      slotIdx[slot] = fresh;
    }
  }

  async function runPool(
    slots: number[],
    attempts: number,
    slotCols: number,
    pool: number,
    opts: BuildOpts = {},
  ) {
    let cursor = 0;
    async function worker() {
      for (;;) {
        const k = cursor++;
        if (k >= slots.length) return;
        await fillSlot(slots[k], attempts, slotCols, opts);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(pool, slots.length) }, worker),
    );
  }

  const missingSlots = () => {
    const m: number[] = [];
    for (let i = 0; i < count; i++) if (!results[i]) m.push(i);
    return m;
  };

  // Round 1: requested density, AI on.
  await runPool(
    Array.from({ length: count }, (_, i) => i),
    3,
    cols,
    CONCURRENCY,
  );

  // Refills: gradually ease density and let the rate limiter recover.
  // Last round drops the AI shape entirely so the slot is guaranteed to fill.
  const refills: Array<{
    cols: number;
    attempts: number;
    pool: number;
    waitMs: number;
    opts: BuildOpts;
  }> = [
    { cols: Math.floor(cols * 0.85), attempts: 4, pool: 3, waitMs: 2000, opts: {} },
    { cols: Math.floor(cols * 0.7), attempts: 5, pool: 2, waitMs: 5000, opts: {} },
    { cols: Math.floor(cols * 0.55), attempts: 6, pool: 2, waitMs: 7000, opts: {} },
  ];

  for (const r of refills) {
    if (completed >= count) break;
    const missing = missingSlots();
    if (!missing.length) break;
    if (r.waitMs) await new Promise<void>((res) => setTimeout(res, r.waitMs));
    await runPool(missing, r.attempts, Math.max(22, r.cols), r.pool, r.opts);
  }

  const book = results.filter((m): m is BookMaze => m !== null);
  if (book.length === 0) {
    throw new Error(
      `Couldn't build any "${keyword}" shapes. Try another keyword or a lower difficulty.`,
    );
  }
  if (book.length < count) {
    throw new Error(
      `Only built ${book.length}/${count} mazes — the image service kept failing. Try a lower difficulty, a different keyword, or a smaller count.`,
    );
  }
  return book;
}

function placeImage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  title: string,
) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = Math.max(28, pw * 0.07);
  const titleSize = Math.min(20, Math.max(12, pw * 0.045));

  // Fixed header near the top — same spot on every page.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(titleSize);
  pdf.text(title, pw / 2, margin + titleSize, { align: 'center' });

  // Body = the area below the header; the maze is centred within it.
  const bodyTop = margin + titleSize + 18;
  const bodyBottom = ph - margin;
  const availW = pw - margin * 2;
  const availH = bodyBottom - bodyTop;
  const scale = Math.min(availW / canvas.width, availH / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const x = (pw - w) / 2;
  const y = bodyTop + (availH - h) / 2;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h, undefined, 'FAST');
}

const PAGE_FORMATS: Record<PageSize, 'a4' | [number, number]> = {
  a4: 'a4',
  '5x8': [5 * 72, 8 * 72],
  '6x9': [6 * 72, 9 * 72],
};

export async function exportBookPdf(
  book: BookMaze[],
  keyword: string,
  mode: SolutionMode,
  pageSize: PageSize,
  onProgress: (done: number, total: number) => void,
) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: PAGE_FORMATS[pageSize],
  });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const name = titleCase(keyword);
  const CELL = 18;

  // Cover (jsPDF starts with one page already).
  const coverTitle = Math.min(48, pw * 0.1);
  const coverSub = Math.min(16, pw * 0.038);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(coverTitle);
  pdf.text(`${name} Mazes`, pw / 2, ph * 0.42, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(coverSub);
  pdf.text(
    `${book.length} puzzles  ·  solutions ${
      mode === 'after-each' ? 'after each maze' : 'at the back'
    }`,
    pw / 2,
    ph * 0.42 + coverTitle * 0.9,
    { align: 'center' },
  );

  const total = mode === 'after-each' ? book.length : book.length * 2;
  let done = 0;

  const fmt = PAGE_FORMATS[pageSize];

  for (let i = 0; i < book.length; i++) {
    const { maze, markers } = book[i];
    const tag = `Maze ${i + 1}`;
    pdf.addPage(fmt, 'portrait');
    placeImage(pdf, renderToCanvas(maze, CELL, false, markers), tag);
    if (mode === 'after-each') {
      pdf.addPage(fmt, 'portrait');
      placeImage(
        pdf,
        renderToCanvas(maze, CELL, true, markers),
        `${tag} — Solution`,
      );
    }
    done++;
    onProgress(done, total);
    if (i % 4 === 0) await tick();
  }

  if (mode === 'at-end') {
    for (let i = 0; i < book.length; i++) {
      const { maze, markers } = book[i];
      pdf.addPage(fmt, 'portrait');
      placeImage(
        pdf,
        renderToCanvas(maze, CELL, true, markers),
        `Solution ${i + 1}`,
      );
      done++;
      onProgress(done, total);
      if (i % 4 === 0) await tick();
    }
  }

  pdf.save(`${slugify(keyword)}-maze-book-${pageSize}.pdf`);
}

export async function exportBookZip(
  book: BookMaze[],
  keyword: string,
  onProgress: (done: number, total: number) => void,
) {
  const zip = new JSZip();
  const mazeDir = zip.folder('mazes')!;
  const solDir = zip.folder('solutions')!;
  const pad = (n: number) => String(n).padStart(3, '0');
  const CELL = 22;

  for (let i = 0; i < book.length; i++) {
    const { maze, markers } = book[i];
    const tag = `Maze ${i + 1}`;
    const q = renderToCanvas(maze, CELL, false, markers, tag)
      .toDataURL('image/png')
      .split(',')[1];
    const a = renderToCanvas(maze, CELL, true, markers, `${tag} — Solution`)
      .toDataURL('image/png')
      .split(',')[1];
    mazeDir.file(`maze-${pad(i + 1)}.png`, q, { base64: true });
    solDir.file(`solution-${pad(i + 1)}.png`, a, { base64: true });
    onProgress(i + 1, book.length);
    if (i % 3 === 0) await tick();
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
  });
  saveBlob(blob, `${slugify(keyword)}-maze-book.zip`);
}
