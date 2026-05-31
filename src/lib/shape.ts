// Turns a theme keyword into a binary silhouette mask, using free services
// (no API key): Pollinations text-to-image first, Iconify icons as fallback.

export const SAMPLE = 600; // px of the offscreen silhouette buffer

export interface Silhouette {
  /** SAMPLE x SAMPLE grayscale-derived "is dark pixel" buffer */
  dark: Uint8Array;
  source: 'ai' | 'icon';
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

function pollinationsUrl(keyword: string, seed: number): string {
  const prompt =
    `minimalist solid pure black silhouette of a single ${keyword}, ` +
    `centered, large, filling most of the frame, plain pure white background, ` +
    `extreme high contrast, flat 2D, no text, no shadow, no gradient, simple bold shape`;
  return (
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${SAMPLE}&height=${SAMPLE}&nologo=true&model=flux&seed=${seed}`
  );
}

/** Iconify lookup: only accept icons whose slug actually mentions the
 *  search term, so an off-theme icon never leaks into the book. */
async function iconifyUrl(keyword: string): Promise<string | null> {
  const q = keyword.trim();
  if (!q) return null;
  const wantWords = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=24`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { icons?: string[] };
    const icons = data.icons ?? [];
    const match = icons.find((n) => {
      const slug = (n.split(':')[1] ?? '').toLowerCase();
      return wantWords.some((w) => slug.includes(w));
    });
    if (!match || !match.includes(':')) return null;
    const [prefix, icon] = match.split(':');
    return `https://api.iconify.design/${prefix}/${icon}.svg?height=${SAMPLE}&color=%23000000`;
  } catch {
    return null;
  }
}

/** Draw an image "contained" and centered on a white SAMPLE square. */
function rasterize(img: HTMLImageElement): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SAMPLE, SAMPLE);

  const iw = img.naturalWidth || SAMPLE;
  const ih = img.naturalHeight || SAMPLE;
  const pad = SAMPLE * 0.06;
  const scale = Math.min((SAMPLE - pad * 2) / iw, (SAMPLE - pad * 2) / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, (SAMPLE - w) / 2, (SAMPLE - h) / 2, w, h);

  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  const dark = new Uint8Array(SAMPLE * SAMPLE);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    dark[p] = lum < 145 ? 1 : 0;
  }
  return dark;
}

export interface ShapeOpts {
  skipAI?: boolean;
  /** Override what iconify searches for (use the clean base subject). */
  iconSearch?: string;
}

export async function fetchSilhouette(
  keyword: string,
  seed: number,
  opts: ShapeOpts = {},
): Promise<Silhouette> {
  // Primary: free AI image generation. One attempt — multiple retries here
  // multiplied the slowest-fetch tax in every batch. Failures fall through
  // to Iconify and finally to the procedural fallback, none of which can
  // hang the batch.
  if (!opts.skipAI) {
    try {
      // 8 s timeout: typical Pollinations responses arrive in 2-6 s. Tighter
      // than before so a single stalled connection can't drag the whole batch.
      const img = await loadImage(pollinationsUrl(keyword, seed), 8000);
      const dark = rasterize(img);
      const filled = dark.reduce((a, b) => a + b, 0) / dark.length;
      if (filled > 0.18 && filled < 0.55) return { dark, source: 'ai' };
    } catch {
      /* fall through to Iconify */
    }
  }

  // Fallback 1: free icon library, but only if its slug actually matches.
  try {
    const url = await iconifyUrl(opts.iconSearch ?? keyword);
    if (url) {
      const img = await loadImage(url, 6000);
      return { dark: rasterize(img), source: 'icon' };
    }
  } catch {
    /* fall through */
  }

  // Fallback 2: a procedural silhouette so we NEVER throw. The shape isn't
  // on-theme but the maze fills it anyway — much better than hanging the
  // batch or skipping a slot.
  return { dark: proceduralSilhouette(seed), source: 'icon' };
}

/** One of 12 procedural silhouettes chosen by seed — guarantees that
 *  fetchSilhouette always returns a usable mask even when both Pollinations
 *  and Iconify are unreachable. */
function proceduralSilhouette(seed: number): Uint8Array {
  const dark = new Uint8Array(SAMPLE * SAMPLE);
  const cx = SAMPLE / 2;
  const cy = SAMPLE / 2;
  const r = SAMPLE * 0.42;
  const variant = ((seed >>> 0) % 12);
  const set = (x: number, y: number) => {
    if (x >= 0 && x < SAMPLE && y >= 0 && y < SAMPLE) dark[y * SAMPLE + x] = 1;
  };
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const dx = x - cx;
      const dy = y - cy;
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
