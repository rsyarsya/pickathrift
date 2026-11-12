"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { AdminHeader, Panel } from "@/modules/admin/components/AdminParts";
import {
  AdminOrderStatus,
  orderCode,
  shortDate,
  shortDateTime,
} from "@/modules/admin/components/OrderParts";
import { ReasonDialog } from "@/modules/admin/components/ReasonDialog";
import { getAdminOrder, updateAdminOrder } from "@/modules/admin/data/orders";
import {
  COURIERS,
  REJECT_REASONS,
  REUPLOAD_REASONS,
  canAdmin,
  trackingError,
  type AdminOrderAction,
} from "@/modules/admin/orderActions";
import { TRANSFER_ACCOUNT } from "@/modules/checkout/data/fixtures";
import { SHIPPING_FEE, orderTotal, type Order } from "@/modules/orders/order";

const overline = "font-mono text-micro tracking-label text-muted";

function Row({
  label,
  children,
  strong,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-12 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn("text-right", strong && "font-mono text-base font-medium")}>
        {children}
      </span>
    </div>
  );
}

/** Bukti transfer: foto asli kalau ada, atau struk contoh untuk pesanan demo. */
function ProofCard({ order }: { order: Order }) {
  const file = order.proof?.file;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Panel className="border border-line">
      <div className="flex items-start justify-between gap-12">
        <p className={overline}>BUKTI TRANSFER · DIUNGGAH BUYER</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-caption font-medium underline"
          >
            Buka penuh ↗
          </a>
        )}
      </div>
      {!order.proof ? (
        <p className="rounded-[8px] bg-canvas px-16 py-24 text-center text-sm text-muted">
          Buyer belum mengunggah bukti transfer.
        </p>
      ) : url ? (
        // Foto bukti dari Buyer; ukuran asli tidak diketahui, jadi pakai img biasa.
        <img
          src={url}
          alt={`Bukti transfer ${orderCode(order)}`}
          className="max-h-560 w-full rounded-[8px] bg-canvas object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-10 rounded-[8px] bg-[#f7f7fb] p-16 md:p-22">
          <p className="font-mono text-xs font-medium tracking-label text-success">
            TRANSFER BERHASIL
          </p>
          <p className="text-[32px] font-medium tracking-[-0.03em] md:text-[36px]">
            {formatRupiah(orderTotal(order.product))}
          </p>
          <dl className="flex w-full flex-col gap-8 font-mono text-xs uppercase">
            {[
              [
                "Ke",
                `${TRANSFER_ACCOUNT.bank} ${TRANSFER_ACCOUNT.number} · ${TRANSFER_ACCOUNT.holder}`,
              ],
              ["Dari", order.address.recipient],
              ["Waktu", shortDateTime(order.proof.uploadedAt)],
              ["Ref", `TRF${order.proof.uploadedAt.toString().slice(-10)}`],
            ].map(([term, value]) => (
              <div key={term} className="flex justify-between gap-12">
                <dt className="font-sans text-caption normal-case text-muted">{term}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {order.proof && (
        <p className="text-caption text-muted">
          {order.proof.name} · diunggah {shortDateTime(order.proof.uploadedAt)}
        </p>
      )}
    </Panel>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <Panel>
      <p className={overline}>DETAIL PESANAN {orderCode(order)}</p>
      <div className="flex items-center gap-12">
        <Image
          src={order.product.images[0]!}
          alt=""
          width={96}
          height={120}
          className="h-60 w-48 rounded-sm object-cover"
        />
        <div>
          <p className="text-body font-medium">{order.product.name}</p>
          <p className="font-mono text-nano tracking-[0.05em] text-muted uppercase">
            {order.product.brand} · {order.product.size} · 1 unit
          </p>
        </div>
      </div>
      <Row label="Subtotal">{formatRupiah(order.product.price)}</Row>
      <Row label="Ongkir tetap">{formatRupiah(SHIPPING_FEE)}</Row>
      <Row label="Total" strong>
        {formatRupiah(orderTotal(order.product))}
      </Row>
      {order.verifiedAt && <Row label="Dibayar">{shortDate(order.verifiedAt)} · diverifikasi</Row>}
    </Panel>
  );
}

function BuyerCard({ order, title = "PEMBELI" }: { order: Order; title?: string }) {
  const a = order.address;
  return (
    <Panel>
      <p className={overline}>{title}</p>
      <p className="text-sm font-medium">
        {a.recipient} · {a.phone}
      </p>
      <p className="text-sm leading-[1.45] text-muted">
        {a.street}, {a.city} {a.postalCode}
      </p>
    </Panel>
  );
}

/** M3.2 dan M3.3: cocokkan bukti, lalu setujui, minta unggah ulang, atau tolak. */
function Verification({
  order,
  run,
  busy,
}: {
  order: Order;
  run: (action: AdminOrderAction, message: string) => Promise<boolean>;
  busy: boolean;
}) {
  const total = formatRupiah(orderTotal(order.product));
  const checks = [
    `Nominal sama dengan total ${total}`,
    "Rekening tujuan rekening toko",
    "Waktu transfer setelah pesanan dibuat",
  ];
  const [checked, setChecked] = useState<boolean[]>(checks.map(() => false));
  const [dialog, setDialog] = useState<"reject" | "reupload" | null>(null);
  const allChecked = checked.every(Boolean);
  const waitingReupload = order.status === "PERLU_UNGGAH_ULANG";

  return (
    <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-14">
        {waitingReupload && (
          <p className="rounded-md bg-warning-bg px-16 py-12 text-sm leading-[1.45]">
            Buyer diminta mengunggah ulang bukti{order.adminNote ? `: ${order.adminNote}` : ""}.
            Kamu tetap bisa menyetujui atau menolak kalau dana sudah dicek di rekening.
          </p>
        )}
        <ProofCard order={order} />
      </div>
      <div className="flex w-full flex-col gap-14 lg:w-420 lg:shrink-0">
        <Panel>
          <p className={overline}>COCOKKAN SEBELUM MENYETUJUI</p>
          {checks.map((label, i) => (
            <label key={label} className="flex items-center gap-10 text-sm">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => setChecked(checked.map((v, j) => (j === i ? !v : v)))}
                className="size-18 appearance-none rounded-[4px] border-[1.5px] border-line-strong bg-surface bg-center bg-no-repeat checked:border-fg checked:bg-fg checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23f4f2ee%22 stroke-width=%223%22><path d=%22M20 6 9 17l-5-5%22/></svg>')] checked:bg-[length:12px]"
              />
              {label}
            </label>
          ))}
        </Panel>
        <div className="flex flex-col gap-10">
          <Button
            size="md"
            disabled={busy || !allChecked}
            onClick={() =>
              run({ type: "approve" }, "✓ Pembayaran disetujui · pesanan masuk Perlu dikirim")
            }
          >
            {busy ? "Memproses…" : "Setujui pembayaran"}
          </Button>
          {!allChecked && (
            <p className="text-center text-caption text-muted">
              Centang ketiga poin di atas untuk menyetujui.
            </p>
          )}
          {canAdmin(order, "reupload") && (
            <Button
              variant="outline"
              size="md"
              disabled={busy}
              onClick={() => setDialog("reupload")}
            >
              Minta unggah ulang
            </Button>
          )}
          <Button
            variant="outline"
            size="md"
            disabled={busy}
            onClick={() => setDialog("reject")}
            className="border-danger text-danger hover:bg-danger/5"
          >
            Tolak dan batalkan
          </Button>
        </div>
        <p className="text-caption leading-[1.45] text-muted">
          Setelah disetujui, barang berubah jadi Terjual dan buyer melihat status Diproses.
        </p>
        <OrderSummary order={order} />
        <BuyerCard order={order} />
      </div>

      <ReasonDialog
        open={dialog === "reject"}
        title={`Batalkan pesanan ${orderCode(order)}?`}
        description={`${order.product.name} kembali Tersedia di katalog. Alasan di bawah dikirim ke buyer.`}
        reasons={REJECT_REASONS}
        confirmLabel="Batalkan pesanan"
        tone="danger"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          if (await run({ type: "reject", note }, "Pesanan dibatalkan · barang kembali Tersedia"))
            setDialog(null);
        }}
      />
      <ReasonDialog
        open={dialog === "reupload"}
        title="Minta buyer unggah ulang?"
        description="Pesanan tidak dibatalkan dan tidak punya batas waktu. Alasan di bawah dikirim ke buyer."
        reasons={REUPLOAD_REASONS}
        confirmLabel="Kirim permintaan"
        tone="primary"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          if (await run({ type: "reupload", note }, "✓ Permintaan unggah ulang terkirim ke buyer"))
            setDialog(null);
        }}
      />
    </div>
  );
}

/** M3.4–M3.6: isi kurir dan nomor resi, lalu tandai Dikirim. */
function Shipping({
  order,
  run,
  busy,
  justShipped,
}: {
  order: Order;
  run: (action: AdminOrderAction, message: string) => Promise<boolean>;
  busy: boolean;
  justShipped: boolean;
}) {
  const shipped = order.shipment;
  const [service, setService] = useState(shipped?.service ?? COURIERS[0]!);
  const [number, setNumber] = useState(shipped?.number ?? "");
  const [error, setError] = useState<string | null>(null);
  const control =
    "w-full rounded-md border px-16 py-14 text-base outline-none focus:border-fg disabled:cursor-not-allowed disabled:bg-subtle";

  async function save() {
    const problem = trackingError(number);
    setError(problem);
    if (problem) return;
    await run({ type: "ship", service, number }, "✓ Resi tersimpan · status Dikirim");
  }

  return (
    <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-14">
        {justShipped && (
          <p role="status" className="rounded-md bg-success-bg px-16 py-12 text-sm">
            Resi tersimpan. Status pesanan sekarang Dikirim.
          </p>
        )}
        <Panel>
          <p className={overline}>PENGIRIMAN</p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="flex flex-col gap-14"
          >
            <div className="flex flex-col gap-14 md:flex-row md:gap-12">
              <div className="flex flex-1 flex-col gap-8">
                <label htmlFor="kurir" className="text-sm font-medium">
                  Kurir
                </label>
                <select
                  id="kurir"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={!!shipped || busy}
                  className={cn(control, "border-line bg-surface")}
                >
                  {COURIERS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-8">
                <label htmlFor="resi" className="text-sm font-medium">
                  Nomor resi
                </label>
                <input
                  id="resi"
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder="Masukkan nomor resi"
                  disabled={!!shipped || busy}
                  aria-invalid={!!error}
                  aria-describedby={error ? "resi-error" : undefined}
                  className={cn(
                    control,
                    error ? "border-[1.5px] border-danger bg-[#fff8f6]" : "border-line bg-surface",
                  )}
                />
                {error && (
                  <p id="resi-error" className="text-caption text-danger">
                    {error}
                  </p>
                )}
                {shipped && (
                  <p className="text-caption text-muted">
                    Tersimpan {shortDateTime(shipped.shippedAt)}.
                  </p>
                )}
              </div>
            </div>
            {shipped ? (
              <p className="text-caption text-muted">
                Buyer bisa melacak paket dan menekan konfirmasi diterima. Status jadi Selesai
                setelah itu.
              </p>
            ) : (
              <Button type="submit" size="md" disabled={busy} className="self-start">
                {busy ? "Menyimpan…" : "Simpan dan tandai Dikirim"}
              </Button>
            )}
          </form>
        </Panel>
        <BuyerCard order={order} title="KIRIM KE" />
      </div>
      <div className="w-full lg:w-340 lg:shrink-0">
        <OrderSummary order={order} />
      </div>
    </div>
  );
}

/** Pesanan yang tidak butuh aksi admin: menunggu bayar, selesai, dibatalkan. */
function ReadOnly({ order }: { order: Order }) {
  const note =
    order.status === "MENUNGGU_PEMBAYARAN"
      ? `Buyer belum mengunggah bukti. Pesanan batal otomatis ${shortDateTime(order.expiresAt)} kalau belum dibayar.`
      : order.status === "SELESAI"
        ? `Buyer mengonfirmasi barang diterima${order.receivedAt ? ` ${shortDate(order.receivedAt)}` : ""}.`
        : order.status === "DIBATALKAN"
          ? `Dibatalkan ${order.cancellation === "expired" ? "otomatis karena lewat batas bayar" : order.cancellation === "buyer" ? "oleh buyer" : "oleh admin"}${order.adminNote ? `: ${order.adminNote}` : ""}.`
          : null;
  return (
    <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-14">
        {note && (
          <p
            className={cn(
              "rounded-md px-16 py-12 text-sm leading-[1.45]",
              order.status === "DIBATALKAN"
                ? "bg-danger-bg"
                : order.status === "SELESAI"
                  ? "bg-success-bg"
                  : "bg-warning-bg",
            )}
          >
            {note}
          </p>
        )}
        {order.shipment && (
          <Panel>
            <p className={overline}>PENGIRIMAN</p>
            <Row label="Kurir">{order.shipment.service}</Row>
            <Row label="Nomor resi">
              <span className="font-mono">{order.shipment.number}</span>
            </Row>
          </Panel>
        )}
        <BuyerCard order={order} />
      </div>
      <div className="w-full lg:w-340 lg:shrink-0">
        <OrderSummary order={order} />
      </div>
    </div>
  );
}

function Detail({ initial, demo }: { initial: Order; demo: string | null }) {
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [justShipped, setJustShipped] = useState(false);
  const { toast, show, fail, clear } = useToast();
  const back = `/admin/pesanan${demo === "contoh" ? "?demo=contoh" : ""}`;

  async function run(action: AdminOrderAction, message: string) {
    setBusy(true);
    try {
      const updated = await updateAdminOrder(order, action);
      setOrder(updated);
      setJustShipped(action.type === "ship");
      show(message, { label: "Ke daftar", href: back });
      return true;
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Gagal menyimpan.", () => {
        void run(action, message);
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const verifying = canAdmin(order, "approve");
  const shipping = order.status === "DIPROSES" || (order.status === "DIKIRIM" && justShipped);
  const title = verifying ? "Verifikasi" : shipping ? "Kirim" : "Pesanan";

  return (
    <div className="flex flex-col gap-18 px-16 pt-20 pb-64 md:px-24 lg:px-40 lg:pt-28">
      <div className="lg:hidden">
        <BackLink href={back}>Pesanan masuk</BackLink>
      </div>
      <AdminHeader
        overline={
          <Link href={back} className="hidden hover:underline lg:inline">
            ← PESANAN MASUK
          </Link>
        }
        title={`${title} ${orderCode(order)}`}
        actions={<AdminOrderStatus status={order.status} />}
      />
      {verifying ? (
        // key: checklist kembali kosong kalau status berubah.
        <Verification key={order.status} order={order} run={run} busy={busy} />
      ) : shipping ? (
        <Shipping order={order} run={run} busy={busy} justShipped={justShipped} />
      ) : (
        <ReadOnly order={order} />
      )}
      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

/** M3 detail pesanan admin. */
export function OrderDetailScreen({ id }: { id: string }) {
  const demo = useSearchParams().get("demo");
  const result = useAsync(() => getAdminOrder(id, demo), [id, demo]);

  if (result.status === "loading") {
    return (
      <div className="flex animate-pulse flex-col gap-18 px-16 pt-28 md:px-24 lg:px-40" aria-busy>
        <div className="h-36 w-1/3 rounded-full bg-subtle" />
        <div className="h-320 rounded-[12px] bg-surface" />
      </div>
    );
  }
  if (result.status === "error") {
    const missing = result.error.status === 404;
    return (
      <StatusMessage
        tone={missing ? "empty" : "error"}
        title={missing ? "Pesanan tidak ditemukan" : "Pesanan gagal dimuat"}
        description={result.error.message}
        actions={
          missing ? (
            <ButtonLink href="/admin/pesanan" size="md">
              Kembali ke Pesanan masuk
            </ButtonLink>
          ) : (
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          )
        }
      />
    );
  }
  return <Detail key={result.data.id} initial={result.data} demo={demo} />;
}
