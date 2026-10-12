/** A rich-style horizontal rule with a title: ── title ──────── */
export function Rule({ children, level = 2 }: { children: React.ReactNode; level?: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <H className="rule">
      <span>{children}</span>
    </H>
  );
}
