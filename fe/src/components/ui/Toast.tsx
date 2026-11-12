"use client";

import Link from "next/link";
import { useEffect } from "react";

export type ToastData = {
  id: number;
  message: string;
  action?: { label: string; href: string };
  /** X1.7: tanda galat merah dan tombol "Coba lagi" yang menjalankan ulang aksinya. */
  error?: boolean;
  retry?: () => void;
};

/** Notifikasi gelap di bawah tengah layar. Hilang sendiri setelah 4 detik, galat 8 detik. */
export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDone, toast.error ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div
      role={toast?.error ? "alert" : "status"}
      aria-live={toast?.error ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-16 bottom-24 z-50 flex justify-center"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-14 rounded-[12px] bg-night px-18 py-14 text-body font-medium text-night-fg shadow-overlay"
        >
          {toast.error && (
            <span
              aria-hidden
              className="flex size-20 shrink-0 items-center justify-center rounded-full bg-danger text-caption font-bold"
            >
              !
            </span>
          )}
          <span>{toast.message}</span>
          {toast.retry && (
            <button
              type="button"
              onClick={() => {
                onDone();
                toast.retry?.();
              }}
              className="text-peach underline"
            >
              Coba lagi
            </button>
          )}
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
