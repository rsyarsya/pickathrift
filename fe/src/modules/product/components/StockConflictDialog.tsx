"use client";

import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type StockConflictDialogProps = {
  open: boolean;
  productName: string;
  similarHref: string;
  onSave: () => void;
  onClose: () => void;
  bottomSheet?: boolean;
};

/** B2.4: pembeli lain lebih dulu memesan barang ini (409). */
export function StockConflictDialog({
  open,
  productName,
  similarHref,
  onSave,
  onClose,
  bottomSheet,
}: StockConflictDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="conflict-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-460 rounded-xl bg-canvas p-0 text-fg shadow-overlay",
        bottomSheet && "max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none",
      )}
    >
      <div className="flex flex-col gap-16 px-24 pt-32 pb-28 md:px-28">
        <span
          aria-hidden
          className="flex size-56 items-center justify-center rounded-full bg-warning-bg text-2xl font-bold text-warning"
        >
          !
        </span>
        <h2 id="conflict-title" className="text-title">
          Yah, keduluan.
        </h2>
        <p className="text-body text-muted">
          {productName} baru saja dipesan pembeli lain beberapa detik lalu. Barang thrift cuma ada
          satu, jadi kami tidak bisa memprosesnya.
        </p>
        <p className="text-sm leading-normal">
          Kalau pesanan itu batal, barangnya kembali tersedia. Simpan ke wishlist supaya gampang
          dicek lagi.
        </p>
        <div className="flex flex-col gap-10 sm:flex-row">
          <Button className="sm:flex-1" onClick={onSave}>
            Simpan ke wishlist
          </Button>
          <ButtonLink href={similarHref} variant="outline" className="sm:flex-1">
            Lihat barang serupa
          </ButtonLink>
        </div>
        <p className="font-mono text-nano tracking-label text-muted">
          KODE · 409 STOK SUDAH DIPESAN
        </p>
      </div>
    </dialog>
  );
}
