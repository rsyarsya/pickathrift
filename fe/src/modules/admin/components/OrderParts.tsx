import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Order, OrderStatus } from "@/modules/orders/order";
import { orderStatuses } from "@/modules/orders/components/OrderStatusLabel";
import { orderReference } from "@/modules/orders/links";

/** Label status dari sudut pandang admin: "Menunggu verifikasi" Buyer = "Perlu verifikasi". */
export function AdminOrderStatus({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const base = orderStatuses[status];
  const label = status === "MENUNGGU_VERIFIKASI" ? "Perlu verifikasi" : base.label;
  const color = status === "MENUNGGU_VERIFIKASI" ? "text-warning" : base.color;
  return (
    <span className={cn("inline-flex items-center gap-6 text-sm font-medium", className)}>
      <Icon name={base.icon} size={16} className={cn("shrink-0", color)} />
      {label}
    </span>
  );
}

/** "Dinda Maharani" → "Dinda M." */
export function shortName(name: string) {
  const [first = "", second] = name.trim().split(/\s+/);
  return second ? `${first} ${second.charAt(0)}.` : first;
}

const dayMonth = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const shortDate = (time: number) => dayMonth.format(time);
export const shortDateTime = (time: number) => dateTime.format(time);

/** Referensi tampilan yang sama dengan Buyer; URL tetap memakai ID lengkap. */
export function orderCode(order: Pick<Order, "id">) {
  return orderReference(order);
}

export function adminOrderHref(order: Order) {
  return `/admin/pesanan/${encodeURIComponent(order.id)}`;
}
