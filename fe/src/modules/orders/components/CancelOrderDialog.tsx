import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/Button";

export function CancelOrderDialog({
  dialogRef,
  productName,
  pending,
  error,
  onConfirm,
}: {
  dialogRef: Ref<HTMLDialogElement>;
  productName: string;
  pending: boolean;
  error: ReactNode;
  onConfirm: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      data-cancel-order
      aria-labelledby="cancel-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-440 rounded-xl bg-canvas p-0 text-fg shadow-overlay max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      <div className="grid gap-14 p-24 md:p-28">
        <span
          aria-hidden
          className="grid size-56 place-items-center rounded-full bg-danger-bg text-title text-danger"
        >
          !
        </span>
        <h2 id="cancel-title" className="text-title">
          Batalkan pesanan ini?
        </h2>
        <p className="text-body text-muted">
          {productName} akan kembali tersedia untuk pembeli lain. Pembatalan tidak bisa diurungkan.
        </p>
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        <div className="grid gap-10 md:grid-cols-2">
          <form method="dialog" className="order-2">
            <Button type="submit" variant="outline" className="w-full" disabled={pending}>
              Tidak jadi
            </Button>
          </form>
          <Button variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? "Membatalkan…" : "Ya, batalkan"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
