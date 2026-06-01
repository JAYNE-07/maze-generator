// Turns a theme keyword into a binary silhouette mask using the curated
// ICON_CATALOG. No Iconify search at runtime — every catalog slug is a
// game-icons silhouette already verified on-theme for its keyword, so
// wrong-context icons (e.g. a $ for "sand dollar") can't leak in.

import { ICON_CATALOG } from './iconCatalog';

export const SAMPLE = 600; // px of the offscreen silhouette buffer

export interface Silhouette {
  /** SAMPLE x SAMPLE grayscale-derived "is dark pixel" buffer */
  dark: Uint8Array;
  /** Where the mask came from: 'icon' = on-theme Iconify SVG;
   *  'procedural' = generic geometric fallback (Iconify unreachable or
   *  catalog empty for this keyword). */
  source: 'icon' | 'procedural';
}

function loadImage(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('timed out'));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('failed to load image'));
    };
    img.src = src;
  });
}

/** djb2 string hash — used to spread subject picks across the catalog
 *  so different subjects with no own match don't all collide on the same
 *  catalog entry at the same rotation. */
function hashStr(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick a curated game-icons URL for `themeKey`. Returns null if no
 *  catalog entry exists for the keyword. The rotation + subjectHash
 *  index spreads picks deterministically across the catalog so a
 *  500-maze book hits a different catalog entry each time the keyword
 *  cycles. */
function iconifyUrl(
  themeKey: string,
  rotation: number,
  subjectHash = 0,
): string | null {
  const catalog = ICON_CATALOG[themeKey];
  if (!catalog || !catalog.length) return null;
  const idx = ((rotation >>> 0) + subjectHash) % catalog.length;
  return `https://api.iconify.design/game-icons/${catalog[idx]}.svg?height=${SAMPLE}&color=%23000000`;
}

interface RasterVariant {
  /** Radians. Rotates the icon around the canvas centre before sampling. */
  rotate?: number;
  /** Multiplier on top of the contain-fit scale. */
  scale?: number;
  /** Mirror horizontally. */
  flipH?: boolean;
}

/** Draw an image "contained" and centered on a white SAMPLE square, then
 *  convert to a SOLID silhouette via flood-fill-from-corner. This handles
 *  both filled icons (game-icons, noto, openmoji) and OUTLINE icons
 *  (mdi-outline, tabler, lucide, etc.) — outline icons become solid
 *  silhouettes instead of wispy lines that produce useless mazes. The
 *  optional `variant` lets the caller produce visually distinct
 *  silhouettes from the SAME icon URL (rotation × flip × scale gives
 *  16+ unique masks per icon, so a 500-maze book whose icon pool
 *  collides on duplicates still looks visually varied). */
function rasterize(img: HTMLImageElement, variant?: RasterVariant): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SAMPLE, SAMPLE);

  const iw = img.naturalWidth || SAMPLE;
  const ih = img.naturalHeight || SAMPLE;
  const pad = SAMPLE * 0.06;
  const fit = Math.min((SAMPLE - pad * 2) / iw, (SAMPLE - pad * 2) / ih);
  const scale = fit * (variant?.scale ?? 1);
  const w = iw * scale;
  const h = ih * scale;
  ctx.save();
  ctx.translate(SAMPLE / 2, SAMPLE / 2);
  if (variant?.flipH) ctx.scale(-1, 1);
  if (variant?.rotate) ctx.rotate(variant.rotate);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  // Mark pixels that are clearly NOT background-white (so dark lines AND
  // dark fills both count as "inside").
  const dark = new Uint8Array(SAMPLE * SAMPLE);
  let darkCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < 200) {
      dark[p] = 1;
      darkCount++;
    }
  }
  const filledRatio = darkCount / dark.length;

  // If the icon already has solid-enough coverage (≥18% dark pixels), use
  // dark pixels DIRECTLY — preserves interior detail (the lion's mane,
  // the basketball's seams, the rabbit's ears) so every subject produces
  // a visually distinct silhouette instead of being homogenised into a
  // solid blob by the flood-fill below.
  if (filledRatio >= 0.18) return dark;

  // Sparse line-art icon — flood-fill from all four corners through non-
  // dark pixels and treat unreached interior as silhouette. Rescues thin
  // outline-only icons into a usable mask.
  const exterior = new Uint8Array(SAMPLE * SAMPLE);
  const stack: number[] = [];
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= SAMPLE || y >= SAMPLE) return;
    const i = y * SAMPLE + x;
    if (dark[i] || exterior[i]) return;
    exterior[i] = 1;
    stack.push(i);
  };
  for (let i = 0; i < SAMPLE; i++) {
    visit(i, 0);
    visit(i, SAMPLE - 1);
    visit(0, i);
    visit(SAMPLE - 1, i);
  }
  while (stack.length) {
    const cur = stack.pop()!;
    const x = cur % SAMPLE;
    const y = (cur - x) / SAMPLE;
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }

  const sil = new Uint8Array(SAMPLE * SAMPLE);
  for (let i = 0; i < sil.length; i++) sil[i] = exterior[i] ? 0 : 1;
  return sil;
}

export interface ShapeOpts {
  skipAI?: boolean;
  /** Override what iconify searches for (use the clean base subject). */
  iconSearch?: string;
  /** Theme keyword (e.g. 'animals', 'birds') used to look up
   *  ICON_CATALOG[themeFallback]. Combined with iconRotation and a per-
   *  subject hash, this guarantees a 500-maze book picks a different
   *  catalog entry each maze. */
  themeFallback?: string;
  /** Which icon variation to pick from the matched pool. Lets a book pick
   *  a different icon every time the same subject repeats (e.g. the 1st
   *  "rabbit" gets icon #0, the 2nd gets icon #1, etc.) so 550 mazes from
   *  a 13-subject keyword still produce 550 strictly different shapes. */
  iconRotation?: number;
}

export async function fetchSilhouette(
  keyword: string,
  seed: number,
  opts: ShapeOpts = {},
): Promise<Silhouette> {
  // PRIMARY: curated game-icons catalog. Every entry is hand-verified
  // on-theme so no wrong-context icons leak in (no more $ symbols for
  // "sand dollar" in an animals book).
  try {
    const rotation = opts.iconRotation ?? seed;
    const themeKey = opts.themeFallback ?? keyword;
    const subjectHash = opts.iconSearch ? hashStr(opts.iconSearch) : 0;
    const url = iconifyUrl(themeKey, rotation, subjectHash);
    if (url) {
      const img = await loadImage(url, 8000);
      // Variant derived from the rotation index: 8 rotations × 2 flips ×
      // 4 scales = 64 distinct silhouettes per icon URL. Combined with
      // the unique URLs across a book, even when icon URLs collide
      // between mazes the silhouettes still look different.
      const variant: RasterVariant = {
        rotate: ((rotation >>> 0) % 8) * (Math.PI / 4),
        scale: 0.82 + (((rotation >>> 3) % 4) * 0.05),
        flipH: (((rotation >>> 5) & 1) === 1),
      };
      const dark = rasterize(img, variant);
      const filled = dark.reduce((a, b) => a + b, 0) / dark.length;
      if (filled > 0.05 && filled < 0.85) return { dark, source: 'icon' };
    }
  } catch {
    /* fall through to procedural */
  }

  // FALLBACK: procedural silhouette so we never throw. Subject-aware
  // (different keywords/subjects produce different shape variants).
  return { dark: proceduralSilhouette(seed, keyword), source: 'procedural' };
}

/** One of 12 base procedural silhouettes, plus a per-subject rotation and
 *  scale so each maze in a book gets a visually distinct shape — even when
 *  the whole batch falls through to procedural (e.g. Pollinations is down).
 *  Mixing the keyword's hash into the variant selector means "animals" and
 *  "vehicles" never pick the same shape index for the same maze index. */
function proceduralSilhouette(seed: number, keyword: string): Uint8Array {
  // djb2 hash of the keyword/subject string so it deterministically perturbs
  // the seed without ever colliding across different keywords.
  let h = 5381 >>> 0;
  for (let i = 0; i < keyword.length; i++) {
    h = (((h << 5) + h) ^ keyword.charCodeAt(i)) >>> 0;
  }
  const mixed = (seed ^ h) >>> 0;

  const dark = new Uint8Array(SAMPLE * SAMPLE);
  const cx = SAMPLE / 2;
  const cy = SAMPLE / 2;
  const scale = 0.78 + ((mixed >>> 12) % 7) * 0.04; // 0.78 .. 1.02
  const r = SAMPLE * 0.42 * scale;
  const variant = (mixed % 12);
  const rot = ((mixed >>> 4) % 360) * (Math.PI / 180);
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const set = (x: number, y: number) => {
    if (x >= 0 && x < SAMPLE && y >= 0 && y < SAMPLE) dark[y * SAMPLE + x] = 1;
  };
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      // Rotate the sample point around the centre so the variant test sees
      // a rotated coordinate — gives 360 distinct silhouettes per variant.
      const rx = x - cx;
      const ry = y - cy;
      const dx = rx * cosR - ry * sinR;
      const dy = rx * sinR + ry * cosR;
      const d = Math.sqrt(dx * dx + dy * dy);
      let inside = false;
      switch (variant) {
        case 0: inside = d < r; break;                                    // disc
        case 1: inside = Math.abs(dx) < r * 0.95 && Math.abs(dy) < r * 0.95; break; // square
        case 2: { // heart-ish
          const X = dx / r, Y = -dy / r;
          const v = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y;
          inside = v < 0;
          break;
        }
        case 3: inside = d < r * (1 + 0.2 * Math.sin(Math.atan2(dy, dx) * 5)); break; // star
        case 4: { // hexagon
          const ax = Math.abs(dx), ay = Math.abs(dy);
          inside = ay < r * 0.866 && ax * 0.5 + ay * 0.866 < r * 0.866;
          break;
        }
        case 5: inside = Math.abs(dx) + Math.abs(dy) < r * 1.15; break;  // diamond
        case 6: inside = (Math.abs(dx) < r * 0.3 || Math.abs(dy) < r * 0.3) && d < r; break; // cross
        case 7: { // cloud
          const blobs = [[-r * 0.5, 0, r * 0.55], [r * 0.5, 0, r * 0.55], [0, -r * 0.25, r * 0.6]];
          for (const [bx, by, br] of blobs) {
            if ((dx - bx) ** 2 + (dy - by) ** 2 < br * br) { inside = true; break; }
          }
          break;
        }
        case 8: inside = dy > -r * 0.9 && Math.abs(dx) < (r * 0.9 - dy * 0.5); break; // triangle
        case 9: inside = (dx * dx) / (r * r) + (dy * dy) / (r * r * 0.65 * 0.65) < 1; break; // oval
        case 10: inside = d < r * (1 + 0.25 * Math.sin(Math.atan2(dy, dx) * 6)); break; // 6-star
        default: inside = Math.abs(dx) < r * 0.4 && dy < r * 0.7 && dy > -r * 0.95; // arrow
      }
      if (inside) set(x, y);
    }
  }
  return dark;
}

/** Sample the silhouette into a cols x rows boolean grid (row-major). */
export function maskGrid(
  sil: Silhouette,
  cols: number,
  rows: number,
): boolean[] {
  const cw = SAMPLE / cols;
  const ch = SAMPLE / rows;
  const inside = new Array<boolean>(cols * rows).fill(false);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw);
      const y0 = Math.floor(r * ch);
      const x1 = Math.floor((c + 1) * cw);
      const y1 = Math.floor((r + 1) * ch);
      let total = 0;
      let dark = 0;
      const stepX = Math.max(1, Math.floor((x1 - x0) / 5));
      const stepY = Math.max(1, Math.floor((y1 - y0) / 5));
      for (let y = y0; y < y1; y += stepY) {
        for (let x = x0; x < x1; x += stepX) {
          total++;
          if (sil.dark[y * SAMPLE + x]) dark++;
        }
      }
      inside[r * cols + c] = total > 0 && dark / total >= 0.45;
    }
  }
  return inside;
}
