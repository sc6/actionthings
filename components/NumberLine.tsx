import { formatNumber, niceScale } from "@/lib/scale";

/**
 * Number line with a diamond at the median and a yellow bar spanning whichever
 * of min / max are set (no bar when neither is). An attribute's global range,
 * when set, fixes the ends of the line.
 */
export function NumberLine({
  min,
  median,
  max,
  unit,
  rangeMin = null,
  rangeMax = null,
}: {
  min: number | null;
  median: number;
  max: number | null;
  unit: string;
  rangeMin?: number | null;
  rangeMax?: number | null;
}) {
  const from = min ?? median;
  const to = max ?? median;
  const { lo, hi, ticks } = niceScale(from, to, { lo: rangeMin, hi: rangeMax });
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const u = unit ? ` ${unit}` : "";
  const label = [
    min !== null && `min ${formatNumber(min)}${u}`,
    `median ${formatNumber(median)}${u}`,
    max !== null && `max ${formatNumber(max)}${u}`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div
      className="numline"
      role="img"
      aria-label={label}
    >
      <div className="axis" />
      {ticks.map((t) => (
        <div key={t} className="tick" style={{ left: pct(t) }}>
          <span>{formatNumber(t)}</span>
        </div>
      ))}
      {from !== to && (
        <div
          className="range"
          style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }}
          title={`${min === null ? "median" : "min"} ${formatNumber(from)} – ${max === null ? "median" : "max"} ${formatNumber(to)}${u}`}
        />
      )}
      <div className="median" style={{ left: pct(median) }} title={`median ${formatNumber(median)}${u}`} />
    </div>
  );
}
