import Link from "next/link";
import type { Action } from "@/lib/repo";
import { conditionString } from "./ConditionText";

/** Compact boxed tag for an action: `#owner → verb → #target …`, condition in the tooltip. */
export function ActionTag({ action, showLabel = true }: { action: Action; showLabel?: boolean }) {
  const title = [action.conditions.length ? `where ${conditionString(action.conditions)}` : "", action.description]
    .filter(Boolean)
    .join("\n");
  return (
    <span className="tag action" title={title || undefined}>
      {showLabel && (
        <>
          <Link href={`/labels/${action.label_id}`} className="label-ref">
            #{action.label_name}
          </Link>
          <span className="dim">→</span>
        </>
      )}
      <span className="verb">{action.verb}</span>
      <span className="dim">→</span>
      {action.targets.length === 0 ? (
        <span className="dim">no targets</span>
      ) : (
        action.targets.map((t) => (
          <Link key={t.id} href={`/labels/${t.id}`} className="label-ref">
            #{t.name}
          </Link>
        ))
      )}
      {action.conditions.length > 0 && <span className="dim">*</span>}
    </span>
  );
}
