"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { shopContent, shopPanel } from "@/components/layout/shopContent";
import { BackLink } from "@/components/ui/BackLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { BuyerOnly } from "@/modules/auth/components/BuyerOnly";
import {
  checkoutColumns,
  OrderSummary,
  overline,
} from "@/modules/checkout/components/OrderSummary";
import { PaymentProgress } from "@/modules/checkout/components/PaymentProgress";
import { getTransferAccount } from "@/modules/checkout/data/checkout";
import { getOrder, updateBuyerOrder } from "../data/orders";
import { checkoutHref, orderReference, reviewHref } from "../links";
import { expireOrder, formatCountdown, orderTotal, type Order } from "../order";
import { usePaymentCountdown } from "../usePaymentCountdown";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { OrderStatusLabel, orderStatuses } from "./OrderStatusLabel";

function ShippingAddress({ order }: { order: Order }) {
  const { recipient, phone, street, city, postalCode } = order.address;
  return (
    <section className="grid gap-4 border-t border-line pt-12">
      <h3 className={overline}>Dikirim ke</h3>
      <p className="text-body wrap-anywhere">
        {recipient} · {phone}
      </p>
      <p className="text-caption wrap-anywhere text-muted">
        {street}, {city} {postalCode}
      </p>
    </section>
  );
}

function Shipment({ shipment }: { shipment: NonNullable<Order["shipment"]> }) {
  const { toast, show, clear } = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(shipment.number);
      show("✓ Nomor resi disalin");
    } catch {
      show("Gagal menyalin. Pilih nomor resi untuk menyalinnya.");
    }
  }

  return (
    <div className={cn(shopPanel, "flex items-center justify-between gap-16 p-16")}>
      <div className="min-w-0">
        <p className={overline}>Nomor resi · {shipment.service}</p>
        <p className="font-mono text-card wrap-anywhere">{shipment.number}</p>
      </div>
      <button type="button" className={asideLink} onClick={() => void copy()}>
        Salin
      </button>
      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

function cancellationReason(order: Order) {
  if (order.cancellation === "expired")
    return "Pesanan dibatalkan karena batas waktu pembayaran habis.";
  if (order.cancellation === "admin")
    return order.adminNote
      ? `Dibatalkan admin: ${order.adminNote}`
      : "Pesanan dibatalkan oleh admin.";
  return "Pesanan sudah kamu batalkan.";
}

function OrderDetail({
  initial,
  openCancel,
  onReload,
}: {
  initial: Order;
  openCancel: boolean;
  onReload: () => void;
}) {
  const [current, setCurrent] = useState(initial);
  const [pending, setPending] = useState<"cancel" | "receive" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const seconds = usePaymentCountdown(current);
  const order = seconds === 0 ? expireOrder(current, current.expiresAt) : current;
  const { status } = order;
  const { title, step } = orderStatuses[status];
  const waiting = status === "MENUNGGU_PEMBAYARAN";
  const account = getTransferAccount();
  const historyHref = order.demo ? "/pesanan?demo=riwayat" : "/pesanan";

  useEffect(() => {
    const modal = dialog.current;
    if (openCancel && waiting && modal && !modal.open) modal.showModal();
  }, [openCancel, waiting]);

  async function update(type: "cancel" | "receive") {
    if (pending) return;
    setError(null);
    setPending(type);
    try {
      const next = await updateBuyerOrder(order, { type });
      dialog.current?.close();
      setCurrent(next);
    } catch (error) {
      setError(
        error instanceof ApiError ? error : new ApiError(0, "Pesanan gagal diperbarui. Coba lagi."),
      );
    } finally {
      setPending(null);
    }
  }

  const errorContent = error && (
    <>
      {error.message}
      {error.status === 409 && (
        <button type="button" className={cn(asideLink, "ml-8")} onClick={onReload}>
          Muat ulang
        </button>
      )}
    </>
  );

  return (
    <div className={cn(shopContent, "grid gap-16")}>
      <div className="lg:hidden">
        <BackLink href={historyHref}>Pesanan saya</BackLink>
      </div>
      <PageHeader
        title={title}
        overline={
          <>
            <span className="lg:hidden">Pesanan</span>
            <span className="hidden lg:inline">
              <Link href={historyHref} className="hover:underline">
                ← Pesanan saya
              </Link>{" "}
              ·
            </span>{" "}
            {orderReference(order)}
          </>
        }
        aside={<OrderStatusLabel status={status} />}
      />
      <OrderStatusLabel status={status} className="md:hidden" />
      {step !== undefined && <PaymentProgress current={step} complete={status === "SELESAI"} />}
      <div className={checkoutColumns}>
        <div className="grid min-w-0 gap-14">
          {status === "DIPROSES" && (
            <p className="rounded-md bg-lilac/40 p-16 text-body">
              Pembayaran sudah diverifikasi. Admin sedang mengemas barangmu, resi muncul di sini
              setelah dikirim.
            </p>
          )}
          {status === "DIKIRIM" && (
            <>
              <p className="rounded-md bg-lilac/40 p-16 text-body">
                Barang sudah dikirim. Tekan konfirmasi kalau paketnya sudah kamu terima.
              </p>
              {order.shipment && <Shipment shipment={order.shipment} />}
              <Button
                className="md:justify-self-start"
                disabled={pending !== null}
                onClick={() => void update("receive")}
              >
                {pending === "receive" ? "Mengonfirmasi…" : "Konfirmasi pesanan diterima"}
              </Button>
              <p className="text-caption text-muted">
                Ulasan bisa ditulis setelah pesanan dikonfirmasi diterima.
              </p>
              {errorContent && (
                <p role="alert" className="text-caption text-danger">
                  {errorContent}
                </p>
              )}
            </>
          )}
          {status === "SELESAI" && (
            <>
              <p className="rounded-md bg-success-bg p-16 text-body">
                {order.review
                  ? "Ulasanmu sudah tampil di Ulasan toko."
                  : "Terima kasih sudah melanjutkan cerita pakaian ini. Bagaimana pengalamanmu?"}
              </p>
              <ButtonLink href={reviewHref(order)} className="md:justify-self-start">
                {order.review ? "Lihat ulasan" : "Tulis ulasan →"}
              </ButtonLink>
            </>
          )}
          {status === "DIBATALKAN" && (
            <>
              <p className="rounded-md bg-danger-bg p-16 text-body">
                {cancellationReason(order)} Barang sudah kembali tersedia di katalog.
              </p>
              <ButtonLink href="/katalog" variant="outline" className="md:justify-self-start">
                Lihat barang lain
              </ButtonLink>
            </>
          )}
          {waiting && (
            <>
              <div className="rounded-md bg-butter p-16 text-body">
                <p>
                  Transfer {formatRupiah(orderTotal(order.product))} ke {account.bank}{" "}
                  {account.number} a.n. {account.holder}, lalu unggah buktinya.
                </p>
                <p role="timer" className="mt-6 font-mono text-caption">
                  Sisa waktu {formatCountdown(seconds ?? 0)}
                </p>
              </div>
              <ButtonLink href={checkoutHref(order)} className="md:justify-self-start">
                Kirim bukti pembayaran
              </ButtonLink>
              <button
                type="button"
                className={cn(asideLink, "justify-self-start text-body text-muted")}
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
                pending={pending === "cancel"}
                error={errorContent}
                onConfirm={() => void update("cancel")}
              />
            </>
          )}
          {status === "MENUNGGU_VERIFIKASI" && (
            <p className="rounded-md bg-success-bg p-16 text-body">
              Bukti transfer sudah diterima dan sedang menunggu verifikasi admin.
            </p>
          )}
          {status === "PERLU_UNGGAH_ULANG" && (
            <>
              <p className="rounded-md bg-warning-bg p-16 text-body">
                {order.adminNote ?? "Admin meminta bukti pembayaran yang baru."}
              </p>
              <ButtonLink href={checkoutHref(order)} className="md:justify-self-start">
                Unggah ulang bukti
              </ButtonLink>
            </>
          )}
        </div>
        <OrderSummary product={order.product} title="Ringkasan">
          <ShippingAddress order={order} />
        </OrderSummary>
      </div>
    </div>
  );
}

function DetailLoader({ id, demo, email }: { id: string; demo: string | null; email: string }) {
  const result = useAsync(() => getOrder(id, email, demo), [id, email, demo]);
  if (result.status === "loading")
    return (
      <p className={shopContent} role="status">
        Memuat detail pesanan…
      </p>
    );
  if (result.status === "error")
    return (
      <div className={shopContent}>
        <BackLink href="/pesanan">Pesanan saya</BackLink>
        <StatusMessage
          tone="error"
          title="Pesanan gagal dimuat"
          description={result.error.message}
          actions={
            result.error.status === 404 ? (
              <ButtonLink href="/pesanan">Lihat pesanan saya</ButtonLink>
            ) : (
              <Button onClick={result.reload}>Coba lagi</Button>
            )
          }
        />
      </div>
    );
  return (
    <OrderDetail initial={result.data} openCancel={demo === "batal"} onReload={result.reload} />
  );
}

export function OrderDetailScreen({ id }: { id: string }) {
  const demo = useSearchParams().get("demo");
  return (
    <BuyerOnly>
      {(user) => (
        <DetailLoader key={`${user.email}:${id}:${demo}`} email={user.email} id={id} demo={demo} />
      )}
    </BuyerOnly>
  );
}
