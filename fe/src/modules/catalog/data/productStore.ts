import type { Product } from "@/modules/catalog/types";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";

/*
 * SEMENTARA: daftar produk yang bisa diubah admin (M1/M2), disimpan di localStorage
 * browser ini. Selama admin belum mengubah apa pun, isinya sama dengan fixtures.
 * Begitu backend ada, katalog membaca GET /products dan admin memakai POST/PATCH.
 */
const KEY = "pickathrift.products";

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return PRODUCTS;
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as Product[]) : PRODUCTS;
  } catch {
    return PRODUCTS;
  }
}

/** Menyimpan seluruh daftar. Melempar galat kalau penyimpanan penuh (foto terlalu besar). */
export function storeProducts(products: Product[]) {
  localStorage.setItem(KEY, JSON.stringify(products));
}

export const isActive = (product: Product) => product.active !== false;
