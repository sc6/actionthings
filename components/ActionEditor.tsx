import { addActionTarget, deleteAction, removeActionTarget, removeCondition } from "@/app/actions";
import { type Action, attributesOfLabel, attributesOfLabels, type Label } from "@/lib/repo";
import { ClauseText } from "./ConditionText";
import { ConditionInput } from "./ConditionInput";
import { ConfirmButton } from "./ConfirmButton";
import { LabelInput } from "./LabelInput";
import { LabelTag } from "./LabelTag";

/** Editor for one action on its owning label's page: targets and condition clauses. */
export function ActionEditor({ action, allLabels }: { action: Action; allLabels: Label[] }) {
  const targetIds = new Set(action.targets.map((t) => t.id));
  const targetAttributes = attributesOfLabels([...targetIds]);
  const selfAttributes = attributesOfLabel(action.label_id).map((a) => ({ ...a, label_name: action.label_name }));

  return (
    <table className="action-editor">
      <tbody>
        <tr>
          <th className="label">action</th>
          <td>
            <span className="verb">{action.verb}</span>
            {action.description && <span className="dim"> · {action.description}</span>}
          </td>
          <td className="shrink">
            <form action={deleteAction}>
              <input type="hidden" name="id" value={action.id} />
              <ConfirmButton
                showMessage
                confirmLabel="delete action?"
                message={`Delete "${action.verb}" from every #${action.label_name} object?`}
              >
                delete
              </ConfirmButton>
            </form>
          </td>
        </tr>
        <tr>
          <th className="label">targets</th>
          <td colSpan={2}>
            <div className="tags">
              {action.targets.map((t) => (
                <LabelTag
                  key={t.id}
                  label={t}
                  remove={
                    <form action={removeActionTarget}>
                      <input type="hidden" name="action_id" value={action.id} />
                      <input type="hidden" name="label_id" value={t.id} />
                      <ConfirmButton
                        className="tag-x"
                        confirmLabel="remove?"
                        message={`Stop targeting #${t.name}? Clauses comparing its attributes are removed too.`}
                      >
                        ×
                      </ConfirmButton>
                    </form>
                  }
                />
              ))}
              <LabelInput
                key={action.targets.map((t) => t.id).join()}
                action={addActionTarget}
                fields={{ action_id: action.id }}
                suggestions={allLabels.filter((l) => !targetIds.has(l.id))}
                placeholder="+ target label"
                focusKey={`action-${action.id}-targets`}
              />
            </div>
            <div className="dim hint">
              {action.targets.length === 0
                ? "no targets yet; add the label(s) a target must have"
                : action.targets.length > 1
                  ? "targets must have all of these labels"
                  : "targets must have this label"}
            </div>
          </td>
        </tr>
        <tr>
          <th className="label top">where</th>
          <td colSpan={2}>
            {action.conditions.length === 0 && <div className="dim">always (every target qualifies)</div>}
            {action.conditions.map((c, i) => (
              <div key={c.id} className="clause-row">
                <span className="connector">{i === 0 ? "" : c.connector.toUpperCase()}</span>
                <ClauseText c={c} />
                <form action={removeCondition}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton className="tag-x plain" confirmLabel="remove?" message="Remove this clause?">
                    ×
                  </ConfirmButton>
                </form>
              </div>
            ))}
            {targetAttributes.length === 0 ? (
              <div className="dim hint">
                {action.targets.length === 0
                  ? "add a target label to compare its attributes"
                  : "the target labels have no attributes to compare"}
              </div>
            ) : (
              <ConditionInput
                actionId={action.id}
                first={action.conditions.length === 0}
                targetAttributes={targetAttributes}
                selfAttributes={selfAttributes}
              />
            )}
            <div className="dim hint">compares medians · AND binds tighter than OR</div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
