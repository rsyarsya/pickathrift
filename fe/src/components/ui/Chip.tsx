import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "sm" | "lg";
  /** Garis merah saat pilihan wajib belum diisi (B4.3). */
  invalid?: boolean;
};

/** Pil pilihan yang bisa ditekan: ukuran, kategori, gaya. */
export function Chip({ active, onClick, children, size = "sm", invalid }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-colors",
        size === "sm" ? "px-14 py-7 text-caption" : "px-16 py-8 text-sm",
        active ? "border-fg bg-fg text-night-fg" : "border-line bg-surface hover:border-fg",
        invalid && !active && "border-[1.5px] border-danger",
      )}
    >
      {children}
    </button>
  );
}
