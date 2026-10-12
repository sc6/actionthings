import { GRID, PALETTE } from "@/lib/sprite";

/** Renders a 16x16 sprite as crisp SVG. Runs of same-colored pixels become one rect. */
export function PixelIcon({ data, size = 128, title }: { data: string; size?: number; title?: string }) {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      const c = parseInt(data[y * GRID + x] ?? "0", 16) || 0;
      let w = 1;
      while (x + w < GRID && (parseInt(data[y * GRID + x + w], 16) || 0) === c) w++;
      if (c !== 0) rects.push(<rect key={`${x},${y}`} x={x} y={y} width={w} height={1} fill={PALETTE[c]} />);
      x += w;
    }
  }
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {rects}
    </svg>
  );
}
