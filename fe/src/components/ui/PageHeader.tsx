import type { ReactNode } from "react";

type PageHeaderProps = {
  /** Baris DM Mono kecil di atas judul, misalnya "4 BARANG DISIMPAN". */
  overline: string;
  title: string;
  /** Tautan kecil di kanan, misalnya "Lanjut belanja →". */
  aside?: ReactNode;
};

/** Judul layar Buyer: overline, judul besar, dan tautan kanan. */
export function PageHeader({ overline, title, aside }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-16">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-xs tracking-label text-muted uppercase" aria-live="polite">
          {overline}
        </p>
        <h1 className="text-[32px] font-medium tracking-[-0.03em] md:text-[44px]">{title}</h1>
      </div>
      {aside && <div className="shrink-0 pb-8 text-sm max-md:hidden">{aside}</div>}
    </div>
  );
}

/** Kelas tautan kecil bergaris bawah di sisi kanan judul. */
export const asideLink = "underline underline-offset-2 hover:text-brand";
