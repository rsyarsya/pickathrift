"use client";

import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { ProductCard, ProductCardSkeleton } from "@/modules/catalog/components/ProductCard";
import { findMatches, type Demo } from "@/modules/catalog/data/products";
import { useProductActions } from "@/modules/catalog/useProductActions";
import {
  TOLERANCE_CM,
  criteriaChips,
  criteriaToParams,
  type Criteria,
  type Match,
} from "@/modules/match/criteria";

const grid = "grid grid-cols-2 gap-x-12 gap-y-24 md:grid-cols-3 md:gap-x-24 lg:gap-x-32";

function fitNote(match: Match, index: number) {
  if (match.diffCm === undefined) return null;
  const parts = [`Selisih ${match.diffCm} cm`];
  if (index === 0) parts.push("paling pas");
  if (match.product.status === "reserved") parts.push("sedang dipesan");
  return <p className="text-caption text-success">{parts.join(" · ")}</p>;
}

/** B4.4 Hasil dan B4.5 Hasil kosong. */
export function MatchResults({ criteria, demo }: { criteria: Criteria; demo: Demo }) {
  const actions = useProductActions();
  const key = criteriaToParams(criteria).toString();
  const result = useAsync(() => findMatches(criteria, demo), [key, demo]);
  const editHref = `/cari-yang-cocok?${key}`;
  const hasBody = Object.keys(criteria.body).length > 0;
  const matches = result.data ?? [];

  const overline =
    result.status === "loading"
      ? "MEMUAT…"
      : result.status === "error"
        ? "—"
        : `${matches.length} BARANG COCOK${hasBody ? ` · TOLERANSI ${TOLERANCE_CM} CM` : ""}`;

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-48 lg:pt-32 lg:pb-96">
      <PageHeader
        overline={overline}
        title="Hasil Cari yang Cocok"
        aside={
          <Link href={editHref} className={asideLink}>
            Ubah kriteria
          </Link>
        }
      />

      <ul className="flex flex-wrap gap-8" aria-label="Kriteria">
        {criteriaChips(criteria).map((chip) => (
          <li key={chip} className="rounded-full bg-mint px-14 py-7 text-caption font-medium">
            {chip}
          </li>
        ))}
      </ul>
      <Link href={editHref} className="self-start text-sm underline md:hidden">
        Ubah kriteria
      </Link>

      {result.status === "error" ? (
        <StatusMessage
          tone="error"
          title="Pencarian gagal"
          description={result.error.message}
          actions={
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          }
          footnote={`KODE GALAT · ${result.error.status || "JARINGAN"}`}
        />
      ) : result.status === "loading" ? (
        <ul className={grid}>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      ) : matches.length === 0 ? (
        <StatusMessage
          tone="empty"
          title={hasBody ? `Belum ada yang pas dalam ${TOLERANCE_CM} cm` : "Belum ada yang cocok"}
          description="Coba naikkan budget, kosongkan salah satu ukuran, atau pilih gaya lain."
          actions={
            <>
              <ButtonLink href={editHref} size="md">
                Ubah kriteria
              </ButtonLink>
              <ButtonLink
                href={criteria.category ? `/katalog?kategori=${criteria.category}` : "/katalog"}
                variant="outline"
                size="md"
              >
                Lihat semua {criteria.category?.toLowerCase() ?? "barang"}
              </ButtonLink>
            </>
          }
        />
      ) : (
        <>
          {hasBody && (
            <p className="font-mono text-micro tracking-label text-muted">
              DIURUTKAN DARI SELISIH UKURAN TERKECIL
            </p>
          )}
          <ul className={grid}>
            {matches.map((match, i) => (
              <li key={match.product.id}>
                <ProductCard
                  product={match.product}
                  priority={i < 3}
                  saved={actions.isSaved(match.product.id)}
                  onToggleWishlist={() => actions.toggleWishlist(match.product)}
                  onCompare={() => actions.compare(match.product)}
                  footer={fitNote(match, i) ?? undefined}
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
