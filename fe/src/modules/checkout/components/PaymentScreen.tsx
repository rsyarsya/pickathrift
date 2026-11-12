import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import {
  formatCountdown,
  orderTotal,
  PAYMENT_WINDOW_HOURS,
  PROOF_TYPES,
  validateProof,
  type Order,
} from "@/modules/orders/order";
import { CancelOrderDialog } from "@/modules/orders/components/CancelOrderDialog";
import { OrderStatusLabel, orderStatuses } from "@/modules/orders/components/OrderStatusLabel";
import { updateBuyerOrder } from "@/modules/orders/data/orders";
import { orderHref, orderReference } from "@/modules/orders/links";
import { usePaymentCountdown } from "@/modules/orders/usePaymentCountdown";
import type { loadCheckout } from "../data/checkout";
import { checkoutColumns, OrderSummary, overline } from "./OrderSummary";
import { PaymentProgress } from "./PaymentProgress";

type PaymentProps = {
  order: Order;
  account: Awaited<ReturnType<typeof loadCheckout>>["account"];
  rejectedProof: Awaited<ReturnType<typeof loadCheckout>>["rejectedProof"];
  onChange: (order: Order) => void;
  onRestart: () => void;
};

const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" });

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

function TransferInstructions({
  order,
  account,
  seconds,
}: Pick<PaymentProps, "order" | "account"> & { seconds: number | null }) {
  return (
    <section className="grid gap-4 rounded-md bg-butter p-16">
      <h2 className={cn(overline, "text-fg")}>Transfer ke rekening toko</h2>
      <p className="font-mono text-card">
        {account.bank} · {account.number}
      </p>
      <p className="text-caption">
        a.n. {account.holder} · nominal tepat {formatRupiah(orderTotal(order.product))}
      </p>
      {seconds !== null && (
        <p className="text-caption">
          Bayar sebelum {time.format(order.expiresAt)} WIB ({PAYMENT_WINDOW_HOURS} jam). Lewat dari
          itu pesanan batal otomatis dan barang dilepas.
          <span role="timer" className="mt-4 block font-mono">
            Sisa waktu {formatCountdown(seconds)}
          </span>
        </p>
      )}
    </section>
  );
}

function ProofReceived({ proof }: { proof: Order["proof"] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string>();
  const file = proof?.file;

  useEffect(() => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return (
    <>
      <p role="status" className="rounded-md bg-success-bg p-16 text-body">
        Bukti transfer sudah kami terima. Admin biasanya memverifikasi dalam 1–24 jam. Barang tetap
        terkunci untukmu.
      </p>
      {proof && (
        <div className="flex items-center gap-14 rounded-md border border-line bg-surface p-12">
          <span aria-hidden className="h-56 w-44 shrink-0 rounded-sm bg-lilac" />
          <div className="min-w-0 flex-1">
            <p className="text-body wrap-anywhere">{proof.name}</p>
            <p className={overline}>
              {fileSize(proof.size)} · Diunggah {time.format(proof.uploadedAt)} WIB
            </p>
          </div>
          <button type="button" className={asideLink} onClick={() => dialog.current?.showModal()}>
            Lihat
          </button>
          <dialog
            ref={dialog}
            aria-labelledby="proof-title"
            className="m-auto w-[calc(100%-32px)] max-w-580 rounded-xl bg-canvas p-24 text-fg shadow-overlay"
          >
            <div className="grid gap-16">
              <h2 id="proof-title" className="text-card wrap-anywhere">
                {proof.name}
              </h2>
              {url ? (
                <Image
                  unoptimized
                  src={url}
                  alt="Bukti pembayaran yang diunggah"
                  width={500}
                  height={500}
                  className="max-h-[65dvh] w-full object-contain"
                />
              ) : (
                <p>Bukti pembayaran simulasi.</p>
              )}
              <Button variant="outline" onClick={() => dialog.current?.close()}>
                Tutup
              </Button>
            </div>
          </dialog>
        </div>
      )}
      <ButtonLink href="/pesanan" variant="outline" className="md:justify-self-start">
        Lihat riwayat pesanan
      </ButtonLink>
    </>
  );
}

function ProofForm({
  order,
  rejectedProof,
  pending,
  error,
  onSubmit,
}: {
  order: Order;
  rejectedProof: PaymentProps["rejectedProof"];
  pending: boolean;
  error: string | null;
  onSubmit: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const selection = file ?? rejectedProof;
  const fieldError = selection ? validateProof(selection) : undefined;
  const reupload = order.status === "PERLU_UNGGAH_ULANG";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file && !fieldError && !pending) onSubmit(file);
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending} className="grid gap-12">
      <p id="proof-label" className={overline}>
        Bukti pembayaran
      </p>
      {order.adminNote && (
        <p className="text-caption text-danger">
          Catatan admin: {order.adminNote} Pesananmu tetap aman dan tidak batal otomatis.
        </p>
      )}
      <div className="relative">
        <input
          id="payment-proof"
          type="file"
          accept={PROOF_TYPES.join(",")}
          disabled={pending}
          className="peer sr-only"
          aria-labelledby="proof-label proof-picker"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "proof-error" : "proof-hint"}
          onChange={(event) => {
            const next = event.currentTarget.files?.[0];
            if (next) setFile(next);
            event.currentTarget.value = "";
          }}
        />
        <label
          htmlFor="payment-proof"
          className={cn(
            "grid cursor-pointer gap-6 rounded-md border border-dashed px-16 py-22 text-center peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-disabled:cursor-not-allowed",
            fieldError
              ? "border-danger bg-danger-bg"
              : "border-line-strong bg-surface hover:bg-subtle",
          )}
        >
          {selection && (
            <span
              className={cn("font-mono text-caption wrap-anywhere", fieldError && "text-danger")}
            >
              {selection.name} · {fileSize(selection.size)}
            </span>
          )}
          {fieldError && (
            <span id="proof-error" role="alert" className="text-caption text-danger">
              {fieldError}
            </span>
          )}
          <span id="proof-picker" className={cn("text-body font-medium", selection && asideLink)}>
            {selection ? "Pilih file lain" : "+ Pilih bukti transfer"}
          </span>
          {!fieldError && (
            <span id="proof-hint" className={overline}>
              JPG atau PNG · Maks 2 MB
            </span>
          )}
        </label>
      </div>
      <Button type="submit" disabled={!file || Boolean(fieldError) || pending}>
        {pending ? "Mengirim bukti…" : reupload ? "Kirim ulang bukti" : "Kirim bukti pembayaran"}
      </Button>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export function PaymentScreen({
  order,
  account,
  rejectedProof,
  onChange,
  onRestart,
}: PaymentProps) {
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"cancel" | "upload" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const waiting = order.status === "MENUNGGU_PEMBAYARAN";
  const reupload = order.status === "PERLU_UNGGAH_ULANG";
  const verifying = order.status === "MENUNGGU_VERIFIKASI";
  const seconds = usePaymentCountdown(order);
  const ended = seconds === 0 || order.status === "DIBATALKAN";

  async function update(next: { type: "cancel" } | { type: "upload"; file: File }) {
    if (action) return;
    setAction(next.type);
    const setError = next.type === "cancel" ? setCancelError : setUploadError;
    setError(null);
    try {
      const updated = await updateBuyerOrder(order, next);
      cancelDialog.current?.close();
      onChange(updated);
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Pesanan gagal diperbarui. Coba lagi.");
    } finally {
      setAction(null);
    }
  }

  const heading = `Pesanan ${orderReference(order)}`;
  if (ended) {
    return (
      <>
        <PageHeader title="Pesanan dibatalkan" overline={heading} />
        <StatusMessage
          tone="warning"
          title={
            seconds === 0 || order.cancellation === "expired"
              ? "Batas waktu pembayaran habis"
              : "Pesanan berhasil dibatalkan"
          }
          description="Barang sudah dilepas dan dapat dipesan kembali selama stok tersedia."
          actions={<Button onClick={onRestart}>Kembali ke checkout</Button>}
        />
      </>
    );
  }

  const { title } = orderStatuses[order.status];
  if (!verifying && !reupload && !waiting) {
    return (
      <>
        <PageHeader title={title} overline={heading} />
        <ButtonLink href={orderHref(order)} className="justify-self-start">
          Lihat detail pesanan
        </ButtonLink>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={title}
        overline={heading}
        aside={<OrderStatusLabel status={order.status} />}
      />
      <PaymentProgress current={verifying ? 2 : 1} />
      <div className={checkoutColumns}>
        <div className="grid min-w-0 gap-14">
          {verifying ? (
            <ProofReceived proof={order.proof} />
          ) : (
            <>
              <TransferInstructions order={order} account={account} seconds={seconds} />
              <ProofForm
                order={order}
                rejectedProof={rejectedProof}
                pending={action === "upload"}
                error={uploadError}
                onSubmit={(file) => void update({ type: "upload", file })}
              />
              {waiting && (
                <button
                  type="button"
                  className={cn(asideLink, "justify-self-start text-body text-muted")}
                  disabled={action !== null}
                  onClick={() => cancelDialog.current?.showModal()}
                >
                  Batalkan pesanan
                </button>
              )}
            </>
          )}
        </div>
        <OrderSummary product={order.product} />
      </div>
      {waiting && (
        <CancelOrderDialog
          dialogRef={cancelDialog}
          productName={order.product.name}
          pending={action === "cancel"}
          error={cancelError}
          onConfirm={() => void update({ type: "cancel" })}
        />
      )}
    </>
  );
}
