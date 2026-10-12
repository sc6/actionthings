"use client";

import { Rule } from "@/components/Rule";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <Rule level={1}>error</Rule>
      <table>
        <tbody>
          <tr>
            <th className="label">message</th>
            <td style={{ color: "var(--danger)" }}>{error.message}</td>
          </tr>
          {error.digest && (
            <tr>
              <th className="label">digest</th>
              <td className="dim">{error.digest}</td>
            </tr>
          )}
        </tbody>
      </table>
      <button onClick={reset}>retry</button>
    </>
  );
}
