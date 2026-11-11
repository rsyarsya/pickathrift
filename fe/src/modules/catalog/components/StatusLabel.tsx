import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { ProductStatus } from "@/modules/catalog/types";

const STATUS: Record<ProductStatus, { label: string; icon: IconName; color: string }> = {
  available: { label: "Tersedia", icon: "check", color: "text-success" },
  reserved: { label: "Dipesan", icon: "clock", color: "text-warning" },
  sold: { label: "Terjual", icon: "tag", color: "text-muted" },
};

export function StatusLabel({ status, className }: { status: ProductStatus; className?: string }) {
  const { label, icon, color } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-6 text-caption font-medium", className)}>
      <Icon name={icon} strokeWidth={1.9} className={color} />
      {label}
    </span>
  );
}
