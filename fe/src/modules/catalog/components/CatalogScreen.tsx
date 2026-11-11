"use client";

import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { formatRupiah } from "@/lib/format";
import { FilterPanel } from "@/modules/catalog/components/FilterPanel";
import { ProductCard, ProductCardSkeleton } from "@/modules/catalog/components/ProductCard";
import { SortMenu } from "@/modules/catalog/components/SortMenu";
import { listProducts } from "@/modules/catalog/data/products";
import { hasFilters } from "@/modules/catalog/query";
import type { CatalogQuery } from "@/modules/catalog/types";
import { useCatalogQuery } from "@/modules/catalog/useCatalogQuery";
import { useProductActions } from "@/modules/catalog/useProductActions";

const PAGE_SIZE = 6;
const overline = "font-mono text-xs tracking-label text-muted uppercase";

/** Chip filter aktif di bawah judul (B1.2). Klik untuk melepas satu filter. */
function ActiveFilters({
  query,
  update,
  reset,
}: {
  query: CatalogQuery;
  update: (patch: Partial<CatalogQuery>) => void;
  reset: () => void;
}) {
  const chips: { label: string; remove: () => void }[] = [];
  if (query.category)
    chips.push({ label: query.category, remove: () => update({ category: undefined }) });
  for (const s of query.sizes)
    chips.push({ label: s, remove: () => update({ sizes: query.sizes.filter((x) => x !== s) }) });
  for (const c of query.conditions)
    chips.push({
      label: c,
      remove: () => update({ conditions: query.conditions.filter((x) => x !== c) }),
    });
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const max = query.maxPrice !== undefined ? formatRupiah(query.maxPrice).slice(3) : "…";
    chips.push({
      label: `Rp ${query.minPrice !== undefined ? formatRupiah(query.minPrice).slice(3) : "0"}–${max}`,
      remove: () => update({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (query.availableOnly)
    chips.push({ label: "Hanya tersedia", remove: () => update({ availableOnly: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-8">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.remove}
          aria-label={`Hapus filter ${chip.label}`}
          className="rounded-full border border-line bg-butter px-14 py-7 text-caption font-medium hover:border-fg"
        >
          {chip.label} &nbsp;×
        </button>
      ))}
      <button type="button" onClick={reset} className="text-caption underline">
        Hapus semua
      </button>
    </div>
  );
}

export function CatalogScreen() {
  const { query, demo, key, update, reset } = useCatalogQuery();
  const actions = useProductActions();
  const sheet = useRef<HTMLDialogElement>(null);

  // Kembali ke halaman pertama setiap kali filter berubah.
  const [paging, setPaging] = useState({ key, limit: PAGE_SIZE });
  const limit = paging.key === key ? paging.limit : PAGE_SIZE;

  const page = useAsync(() => listProducts(query, limit, demo), [key, limit, demo]);
  const data = page.data;
  const loadingMore = page.status === "loading" && limit > PAGE_SIZE;
  const showSkeleton = page.status === "loading" && !loadingMore;

  const title = query.q ? `“${query.q}”` : (query.category ?? "Semua koleksi");
  const count =
    page.status === "error" ? "—" : showSkeleton ? "MEMUAT…" : `${data?.total ?? 0} BARANG`;

  return (
    <div className="flex gap-48 px-16 pt-24 md:px-24 lg:px-48 lg:pt-36">
      <aside aria-label="Filter" className="hidden w-260 shrink-0 lg:block">
        <FilterPanel variant="sidebar" query={query} counts={data?.counts} update={update} />
      </aside>

      <section aria-labelledby="catalog-title" className="flex min-w-0 flex-1 flex-col gap-20">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-8">
            <p className={overline} aria-live="polite">
              {count}
            </p>
            <h1
              id="catalog-title"
              className="text-[32px] font-medium tracking-[-0.035em] md:text-display"
            >
              {title}
            </h1>
          </div>
          <div className="flex gap-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sheet.current?.showModal()}
              className="border border-line bg-surface lg:hidden"
            >
              Filter
            </Button>
            <SortMenu value={query.sort} onChange={(sort) => update({ sort })} />
          </div>
        </div>

        <ActiveFilters query={query} update={update} reset={reset} />

        {page.status === "error" ? (
          <StatusMessage
            tone="error"
            title="Katalog gagal dimuat"
            description={page.error.message}
            actions={
              <Button size="md" onClick={page.reload}>
                Coba lagi
              </Button>
            }
            footnote={`KODE GALAT · ${page.error.status || "JARINGAN"}`}
          />
        ) : showSkeleton ? (
          <div className="grid grid-cols-2 gap-x-12 gap-y-24 pb-64 md:grid-cols-3 md:gap-x-24 lg:gap-x-32 lg:pb-96">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.total === 0 ? (
          <StatusMessage
            tone="empty"
            title="Tidak ada barang yang cocok"
            description="Coba longgarkan filter, atau cari berdasarkan ukuran pakaianmu sendiri."
            actions={
              <>
                {(hasFilters(query) || query.q) && (
                  <Button size="md" onClick={reset}>
                    Hapus filter
                  </Button>
                )}
                <ButtonLink href="/cari-yang-cocok" variant="outline" size="md">
                  Coba Cari yang Cocok
                </ButtonLink>
              </>
            }
          />
        ) : (
          data && (
            <>
              <ul className="grid grid-cols-2 gap-x-12 gap-y-24 md:grid-cols-3 md:gap-x-24 lg:gap-x-32 lg:gap-y-40">
                {data.items.map((product, i) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      priority={i < 3}
                      saved={actions.isSaved(product.id)}
                      onToggleWishlist={() => actions.toggleWishlist(product)}
                      onCompare={() => actions.compare(product)}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col items-center gap-12 pt-32 pb-64 lg:pb-96">
                <p className={overline}>
                  Menampilkan {data.items.length} dari {data.total} barang
                </p>
                {data.items.length < data.total && (
                  <Button
                    variant="outline"
                    disabled={loadingMore}
                    onClick={() => setPaging({ key, limit: limit + PAGE_SIZE })}
                    className="px-32 py-14 max-md:w-full"
                  >
                    {loadingMore ? "Memuat…" : "Muat lebih banyak"}
                  </Button>
                )}
              </div>
            </>
          )
        )}
      </section>

      <dialog
        ref={sheet}
        aria-label="Filter"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="mx-0 mt-auto mb-0 max-h-[88dvh] w-full max-w-none rounded-t-xl bg-canvas p-0 text-fg lg:hidden"
      >
        <div className="flex flex-col gap-20 px-16 pt-12 pb-24 md:px-24">
          <span className="mx-auto h-4 w-40 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className="text-[26px] font-medium tracking-[-0.02em]">Filter</h2>
            <div className="flex items-center gap-16">
              <button type="button" onClick={reset} className="text-body underline">
                Reset
              </button>
              <form method="dialog">
                <button aria-label="Tutup filter" className="flex">
                  <Icon name="close" size={20} />
                </button>
              </form>
            </div>
          </div>
          <FilterPanel variant="sheet" query={query} counts={data?.counts} update={update} />
          <form method="dialog">
            <Button type="submit" className="w-full">
              {showSkeleton ? "Memuat…" : `Tampilkan ${data?.total ?? 0} barang`}
            </Button>
          </form>
        </div>
      </dialog>

      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </div>
  );
}
