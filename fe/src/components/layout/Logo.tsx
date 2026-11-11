import Link from "next/link";
import { cn } from "@/lib/cn";

/** Logo PickaThrift: huruf i pertama tanpa titik, diganti titik merah. */
export function Logo({ size = 28, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) {
  return (
    <Link
      href="/katalog"
      aria-label="PickaThrift, ke katalog"
      className={cn(
        "relative inline-flex font-bold leading-none tracking-[-0.03em]",
        tone === "dark" ? "text-fg" : "text-night-fg",
      )}
      style={{ fontSize: size }}
    >
      P
      <span className="relative">
        ı
        <span
          className="absolute left-[0.1em] top-[0.02em] size-[0.2em] rounded-full bg-brand"
          aria-hidden
        />
      </span>
      ckaThrift
    </Link>
  );
}
