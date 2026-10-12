import { notFound } from "next/navigation";
import { createAction, deleteLabel, renameLabel } from "@/app/actions";
import { ActionEditor } from "@/components/ActionEditor";
import { AttributesTable } from "@/components/AttributesTable";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ObjectLink } from "@/components/ObjectLink";
import { Rule } from "@/components/Rule";
import { SaveButton } from "@/components/SaveButton";
import { actionsOfLabel, attributesOfLabel, getLabel, listLabels, objectsWithLabel } from "@/lib/repo";

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const label = getLabel(Number(id));
  if (!label) notFound();

  const objects = objectsWithLabel(label.id);
  const actions = actionsOfLabel(label.id);
  const attributes = attributesOfLabel(label.id);
  const allLabels = listLabels().map(({ id, name }) => ({ id, name }));

  return (
    <>
      <Rule level={1}>label · #{label.name}</Rule>
      <form action={renameLabel}>
        <input type="hidden" name="id" value={label.id} />
        <table>
          <tbody>
            <tr>
              <th className="label">name</th>
              <td>
                <div className="row">
                  <input type="text" name="name" defaultValue={label.name} required autoComplete="off" className="lowercase" />
                  <SaveButton className="primary">rename</SaveButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      <Rule>attributes</Rule>
      <p className="dim">
        Every object labeled #{label.name} has these attributes; each object sets its own min, median and max, within the global range if one is set.
      </p>
      <AttributesTable labelId={label.id} labelName={label.name} attributes={attributes} />

      <Rule>actions</Rule>
      <p className="dim">
        Every object labeled #{label.name} has these actions. An action targets objects that carry all of its target
        labels and satisfy its condition.
      </p>
      {actions.map((ac) => (
        <ActionEditor key={ac.id} action={ac} allLabels={allLabels} />
      ))}
      <form action={createAction} className="row new-action">
        <input type="hidden" name="label_id" value={label.id} />
        <input type="text" name="verb" required autoComplete="off" placeholder="+ action verb" size={16} />
        <input type="text" name="description" autoComplete="off" placeholder="description (optional)" />
        <SaveButton className="primary">add action</SaveButton>
      </form>

      <Rule>objects labeled #{label.name}</Rule>
      <table>
        <thead>
          <tr>
            <th className="num">id</th>
            <th>object</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          {objects.length === 0 && (
            <tr><td colSpan={3} className="dim center">no objects have this label</td></tr>
          )}
          {objects.map((o) => (
            <tr key={o.id}>
              <td className="num dim">{o.id}</td>
              <td><ObjectLink id={o.id} name={o.name} icon={o.icon} /></td>
              <td className="dim">{o.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Rule>danger zone</Rule>
      <form action={deleteLabel}>
        <input type="hidden" name="id" value={label.id} />
        <ConfirmButton
          showMessage
          confirmLabel="delete label?"
          message={`Delete #${label.name}? It will be removed from ${objects.length} object(s), along with its ${actions.length} action(s) and ${attributes.length} attribute(s).`}
        >
          delete label
        </ConfirmButton>
      </form>
    </>
  );
}
