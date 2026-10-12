import Link from "next/link";
import { createObject } from "@/app/actions";
import { ActionTag } from "@/components/ActionTag";
import { LabelTag } from "@/components/LabelTag";
import { PixelIcon } from "@/components/PixelIcon";
import { Rule } from "@/components/Rule";
import { actionsByObject, labelsByObject, listObjects } from "@/lib/repo";

export default function ObjectsPage() {
  const objects = listObjects();
  const actions = actionsByObject();
  const labels = labelsByObject();

  return (
    <>
      <Rule level={1}>objects</Rule>
      <table>
        <thead>
          <tr>
            <th className="shrink">icon</th>
            <th className="num">id</th>
            <th>name</th>
            <th>labels</th>
            <th>description</th>
            <th>actions</th>
          </tr>
        </thead>
        <tbody>
          {objects.length === 0 && (
            <tr>
              <td colSpan={6} className="dim center">no objects yet</td>
            </tr>
          )}
          {objects.map((o) => (
            <tr key={o.id}>
              <td className="shrink">
                <Link href={`/objects/${o.id}`}>
                  <PixelIcon data={o.icon} size={32} title={o.name} />
                </Link>
              </td>
              <td className="num dim">{o.id}</td>
              <td>
                <Link href={`/objects/${o.id}`}>{o.name}</Link>
              </td>
              <td>
                {(labels.get(o.id) ?? []).map((l) => (
                  <LabelTag key={l.id} label={l} />
                ))}
              </td>
              <td className="dim">{o.description}</td>
              <td>
                {(actions.get(o.id) ?? []).map((ac) => (
                  <ActionTag key={ac.id} action={ac} />
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Rule>new object</Rule>
      <form action={createObject}>
        <table>
          <tbody>
            <tr>
              <th className="label">name</th>
              <td>
                <input type="text" name="name" required autoComplete="off" placeholder="e.g. lantern" className="lowercase" />
              </td>
            </tr>
            <tr>
              <th className="label">description</th>
              <td>
                <input type="text" name="description" autoComplete="off" />
              </td>
            </tr>
            <tr>
              <th className="label"></th>
              <td>
                <button type="submit" className="primary">create</button>
                <span className="dim"> a random pixel-art icon is generated; edit it on the object page</span>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </>
  );
}
