"use client";

import Image from "next/image";
import { useState, type DragEvent } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { listProductsByIds } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";
import { COMPARE_DRAG_TYPE, COMPARE_LIMIT, useCompare } from "@/modules/compare/useCompare";

type Props = { onAdd: (product: Pick<Product, "id" | "category">) => void };

/**
 * Tray dua slot Meja Perbandingan (DS-005). Desktop: seret foto kartu ke sini.
 * Ponsel/tablet: tray ringkas muncul setelah ada barang, diisi lewat "+ Bandingkan".
 */
export function CompareTray({ onAdd }: Props) {
  const compare = useCompare();
  const [over, setOver] = useState(false);
  const loaded = useAsync(() => listProductsByIds(compare.ids), [compare.ids.join()]);
  const count = compare.ids.length;

  const accepts = (event: DragEvent) => event.dataTransfer.types.includes(COMPARE_DRAG_TYPE);

  function drop(event: DragEvent) {
    setOver(false);
    if (!accepts(event)) return;
    event.preventDefault();
    try {
      onAdd(JSON.parse(event.dataTransfer.getData(COMPARE_DRAG_TYPE)));
    } catch {
      // Data drag rusak atau dari luar halaman: abaikan.
    }
  }

  const hint = over
    ? "Lepas untuk menambahkan"
    : count < COMPARE_LIMIT
      ? "Seret foto barang ke sini"
      : "Siap dibandingkan";

  return (
    <aside
      aria-label="Meja Perbandingan"
      onDragEnter={(e) => accepts(e) && setOver(true)}
      onDragOver={(e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={drop}
      className={cn(
        "fixed inset-x-12 bottom-12 z-30 flex items-center gap-12 rounded-lg border p-10 shadow-[0_8px_32px_rgb(30_30_28/0.16)] transition-colors duration-200 md:inset-x-auto md:right-24 md:bottom-24 md:w-420 md:p-14",
        over ? "border-fg bg-lilac" : "border-line bg-surface",
        count === 0 && "max-lg:hidden",
      )}
    >
      <ul className="flex shrink-0 gap-8">
        {Array.from({ length: COMPARE_LIMIT }, (_, i) => {
          const id = compare.ids[i];
          const product = loaded.data?.find((p) => p.id === id);
          return (
            <li
              key={i}
              className={cn(
                "relative size-48 overflow-hidden rounded-sm md:size-64",
                id ? "bg-subtle" : "border border-dashed border-line-strong",
              )}
            >
              {product && (
                <Image
                  src={product.images[0]!}
                  alt={product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
              {id && (
                <button
                  type="button"
                  onClick={() => compare.remove(id)}
                  aria-label={`Hapus ${product?.name ?? "barang"} dari meja`}
                  className="absolute top-2 right-2 flex rounded-full bg-surface p-2"
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-sm font-medium" aria-live="polite">
          Bandingkan {count}/{COMPARE_LIMIT}
        </p>
        <p className="truncate text-caption text-muted max-lg:hidden">{hint}</p>
      </div>
      <ButtonLink
        href="/meja-perbandingan"
        size="sm"
        variant={count === COMPARE_LIMIT ? "primary" : "outline"}
        className="shrink-0"
      >
        Buka
      </ButtonLink>
    </aside>
  );
}
