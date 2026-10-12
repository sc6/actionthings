import Link from "next/link";
import { ActionsTable } from "@/components/ActionsTable";
import { Rule } from "@/components/Rule";
import { listActions, stats } from "@/lib/repo";

export default function Home() {
  const s = stats();
  const actions = listActions();
  return (
    <>
      <Rule level={1}>dashboard</Rule>
      <table>
        <thead>
          <tr>
            <th>table</th>
            <th className="num">rows</th>
            <th>meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Link href="/objects">objects</Link></td>
            <td className="num">{s.objects}</td>
            <td className="dim">things being tracked; they get actions from their labels</td>
          </tr>
          <tr>
            <td><Link href="/labels">labels</Link></td>
            <td className="num">{s.labels}</td>
            <td className="dim">categories assigned to objects; each label owns actions its objects get</td>
          </tr>
          <tr>
            <td><Link href="/actions">actions</Link></td>
            <td className="num">{s.actions}</td>
            <td className="dim">owned by a label, aimed at labels: #aflame → ignite → #flammable where …</td>
          </tr>
        </tbody>
      </table>

      <Rule>actions</Rule>
      <ActionsTable actions={actions} />
    </>
  );
}
