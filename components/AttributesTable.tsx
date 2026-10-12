import { createAttribute, deleteAttribute, updateAttribute } from "@/app/actions";
import type { Attribute } from "@/lib/repo";
import { ConfirmButton } from "./ConfirmButton";
import { SaveButton } from "./SaveButton";

/**
 * A label's attributes, editable in place, plus a row for adding one. Global
 * min / max are optional bounds for every object's values.
 */
export function AttributesTable({ labelId, labelName, attributes }: { labelId: number; labelName: string; attributes: Attribute[] }) {
  return (
    <table className="attr-table">
      <thead>
        <tr>
          <th>attribute</th>
          <th>unit</th>
          <th className="num">global min</th>
          <th className="num">global max</th>
          <th className="shrink"></th>
        </tr>
      </thead>
      <tbody>
        {attributes.map((a) => {
          const formId = `attr-def-${a.id}`;
          return (
            <tr key={a.id}>
              <td>
                <input
                  type="text"
                  name="name"
                  defaultValue={a.name}
                  required
                  autoComplete="off"
                  form={formId}
                  className="lowercase"
                />
              </td>
              <td>
                <input type="text" name="unit" defaultValue={a.unit} autoComplete="off" form={formId} size={10} />
              </td>
              <td className="num">
                <RangeInput name="range_min" value={a.range_min} form={formId} />
              </td>
              <td className="num">
                <RangeInput name="range_max" value={a.range_max} form={formId} />
              </td>
              <td className="shrink">
                <div className="row">
                  {/* The row's inputs join this form via their `form` attribute. */}
                  <form id={formId} action={updateAttribute}>
                    <input type="hidden" name="id" value={a.id} />
                    <SaveButton>save</SaveButton>
                  </form>
                  <form action={deleteAttribute}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton
                      confirmLabel="remove?"
                      title={`remove ${a.name}`}
                      message={`Remove "${a.name}" from every #${labelName} object? Their values will be deleted.`}
                    >
                      ×
                    </ConfirmButton>
                  </form>
                </div>
              </td>
            </tr>
          );
        })}
        <tr>
          <td>
            <input
              type="text"
              name="name"
              required
              autoComplete="off"
              placeholder="+ attribute"
              form="attr-new"
              className="lowercase"
            />
          </td>
          <td>
            <input type="text" name="unit" autoComplete="off" placeholder="unit" form="attr-new" size={10} />
          </td>
          <td className="num">
            <RangeInput name="range_min" value={null} form="attr-new" />
          </td>
          <td className="num">
            <RangeInput name="range_max" value={null} form="attr-new" />
          </td>
          <td className="shrink">
            {/* React resets the form (and its associated inputs) after a successful add. */}
            <form id="attr-new" action={createAttribute}>
              <input type="hidden" name="label_id" value={labelId} />
              <SaveButton className="primary">add</SaveButton>
            </form>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function RangeInput({ name, value, form }: { name: string; value: number | null; form: string }) {
  return (
    <input
      type="number"
      name={name}
      step="any"
      defaultValue={value ?? ""}
      placeholder="none"
      form={form}
      className="num-input"
      aria-label={name.replace("_", " ")}
    />
  );
}
