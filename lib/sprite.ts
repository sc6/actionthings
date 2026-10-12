// 16x16 pixel-art sprites, stored as 256 hex chars (one palette index per pixel).
// Index 0 is transparent. Rendered at 128x128 (8x scale).

export const GRID = 16;
export const PIXELS = GRID * GRID;

// PICO-8 palette.
export const PALETTE = [
  "transparent",
  "#1d2b53",
  "#7e2553",
  "#008751",
  "#ab5236",
  "#5f574f",
  "#c2c3c7",
  "#fff1e8",
  "#ff004d",
  "#ffa300",
  "#ffec27",
  "#00e436",
  "#29adff",
  "#83769c",
  "#ff77a8",
  "#ffccaa",
] as const;

const OUTLINE = 7;
const BODY_COLORS = [2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15];

export function isValidSprite(data: string): boolean {
  return data.length === PIXELS && /^[0-9a-f]+$/.test(data);
}

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic, horizontally symmetric "space invader" style sprite. */
export function generateSprite(seed: string | number): string {
  const rand = mulberry32(typeof seed === "number" ? seed : hashString(seed));
  const half = GRID / 2;

  let mask: boolean[][] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    mask = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
    // Fill the left half inside a 1px margin (room for the outline), denser toward the center.
    for (let y = 1; y < GRID - 1; y++) {
      for (let x = 1; x < half; x++) {
        const dx = half - 0.5 - x;
        const dy = Math.abs(y - (GRID - 1) / 2);
        const d = Math.sqrt(dx * dx + dy * dy) / half;
        mask[y][x] = rand() < 0.9 - d * 0.8;
      }
    }
    // Drop isolated pixels.
    const copy = mask.map((r) => r.slice());
    for (let y = 1; y < GRID - 1; y++) {
      for (let x = 1; x < half; x++) {
        if (!copy[y][x]) continue;
        const n = +copy[y - 1][x] + +copy[y + 1][x] + +copy[y][x - 1] + +(x + 1 < half ? copy[y][x + 1] : copy[y][x]);
        if (n === 0) mask[y][x] = false;
      }
    }
    // Mirror.
    for (let y = 0; y < GRID; y++) for (let x = 0; x < half; x++) mask[y][GRID - 1 - x] = mask[y][x];
    if (mask.flat().filter(Boolean).length >= 50) break;
  }

  const body = BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)];
  let accent = body;
  while (accent === body) accent = BODY_COLORS[Math.floor(rand() * BODY_COLORS.length)];

  const px: number[][] = Array.from({ length: GRID }, () => Array<number>(GRID).fill(0));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < half; x++) {
      if (!mask[y][x]) continue;
      const topEdge = !mask[y - 1]?.[x];
      const c = topEdge || rand() < 0.12 ? accent : body;
      px[y][x] = c;
      px[y][GRID - 1 - x] = c;
    }
  }

  // Eyes.
  if (rand() < 0.7) {
    const ey = 4 + Math.floor(rand() * 4);
    const ex = 4 + Math.floor(rand() * 3);
    if (mask[ey][ex]) {
      px[ey][ex] = 0;
      px[ey][GRID - 1 - ex] = 0;
    }
  }

  // Outline: empty cells touching the body.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (mask[y][x]) continue;
      if (mask[y - 1]?.[x] || mask[y + 1]?.[x] || mask[y][x - 1] || mask[y][x + 1]) px[y][x] = OUTLINE;
    }
  }

  return px.flat().map((c) => c.toString(16)).join("");
}
