import { createStore } from "@/lib/store";

/*
 * Wishlist Buyer. SEMENTARA disimpan di localStorage; begitu backend ada, toggle()
 * memanggil POST/DELETE /wishlist/:id lewat api() dan isi awal diambil dari GET /wishlist.
 */
const store = createStore<string[]>([], "pickathrift.wishlist");

export function useWishlist() {
  const ids = store.use();
  return {
    ids,
    has: (id: string) => ids.includes(id),
    /** `saved`: barang sekarang ada di wishlist. `persisted`: false = hanya di memori. */
    toggle(id: string) {
      const current = store.get();
      const saved = !current.includes(id);
      const persisted = store.set(saved ? [...current, id] : current.filter((x) => x !== id));
      return { saved, persisted };
    },
    remove: (remove: string[]) => store.set(store.get().filter((x) => !remove.includes(x))),
  };
}
