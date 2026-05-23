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
  // Primary: free AI image generation. Skip entirely when the caller has
  // already given up on AI (final fallback round in book.ts).
  if (!opts.skipAI) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const img = await loadImage(
          pollinationsUrl(keyword, seed + attempt * 1009),
          20000,
        );
        const dark = rasterize(img);
        const filled = dark.reduce((a, b) => a + b, 0) / dark.length;
        // Narrower band -> all shapes carry similar maze complexity.
        if (filled > 0.18 && filled < 0.55) return { dark, source: 'ai' };
      } catch {
        await new Promise<void>((r) => setTimeout(r, 600));
      }
    }
  }

  // Fallback: free icon library, but only if its slug actually matches.
  try {
    const url = await iconifyUrl(opts.iconSearch ?? keyword);
    if (url) {
      const img = await loadImage(url, 12000);
      return { dark: rasterize(img), source: 'icon' };
    }
  } catch {
    /* fall through */
  }

  // No on-theme shape available — let the caller try a different subject.
  throw new Error(`no on-theme shape for "${keyword}"`);
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
