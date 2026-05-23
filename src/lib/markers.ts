// Themed cartoon markers for the maze entrance/exit. e.g. for "cat":
// a cartoon cat at the start, a bowl of cat food at the finish.
// Uses the same free image service; falls back to drawn glyphs.

export interface MarkerImg {
  img: HTMLImageElement;
  url: string;
}

export interface Markers {
  start: MarkerImg | null;
  end: MarkerImg | null;
}

const ICON = 256;

function load(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('error'));
    };
    img.src = src;
  });
}

/** Cut the cartoon out of its white background -> transparent sticker. */
function detaint(img: HTMLImageElement): MarkerImg {
  const cv = document.createElement('canvas');
  cv.width = ICON;
  cv.height = ICON;
  const ctx = cv.getContext('2d')!;
  const s = Math.min(ICON / img.naturalWidth, ICON / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, (ICON - w) / 2, (ICON - h) / 2, w, h);

  const id = ctx.getImageData(0, 0, ICON, ICON);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    // only touch low-chroma, bright pixels (the white backdrop + its halo)
    if (mx - mn < 32 && mx > 205) {
      // 240+ fully transparent, 205 fully opaque, linear in between
      const a = Math.max(0, Math.min(255, Math.round(((240 - mx) / 35) * 255)));
      d[i + 3] = a;
    }
  }
  ctx.putImageData(id, 0, 0);

  const url = cv.toDataURL('image/png');
  const out = new Image();
  out.src = url;
  return { img: out, url };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function genIcon(prompt: string, seed: number): Promise<MarkerImg | null> {
  // Tight retry budget so the batch never stalls on icons; if it doesn't
  // come back quickly we fall through to the vector flag instead.
  for (let attempt = 0; attempt < 2; attempt++) {
    const u =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${ICON}&height=${ICON}&nologo=true&model=turbo&seed=${
        seed + attempt * 1009
      }`;
    try {
      const raw = await load(u, 14000);
      const m = detaint(raw);
      await m.img.decode();
      return m;
    } catch {
      await sleep(500);
    }
  }
  return null;
}

export async function fetchMarkers(
  keyword: string,
  seed: number,
): Promise<Markers> {
  const [start, end] = await Promise.all([
    genIcon(
      `cute simple flat vector cartoon ${keyword} mascot, full body, ` +
        `friendly, thick clean outline, sticker style, centered, ` +
        `plain solid white background, no text`,
      seed,
    ),
    genIcon(
      `cute simple flat vector cartoon icon of the favourite treat, food ` +
        `or treasure that a ${keyword} wants to reach as a goal, ` +
        `thick clean outline, sticker style, centered, ` +
        `plain solid white background, no text`,
      seed + 9173,
    ),
  ]);
  return { start, end };
}
