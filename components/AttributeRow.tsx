"use client";

import Link from "next/link";
import { useState } from "react";
import { setAttributeValues } from "@/app/actions";
import type { ObjectAttribute } from "@/lib/repo";
import { formatNumber, formatRange } from "@/lib/scale";
import { NumberLine } from "./NumberLine";

/**
 * One attribute on an object page: number line plus the object's values,
 * editable in place. Render with a `key` that includes the values, so a save
 * remounts the row and leaves edit mode.
 */
export function AttributeRow({ objectId, attr }: { objectId: number; attr: ObjectAttribute }) {
  // The median is required; min and max are optional.
  const isSet = attr.median !== null;
  const [editing, setEditing] = useState(false);
  const formId = `attr-${attr.id}`;

  // Native validation: block saving unless min ≤ median ≤ max (for whichever of
  // min / max are filled in). The inputs live in other cells (joined via the
  // `form` attribute), so this runs per input.
  const validate = () => {
    const f = (document.getElementById(formId) as HTMLFormElement | null)?.elements;
    if (!f) return;
    const [min, median, max] = (["min", "median", "max"] as const).map((k) => f.namedItem(k) as HTMLInputElement);
    const ok =
      !median.value ||
      ((!min.value || +min.value <= +median.value) && (!max.value || +median.value <= +max.value));
    median.setCustomValidity(ok ? "" : "Need min ≤ median ≤ max");
  };

  const valueCell = (key: "min" | "median" | "max") => (
    <td className="num">
      {editing ? (
        <input
          type="number"
          name={key}
          form={formId}
          step="any"
          required={key === "median"}
          placeholder={key === "median" ? undefined : "—"}
          defaultValue={attr[key] ?? ""}
          className="num-input"
          aria-label={key}
          min={attr.range_min ?? undefined}
          max={attr.range_max ?? undefined}
          onInput={validate}
        />
      ) : attr[key] === null ? (
        <span className="dim">—</span>
      ) : (
        formatNumber(attr[key])
      )}
    </td>
  );

  return (
    <tr>
      <td className="nowrap">
        {attr.name}
        <div>
          <Link href={`/labels/${attr.label_id}`} className="dim label-from">
            from #{attr.label_name}
          </Link>
        </div>
      </td>
      <td className="numline-cell">
        {isSet ? (
          <NumberLine
            min={attr.min}
            median={attr.median!}
            max={attr.max}
            unit={attr.unit}
            rangeMin={attr.range_min}
            rangeMax={attr.range_max}
          />
        ) : (
          <span className="dim">no values yet</span>
        )}
      </td>
      {valueCell("min")}
      {valueCell("median")}
      {valueCell("max")}
      <td className="dim nowrap">
        {attr.unit}
        {(attr.range_min !== null || attr.range_max !== null) && (
          <div className="label-from">range {formatRange(attr.range_min, attr.range_max)}</div>
        )}
      </td>
      <td className="shrink">
        {editing ? (
          <form
            id={formId}
            action={setAttributeValues}
            className="row"
          >
            <input type="hidden" name="object_id" value={objectId} />
            <input type="hidden" name="attribute_id" value={attr.id} />
            <button type="submit" className="primary">save</button>
            <button type="button" onClick={() => setEditing(false)}>
              cancel
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={isSet ? undefined : "primary"}>
            {isSet ? "edit" : "set"}
          </button>
        )}
      </td>
    </tr>
  );
}
