import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  empty: "bg-butter text-fg",
  error: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  brand: "bg-brand-subtle text-brand",
};

type StatusMessageProps = {
  tone: keyof typeof tones;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  /** Pengganti tanda "?" atau "!" di lingkaran. */
  icon?: ReactNode;
  /** Baris kecil DM Mono di bawah tombol, misalnya kode galat. */
  footnote?: string;
};

/** Pesan tengah untuk hasil kosong dan galat: ikon bulat, judul, penjelasan, tombol. */
export function StatusMessage({
  tone,
  title,
  description,
  actions,
  footnote,
  icon,
}: StatusMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="mx-auto flex max-w-420 flex-col items-center gap-14 px-16 py-64 text-center"
    >
      <span
        className={cn(
          "flex size-56 items-center justify-center rounded-full text-[26px] font-bold",
          tones[tone],
        )}
        aria-hidden
      >
        {icon ?? (tone === "empty" ? "?" : "!")}
      </span>
      <h2 className="text-[22px] font-medium tracking-[-0.02em]">{title}</h2>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      {actions && <div className="flex flex-wrap justify-center gap-10 pt-4">{actions}</div>}
      {footnote && (
        <p className="font-mono text-nano tracking-label text-muted uppercase">{footnote}</p>
      )}
    </div>
  );
}
