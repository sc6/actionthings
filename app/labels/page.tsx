import { LabelTag } from "@/components/LabelTag";
import { ObjectLink } from "@/components/ObjectLink";
import { Rule } from "@/components/Rule";
import { listLabels, objectsWithLabel } from "@/lib/repo";

export default function LabelsPage() {
  const labels = listLabels();
  return (
    <>
      <Rule level={1}>labels</Rule>
      <p className="dim">
        Categories assigned to objects. Each label provides attributes and actions to every object with it. Assign labels
        on an object&apos;s page; define attributes and actions on a label&apos;s page.
      </p>
      <table>
        <thead>
          <tr>
            <th>label</th>
            <th className="num">objects</th>
            <th className="num">attributes</th>
            <th className="num">actions</th>
            <th>assigned to</th>
          </tr>
        </thead>
        <tbody>
          {labels.length === 0 && (
            <tr><td colSpan={5} className="dim center">no labels yet</td></tr>
          )}
          {labels.map((l) => (
            <tr key={l.id}>
              <td className="shrink"><LabelTag label={l} /></td>
              <td className="num">{l.objects}</td>
              <td className="num">{l.attributes}</td>
              <td className="num">{l.actions}</td>
              <td>
                {objectsWithLabel(l.id).map((o) => (
                  <span key={o.id} className="spaced">
                    <ObjectLink id={o.id} name={o.name} icon={o.icon} />
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
