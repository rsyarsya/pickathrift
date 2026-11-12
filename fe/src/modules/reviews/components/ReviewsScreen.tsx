"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { shopContent, shopPanel } from "@/components/layout/shopContent";
import { BackLink } from "@/components/ui/BackLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAsync } from "@/hooks/useAsync";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { BuyerOnly } from "@/modules/auth/components/BuyerOnly";
import type { SessionUser } from "@/modules/auth/useSession";
import { OrderStatusLabel } from "@/modules/orders/components/OrderStatusLabel";
import { updateBuyerOrder } from "@/modules/orders/data/orders";
import { orderHref, orderReference } from "@/modules/orders/links";
import type { Order } from "@/modules/orders/order";
import { getReviewOrder, REVIEW_DEMOS, submitReview } from "../data/reviews";
import { reviewEligibility, type ReviewInput } from "../review";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { StoreReviews } from "./StoreReviews";

const date = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

function OrderPreview({ order }: { order: Order }) {
  const { product, shipment, receivedAt } = order;
  const milestone = receivedAt
    ? `Diterima ${date.format(receivedAt)}`
    : shipment
      ? `Dikirim ${date.format(shipment.shippedAt)}`
      : null;
  return (
    <div className={cn(shopPanel, "flex items-center gap-12 p-14")}>
      {product.images[0] && (
        <Image
          src={product.images[0]}
          alt=""
          width={54}
          height={70}
          className="h-70 w-54 shrink-0 rounded-sm object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="font-mono text-micro tracking-label text-muted uppercase">
          {orderReference(order)}
          {milestone && ` · ${milestone}`}
        </p>
        <p className="text-card wrap-anywhere">{product.name}</p>
        <p className="font-mono text-micro tracking-label text-muted uppercase">
          {product.brand} · {product.size} · {product.condition}
        </p>
        <OrderStatusLabel
          status={order.status}
          reviewed={Boolean(order.review)}
          className="md:hidden"
        />
      </div>
      <OrderStatusLabel
        status={order.status}
        reviewed={Boolean(order.review)}
        className="hidden shrink-0 md:inline-flex"
      />
    </div>
  );
}

function LockedReview({
  order,
  pending,
  error,
  onReceive,
}: {
  order: Order;
  pending: boolean;
  error: string | null;
  onReceive: () => void;
}) {
  const shipped = order.status === "DIKIRIM";
  const cancelled = order.status === "DIBATALKAN";
  return (
    <>
      <section className="grid gap-14 rounded-lg bg-warning-bg p-18 md:p-20">
        <div className="flex items-start gap-12">
          <span className="grid size-36 shrink-0 place-items-center rounded-full bg-surface text-warning">
            <Icon name="lock" />
          </span>
          <div>
            <h2 className="text-card">Ulasan dibuka setelah pesanan selesai</h2>
            <p className="text-body">
              {cancelled
                ? "Pesanan yang dibatalkan tidak bisa diulas."
                : shipped
                  ? "Konfirmasi dulu kalau paketnya sudah sampai. Setelah itu kamu bisa memberi bintang dan komentar."
                  : "Tunggu barang dikirim dan konfirmasi penerimaan paketmu sebelum memberi ulasan."}
            </p>
          </div>
        </div>
        {shipped && (
          <ol className="grid gap-8 text-caption md:pl-48">
            <li className="flex items-center gap-8">
              <span
                aria-hidden
                className="grid size-22 place-items-center rounded-full bg-fg text-night-fg"
              >
                <Icon name="check" size={13} />
              </span>
              Barang dikirim
            </li>
            <li className="flex items-center gap-8" aria-current="step">
              <span
                aria-hidden
                className="grid size-22 place-items-center rounded-full border border-fg bg-surface"
              >
                2
              </span>
              Kamu konfirmasi diterima
            </li>
            <li className="flex items-center gap-8 text-muted">
              <span aria-hidden className="grid size-22 place-items-center rounded-full bg-subtle">
                3
              </span>
              Tulis ulasan
            </li>
          </ol>
        )}
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-8 md:flex-row md:flex-wrap md:pl-48">
          {shipped && (
            <Button size="md" disabled={pending} onClick={onReceive}>
              {pending ? "Mengonfirmasi…" : "Konfirmasi pesanan diterima"}
            </Button>
          )}
          <ButtonLink href={orderHref(order)} size="md" variant="outline">
            Lihat detail pesanan
          </ButtonLink>
        </div>
      </section>
      <ReviewForm locked />
    </>
  );
}

function ReviewEditor({
  initial,
  user,
  invalid,
}: {
  initial: Order;
  user: SessionUser;
  invalid: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligibility = reviewEligibility(order);

  async function update(save: () => Promise<Order>) {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      setOrder(await save());
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Perubahan gagal disimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn(shopContent, "grid max-w-736 gap-18 lg:max-w-776")}>
      <BackLink href={orderHref(order)}>Pesanan {orderReference(order)}</BackLink>
      <h1 className="text-title md:text-display">
        {eligibility === "sent" ? "Ulasan terkirim" : "Tulis ulasan"}
      </h1>
      <OrderPreview order={order} />
      {eligibility === "locked" && (
        <LockedReview
          order={order}
          pending={pending}
          error={error}
          onReceive={() => void update(() => updateBuyerOrder(order, { type: "receive" }))}
        />
      )}
      {eligibility === "ready" && (
        <ReviewForm
          invalid={invalid}
          pending={pending}
          error={error}
          onSubmit={(input: ReviewInput) => void update(() => submitReview(order, user, input))}
        />
      )}
      {eligibility === "sent" && order.review && (
        <>
          <div role="status" className="grid gap-8 rounded-md bg-success-bg p-18">
            <p className="flex items-center gap-10 text-card text-success">
              <Icon name="check" /> Terima kasih, {order.review.author}
            </p>
            <p className="text-body">
              Ulasanmu sudah tampil di halaman Ulasan toko dan membantu pembeli lain memilih.
            </p>
          </div>
          <ReviewCard review={order.review} preview />
          <div className="flex flex-col gap-8 md:flex-row">
            <ButtonLink href="/ulasan">Lihat ulasan toko</ButtonLink>
            <ButtonLink href="/katalog" variant="outline">
              Belanja lagi
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewLoader({
  id,
  demo,
  user,
}: {
  id: string | null;
  demo: string | null;
  user: SessionUser;
}) {
  const result = useAsync(() => getReviewOrder(id, user.email, demo), [id, demo, user.email]);
  if (result.status === "loading")
    return (
      <p className={shopContent} role="status">
        Memuat pesanan untuk ulasan…
      </p>
    );
  if (result.status === "error")
    return (
      <div className={shopContent}>
        <StatusMessage
          tone="error"
          title="Ulasan gagal dimuat"
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
  return <ReviewEditor initial={result.data} user={user} invalid={demo === "validasi"} />;
}

export function ReviewsScreen() {
  const search = useSearchParams();
  const id = search.get("pesanan");
  const demo = search.get("demo");
  if (id || (demo && REVIEW_DEMOS.includes(demo))) {
    return (
      <BuyerOnly>
        {(user) => (
          <ReviewLoader key={`${user.email}:${id}:${demo}`} user={user} id={id} demo={demo} />
        )}
      </BuyerOnly>
    );
  }
  if (search.get("milik") === "saya")
    return (
      <BuyerOnly>
        {(user) => <StoreReviews key={user.email} email={user.email} demo={demo} />}
      </BuyerOnly>
    );
  return <StoreReviews demo={demo} />;
}
