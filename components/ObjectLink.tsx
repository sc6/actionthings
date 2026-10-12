import Link from "next/link";
import { PixelIcon } from "./PixelIcon";

export function ObjectLink({ id, name, icon }: { id: number; name: string; icon: string }) {
  return (
    <Link href={`/objects/${id}`} className="obj-link">
      <PixelIcon data={icon} size={16} />
      <span>{name}</span>
    </Link>
  );
}
