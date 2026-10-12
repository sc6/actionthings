import Link from "next/link";
import { notFound } from "next/navigation";
import { addLabel, deleteObject, removeLabel, updateObject } from "@/app/actions";
import { ConditionText } from "@/components/ConditionText";
import { AttributeRow } from "@/components/AttributeRow";
import { ConfirmButton } from "@/components/ConfirmButton";
import { IconEditor } from "@/components/IconEditor";
import { LabelInput } from "@/components/LabelInput";
import { LabelTag } from "@/components/LabelTag";
import { PixelIcon } from "@/components/PixelIcon";
import { Rule } from "@/components/Rule";
import { actionsOf, attributesOf, getObject, labelsOf, listLabels } from "@/lib/repo";

export default async function ObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obj = getObject(Number(id));
  if (!obj) notFound();

  const labels = labelsOf(obj.id);
  const labelIds = new Set(labels.map((l) => l.id));
  const otherLabels = listLabels()
    .filter((l) => !labelIds.has(l.id))
    .map(({ id, name }) => ({ id, name }));
  const actions = actionsOf(obj.id);
  const attributes = attributesOf(obj.id);
  const myMedians = new Map(attributes.filter((a) => a.median !== null).map((a) => [a.id, a.median!]));

  return (
    <>
      <Rule level={1}>
        object #{obj.id} · {obj.name}
      </Rule>
      <table>
        <tbody>
          <tr>
            <td className="icon-cell" rowSpan={4}>
              <PixelIcon data={obj.icon} size={128} title={obj.name} />
            </td>
            <th className="label">id</th>
            <td className="dim">{obj.id}</td>
          </tr>
          <tr>
            <th className="label">name</th>
            <td>{obj.name}</td>
          </tr>
          <tr>
            <th className="label">description</th>
            <td>{obj.description || <span className="dim">—</span>}</td>
          </tr>
          <tr>
            <th className="label">created</th>
            <td className="dim">{obj.created_at} utc</td>
          </tr>
        </tbody>
      </table>

      <details>
        <summary>edit name / description</summary>
        <form action={updateObject}>
          <input type="hidden" name="id" value={obj.id} />
          <table>
            <tbody>
              <tr>
                <th className="label">name</th>
                <td>
                  <input
                    type="text"
                    name="name"
                    defaultValue={obj.name}
                    required
                    autoComplete="off"
                    className="lowercase"
                  />
                </td>
              </tr>
              <tr>
                <th className="label">description</th>
                <td>
                  <input type="text" name="description" defaultValue={obj.description} autoComplete="off" />
                </td>
              </tr>
              <tr>
                <th className="label"></th>
                <td>
                  <button type="submit" className="primary">save</button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </details>

      <details>
        <summary>edit icon</summary>
        <IconEditor objectId={obj.id} initial={obj.icon} />
      </details>

      <Rule>labels</Rule>
      <div className="tags">
        {labels.map((l) => (
          <LabelTag
            key={l.id}
            label={l}
            remove={
              <form action={removeLabel}>
                <input type="hidden" name="object_id" value={obj.id} />
                <input type="hidden" name="label_id" value={l.id} />
                <ConfirmButton
                  className="tag-x"
                  confirmLabel="remove?"
                  message={`Remove #${l.name} from ${obj.name}? Its attributes and actions no longer apply.`}
                >
                  ×
                </ConfirmButton>
              </form>
            }
          />
        ))}
        <LabelInput
          key={labels.map((l) => l.id).join()}
          action={addLabel}
          fields={{ object_id: obj.id }}
          suggestions={otherLabels}
          focusKey="object-labels"
        />
      </div>

      <Rule>attributes</Rule>
      <table>
        <thead>
          <tr>
            <th>attribute</th>
            <th>range</th>
            <th className="num">min</th>
            <th className="num">median</th>
            <th className="num">max</th>
            <th>unit</th>
            <th className="shrink"></th>
          </tr>
        </thead>
        <tbody>
          {attributes.length === 0 && (
            <tr>
              <td colSpan={7} className="dim center">
                none. attributes come from labels; define them on a label&apos;s page
              </td>
            </tr>
          )}
          {attributes.map((a) => (
            <AttributeRow key={`${a.id}:${a.min}:${a.median}:${a.max}`} objectId={obj.id} attr={a} />
          ))}
        </tbody>
      </table>

      <Rule>actions</Rule>
      <table>
        <thead>
          <tr>
            <th className="join-next">action</th>
            <th>targets</th>
            <th>where</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 && (
            <tr>
              <td colSpan={3} className="dim center">
                none. actions come from labels; define them on a label&apos;s page
              </td>
            </tr>
          )}
          {actions.map((ac) => (
            <tr key={ac.id} title={ac.description || undefined}>
              <td className="nowrap join-next">
                <span className="verb">{ac.verb}</span>
                <div>
                  <Link href={`/labels/${ac.label_id}`} className="dim label-from">
                    from #{ac.label_name}
                  </Link>
                </div>
              </td>
              <td className="joined">
                <span className="join-arrow">→</span>
                {ac.targets.length === 0 && <span className="dim">none</span>}
                {ac.targets.map((t) => (
                  <LabelTag key={t.id} label={t} />
                ))}
              </td>
              <td>
                <ConditionText conditions={ac.conditions} selfValues={myMedians} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Rule>danger zone</Rule>
      <form action={deleteObject}>
        <input type="hidden" name="id" value={obj.id} />
        <ConfirmButton
          showMessage
          confirmLabel="delete object?"
          message={`Delete "${obj.name}" along with its labels and attribute values?`}
        >
          delete object
        </ConfirmButton>
      </form>
    </>
  );
}
