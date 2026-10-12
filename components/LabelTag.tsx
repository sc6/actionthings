import Link from "next/link";
import type { Label } from "@/lib/repo";

/** Boxed `#label` tag linking to the label's page, optionally with a remove button. */
export function LabelTag({ label, remove }: { label: Label; remove?: React.ReactNode }) {
  if (!remove) {
    return (
      <Link href={`/labels/${label.id}`} className="tag">
        {label.name}
      </Link>
    );
  }
  return (
    <span className="tag removable">
      <Link href={`/labels/${label.id}`}>{label.name}</Link>
      {remove}
    </span>
  );
}
