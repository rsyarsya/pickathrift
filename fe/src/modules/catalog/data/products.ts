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
import { applyOrderStock } from "@/modules/orders/order";
import { withOrders } from "@/modules/orders/data/orderStore";

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

function delay<T>(value: () => T | Promise<T>, ms = LATENCY): Promise<T> {
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

function readProducts() {
  if (typeof indexedDB === "undefined") return Promise.resolve(PRODUCTS);
  return withOrders((orders) => PRODUCTS.map((product) => applyOrderStock(product, orders)));
}

export function listProducts(
  query: CatalogQuery,
  limit: number,
  demo: Demo = null,
): Promise<CatalogPage> {
  if (demo === "memuat") return new Promise(() => {});

  return delay(async () => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    const matches = demo === "kosong" ? [] : applyQuery(await readProducts(), query);
    const counts = { Semua: PRODUCTS.length } as CatalogPage["counts"];
    for (const c of CATEGORIES) counts[c] = PRODUCTS.filter((p) => p.category === c).length;
    return { items: matches.slice(0, limit), total: matches.length, counts };
  });
}

export function getProduct(id: string, { includeOrderStock = true } = {}): Promise<Product> {
  return delay(async () => {
    const products = includeOrderStock ? await readProducts() : PRODUCTS;
    const product = products.find((p) => p.id === id);
    if (!product) throw new ApiError(404, "Barang ini tidak ada atau sudah dihapus.");
    return product;
  });
}

/** Cek stok sebelum checkout. Pesanan yang berhasil dibuat akan mengunci barang. */
export function reserveProduct(id: string, demo: Demo = null): Promise<void> {
  return getProduct(id).then((product) => {
    if (demo === "konflik" || product.status !== "available")
      throw new ApiError(409, "Stok sudah dipesan.");
  });
}

/** Barang untuk wishlist dan meja perbandingan, urut sesuai `ids`. Yang sudah dihapus dilewati. */
export function listProductsByIds(ids: string[], demo: Demo = null): Promise<Product[]> {
  return delay(async () => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    const products = await readProducts();
    return ids.flatMap((id) => products.find((p) => p.id === id) ?? []);
  });
}

/** Cari yang Cocok (B4). */
export function findMatches(criteria: Criteria, demo: Demo = null): Promise<Match[]> {
  return delay(async () => {
    if (demo === "gagal") {
      throw new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");
    }
    return demo === "kosong" ? [] : matchProducts(await readProducts(), criteria);
  });
}
