import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { StatusLabel } from "@/modules/catalog/components/StatusLabel";
import type { Product } from "@/modules/catalog/types";

/** Judul halaman admin: overline kecil, judul, dan tombol di kanan. */
export function AdminHeader({
  overline,
  title,
  actions,
}: {
  overline: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-16">
      <div className="flex flex-col gap-6">
        <div className="font-mono text-micro tracking-label text-muted">{overline}</div>
        <h1 className="text-[28px] font-medium tracking-[-0.03em] md:text-[34px]">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

/** Status produk untuk admin: status stok, atau Nonaktif kalau disembunyikan. */
export function AdminStatusLabel({ product, className }: { product: Product; className?: string }) {
  if (product.active === false) {
    return (
      <span className={cn("inline-flex items-center gap-6 text-sm font-medium", className)}>
        <Icon name="eyeOff" strokeWidth={1.9} className="text-muted" />
        Nonaktif
      </span>
    );
  }
  return <StatusLabel status={product.status} className={cn("text-sm", className)} />;
}

const dayMonth = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

/** "Hari ini", "Kemarin", atau tanggal pendek seperti "8 Nov". */
export function updatedLabel(iso: string, now = new Date()) {
  const date = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return dayMonth.format(date);
}

/** Kartu putih untuk bagian form admin. */
export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("flex flex-col gap-14 rounded-[12px] bg-surface p-16 md:p-20", className)}
    >
      {title && (
        <div className="flex flex-col gap-4">
          <h2 className="text-card">{title}</h2>
          {hint && <p className="text-caption text-muted">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
