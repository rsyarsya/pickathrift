"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { SortKey } from "@/modules/catalog/types";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "termurah", label: "Harga terendah" },
  { value: "termahal", label: "Harga tertinggi" },
];

/** Tombol "Urutkan" dengan daftar pilihan (B1.6). Tutup dengan klik di luar atau Escape. */
export function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value)?.label ?? "Terbaru";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-6 rounded-full border border-line bg-surface px-14 py-9 text-sm font-medium whitespace-nowrap hover:border-fg"
      >
        Urutkan: {current}
        <span aria-hidden className="text-[9px]">
          ▼
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Urutkan"
          className="absolute top-full z-20 mt-8 w-200 overflow-hidden rounded-md border border-line bg-surface py-4 shadow-overlay max-lg:left-0 lg:right-0"
        >
          {OPTIONS.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-14 py-10 text-left text-sm hover:bg-canvas",
                  o.value === value && "bg-canvas",
                )}
              >
                {o.label}
                {o.value === value && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
