"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { ProductCard, ProductCardSkeleton } from "@/modules/catalog/components/ProductCard";
import { listProducts } from "@/modules/catalog/data/products";
import { EMPTY_QUERY } from "@/modules/catalog/query";
import type { Category, Product } from "@/modules/catalog/types";
import { useProductActions } from "@/modules/catalog/useProductActions";

type Actions = ReturnType<typeof useProductActions>;

/** Foto besar satu kategori dengan label jumlah dan tombol belanja. */
function CategoryTile({
  category,
  count,
  image,
}: {
  category: Category;
  count?: number;
  image: string;
}) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-subtle md:aspect-[4/3] lg:aspect-auto lg:min-h-720">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 46vw, 100vw"
        className="object-cover"
      />
      <div className="absolute top-16 left-16 flex flex-col gap-2 rounded-sm bg-canvas px-14 py-10 lg:top-24 lg:left-24">
        <p className="text-2xl font-medium tracking-[-0.025em]">{category}</p>
        <p className="font-mono text-xs tracking-[0.05em]">
          {count === undefined ? "…" : `${count} BARANG`}
        </p>
      </div>
      <Link
        href={`/katalog?kategori=${category}`}
        className={buttonClass(
          "primary",
          "sm",
          "absolute bottom-16 left-16 lg:bottom-24 lg:left-24",
        )}
      >
        Belanja {category.toLowerCase()} →
      </Link>
    </div>
  );
}

/** Kotak teks berwarna di sela kartu. */
function Note({
  tone,
  overline,
  children,
}: {
  tone: string;
  overline: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col justify-between gap-24 rounded-sm p-20 md:p-28 lg:h-218", tone)}
    >
      <p className="font-mono text-xs tracking-label">{overline}</p>
      <p className="text-[22px] leading-[1.15] font-medium tracking-[-0.027em] md:text-title">
        {children}
      </p>
    </div>
  );
}

/** Dua kartu produk berdampingan, dengan kerangka selama memuat. */
function CardPair({ products, actions }: { products?: Product[]; actions: Actions }) {
  return (
    <ul className="grid grid-cols-2 gap-12 md:gap-28">
      {products
        ? products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                saved={actions.isSaved(product.id)}
                onToggleWishlist={() => actions.toggleWishlist(product)}
                onCompare={() => actions.compare(product)}
              />
            </li>
          ))
        : [0, 1].map((i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))}
    </ul>
  );
}

/** "Edisi minggu ini": bento dua tile kategori, empat barang terbaru, dan dua catatan. */
export function WeeklyEdit() {
  const actions = useProductActions();
  const result = useAsync(() => listProducts(EMPTY_QUERY, 4), []);
  const items = result.status === "success" ? result.data.items : undefined;
  const counts = result.data?.counts;

  return (
    <section
      aria-labelledby="weekly-title"
      className="flex flex-col gap-24 px-16 py-64 md:px-24 lg:gap-32 lg:px-48 lg:py-96"
    >
      <div className="flex items-end justify-between gap-16">
        <div className="flex flex-col gap-10">
          <p className="font-mono text-xs tracking-label text-muted">
            {result.data ? `${result.data.total} BARANG BARU` : "MEMUAT…"} · DIPILIH SATU PER SATU
          </p>
          <h2
            id="weekly-title"
            className="text-[32px] font-medium tracking-[-0.036em] md:text-[44px]"
          >
            Edisi minggu ini
          </h2>
        </div>
        <Link href="/katalog" className="shrink-0 text-body underline underline-offset-2">
          <span className="md:hidden">Semua →</span>
          <span className="hidden md:inline">Lihat semua →</span>
        </Link>
      </div>

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title="Barang gagal dimuat"
          description={result.error.message}
          actions={
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-24">
          <div className="grid gap-24 lg:grid-cols-2">
            <CategoryTile
              category="Jaket"
              count={counts?.Jaket}
              image="/products/corduroy-jacket-tan.jpg"
            />
            <div className="flex flex-col gap-24">
              <CardPair products={items?.slice(0, 2)} actions={actions} />
              <Note tone="bg-butter" overline="ATURAN TOKO">
                Setiap barang cuma ada satu. Begitu dipesan, barang itu hilang dari rak.
              </Note>
            </div>
          </div>

          <div className="grid gap-24 lg:grid-cols-2">
            <div className="flex flex-col gap-24">
              <CardPair products={items?.slice(2, 4)} actions={actions} />
              <Note tone="bg-lilac" overline="RAGU DI ANTARA DUA?">
                <span className="md:hidden">
                  Tekan “+ Bandingkan” di dua kartu, lalu buka Meja Perbandingan.
                </span>
                <span className="hidden md:inline">
                  Taruh berdampingan di Meja Perbandingan. Harga, ukuran, dan kondisi sekaligus.
                </span>
              </Note>
            </div>
            <CategoryTile category="Kaos" count={counts?.Kaos} image="/images/tile-kaos.jpg" />
          </div>
        </div>
      )}

      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </section>
  );
}
