import { OP_SYMBOL } from "@/lib/ops";
import type { Condition } from "@/lib/repo";
import { formatNumber } from "@/lib/scale";

/**
 * One clause, e.g. `their ignition temperature ≥ my flame temperature`. With
 * `selfValues` (attribute id -> the actor's median), shows the actor's value.
 */
export function ClauseText({ c, selfValues }: { c: Condition; selfValues?: Map<number, number> }) {
  return (
    <span className="clause">
      <span>
        <span className="dim">their</span> {c.target_attribute}
      </span>{" "}
      <span className="op">{OP_SYMBOL[c.op]}</span>{" "}
      {c.self_attribute !== null ? (
        <span>
          <span className="dim">my</span> {c.self_attribute}
          {selfValues && (
            <span className="dim">
              {" "}
              ({selfValues.has(c.self_attribute_id!) ? formatNumber(selfValues.get(c.self_attribute_id!)!) : "not set"})
            </span>
          )}
        </span>
      ) : (
        <span>
          {formatNumber(c.value!)}
          {c.target_unit && <span className="dim"> {c.target_unit}</span>}
        </span>
      )}
    </span>
  );
}

/** A whole condition with its AND / OR connectors; "always" when there are no clauses. */
export function ConditionText({
  conditions,
  selfValues,
}: {
  conditions: Condition[];
  selfValues?: Map<number, number>;
}) {
  if (conditions.length === 0) return <span className="dim">always</span>;
  return (
    <span>
      {conditions.map((c, i) => (
        <span key={c.id}>
          {i > 0 && <span className="connector"> {c.connector.toUpperCase()} </span>}
          <ClauseText c={c} selfValues={selfValues} />
        </span>
      ))}
    </span>
  );
}

/** Plain-text condition, for tooltips. */
export function conditionString(conditions: Condition[]): string {
  return conditions
    .map(
      (c, i) =>
        `${i > 0 ? ` ${c.connector.toUpperCase()} ` : ""}their ${c.target_attribute} ${OP_SYMBOL[c.op]} ${
          c.self_attribute !== null ? `my ${c.self_attribute}` : formatNumber(c.value!)
        }`,
    )
    .join("");
}
