import { ActionsTable } from "@/components/ActionsTable";
import { Rule } from "@/components/Rule";
import { listActions } from "@/lib/repo";

export default function ActionsPage() {
  return (
    <>
      <Rule level={1}>actions</Rule>
      <p className="dim">
        Every action is owned by a label; each object with that label has the action. It targets objects that carry
        all of its target labels and satisfy its condition (comparing medians). Edit actions on a label&apos;s page.
      </p>
      <ActionsTable actions={listActions()} showDescription />
    </>
  );
}
