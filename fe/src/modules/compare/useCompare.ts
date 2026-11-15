import { createStore } from "@/lib/store";
import type { Category } from "@/modules/catalog/types";

/** Meja Perbandingan menampung paling banyak dua barang. */
export const COMPARE_LIMIT = 2;

/** Tipe data drag kartu produk ke tray perbandingan. */
export const COMPARE_DRAG_TYPE = "application/x-pickathrift-product";

/** Kategori ikut disimpan supaya barang beda jenis bisa ditolak tanpa memuat produk. */
type CompareItem = { id: string; category: Category };

const store = createStore<CompareItem[]>([], "pickathrift.compare");

export type CompareResult = "added" | "exists" | "full" | "mismatch";

export function useCompare() {
  // Versi lama menyimpan string[]; abaikan isi yang bentuknya bukan item.
  const items = store.use().filter((item) => typeof item?.id === "string");
  const ids = items.map((item) => item.id);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    add(product: CompareItem): CompareResult {
      if (ids.includes(product.id)) return "exists";
      if (items.length >= COMPARE_LIMIT) return "full";
      if (items[0] && items[0].category !== product.category) return "mismatch";
      store.set([...items, { id: product.id, category: product.category }]);
      return "added";
    },
    remove: (id: string) => store.set(items.filter((x) => x.id !== id)),
    clear: () => store.set([]),
  };
}
