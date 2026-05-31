// Turns a theme keyword into a binary silhouette mask, using free services
// (no API key): Pollinations text-to-image first, Iconify icons as fallback.

export const SAMPLE = 600; // px of the offscreen silhouette buffer

export interface Silhouette {
  /** SAMPLE x SAMPLE grayscale-derived "is dark pixel" buffer */
  dark: Uint8Array;
  /** Where the mask came from: 'icon' = on-theme Iconify SVG;
   *  'procedural' = generic geometric fallback (Iconify unreachable or
   *  returned no usable mono icons for this keyword). */
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

// pollinationsUrl removed — the service started returning HTTP 402 Payment
// Required around mid-2026. Iconify is the new primary source. Procedural
// fallback below is the safety net.

/** Iconify lookup. Returns an icon URL whose slug mentions the search term
 *  so we never leak off-theme icons. `seed` selects from the matching pool,
 *  so a 30-maze "lion" book gets 30 different lion icons from different
 *  packs (game-icons, noto, openmoji, tabler, mdi, etc.) instead of the
 *  same one every time. */
/** Monochrome-friendly icon packs that ACTUALLY respect the `color`
 *  query param — these rasterise into clean black silhouettes on white.
 *  Listed roughly in order of silhouette quality. */
const MONO_PACK_PRIORITY = [
  'game-icons',          // hand-drawn solid black silhouettes — best
  'material-symbols',
  'mdi',                 // base mdi is filled (mdi-light + -outline are NOT)
  'ic',
  'iconamoon-solid',
  'ph-fill',
  'solar-bold',
  'tabler-filled',
  'mingcute-fill',
  'ri-fill',
  'carbon',
  'iconoir',
  'lucide',
  'tabler',
  'mdi-light',
];
/** Emoji and multi-colour packs — their colours are baked in so they
 *  ignore `color=#000000` and rasterise as multi-coloured blobs. SKIP. */
const COLOUR_PACK_BLOCKLIST = [
  'noto', 'noto-v1', 'twemoji', 'openmoji', 'emojione', 'emojione-v1',
  'fluent-emoji', 'fluent-emoji-flat', 'fluent-emoji-high-contrast',
  'fxemoji', 'streamline-emojis', 'dinkie-icons', 'flat-color-icons',
  'logos', 'devicon', 'devicon-plain', 'skill-icons', 'vscode-icons',
];

async function iconifyUrl(keyword: string, seed: number): Promise<string | null> {
  const q = keyword.trim();
  if (!q) return null;
  const wantWords = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=128`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { icons?: string[] };
    // Keyword has to actually appear in the slug AND the pack must not be
    // a multi-colour emoji pack (those ignore the colour override).
    const matched = (data.icons ?? []).filter((n) => {
      if (!n.includes(':')) return false;
      const [prefix, slug] = n.split(':');
      if (COLOUR_PACK_BLOCKLIST.includes(prefix)) return false;
      // Reject explicit outline variants that produce wispy line art.
      if (/-(outline|outlined|line|light|lite|thin)$/.test(prefix)) return false;
      if (/-(outline|outlined|line)$/.test(slug)) return false;
      return wantWords.some((w) => slug.toLowerCase().includes(w));
    });
    if (!matched.length) return null;
    // Rank by pack priority — game-icons (best silhouettes) first.
    const score = (n: string) => {
      const prefix = n.split(':')[0];
      const idx = MONO_PACK_PRIORITY.indexOf(prefix);
      return idx === -1 ? MONO_PACK_PRIORITY.length : idx;
    };
    matched.sort((a, b) => score(a) - score(b));
    // Pick deterministically from the top half so a 30-maze book still
    // sees variety, but never falls into the low-quality tail.
    const top = matched.slice(0, Math.max(8, Math.ceil(matched.length / 2)));
    const pick = top[(seed >>> 0) % top.length];
    const [prefix, icon] = pick.split(':');
    return `https://api.iconify.design/${prefix}/${icon}.svg?height=${SAMPLE}&color=%23000000`;
  } catch {
    return null;
  }
}

/** Draw an image "contained" and centered on a white SAMPLE square, then
 *  convert to a SOLID silhouette via flood-fill-from-corner. This handles
 *  both filled icons (game-icons, noto, openmoji) and OUTLINE icons
 *  (mdi-outline, tabler, lucide, etc.) — outline icons become solid
 *  silhouettes instead of wispy lines that produce useless mazes. */
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
  // Mark pixels that are clearly NOT background-white (so dark lines AND
  // dark fills both count as "inside").
  const dark = new Uint8Array(SAMPLE * SAMPLE);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    dark[p] = lum < 200 ? 1 : 0;
  }

  // Flood-fill from all four corners through non-dark pixels. Anything not
  // reached is interior — combined with the dark pixels, that's a solid
  // silhouette regardless of whether the icon was filled or outlined.
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
}

export async function fetchSilhouette(
  keyword: string,
  seed: number,
  opts: ShapeOpts = {},
): Promise<Silhouette> {
  // PRIMARY: Iconify. Pollinations.ai started returning 402 Payment Required
  // around mid-2026 so it's no longer usable as a free image source.
  // Iconify is reliable, fast (~200 ms), free, and returns actual on-theme
  // SVG icons (lion -> lion icon, truck -> truck icon, etc.).
  // We pick from the top N matches using the seed so a 30-maze book of
  // "lion" still gets variety (different lion-themed icons from different
  // icon packs — game-icons, noto, openmoji, tabler, etc.).
  try {
    const url = await iconifyUrl(opts.iconSearch ?? keyword, seed);
    if (url) {
      const img = await loadImage(url, 8000);
      const dark = rasterize(img);
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
