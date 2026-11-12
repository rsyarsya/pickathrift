"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { AdminHeader, AdminStatusLabel, updatedLabel } from "@/modules/admin/components/AdminParts";
import { ConfirmDialog } from "@/modules/admin/components/ConfirmDialog";
import {
  adminStatus,
  listAdminProducts,
  setProductActive,
  type AdminProduct,
  type AdminStatus,
} from "@/modules/admin/data/products";

type Filter = "semua" | AdminStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "tersedia", label: "Tersedia" },
  { value: "dipesan", label: "Dipesan" },
  { value: "terjual", label: "Terjual" },
  { value: "nonaktif", label: "Nonaktif" },
];

const STATS: { value: AdminStatus; label: string; color: string }[] = [
  { value: "tersedia", label: "TERSEDIA", color: "text-success" },
  { value: "dipesan", label: "DIPESAN", color: "text-warning" },
  { value: "terjual", label: "TERJUAL", color: "text-sold" },
  { value: "nonaktif", label: "NONAKTIF", color: "text-night-muted" },
];

const headCell = "px-12 py-12 text-left font-mono text-nano font-normal tracking-label text-muted";

function Thumb({ product }: { product: AdminProduct }) {
  return (
    <Image
      src={product.images[0]!}
      alt=""
      width={88}
      height={108}
      className={cn(
        "h-54 w-44 shrink-0 rounded-sm bg-subtle object-cover",
        product.active === false && "opacity-45",
      )}
    />
  );
}

/** Aksi per baris: Edit + Nonaktifkan/Aktifkan, atau Lihat untuk barang terjual. */
function RowActions({
  product,
  onDeactivate,
  onActivate,
}: {
  product: AdminProduct;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const status = adminStatus(product);
  if (status === "terjual") {
    return (
      <Link href={`/produk/${product.id}`} className="text-caption font-medium underline">
        Lihat
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-10 text-caption">
      <Link href={`/admin/produk/${product.id}`} className="font-medium underline">
        Edit
      </Link>
      {status === "nonaktif" ? (
        <button type="button" onClick={onActivate} className="text-success underline">
          Aktifkan
        </button>
      ) : (
        <button
          type="button"
          onClick={onDeactivate}
          disabled={status === "dipesan"}
          title={
            status === "dipesan" ? "Barang sedang dipesan, tidak bisa dinonaktifkan." : undefined
          }
          className="text-danger underline disabled:cursor-not-allowed disabled:opacity-35"
        >
          Nonaktifkan
        </button>
      )}
    </div>
  );
}

/** Menu ⋯ di kartu ponsel. */
function MobileMenu({
  product,
  onDeactivate,
  onActivate,
}: {
  product: AdminProduct;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const status = adminStatus(product);
  const item = "block w-full px-14 py-10 text-left text-sm hover:bg-canvas";
  return (
    <details className="relative">
      <summary
        aria-label={`Aksi untuk ${product.name}`}
        className="flex size-32 list-none items-center justify-center rounded-full text-muted hover:bg-canvas [&::-webkit-details-marker]:hidden"
      >
        <Icon name="more" size={20} strokeWidth={2.4} />
      </summary>
      <div className="absolute top-full right-0 z-10 mt-4 w-160 overflow-hidden rounded-md border border-line bg-surface py-4 shadow-overlay">
        {status === "terjual" ? (
          <Link href={`/produk/${product.id}`} className={item}>
            Lihat di toko
          </Link>
        ) : (
          <>
            <Link href={`/admin/produk/${product.id}`} className={item}>
              Edit
            </Link>
            {status === "nonaktif" ? (
              <button type="button" onClick={onActivate} className={cn(item, "text-success")}>
                Aktifkan
              </button>
            ) : (
              <button
                type="button"
                onClick={onDeactivate}
                disabled={status === "dipesan"}
                className={cn(item, "text-danger disabled:opacity-35")}
              >
                Nonaktifkan
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}

/** M1 Kelola produk: daftar, cari dan filter, memuat, belum ada produk, konfirmasi nonaktifkan. */
export function ProductListScreen() {
  const demo = useSearchParams().get("demo");
  const result = useAsync(() => listAdminProducts(demo), [demo]);
  const { toast, show, fail, clear } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [target, setTarget] = useState<AdminProduct | null>(null);
  const [busy, setBusy] = useState(false);

  const all = result.data ?? [];
  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f.value,
      f.value === "semua" ? all.length : all.filter((p) => adminStatus(p) === f.value).length,
    ]),
  ) as Record<Filter, number>;
  const keyword = query.trim().toLowerCase();
  const visible = all.filter(
    (p) =>
      (filter === "semua" || adminStatus(p) === filter) &&
      (!keyword || `${p.name} ${p.brand}`.toLowerCase().includes(keyword)),
  );

  async function changeActive(product: AdminProduct, active: boolean) {
    setBusy(true);
    try {
      await setProductActive(product.id, active);
      show(active ? `✓ ${product.name} aktif lagi di katalog` : `✓ ${product.name} dinonaktifkan`);
      setTarget(null);
      result.reload();
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Gagal menyimpan.", () =>
        changeActive(product, active),
      );
    } finally {
      setBusy(false);
    }
  }

  const loading = result.status === "loading" && !result.data;
  const empty = result.status === "success" && all.length === 0;

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-40 lg:pt-32">
      <AdminHeader
        overline={loading ? "MEMUAT…" : `${all.length} PRODUK · SATU UNIT PER BARANG`}
        title="Kelola produk"
        actions={
          <ButtonLink href="/admin/produk/baru" size="sm" className="max-sm:w-full">
            + Tambah produk
          </ButtonLink>
        }
      />

      {!empty && result.status !== "error" && (
        <dl className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.value} className="flex flex-col gap-4 rounded-md bg-surface px-16 py-14">
              <dt className={cn("font-mono text-nano tracking-[0.08em]", stat.color)}>
                {stat.label}
              </dt>
              <dd className="text-[26px] font-medium tracking-[-0.03em]">
                {loading ? "…" : counts[stat.value]}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-10 md:flex-row md:items-center">
        <label className="flex items-center gap-8 rounded-full border border-line bg-surface px-14 py-10 focus-within:border-fg md:w-320">
          <Icon name="search" className="shrink-0 text-muted" />
          <span className="sr-only">Cari produk</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau merek…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-disabled-fg"
          />
        </label>
        <div
          className="-mx-16 flex gap-6 overflow-x-auto px-16 md:mx-0 md:px-0"
          role="group"
          aria-label="Filter status"
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
                {loading ? "" : counts[f.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {result.status === "error" ? (
        <div className="rounded-[12px] bg-surface">
          <StatusMessage
            tone="error"
            title="Produk gagal dimuat"
            description={result.error.message}
            actions={
              <Button size="md" onClick={result.reload}>
                Coba lagi
              </Button>
            }
            footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
          />
        </div>
      ) : empty ? (
        <div className="rounded-[12px] bg-surface">
          <StatusMessage
            tone="empty"
            icon={<Icon name="box" size={22} />}
            title="Belum ada produk"
            description="Tambah barang pertama. Setiap barang otomatis berstok satu dan berstatus Tersedia."
            actions={
              <ButtonLink href="/admin/produk/baru" size="md">
                + Tambah produk pertama
              </ButtonLink>
            }
          />
        </div>
      ) : !loading && visible.length === 0 ? (
        <div className="rounded-[12px] bg-surface">
          <StatusMessage
            tone="empty"
            title="Tidak ada produk yang cocok"
            description="Coba kata kunci lain atau pilih status Semua."
            actions={
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setQuery("");
                  setFilter("semua");
                }}
              >
                Hapus pencarian
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Tabel untuk tablet dan desktop. */}
          <div className="hidden overflow-hidden rounded-[12px] bg-surface md:block">
            <table className="w-full border-collapse" aria-busy={loading}>
              <thead className="bg-[#faf9f6]">
                <tr>
                  <th className={cn(headCell, "w-72")}>
                    <span className="sr-only">Foto</span>
                  </th>
                  <th className={headCell}>BARANG</th>
                  <th className={cn(headCell, "hidden lg:table-cell")}>KATEGORI</th>
                  <th className={cn(headCell, "hidden lg:table-cell")}>UKURAN</th>
                  <th className={headCell}>HARGA</th>
                  <th className={headCell}>STATUS</th>
                  <th className={cn(headCell, "hidden lg:table-cell")}>DIPERBARUI</th>
                  <th className={headCell}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} className="border-t border-[#efede8]">
                        <td colSpan={8} className="px-12 py-10">
                          <div className="flex animate-pulse items-center gap-16">
                            <div className="h-54 w-44 rounded-sm bg-subtle" />
                            <div className="h-12 w-1/3 rounded-full bg-subtle" />
                            <div className="ml-auto h-12 w-1/5 rounded-full bg-subtle" />
                          </div>
                        </td>
                      </tr>
                    ))
                  : visible.map((product) => (
                      <tr key={product.id} className="border-t border-[#efede8]">
                        <td className="px-12 py-10">
                          <Thumb product={product} />
                        </td>
                        <td className="px-12 py-10">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="font-mono text-nano tracking-[0.05em] text-muted uppercase">
                            {product.brand}
                            <span className="lg:hidden"> · {product.size}</span>
                          </p>
                        </td>
                        <td className="hidden px-12 py-10 text-sm lg:table-cell">
                          {product.category}
                        </td>
                        <td className="hidden px-12 py-10 font-mono text-caption font-medium lg:table-cell">
                          {product.size}
                        </td>
                        <td className="px-12 py-10 font-mono text-caption font-medium whitespace-nowrap">
                          {formatRupiah(product.price)}
                        </td>
                        <td className="px-12 py-10">
                          <AdminStatusLabel product={product} />
                        </td>
                        <td className="hidden px-12 py-10 text-caption text-muted lg:table-cell">
                          {updatedLabel(product.updatedAt ?? product.createdAt)}
                        </td>
                        <td className="px-12 py-10">
                          <RowActions
                            product={product}
                            onDeactivate={() => setTarget(product)}
                            onActivate={() => changeActive(product, true)}
                          />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Kartu untuk ponsel. */}
          <ul className="flex flex-col gap-10 md:hidden" aria-busy={loading}>
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="h-84 animate-pulse rounded-[12px] bg-surface" />
                ))
              : visible.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-12 rounded-[12px] bg-surface p-12"
                  >
                    <Thumb product={product} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">{product.name}</p>
                      <p className="truncate font-mono text-nano tracking-[0.05em] text-muted uppercase">
                        {product.brand} · {product.size} · {product.category}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-2">
                        <span className="font-mono text-caption font-medium">
                          {formatRupiah(product.price)}
                        </span>
                        <AdminStatusLabel product={product} className="text-caption" />
                      </div>
                    </div>
                    <MobileMenu
                      product={product}
                      onDeactivate={() => setTarget(product)}
                      onActivate={() => changeActive(product, true)}
                    />
                  </li>
                ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={`Nonaktifkan ${target?.name ?? "produk"}?`}
        confirmLabel="Nonaktifkan"
        busy={busy}
        onConfirm={() => target && changeActive(target, false)}
        onClose={() => !busy && setTarget(null)}
      >
        Barang hilang dari katalog dan tidak bisa dibeli. Data dan riwayat pesanannya tetap
        tersimpan, bisa diaktifkan lagi kapan saja.
      </ConfirmDialog>

      <Toast toast={toast} onDone={clear} />
    </div>
  );
}
