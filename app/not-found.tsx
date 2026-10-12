import Link from "next/link";
import { Rule } from "@/components/Rule";

export default function NotFound() {
  return (
    <>
      <Rule level={1}>404</Rule>
      <p>
        <span style={{ color: "var(--danger)" }}>error:</span> no such entry. <Link href="/">cd ~</Link>
      </p>
    </>
  );
}
