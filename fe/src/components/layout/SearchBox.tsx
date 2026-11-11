"use client";

import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { formatRupiah } from "@/lib/format";
import { listProducts } from "@/modules/catalog/data/products";
import { EMPTY_QUERY } from "@/modules/catalog/query";

const LIMIT = 5;

/**
 * Pencarian di navbar desktop dengan hasil langsung di bawahnya. Enter membuka katalog
 * dengan kata kunci yang sama. Ide dan alur dropdown dari SearchDropdown karya Ola.
 */
export function SearchBox() {
  const [text, setText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Tunggu jeda mengetik supaya tidak memanggil server di setiap huruf.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const result = useAsync(
    () => (keyword ? listProducts({ ...EMPTY_QUERY, q: keyword }, LIMIT) : Promise.resolve(null)),
    [keyword],
  );
  const showPanel = open && keyword !== "";

  return (
    <div ref={root} className="relative hidden lg:block">
      <Form
        action="/katalog"
        role="search"
        onSubmit={() => setOpen(false)}
        className="flex items-center gap-10 rounded-full border border-line bg-surface px-16 py-10 focus-within:border-fg"
      >
        <Icon name="search" className="shrink-0 text-muted" />
        <input
          name="q"
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Cari jaket, kaos, merek…"
          aria-label="Cari barang"
          aria-expanded={showPanel}
          aria-controls="search-results"
          autoComplete="off"
          className="w-150 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </Form>

      {showPanel && (
        <div
          id="search-results"
          aria-live="polite"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-380 rounded-lg border border-line bg-surface p-12 shadow-overlay"
        >
          {result.status === "loading" ? (
            <p className="py-16 text-center text-caption text-muted">Mencari…</p>
          ) : result.status === "error" ? (
            <p role="alert" className="py-16 text-center text-caption text-danger">
              {result.error.message}
            </p>
          ) : !result.data || result.data.total === 0 ? (
            <div className="py-20 text-center">
              <p className="text-body font-medium">Barang tidak ditemukan</p>
              <p className="mt-6 text-caption text-muted">Coba kata kunci lain, ya.</p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col">
                {result.data.items.map((product) => (
                  <li key={product.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/produk/${product.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-12 rounded-sm p-8 hover:bg-canvas"
                    >
                      <Image
                        src={product.images[0]!}
                        alt=""
                        width={112}
                        height={128}
                        className="h-64 w-56 shrink-0 rounded-sm bg-subtle object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block font-mono text-micro tracking-label text-muted uppercase">
                          {product.brand} · {product.size}
                        </span>
                        <span className="mt-2 block font-mono text-caption font-medium">
                          {formatRupiah(product.price)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/katalog?q=${encodeURIComponent(keyword)}`}
                onClick={() => setOpen(false)}
                className="mt-8 block text-center text-caption underline"
              >
                Lihat semua {result.data.total} hasil
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
