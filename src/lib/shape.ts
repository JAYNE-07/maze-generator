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
/** Tech/brand/logo packs — these icons are never on-theme for puzzle
 *  keywords (lion/truck/pizza), they're company logos. Always exclude.
 *  Emoji packs are now ALLOWED — their colours survive rasterisation
 *  into a clean silhouette via the flood-fill in rasterize(). */
const COLOUR_PACK_BLOCKLIST = [
  'logos', 'devicon', 'devicon-plain', 'skill-icons', 'vscode-icons',
  'simple-icons', 'cib', 'arcticons',
];

// In-memory cache of matched icon lists keyed by search term. Forest has
// 13 unique subjects but a 100-maze forest book otherwise hits Iconify
// 100 times — well above its rate-limit threshold. Caching means we hit
// Iconify only once per unique subject, then pick deterministically by
// seed from the cached match list (which has many icons per subject).
const iconCache = new Map<string, string[] | null>();

/** Search Iconify for `query`. If no usable matches, try fallback queries
 *  built from the words inside the query — so "forest owl" falls back to
 *  "owl", "brown bear" to "bear", etc. Results cached per attempted key. */
async function searchOne(query: string): Promise<string[] | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const wantWords = key.split(/\s+/).filter((w) => w.length > 2);
  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(key)}&limit=128`,
    );
    if (!res.ok) {
      iconCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as { icons?: string[] };
    const matched = (data.icons ?? []).filter((n) => {
      if (!n.includes(':')) return false;
      const [prefix, slug] = n.split(':');
      if (COLOUR_PACK_BLOCKLIST.includes(prefix)) return false;
      if (/-(outline|outlined|line|light|lite|thin)$/.test(prefix)) return false;
      if (/-(outline|outlined|line)$/.test(slug)) return false;
      // wantWords may be empty (single short word like "ox"); accept any
      // matching slug in that case.
      if (!wantWords.length) return true;
      return wantWords.some((w) => slug.toLowerCase().includes(w));
    });
    if (!matched.length) {
      iconCache.set(key, null);
      return null;
    }
    const score = (n: string) => {
      const prefix = n.split(':')[0];
      const idx = MONO_PACK_PRIORITY.indexOf(prefix);
      return idx === -1 ? MONO_PACK_PRIORITY.length : idx;
    };
    matched.sort((a, b) => score(a) - score(b));
    iconCache.set(key, matched);
    return matched;
  } catch {
    iconCache.set(key, null);
    return null;
  }
}

async function searchIconify(query: string): Promise<string[] | null> {
  // Direct subject search ONLY. Word-level fallbacks (e.g. "sand dollar"
  // -> "dollar") were finding wrong-context icons — a US dollar symbol
  // for "sand dollar" in an animals book. If the direct search fails,
  // the caller falls through to the theme keyword instead, which keeps
  // every returned icon firmly on-theme.
  const direct = await searchOne(query);
  return direct && direct.length ? direct : null;
}

/** djb2 string hash — used to spread subject picks across the theme pool
 *  so different subjects with no own Iconify match don't all collide on
 *  the same theme icon at the same rotation. */
function hashStr(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick an Iconify icon URL for `subject`. Uses the subject's own matches
 *  first; falls back to the theme keyword's matches, with a per-subject
 *  offset so different subjects in the same theme pool never collide on
 *  the same icon at the same rotation. */
async function iconifyUrlCombined(
  subject: string,
  themeFallback: string | undefined,
  rotation: number,
): Promise<string | null> {
  const subjMatches = (await searchIconify(subject)) ?? [];
  // Subject has its OWN icon matches — cycle through those by rotation.
  if (subjMatches.length) {
    const pick = subjMatches[(rotation >>> 0) % subjMatches.length];
    const [prefix, icon] = pick.split(':');
    return `https://api.iconify.design/${prefix}/${icon}.svg?height=${SAMPLE}&color=%23000000`;
  }
  // Subject has NO own match — fall back to the theme keyword's pool.
  // Per-subject hash offset so 100 different fallback subjects don't all
  // pick the same theme icon at rotation 0 (which previously produced the
  // user's "same snake-coil shape on every name" symptom).
  if (themeFallback) {
    const themeMatches = (await searchIconify(themeFallback)) ?? [];
    if (themeMatches.length) {
      const offset = hashStr(subject);
      const pick = themeMatches[(offset + (rotation >>> 0)) % themeMatches.length];
      const [prefix, icon] = pick.split(':');
      return `https://api.iconify.design/${prefix}/${icon}.svg?height=${SAMPLE}&color=%23000000`;
    }
  }
  return null;
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
  /** Last-resort search term if both `iconSearch` and its word fallbacks
   *  return nothing — usually the original theme keyword so we at least
   *  stay on-theme (e.g. a forest-book maze with no icon for 'oriole'
   *  falls back to a forest/tree icon instead of a procedural blob). */
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
  // PRIMARY: Iconify. Pollinations.ai started returning 402 Payment Required
  // around mid-2026 so it's no longer usable as a free image source.
  // Iconify is reliable, fast (~200 ms), free, and returns actual on-theme
  // SVG icons (lion -> lion icon, truck -> truck icon, etc.).
  // We pick from the top N matches using the seed so a 30-maze book of
  // "lion" still gets variety (different lion-themed icons from different
  // icon packs — game-icons, noto, openmoji, tabler, etc.).
  try {
    const rotation = opts.iconRotation ?? seed;
    const url = await iconifyUrlCombined(
      opts.iconSearch ?? keyword,
      opts.themeFallback,
      rotation,
    );
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
