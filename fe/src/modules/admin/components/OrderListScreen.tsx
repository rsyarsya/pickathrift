"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { AdminHeader } from "@/modules/admin/components/AdminParts";
import {
  AdminOrderStatus,
  adminOrderHref,
  orderCode,
  shortDate,
  shortName,
} from "@/modules/admin/components/OrderParts";
import { listAdminOrders } from "@/modules/admin/data/orders";
import { orderTotal, type Order, type OrderStatus } from "@/modules/orders/order";

type Filter = "semua" | OrderStatus;

const FILTERS: { value: Filter; label: string; param: string }[] = [
  { value: "semua", label: "Semua", param: "" },
  { value: "MENUNGGU_VERIFIKASI", label: "Perlu verifikasi", param: "verifikasi" },
  { value: "PERLU_UNGGAH_ULANG", label: "Perlu unggah ulang", param: "unggah-ulang" },
  { value: "DIPROSES", label: "Perlu dikirim", param: "dikirim-siap" },
  { value: "MENUNGGU_PEMBAYARAN", label: "Menunggu bayar", param: "bayar" },
  { value: "DIKIRIM", label: "Dikirim", param: "dikirim" },
  { value: "SELESAI", label: "Selesai", param: "selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan", param: "dibatalkan" },
];

const EMPTY: Partial<Record<Filter, { title: string; description: string; next?: Filter }>> = {
  MENUNGGU_VERIFIKASI: {
    title: "Semua bukti sudah diverifikasi",
    description:
      "Tidak ada pembayaran yang menunggu. Cek lagi nanti atau lihat pesanan yang perlu dikirim.",
    next: "DIPROSES",
  },
  DIPROSES: {
    title: "Tidak ada yang perlu dikirim",
    description: "Pesanan yang pembayarannya sudah disetujui akan muncul di sini.",
  },
};

/** Tombol aksi utama per status: Verifikasi, Kirim, atau Lihat. */
function OrderAction({ order, wide }: { order: Order; wide?: boolean }) {
  const href = adminOrderHref(order);
  const primary = order.status === "MENUNGGU_VERIFIKASI" || order.status === "DIPROSES";
  const label =
    order.status === "MENUNGGU_VERIFIKASI"
      ? "Verifikasi"
      : order.status === "DIPROSES"
        ? "Kirim"
        : "Lihat";
  if (!primary && !wide) {
    return (
      <Link href={href} className="text-caption font-medium underline">
        Lihat
      </Link>
    );
  }
  return (
    <Link href={href} className={buttonClass(primary ? "primary" : "outline", "sm", "px-16 py-8")}>
      {label}
    </Link>
  );
}

const headCell = "px-12 py-12 text-left font-mono text-nano font-normal tracking-label text-muted";

/** M3.1 Daftar pesanan dan M3.7 Tidak ada yang perlu diverifikasi. */
export function OrderListScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const demo = params.get("demo");
  const filter = FILTERS.find((f) => f.param === params.get("status"))?.value ?? "semua";
  const result = useAsync(() => listAdminOrders(demo), [demo]);

  function setFilter(value: Filter) {
    const next = new URLSearchParams(params);
    const param = FILTERS.find((f) => f.value === value)!.param;
    if (param) next.set("status", param);
    else next.delete("status");
    router.replace(`/admin/pesanan${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const all = result.data ?? [];
  const count = (value: Filter) =>
    value === "semua" ? all.length : all.filter((o) => o.status === value).length;
  const needsAction = count("MENUNGGU_VERIFIKASI") + count("DIPROSES");
  const visible = filter === "semua" ? all : all.filter((o) => o.status === filter);
  const loading = result.status === "loading" && !result.data;
  const empty = EMPTY[filter];

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-40 lg:pt-32">
      <AdminHeader
        overline={loading ? "MEMUAT…" : `${all.length} PESANAN · ${needsAction} PERLU TINDAKAN`}
        title="Pesanan masuk"
      />

      <div
        className="-mx-16 flex gap-6 overflow-x-auto px-16 md:mx-0 md:flex-wrap md:px-0"
        role="group"
        aria-label="Filter status pesanan"
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex shrink-0 items-center gap-6 rounded-full border px-12 py-5 text-micro font-medium",
              filter === f.value
                ? "border-fg bg-fg text-night-fg"
                : "border-line bg-surface hover:border-fg",
            )}
          >
            {f.label}
            <span
              className={cn("font-mono", filter === f.value ? "text-night-soft" : "text-muted")}
            >
              {loading ? "" : count(f.value)}
            </span>
          </button>
        ))}
      </div>

      {result.status === "error" ? (
        <div className="rounded-[12px] bg-surface">
          <StatusMessage
            tone="error"
            title="Pesanan gagal dimuat"
            description={result.error.message}
            actions={
              <Button size="md" onClick={result.reload}>
                Coba lagi
              </Button>
            }
            footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
          />
        </div>
      ) : !loading && visible.length === 0 ? (
        <div className="rounded-[12px] bg-surface">
          {empty ? (
            <StatusMessage
              tone="empty"
              icon={<Icon name="check" size={22} strokeWidth={2} />}
              title={empty.title}
              description={empty.description}
              actions={
                empty.next && (
                  <Button variant="outline" size="md" onClick={() => setFilter(empty.next!)}>
                    Lihat yang perlu dikirim
                  </Button>
                )
              }
            />
          ) : (
            <StatusMessage
              tone="empty"
              title={
                all.length === 0 ? "Belum ada pesanan masuk" : "Tidak ada pesanan di status ini"
              }
              description={
                all.length === 0
                  ? "Pesanan dari Buyer akan muncul di sini setelah checkout."
                  : "Pilih status lain untuk melihat pesanan."
              }
              actions={
                all.length === 0 &&
                demo !== "contoh" && (
                  <ButtonLink href="/admin/pesanan?demo=contoh" variant="outline" size="md">
                    Lihat pesanan contoh
                  </ButtonLink>
                )
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[12px] bg-surface md:block">
            <table className="w-full border-collapse" aria-busy={loading}>
              <thead className="bg-[#faf9f6]">
                <tr>
                  <th className={headCell}>PESANAN</th>
                  <th className={cn(headCell, "hidden lg:table-cell")}>PEMBELI</th>
                  <th className={headCell}>BARANG</th>
                  <th className={cn(headCell, "hidden lg:table-cell")}>TOTAL</th>
                  <th className={headCell}>STATUS</th>
                  <th className={headCell}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }, (_, i) => (
                      <tr key={i} className="border-t border-[#efede8]">
                        <td colSpan={6} className="px-12 py-14">
                          <div className="h-28 animate-pulse rounded-full bg-subtle" />
                        </td>
                      </tr>
                    ))
                  : visible.map((order) => (
                      <tr
                        key={order.id}
                        className={cn(
                          "border-t border-[#efede8]",
                          order.status === "MENUNGGU_VERIFIKASI" && "bg-[#f7f7fb]",
                        )}
                      >
                        <td className="px-12 py-10">
                          <p className="font-mono text-caption font-medium">{orderCode(order)}</p>
                          <p className="text-caption text-muted">{shortDate(order.createdAt)}</p>
                        </td>
                        <td className="hidden px-12 py-10 text-sm lg:table-cell">
                          {shortName(order.address.recipient)}
                        </td>
                        <td className="px-12 py-10">
                          <div className="flex items-center gap-10">
                            <Image
                              src={order.product.images[0]!}
                              alt=""
                              width={64}
                              height={80}
                              className="h-40 w-32 rounded-sm object-cover"
                            />
                            <span className="text-sm">{order.product.name}</span>
                          </div>
                        </td>
                        <td className="hidden px-12 py-10 font-mono text-caption font-medium whitespace-nowrap lg:table-cell">
                          {formatRupiah(orderTotal(order.product))}
                        </td>
                        <td className="px-12 py-10">
                          <AdminOrderStatus status={order.status} />
                        </td>
                        <td className="px-12 py-10">
                          <OrderAction order={order} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-10 md:hidden" aria-busy={loading}>
            {loading
              ? Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="h-140 animate-pulse rounded-[12px] bg-surface" />
                ))
              : visible.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-col gap-14 rounded-[12px] bg-surface p-12"
                  >
                    <div className="flex gap-12">
                      <Image
                        src={order.product.images[0]!}
                        alt=""
                        width={88}
                        height={108}
                        className="h-54 w-44 shrink-0 rounded-sm object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-micro text-muted">
                          {orderCode(order)} · {shortName(order.address.recipient)} ·{" "}
                          {shortDate(order.createdAt)}
                        </p>
                        <p className="truncate text-body font-medium">{order.product.name}</p>
                        <p className="font-mono text-caption font-medium">
                          {formatRupiah(orderTotal(order.product))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-12">
                      <AdminOrderStatus status={order.status} />
                      <OrderAction order={order} wide />
                    </div>
                  </li>
                ))}
          </ul>
        </>
      )}
    </div>
  );
}
