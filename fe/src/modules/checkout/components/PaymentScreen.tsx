import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import {
  formatCountdown,
  orderAmount,
  PAYMENT_WINDOW_HOURS,
  PROOF_TYPES,
  validateProof,
  type Order,
} from "@/modules/orders/order";
import { CancelOrderDialog } from "@/modules/orders/components/CancelOrderDialog";
import { OrderStatusLabel, orderStatuses } from "@/modules/orders/components/OrderStatusLabel";
import { getOrder, updateBuyerOrder } from "@/modules/orders/data/orders";
import { PaymentProof } from "@/modules/orders/components/PaymentProof";
import { orderHref, orderReference } from "@/modules/orders/links";
import { usePaymentCountdown } from "@/modules/orders/usePaymentCountdown";
import type { loadCheckout } from "../data/checkout";
import { checkoutColumns, OrderSummary, overline } from "./OrderSummary";
import { PaymentProgress } from "./PaymentProgress";
import { GatewayPayment } from "@/modules/orders/components/GatewayPayment";

type PaymentProps = {
  order: Order;
  account: Awaited<ReturnType<typeof loadCheckout>>["account"];
  onChange: (order: Order) => void;
  onRestart: () => void;
  disabled?: boolean;
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
      {account ? (
        <>
          <p className="font-mono text-card">
            {account.bank} · {account.number}
          </p>
          <p className="text-caption">
            a.n. {account.holder} · nominal tepat {formatRupiah(orderAmount(order))}
          </p>
        </>
      ) : (
        <p role="status" className="text-caption">
          Rekening toko belum tersedia. Hubungi admin sebelum melakukan pembayaran.
        </p>
      )}
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

function ProofReceived({ order }: { order: Order }) {
  return (
    <>
      <p role="status" className="rounded-md bg-success-bg p-16 text-body">
        Bukti transfer sudah kami terima. Admin biasanya memverifikasi dalam 1–24 jam. Barang tetap
        terkunci untukmu.
      </p>
      <PaymentProof order={order} />
      <ButtonLink href="/pesanan" variant="outline" className="md:justify-self-start">
        Lihat riwayat pesanan
      </ButtonLink>
    </>
  );
}

function ProofForm({
  order,
  pending,
  error,
  onSubmit,
}: {
  order: Order;
  pending: boolean;
  error: string | null;
  onSubmit: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const selection = file;
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

export function PaymentScreen(props: PaymentProps) {
  const { order } = props;
  if (order.payment?.provider !== "midtrans") return <ManualPaymentScreen {...props} />;
  const { title, step } = orderStatuses[order.status];
  return (
    <>
      <PageHeader
        title={order.payment.reviewReason ? "Pembayaran perlu diperiksa" : title}
        overline={`Pesanan ${orderReference(order)}`}
        aside={<OrderStatusLabel status={order.status} />}
      />
      {step !== undefined && (
        <PaymentProgress current={step} complete={order.status === "SELESAI"} gateway />
      )}
      <div className={checkoutColumns}>
        <div className="grid min-w-0 gap-14">
          <GatewayPayment order={order} onChange={props.onChange} disabled={props.disabled} />
          {order.status !== "MENUNGGU_PEMBAYARAN" && (
            <ButtonLink href={orderHref(order)} className="justify-self-start">
              Lihat detail pesanan
            </ButtonLink>
          )}
        </div>
        <OrderSummary product={order.product} order={order} />
      </div>
    </>
  );
}

function ManualPaymentScreen({ order, account, onChange, onRestart }: PaymentProps) {
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"cancel" | "upload" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const waiting = order.status === "MENUNGGU_PEMBAYARAN";
  const reupload = order.status === "PERLU_UNGGAH_ULANG";
  const verifying = order.status === "MENUNGGU_VERIFIKASI";
  const seconds = usePaymentCountdown(order);
  const ended = order.status === "DIBATALKAN";
  const deadlineReached = waiting && seconds === 0;
  useEffect(() => {
    if (!deadlineReached) return;
    let active = true;
    getOrder(order.id, order.buyerEmail).then(
      (next) => {
        if (active) onChange(next);
      },
      (failure) => {
        if (active)
          setCancelError(
            failure instanceof ApiError ? failure.message : "Status pesanan gagal dimuat.",
          );
      },
    );
    return () => {
      active = false;
    };
    // Identitas pesanan dan perpindahan deadline menentukan kapan status diperiksa.
  }, [deadlineReached, order.id, order.buyerEmail]);

  async function reload() {
    setCancelError(null);
    try {
      onChange(await getOrder(order.id, order.buyerEmail));
    } catch (failure) {
      setCancelError(
        failure instanceof ApiError ? failure.message : "Status pesanan gagal dimuat.",
      );
    }
  }

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
  if (deadlineReached)
    return (
      <>
        <PageHeader title="Batas waktu pembayaran tercapai" overline={heading} />
        <StatusMessage
          tone="warning"
          title="Periksa status pesanan"
          description={
            cancelError ?? "Memeriksa status terbaru dari server sebelum kamu melanjutkan."
          }
          actions={<Button onClick={() => void reload()}>Muat ulang pesanan</Button>}
        />
      </>
    );
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
            <ProofReceived order={order} />
          ) : (
            <>
              <TransferInstructions order={order} account={account} seconds={seconds} />
              <ProofForm
                order={order}
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
        <OrderSummary product={order.product} order={order} />
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
