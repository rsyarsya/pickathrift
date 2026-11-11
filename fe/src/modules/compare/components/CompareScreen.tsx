"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { StatusLabel } from "@/modules/catalog/components/StatusLabel";
import { listProductsByIds, type Demo } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";
import { useProductActions } from "@/modules/catalog/useProductActions";
import { useCompare } from "@/modules/compare/useCompare";
import { StockConflictDialog } from "@/modules/product/components/StockConflictDialog";
import { useBuyNow } from "@/modules/product/useBuyNow";

/* Kolom label (desktop) + dua kolom barang. Di ponsel label pindah ke atas tiap baris. */
const columns = "grid grid-cols-2 gap-x-12 lg:grid-cols-[160px_1fr_1fr] lg:gap-x-16";
const rowLabel = "font-mono text-nano tracking-label text-muted uppercase";

type Actions = ReturnType<typeof useProductActions>;

function EmptySlot({ href, text, tall }: { href: string; text: string; tall: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-8 rounded-md border-[1.5px] border-dashed border-line-strong p-16 text-center text-caption text-muted hover:border-fg hover:text-fg",
        tall ? "min-h-240 lg:min-h-420" : "aspect-[8/7] md:aspect-[9/4]",
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        +
      </span>
      {text}
    </Link>
  );
}

function FilledSlot({
  product,
  onRemove,
  error,
}: {
  product: Product;
  onRemove: () => void;
  error?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <Link href={`/produk/${product.id}`} tabIndex={-1} aria-hidden>
        <Image
          src={product.images[0]!}
          alt=""
          width={800}
          height={360}
          sizes="(min-width: 1024px) 40vw, 50vw"
          className="aspect-[8/7] w-full rounded-sm bg-subtle object-cover md:aspect-[9/4]"
        />
      </Link>
      <div className="flex items-start justify-between gap-8">
        <Link
          href={`/produk/${product.id}`}
          className="text-sm font-medium hover:underline md:text-body"
        >
          {product.name}
        </Link>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Keluarkan ${product.name} dari meja`}
          className="flex shrink-0 p-2 text-muted hover:text-fg"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: [ReactNode, ReactNode] }) {
  return (
    <div className={cn(columns, "items-center gap-y-8 border-b border-line py-10")}>
      <dt className={cn(rowLabel, "col-span-2 lg:col-span-1")}>{label}</dt>
      <dd className="min-w-0">{cells[0]}</dd>
      <dd className="min-w-0">{cells[1]}</dd>
    </div>
  );
}

const BUY_LABEL: Record<Product["status"], string> = {
  available: "Beli ini",
  reserved: "Sedang dipesan",
  sold: "Sudah terjual",
};

function BuyButton({ product, demo, actions }: { product: Product; demo: Demo; actions: Actions }) {
  const purchase = useBuyNow(product.id, demo, actions.showError);
  const status = purchase.conflict ? "reserved" : product.status;
  return (
    <>
      <Button
        size="md"
        className="w-full"
        disabled={status !== "available" || purchase.buying}
        onClick={purchase.buy}
      >
        {purchase.buying ? "Mengunci…" : BUY_LABEL[status]}
      </Button>
      <StockConflictDialog
        open={purchase.conflict}
        productName={product.name}
        similarHref={`/katalog?kategori=${product.category}&tersedia=1`}
        onClose={purchase.closeConflict}
        onSave={() => {
          actions.saveToWishlist(product);
          purchase.closeConflict();
        }}
      />
    </>
  );
}

function ComparisonTable({
  a,
  b,
  demo,
  actions,
}: {
  a: Product;
  b: Product;
  demo: Demo;
  actions: Actions;
}) {
  const cheaper = a.price === b.price ? null : a.price < b.price ? a.id : b.id;
  const labels = [...new Set([...a.measurements, ...b.measurements].map((m) => m.label))];
  const cm = (p: Product, label: string) => {
    const value = p.measurements.find((m) => m.label === label)?.cm;
    return value === undefined ? "—" : `${value} cm`;
  };
  const price = (p: Product) => (
    <span
      className={cn(
        "block rounded-sm px-6 py-4 font-mono text-sm font-medium",
        p.id === cheaper && "bg-success-bg",
      )}
    >
      {formatRupiah(p.price)}
      {p.id === cheaper && <span className="sr-only"> (lebih murah)</span>}
    </span>
  );

  return (
    <>
      <dl className="text-sm">
        <Row label="Harga" cells={[price(a), price(b)]} />
        <Row label="Ukuran label" cells={[a.size, b.size]} />
        {labels.map((label) => (
          <Row key={label} label={label} cells={[cm(a, label), cm(b, label)]} />
        ))}
        <Row label="Kondisi" cells={[a.condition, b.condition]} />
        <Row label="Merek" cells={[a.brand, b.brand]} />
        <Row label="Warna" cells={[a.color, b.color]} />
        <Row
          label="Status"
          cells={[
            <StatusLabel key="a" status={a.status} />,
            <StatusLabel key="b" status={b.status} />,
          ]}
        />
      </dl>
      <div className={cn(columns, "pt-12")}>
        <span className="hidden lg:block" />
        <BuyButton product={a} demo={demo} actions={actions} />
        <BuyButton product={b} demo={demo} actions={actions} />
      </div>
    </>
  );
}

/** B5 Meja Perbandingan: kosong, satu barang, dua barang, tidak sejenis, satu sedang dipesan. */
export function CompareScreen() {
  const demo = useSearchParams().get("demo");
  const router = useRouter();
  const compare = useCompare();
  const actions = useProductActions();
  const result = useAsync(() => listProductsByIds(compare.ids, demo), [compare.ids.join(), demo]);

  const products = (result.data ?? []).filter((p) => compare.ids.includes(p.id));
  const [a, b] = products;
  const mismatch = a && b && a.category !== b.category;
  const unavailable =
    a && b && !mismatch ? [a, b].find((p) => p.status !== "available") : undefined;
  const other = unavailable && (unavailable === a ? b : a);
  const kind = a?.category.toLowerCase() ?? "barang";
  const catalogHref = a ? `/katalog?kategori=${a.category}` : "/katalog";
  const loading = result.status === "loading" && !result.data;

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-48 lg:pt-32 lg:pb-96">
      <PageHeader
        overline="MAKSIMAL DUA BARANG SEJENIS · TIDAK MENGUNCI BARANG"
        title="Meja Perbandingan"
        aside={
          compare.ids.length > 0 && (
            <button type="button" onClick={compare.clear} className={asideLink}>
              Kosongkan meja
            </button>
          )
        }
      />

      {mismatch && (
        <p role="alert" className="rounded-md bg-danger-bg px-16 py-12 text-sm">
          {b.category} tidak bisa dibandingkan dengan {a.category.toLowerCase()}. Ganti salah satu
          supaya sejenis.
        </p>
      )}
      {unavailable && other && (
        <p role="status" className="rounded-md bg-warning-bg px-16 py-12 text-sm">
          {unavailable.name}{" "}
          {unavailable.status === "sold" ? "sudah terjual" : "baru saja dipesan pembeli lain"}.
          {other.status === "available" && ` Kamu masih bisa membeli ${other.name}.`}
        </p>
      )}

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title="Meja gagal dimuat"
          description={result.error.message}
          actions={
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          }
          footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
        />
      ) : loading ? (
        <div className={columns} aria-busy aria-label="Memuat meja">
          <span className="hidden lg:block" />
          <div className="aspect-[8/7] animate-pulse rounded-sm bg-subtle md:aspect-[9/4]" />
          <div className="aspect-[8/7] animate-pulse rounded-sm bg-subtle md:aspect-[9/4]" />
        </div>
      ) : (
        <>
          <div className={columns}>
            <span className="hidden lg:block" />
            {a ? (
              <FilledSlot product={a} onRemove={() => compare.remove(a.id)} />
            ) : (
              <EmptySlot href="/katalog" text="Pilih barang dari katalog" tall />
            )}
            {b ? (
              <FilledSlot
                product={b}
                onRemove={() => compare.remove(b.id)}
                error={mismatch ? `Bukan ${kind}. Ganti dengan ${kind} lain.` : undefined}
              />
            ) : (
              <EmptySlot
                href={catalogHref}
                text={
                  a ? `Tambah satu ${kind} lagi untuk dibandingkan` : "Pilih barang dari katalog"
                }
                tall={!a}
              />
            )}
          </div>

          {!a && (
            <p className="text-caption text-muted">
              Tip: bandingkan dua jaket untuk melihat beda ukuran dalam cm.
            </p>
          )}

          {a && !b && (
            <ButtonLink href={catalogHref} variant="outline" size="md" className="self-start">
              Pilih {kind} dari katalog →
            </ButtonLink>
          )}

          {mismatch && (
            <div className="flex flex-wrap gap-10">
              <Button
                size="md"
                onClick={() => {
                  compare.remove(b.id);
                  router.push(catalogHref);
                }}
              >
                Ganti barang kedua
              </Button>
              <Button variant="outline" size="md" onClick={compare.clear}>
                Kosongkan meja
              </Button>
            </div>
          )}

          {a && b && !mismatch && <ComparisonTable a={a} b={b} demo={demo} actions={actions} />}
        </>
      )}

      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </div>
  );
}
