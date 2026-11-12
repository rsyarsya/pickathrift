"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Dialog konfirmasi aksi berbahaya (M1.5 Nonaktifkan). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && !busy && e.currentTarget.close()}
      className="m-auto w-[calc(100%-32px)] max-w-440 rounded-xl bg-canvas p-0 text-fg shadow-overlay"
    >
      <div className="flex flex-col gap-14 p-24">
        <span
          aria-hidden
          className="flex size-48 items-center justify-center rounded-full bg-danger-bg text-xl font-bold text-danger"
        >
          !
        </span>
        <h2 id="confirm-title" className="text-[22px] font-medium tracking-[-0.02em]">
          {title}
        </h2>
        <div className="text-sm leading-relaxed text-muted">{children}</div>
        <div className="flex flex-col gap-10 pt-4 sm:flex-row">
          <Button
            variant="danger"
            size="md"
            className="sm:flex-1"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Memproses…" : confirmLabel}
          </Button>
          <Button
            variant="outline"
            size="md"
            className="sm:flex-1"
            disabled={busy}
            onClick={onClose}
          >
            Batal
          </Button>
        </div>
      </div>
    </dialog>
  );
}
