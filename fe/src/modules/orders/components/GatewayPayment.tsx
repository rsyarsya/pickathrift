"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { createPaymentSession, syncPayment } from "../data/payment";
import { getOrder, updateBuyerOrder } from "../data/orders";
import { formatCountdown, paymentDeadline, type Order } from "../order";
import { usePaymentCountdown } from "../usePaymentCountdown";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { PaymentDetails } from "./PaymentDetails";

const date = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function GatewayPayment({
  order,
  onChange,
  disabled = false,
}: {
  order: Order;
  onChange: (order: Order) => void;
  disabled?: boolean;
}) {
  const latest = useRef(order);
  latest.current = order;
  const changed = useRef(onChange);
  changed.current = onChange;
  const running = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"pay" | "sync" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const seconds = usePaymentCountdown(order);
  const waiting = order.status === "MENUNGGU_PEMBAYARAN";
  const review = Boolean(order.payment?.reviewReason);
  const started = order.payment?.status !== "not_started";
  const poll = waiting && !review && started;

  useEffect(() => {
    if (!poll || disabled) return;
    let active = true,
      attempts = 0;
    const controller = new AbortController();
    async function check() {
      if (!active || attempts >= 12 || running.current || document.visibilityState !== "visible")
        return;
      attempts++;
      running.current = true;
      setAction("sync");
      try {
        const next = await syncPayment(latest.current, controller.signal);
        if (active) {
          changed.current(next);
          setPollError(null);
        }
      } catch (failure) {
        if (active && !(failure instanceof ApiError && [409, 429].includes(failure.status)))
          setPollError("Status belum bisa diperbarui. Kamu bisa memeriksanya kembali di sini.");
      } finally {
        running.current = false;
        if (active) setAction(null);
      }
    }
    const initial = window.setTimeout(() => void check(), 500);
    const timer = window.setInterval(() => void check(), 10000);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [order.id, poll, disabled]);

  async function run(type: "pay" | "sync" | "cancel") {
    if (running.current || disabled) return;
    running.current = true;
    setAction(type);
    setError(null);
    try {
      if (type === "pay") {
        const session = await createPaymentSession(order);
        window.location.assign(session.redirectUrl);
      } else {
        const next =
          type === "sync"
            ? await syncPayment(order)
            : await updateBuyerOrder(order, { type: "cancel" });
        dialog.current?.close();
        changed.current(next);
        setPollError(null);
      }
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "Pembayaran belum bisa dilanjutkan. Coba periksa status pesanan.",
      );
      if (type === "cancel" && failure instanceof ApiError && failure.status === 409) {
        dialog.current?.close();
        try {
          changed.current(await getOrder(order.id, order.buyerEmail));
        } catch {
          /* Pesan galat tetap tersedia untuk dicoba ulang. */
        }
      }
    } finally {
      running.current = false;
      setAction(null);
    }
  }

  const busy = disabled || action !== null;
  const mayPay =
    waiting &&
    !review &&
    seconds !== 0 &&
    ["not_started", "ready", "pending"].includes(order.payment?.status ?? "");
  return (
    <div className="grid min-w-0 gap-14">
      <PaymentDetails order={order} />
      {waiting && !review && (
        <>
          <div className="grid gap-6 rounded-md bg-butter p-16 text-body">
            <p>Pilih Virtual Account bank atau QRIS di halaman pembayaran Midtrans.</p>
            <p className="text-caption">Batas bayar {date.format(paymentDeadline(order))} WIB.</p>
            <p role="timer" className="font-mono text-caption">
              Sisa waktu {formatCountdown(seconds ?? 0)}
            </p>
            {seconds === 0 && (
              <p role="status" className="text-caption">
                Batas waktu tercapai. Kami perlu memeriksa hasil pembayaran sebelum membatalkan
                pesanan.
              </p>
            )}
          </div>
          <div className="grid gap-10 sm:flex sm:flex-wrap">
            {mayPay && (
              <Button disabled={busy} onClick={() => void run("pay")}>
                {action === "pay"
                  ? "Membuka pembayaran…"
                  : started
                    ? "Lanjutkan pembayaran"
                    : "Lanjut ke pembayaran"}
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => void run("sync")}>
              {action === "sync" ? "Memeriksa…" : "Periksa status pembayaran"}
            </Button>
          </div>
          <button
            type="button"
            className="justify-self-start text-body text-muted underline underline-offset-4"
            disabled={busy}
            onClick={() => {
              setError(null);
              dialog.current?.showModal();
            }}
          >
            Batalkan pesanan
          </button>
          <CancelOrderDialog
            dialogRef={dialog}
            productName={order.product.name}
            gateway
            pending={action === "cancel"}
            error={error}
            onConfirm={() => void run("cancel")}
          />
        </>
      )}
      {(error || pollError) && (
        <p role="alert" className="text-caption text-danger">
          {error ?? pollError}
        </p>
      )}
    </div>
  );
}
