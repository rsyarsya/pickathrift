"use client";

import Link from "next/link";
import { useEffect } from "react";

export type ToastData = { id: number; message: string; action?: { label: string; href: string } };

/** Notifikasi gelap di bawah tengah layar. Hilang sendiri setelah 4 detik. */
export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-16 bottom-24 z-50 flex justify-center"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-14 rounded-[12px] bg-night px-18 py-14 text-body font-medium text-night-fg shadow-overlay"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <Link href={toast.action.href} className="text-peach underline">
              {toast.action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
