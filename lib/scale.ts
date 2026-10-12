/** Rounds a rough step to 1, 2 or 5 × 10^n. */
function niceStep(rough: number): number {
  const pow = 10 ** Math.floor(Math.log10(rough));
  const f = rough / pow;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
}

// Round away floating-point drift (0.1 + 0.2 …).
const clean = (n: number) => Number(n.toPrecision(12));

/**
 * Domain and tick values for a number line around [min, max]. Without bounds
 * the domain is padded and snapped to round ticks. A bound (an attribute's
 * global min / max) fixes that end of the domain exactly and is always labeled.
 */
export function niceScale(
  min: number,
  max: number,
  bounds: { lo?: number | null; hi?: number | null } = {},
  count = 5,
): { lo: number; hi: number; ticks: number[] } {
  const fixedLo = bounds.lo ?? null;
  const fixedHi = bounds.hi ?? null;
  const from = fixedLo ?? min;
  const to = fixedHi ?? max;
  const span = to - from || Math.abs(to) || 1;
  const pad = span * 0.1;
  const step = niceStep((span + (fixedLo === null ? pad : 0) + (fixedHi === null ? pad : 0)) / count);
  const lo = fixedLo ?? Math.floor((min - pad) / step) * step;
  const hi = fixedHi ?? Math.ceil((max + pad) / step) * step;

  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step / 1e6; t += step) ticks.push(clean(t));
  // Fixed ends are always labeled; drop round ticks crowding them.
  const near = (a: number, b: number) => Math.abs(a - b) < step * 0.4;
  const inner = ticks.filter(
    (t) => !(fixedLo !== null && near(t, lo) && t !== lo) && !(fixedHi !== null && near(t, hi) && t !== hi),
  );
  if (fixedLo !== null && inner[0] !== lo) inner.unshift(clean(lo));
  if (fixedHi !== null && inner[inner.length - 1] !== hi) inner.push(clean(hi));
  return { lo, hi, ticks: inner };
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Human-readable global range, e.g. "1 – 10", "≥ 0", "≤ 100"; empty when unbounded. */
export function formatRange(lo: number | null, hi: number | null): string {
  if (lo !== null && hi !== null) return `${formatNumber(lo)} – ${formatNumber(hi)}`;
  if (lo !== null) return `≥ ${formatNumber(lo)}`;
  if (hi !== null) return `≤ ${formatNumber(hi)}`;
  return "";
}
