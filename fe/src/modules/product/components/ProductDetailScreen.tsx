"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { formatRupiah, uploadedAgo } from "@/lib/format";
import { StatusLabel } from "@/modules/catalog/components/StatusLabel";
import { getProduct } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";
import { useProductActions } from "@/modules/catalog/useProductActions";
import { Gallery } from "@/modules/product/components/Gallery";
import { StockConflictDialog } from "@/modules/product/components/StockConflictDialog";
import { useBuyNow } from "@/modules/product/useBuyNow";

const label = "font-mono text-micro tracking-label text-muted uppercase";

const BUY_LABEL: Record<Product["status"], string> = {
  available: "Beli sekarang",
  reserved: "Sedang dipesan pembeli lain",
  sold: "Sudah terjual",
};

function Notice({ product }: { product: Product }) {
  if (product.status === "reserved") {
    return (
      <p className="rounded-md bg-warning-bg px-16 py-14 text-sm leading-[1.45]">
        Barang ini sedang dalam proses pembelian. Kalau pesanan itu dibatalkan, barangnya kembali
        tersedia.
      </p>
    );
  }
  if (product.status === "sold") {
    return (
      <p className="rounded-md bg-sold-bg px-16 py-14 text-sm leading-[1.45]">
        Barang ini sudah terjual. Lihat barang serupa di{" "}
        <Link href={`/katalog?kategori=${product.category}`} className="underline">
          katalog
        </Link>
        .
      </p>
    );
  }
  return null;
}

function Detail({ product: loaded, demo }: { product: Product; demo: string | null }) {
  const actions = useProductActions();
  const purchase = useBuyNow(loaded.id, demo, (message) => actions.showError(message));
  // Setelah 409, tampilkan barang sebagai Dipesan tanpa memuat ulang.
  const product: Product = purchase.conflict ? { ...loaded, status: "reserved" } : loaded;
  const saved = actions.isSaved(product.id);
  const available = product.status === "available";
  const similarHref = `/katalog?kategori=${product.category}&tersedia=1`;

  const buyButton = (className?: string) => (
    <Button onClick={purchase.buy} disabled={!available || purchase.buying} className={className}>
      {purchase.buying ? "Mengunci barang…" : BUY_LABEL[product.status]}
    </Button>
  );

  return (
    <>
      <nav
        aria-label="Remah roti"
        className={cn(label, "hidden px-48 pt-24 whitespace-pre lg:block")}
      >
        <Link href="/katalog" className="hover:underline">
          KATALOG
        </Link>
        {"  /  "}
        <Link href={`/katalog?kategori=${product.category}`} className="hover:underline">
          {product.category}
        </Link>
        {"  /  "}
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="flex flex-col gap-24 px-16 pt-16 pb-48 md:px-24 md:pb-64 lg:flex-row lg:gap-56 lg:px-48 lg:pt-20 lg:pb-96">
        <div className="lg:w-640 lg:shrink-0">
          <Gallery images={product.images} name={product.name} dimmed={product.status === "sold"} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-18">
          <div className="flex flex-wrap items-center gap-10">
            <StatusLabel status={product.status} className="text-sm" />
            <span className={label}>
              {product.category} · DIUNGGAH {uploadedAgo(product.createdAt)}
            </span>
          </div>

          <h1 className="text-[32px] font-medium tracking-[-0.035em] md:text-display">
            {product.name}
          </h1>
          <p
            className={cn(
              "font-mono text-price font-medium",
              product.status === "sold" && "text-muted line-through",
            )}
          >
            {formatRupiah(product.price)}
          </p>

          <dl className="flex flex-wrap gap-8">
            {[
              ["MEREK", product.brand],
              ["UKURAN", product.size],
              ["KONDISI", product.condition],
              ["WARNA", product.color],
            ].map(([term, value]) => (
              <div key={term} className="rounded-[8px] border border-line bg-surface px-12 py-8">
                <dt className="font-mono text-nano tracking-[0.06em] text-muted">{term}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <Notice product={product} />

          <div className="flex flex-col gap-10">
            {buyButton("w-full")}
            <div className="flex gap-10">
              <Button
                variant="outline"
                size="md"
                aria-pressed={saved}
                onClick={() => actions.toggleWishlist(product)}
                className={cn("flex-1", saved && "border-brand bg-brand-subtle text-brand")}
              >
                <Icon name="heart" filled={saved} />
                {saved ? "Di wishlist" : "Wishlist"}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => actions.compare(product)}
                className="flex-1"
              >
                + Bandingkan
              </Button>
            </div>
          </div>

          <p className={label}>ONGKIR TETAP RP 15.000 · TRANSFER MANUAL · SATU UNIT</p>

          <section className="flex flex-col gap-10 border-t border-line pt-16">
            <h2 className={label}>UKURAN PAKAIAN · DIUKUR TERBENTANG DATAR</h2>
            <dl className="grid grid-cols-4 gap-8">
              {product.measurements.map((m) => (
                <div key={m.label} className="flex flex-col gap-2">
                  <dt className="text-caption text-muted">{m.label}</dt>
                  <dd className="font-mono text-base font-medium">{m.cm} cm</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {/* Bar beli ponsel, ikut alur tepat sebelum footer. */}
      <div className="flex items-center justify-between gap-16 border-t border-line bg-surface px-16 py-14 md:hidden">
        <div>
          <p
            className={cn(
              "font-mono text-lg font-medium",
              product.status === "sold" && "text-muted line-through",
            )}
          >
            {formatRupiah(product.price)}
          </p>
          <p className="font-mono text-nano tracking-label text-muted">+ ONGKIR 15.000</p>
        </div>
        {buyButton("max-w-200 flex-1 truncate px-16")}
      </div>

      <StockConflictDialog
        open={purchase.conflict}
        productName={product.name}
        similarHref={similarHref}
        onClose={purchase.closeConflict}
        onSave={() => {
          actions.saveToWishlist(product);
          purchase.closeConflict();
        }}
      />
      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Memuat barang"
      className="flex animate-pulse flex-col gap-24 px-16 pt-16 pb-64 md:px-24 lg:flex-row lg:gap-56 lg:px-48 lg:pt-44 lg:pb-96"
    >
      <div className="aspect-[8/7] rounded-[8px] bg-subtle lg:w-640" />
      <div className="flex flex-1 flex-col gap-18">
        <div className="h-14 w-1/3 rounded-full bg-subtle" />
        <div className="h-40 w-2/3 rounded-full bg-subtle" />
        <div className="h-26 w-1/4 rounded-full bg-subtle" />
        <div className="h-52 rounded-full bg-subtle" />
      </div>
    </div>
  );
}

export function ProductDetailScreen({ id }: { id: string }) {
  const demo = useSearchParams().get("demo");
  const result = useAsync(() => getProduct(id), [id]);

  if (result.status === "loading") return <DetailSkeleton />;

  if (result.status === "error") {
    return result.error.status === 404 ? (
      <StatusMessage
        tone="empty"
        title="Barang tidak ditemukan"
        description={result.error.message}
        actions={
          <ButtonLink href="/katalog" size="md">
            Kembali ke katalog
          </ButtonLink>
        }
      />
    ) : (
      <StatusMessage
        tone="error"
        title="Barang gagal dimuat"
        description={result.error.message}
        actions={
          <Button size="md" onClick={result.reload}>
            Coba lagi
          </Button>
        }
        footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
      />
    );
  }

  return <Detail product={result.data} demo={demo} />;
}
