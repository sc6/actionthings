"use client";

import { useState } from "react";
import { addCondition } from "@/app/actions";
import { OP_SYMBOL, OPS } from "@/lib/ops";
import { SaveButton } from "./SaveButton";

type AttrOption = { id: number; name: string; label_name: string; unit: string };

/**
 * Adds a clause to an action: [AND|OR] <target attribute> <op> <my attribute | value>.
 * React resets the form after each successful add; the "compare with" choice is kept.
 */
export function ConditionInput({
  actionId,
  first,
  targetAttributes,
  selfAttributes,
}: {
  actionId: number;
  /** No connector for the first clause. */
  first: boolean;
  targetAttributes: AttrOption[];
  selfAttributes: AttrOption[];
}) {
  const [rhs, setRhs] = useState(selfAttributes.length ? String(selfAttributes[0].id) : "value");
  return (
    <form action={addCondition} className="inline-form condition-input">
      <input type="hidden" name="action_id" value={actionId} />
      {first ? (
        <input type="hidden" name="connector" value="and" />
      ) : (
        <select name="connector" defaultValue="and" aria-label="connector">
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      )}
      <select name="target_attribute_id" required defaultValue="" aria-label="target attribute">
        <option value="" disabled>
          target attribute…
        </option>
        {targetAttributes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} (#{a.label_name})
          </option>
        ))}
      </select>
      <select name="op" defaultValue=">=" aria-label="comparison">
        {OPS.map((op) => (
          <option key={op} value={op}>
            {OP_SYMBOL[op]}
          </option>
        ))}
      </select>
      <select name="rhs" value={rhs} onChange={(e) => setRhs(e.target.value)} aria-label="compare with">
        {selfAttributes.map((a) => (
          <option key={a.id} value={a.id}>
            my {a.name}
          </option>
        ))}
        <option value="value">value…</option>
      </select>
      {rhs === "value" && (
        <input type="number" name="value" step="any" required placeholder="value" className="num-input" />
      )}
      <SaveButton className="primary">add</SaveButton>
    </form>
  );
}
