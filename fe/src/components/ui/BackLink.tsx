import Link from "next/link";
import { Icon } from "./Icon";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-10 text-body font-medium hover:underline"
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-full border border-line bg-surface">
        <Icon name="arrowLeft" />
      </span>
      {children}
    </Link>
  );
}
