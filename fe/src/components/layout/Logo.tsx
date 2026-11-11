import Link from "next/link";
import { cn } from "@/lib/cn";

/** Logo PickaThrift: huruf i pertama tanpa titik, diganti titik merah. */
export function Logo({
  size = 28,
  tone = "dark",
}: {
  /** Angka = piksel. String untuk ukuran responsif, misalnya "clamp(48px, 8vw, 96px)". */
  size?: number | string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      aria-label="PickaThrift, ke beranda"
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
