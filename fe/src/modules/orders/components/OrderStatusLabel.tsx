import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "../order";

export const orderStatuses: Record<
  OrderStatus,
  { label: string; title: string; icon: IconName; color?: string; step?: number }
> = {
  MENUNGGU_PEMBAYARAN: {
    label: "Menunggu pembayaran",
    title: "Selesaikan pembayaran",
    icon: "clock",
    color: "text-warning",
    step: 1,
  },
  MENUNGGU_VERIFIKASI: {
    label: "Menunggu verifikasi",
    title: "Bukti diterima",
    icon: "eye",
    step: 2,
  },
  PERLU_UNGGAH_ULANG: {
    label: "Perlu unggah ulang",
    title: "Unggah ulang bukti",
    icon: "clock",
    color: "text-warning",
    step: 1,
  },
  DIPROSES: { label: "Diproses", title: "Sedang dikemas", icon: "box", step: 3 },
  DIKIRIM: { label: "Dikirim", title: "Dalam perjalanan", icon: "truck", step: 4 },
  SELESAI: {
    label: "Selesai",
    title: "Pesanan selesai",
    icon: "check",
    color: "text-success",
    step: 5,
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    title: "Pesanan dibatalkan",
    icon: "close",
    color: "text-danger",
  },
};

export function OrderStatusLabel({
  status,
  reviewed = false,
  className,
}: {
  status: OrderStatus;
  reviewed?: boolean;
  className?: string;
}) {
  const { label, icon, color } = orderStatuses[status];
  return (
    <span className={cn("inline-flex items-center gap-6 text-caption font-medium", className)}>
      <Icon name={icon} size={16} className={cn("shrink-0", color)} />
      {reviewed ? "Sudah diulas" : label}
    </span>
  );
}
