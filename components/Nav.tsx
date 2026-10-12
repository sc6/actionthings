"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/objects", label: "objects" },
  { href: "/labels", label: "labels" },
  { href: "/actions", label: "actions" },
];

export function Nav() {
  const path = usePathname();
  return (
    <table className="nav">
      <tbody>
        <tr>
          <td className="brand">
            <Link href="/">▚ actionthings</Link>
          </td>
          {LINKS.map((l) => (
            <td key={l.href} className={path.startsWith(l.href) ? "active" : undefined}>
              <Link href={l.href}>{l.label}</Link>
            </td>
          ))}
          <td className="cwd dim">~{path === "/" ? "" : path} $</td>
        </tr>
      </tbody>
    </table>
  );
}
