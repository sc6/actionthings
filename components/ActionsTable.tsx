import type { Action } from "@/lib/repo";
import { ConditionText } from "./ConditionText";
import { LabelTag } from "./LabelTag";

/** Every action with its owning label, target labels and condition. */
export function ActionsTable({ actions, showDescription = false }: { actions: Action[]; showDescription?: boolean }) {
  const cols = showDescription ? 5 : 4;
  return (
    <table>
      <thead>
        <tr>
          <th>label</th>
          <th>action</th>
          <th>targets</th>
          <th>where</th>
          {showDescription && <th>description</th>}
        </tr>
      </thead>
      <tbody>
        {actions.length === 0 && (
          <tr>
            <td colSpan={cols} className="dim center">
              no actions yet
            </td>
          </tr>
        )}
        {actions.map((ac) => (
          <tr key={ac.id}>
            <td className="shrink">
              <LabelTag label={{ id: ac.label_id, name: ac.label_name }} />
            </td>
            <td className="verb nowrap">{ac.verb}</td>
            <td>
              {ac.targets.length === 0 && <span className="dim">none</span>}
              {ac.targets.map((t) => (
                <LabelTag key={t.id} label={t} />
              ))}
            </td>
            <td>
              <ConditionText conditions={ac.conditions} />
            </td>
            {showDescription && <td className="dim">{ac.description}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
