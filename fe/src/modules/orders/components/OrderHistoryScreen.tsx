"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { shopContent, shopPanel } from "@/components/layout/shopContent";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { BuyerOnly } from "@/modules/auth/components/BuyerOnly";
import { listOrders } from "../data/orders";
import { checkoutHref, orderHref, orderReference, reviewHref } from "../links";
import { orderTotal, type Order } from "../order";
import { OrderStatusLabel } from "./OrderStatusLabel";

const date = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const filters = ["Semua", "Berjalan", "Selesai", "Dibatalkan"] as const;
type Filter = (typeof filters)[number];

function orderGroup(order: Order): Exclude<Filter, "Semua"> {
  if (order.status === "SELESAI") return "Selesai";
  if (order.status === "DIBATALKAN") return "Dibatalkan";
  return "Berjalan";
}

function OrderRow({ order }: { order: Order }) {
  const { product, status } = order;
  const waiting = status === "MENUNGGU_PEMBAYARAN";
  const shipped = status === "DIKIRIM";
  const canReview = status === "SELESAI" && !order.review;
  const detail = orderHref(order);
  const label = waiting
    ? "Bayar sekarang"
    : shipped
      ? "Konfirmasi diterima"
      : canReview
        ? "Tulis ulasan"
        : "Lihat detail";
  const action = waiting ? checkoutHref(order) : canReview ? reviewHref(order) : detail;
  return (
    <li
      className={cn(
        shopPanel,
        "flex flex-col gap-12 p-16 md:flex-row md:items-center md:justify-between",
      )}
    >
      <Link href={detail} className="group flex min-w-0 items-center gap-14">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt=""
            width={56}
            height={72}
            className={cn(
              "h-72 w-56 shrink-0 rounded-sm object-cover",
              status === "DIBATALKAN" && "opacity-55",
            )}
          />
        )}
        <div className="min-w-0">
          <p className="font-mono text-micro tracking-label text-muted uppercase">
            {orderReference(order)} · {date.format(order.createdAt)}
          </p>
          <p className="text-card wrap-anywhere group-hover:underline">{product.name}</p>
          <p className="font-mono text-body">{formatRupiah(orderTotal(product))}</p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-8 md:shrink-0 md:gap-14">
        <OrderStatusLabel status={status} reviewed={Boolean(order.review)} />
        <ButtonLink href={action} size="sm" variant={waiting || shipped ? "primary" : "outline"}>
          {label}
        </ButtonLink>
      </div>
    </li>
  );
}

function OrderHistory({ email, demo }: { email: string; demo: string | null }) {
  const [filter, setFilter] = useState<Filter>("Semua");
  const history = useAsync(() => listOrders(email, demo), [email, demo]);

  if (history.status === "loading")
    return (
      <p className={shopContent} role="status">
        Memuat pesanan…
      </p>
    );
  if (history.status === "error")
    return (
      <div className={shopContent}>
        <PageHeader title="Pesanan saya" overline="Riwayat" />
        <StatusMessage
          tone="error"
          title="Pesanan gagal dimuat"
          description={history.error.message}
          actions={<Button onClick={history.reload}>Coba lagi</Button>}
        />
      </div>
    );

  const orders = history.data.filter((order) => filter === "Semua" || orderGroup(order) === filter);
  return (
    <div className={cn(shopContent, "grid gap-18")}>
      <PageHeader title="Pesanan saya" overline={`${history.data.length} pesanan`} />
      <div className="flex flex-wrap gap-8" role="group" aria-label="Filter status pesanan">
        {filters.map((label) => (
          <Chip key={label} active={filter === label} onClick={() => setFilter(label)}>
            {label}
          </Chip>
        ))}
      </div>
      {orders.length ? (
        <ul className="grid gap-16">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      ) : (
        <StatusMessage
          tone="empty"
          icon={<Icon name="circle" size={24} />}
          title={history.data.length ? "Tidak ada pesanan dengan status ini" : "Belum ada pesanan"}
          description={
            history.data.length
              ? "Pilih filter lain untuk melihat pesananmu."
              : "Barang yang kamu beli akan muncul di sini, lengkap dengan statusnya."
          }
          actions={
            history.data.length ? (
              <Button onClick={() => setFilter("Semua")}>Lihat semua pesanan</Button>
            ) : (
              <ButtonLink href="/katalog">Mulai belanja</ButtonLink>
            )
          }
        />
      )}
    </div>
  );
}

export function OrderHistoryScreen() {
  const demo = useSearchParams().get("demo");
  return (
    <BuyerOnly>
      {(user) => <OrderHistory key={user.email} email={user.email} demo={demo} />}
    </BuyerOnly>
  );
}
