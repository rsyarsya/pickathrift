"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { ProductCard, ProductCardSkeleton } from "@/modules/catalog/components/ProductCard";
import { listProductsByIds } from "@/modules/catalog/data/products";
import { useProductActions } from "@/modules/catalog/useProductActions";
import { useWishlist } from "@/modules/wishlist/useWishlist";

const grid = "grid grid-cols-2 gap-x-12 gap-y-24 md:grid-cols-3 md:gap-x-24 lg:grid-cols-4";
const note = "font-mono text-micro tracking-label text-muted";

/** B3 Wishlist: ada isi, kosong, dan ada yang terjual. */
export function WishlistScreen() {
  const demo = useSearchParams().get("demo");
  const wishlist = useWishlist();
  const actions = useProductActions();
  const result = useAsync(() => listProductsByIds(wishlist.ids, demo), [wishlist.ids.join(), demo]);

  // Hapus dari wishlist langsung hilang dari layar, tanpa menunggu muat ulang.
  const products = (result.data ?? [])
    .filter((p) => wishlist.ids.includes(p.id))
    .sort((a, b) => Number(b.status === "sold") - Number(a.status === "sold"));
  const sold = products.filter((p) => p.status === "sold");
  const loading = result.status === "loading" && !result.data;
  const empty = !loading && result.status !== "error" && products.length === 0;

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-48 lg:pt-32 lg:pb-96">
      <PageHeader
        overline={empty ? "0 BARANG" : loading ? "MEMUAT…" : `${products.length} BARANG DISIMPAN`}
        title="Wishlist"
        aside={
          <Link href="/katalog" className={asideLink}>
            Lanjut belanja →
          </Link>
        }
      />

      {sold.length > 0 && (
        <div className="flex flex-col gap-8 rounded-md bg-sold-bg px-16 py-12 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            {sold.length} barang di wishlistmu sudah terjual: {sold.map((p) => p.name).join(", ")}.
          </p>
          <button
            type="button"
            onClick={() => wishlist.remove(sold.map((p) => p.id))}
            className="self-start text-caption underline md:self-auto"
          >
            Hapus yang terjual
          </button>
        </div>
      )}

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title="Wishlist gagal dimuat"
          description={result.error.message}
          actions={
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          }
          footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
        />
      ) : empty ? (
        <StatusMessage
          tone="brand"
          icon={<Icon name="heart" size={20} />}
          title="Wishlist masih kosong"
          description="Tekan ikon hati di kartu barang untuk menyimpannya di sini. Menyimpan tidak mengunci barang."
          actions={
            <ButtonLink href="/katalog" size="md">
              Jelajahi koleksi
            </ButtonLink>
          }
        />
      ) : (
        <>
          <p className={note}>
            WISHLIST TIDAK MENGUNCI BARANG. YANG LEBIH DULU BELI, DIA YANG DAPAT.
          </p>
          <ul className={grid}>
            {loading
              ? Array.from({ length: Math.max(wishlist.ids.length, 4) }, (_, i) => (
                  <li key={i}>
                    <ProductCardSkeleton />
                  </li>
                ))
              : products.map((product, i) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      priority={i < 4}
                      saved
                      onToggleWishlist={() => actions.toggleWishlist(product)}
                      onCompare={() => actions.compare(product)}
                    />
                  </li>
                ))}
          </ul>
        </>
      )}

      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </div>
  );
}
