"use client";

import { Button } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { ProductCard, ProductCardSkeleton } from "@/modules/catalog/components/ProductCard";
import { listProducts } from "@/modules/catalog/data/products";
import { EMPTY_QUERY } from "@/modules/catalog/query";
import { useProductActions } from "@/modules/catalog/useProductActions";

const COUNT = 5;

// Kartu pertama lebih besar: dua kolom, dua baris di desktop. Susunan dari Ola.
const cell = (i: number) => (i === 0 ? "col-span-2 lg:row-span-2" : "col-span-1");

/** "Edisi minggu ini": lima barang terbaru di landing. */
export function WeeklyEdit() {
  const actions = useProductActions();
  const result = useAsync(() => listProducts(EMPTY_QUERY, COUNT), []);

  return (
    <section aria-labelledby="weekly-title" className="mx-auto max-w-1200 px-16 py-64 md:px-24">
      <div className="mb-32">
        <p className="font-mono text-xs tracking-label text-muted">PICKATHRIFT</p>
        <h2 id="weekly-title" className="mt-12 text-title">
          Edisi minggu ini
        </h2>
        <p className="mt-12 text-body text-muted">Pilihan pakaian thrift yang punya cerita.</p>
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
        <ul className="grid grid-cols-2 items-start gap-x-12 gap-y-32 md:grid-cols-3 md:gap-x-16 lg:grid-cols-4 lg:gap-x-20">
          {result.status === "loading"
            ? Array.from({ length: COUNT }, (_, i) => (
                <li key={i} className={cell(i)}>
                  <ProductCardSkeleton />
                </li>
              ))
            : result.data.items.map((product, i) => (
                <li key={product.id} className={cell(i)}>
                  <ProductCard
                    product={product}
                    priority={i === 0}
                    saved={actions.isSaved(product.id)}
                    onToggleWishlist={() => actions.toggleWishlist(product)}
                    onCompare={() => actions.compare(product)}
                  />
                </li>
              ))}
        </ul>
      )}

      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </section>
  );
}
