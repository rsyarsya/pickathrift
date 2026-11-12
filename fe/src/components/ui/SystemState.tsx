import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TONES = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  neutral: "bg-subtle text-fg",
};

const CATEGORY_LINKS = [
  { label: "Jaket", tone: "bg-peach" },
  { label: "Kaos", tone: "bg-lilac" },
  { label: "Kemeja", tone: "bg-butter" },
  { label: "Celana", tone: "bg-mint" },
];

type SystemStateProps = {
  /** Ikon dalam lingkaran, atau `code` besar seperti 404 kalau tidak diisi. */
  icon?: IconName;
  tone?: keyof typeof TONES;
  /** Angka besar berwarna peach di atas judul (X1.1). */
  bigCode?: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  /** Baris DM Mono di bawah, misalnya "KODE · 404". */
  footnote?: string;
  /** Tampilkan "Atau coba: Jaket Kaos Kemeja Celana" (X1.1). */
  suggestCategories?: boolean;
  /** Pita tipis di atas area, misalnya "Kamu sedang offline…" (X1.4, X1.6). */
  banner?: { text: string; tone: "dark" | "warning" };
};

/** Layar state sistem X1: isi di tengah area setinggi layar, di bawah navbar. */
export function SystemState({
  icon,
  tone = "neutral",
  bigCode,
  title,
  description,
  actions,
  footnote,
  suggestCategories,
  banner,
}: SystemStateProps) {
  return (
    <div className="flex min-h-[calc(100dvh-110px)] flex-col">
      {banner && (
        <p
          role="status"
          className={cn(
            "px-16 py-10 text-center text-caption",
            banner.tone === "dark" ? "bg-night text-night-fg" : "bg-warning-bg text-warning",
          )}
        >
          {banner.text}
        </p>
      )}
      <div className="flex flex-1 items-center justify-center px-16 py-48 pb-60">
        <div className="flex max-w-640 flex-col items-center gap-14 text-center">
          {bigCode ? (
            <p
              aria-hidden
              className="text-[120px] leading-none font-medium tracking-[-0.045em] text-peach md:text-[180px]"
            >
              {bigCode}
            </p>
          ) : (
            icon && (
              <span
                aria-hidden
                className={cn("flex size-56 items-center justify-center rounded-full", TONES[tone])}
              >
                <Icon name={icon} size={22} />
              </span>
            )
          )}
          <h1 className="text-[26px] font-medium tracking-[-0.03em] md:text-[34px]">{title}</h1>
          <p className="max-w-500 text-base leading-normal text-muted md:text-[17px]">
            {description}
          </p>
          {actions && (
            <div className="flex w-full flex-col items-center gap-10 pt-6 sm:w-auto sm:flex-row">
              {actions}
            </div>
          )}
          {suggestCategories && (
            <div className="hidden flex-wrap items-center justify-center gap-8 pt-10 md:flex">
              <span className="text-sm text-muted">Atau coba:</span>
              {CATEGORY_LINKS.map((c) => (
                <Link
                  key={c.label}
                  href={`/katalog?kategori=${c.label}`}
                  className={cn("rounded-full px-12 py-6 text-caption font-medium", c.tone)}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}
          {footnote && (
            <p className="font-mono text-micro tracking-label text-muted uppercase">{footnote}</p>
          )}
        </div>
      </div>
    </div>
  );
}
