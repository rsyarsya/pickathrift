import { ApiError } from "@/lib/api";
import { applyQuery } from "@/modules/catalog/query";
import {
  CATEGORIES,
  type CatalogPage,
  type CatalogQuery,
  type Product,
} from "@/modules/catalog/types";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";
import { matchProducts, type Criteria, type Match } from "@/modules/match/criteria";

/*
 * Satu-satunya pintu layar ke data produk. Sekarang membaca fixtures; nanti tiap
 * fungsi cukup diganti satu panggilan api(), misalnya
 *   listProducts → api<CatalogPage>(`/products?${toSearchParams(query)}&limit=${limit}`)
 * tanpa menyentuh komponen.
 *
 * `demo` memaksa state yang sulit dipicu tanpa backend (?demo=gagal di URL).
 * Hilang bersama fixtures.
 */

export type Demo = string | null;

const LATENCY = 450;

function delay<T>(value: () => T, ms = LATENCY): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value());
      } catch (error) {
        reject(error);
      }
    }, ms),
  );
}

export function listProducts(
  query: CatalogQuery,
  limit: number,
  demo: Demo = null,
): Promise<CatalogPage> {
  if (demo === "memuat") return new Promise(() => {});

  return delay(() => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    const matches = demo === "kosong" ? [] : applyQuery(PRODUCTS, query);
    const counts = { Semua: PRODUCTS.length } as CatalogPage["counts"];
    for (const c of CATEGORIES) counts[c] = PRODUCTS.filter((p) => p.category === c).length;
    return { items: matches.slice(0, limit), total: matches.length, counts };
  });
}

export function getProduct(id: string): Promise<Product> {
  return delay(() => {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) throw new ApiError(404, "Barang ini tidak ada atau sudah dihapus.");
    return product;
  });
}

/** Mengunci barang untuk checkout. 409 berarti pembeli lain lebih dulu memesannya. */
export function reserveProduct(id: string, demo: Demo = null): Promise<void> {
  return delay(() => {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) throw new ApiError(404, "Barang ini tidak ada atau sudah dihapus.");
    if (demo === "konflik" || product.status !== "available") {
      throw new ApiError(409, "Stok sudah dipesan.");
    }
  });
}

/** Barang untuk wishlist dan meja perbandingan, urut sesuai `ids`. Yang sudah dihapus dilewati. */
export function listProductsByIds(ids: string[], demo: Demo = null): Promise<Product[]> {
  return delay(() => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    return ids.flatMap((id) => PRODUCTS.find((p) => p.id === id) ?? []);
  });
}

/** Cari yang Cocok (B4). */
export function findMatches(criteria: Criteria, demo: Demo = null): Promise<Match[]> {
  return delay(() => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    return demo === "kosong" ? [] : matchProducts(PRODUCTS, criteria);
  });
}
