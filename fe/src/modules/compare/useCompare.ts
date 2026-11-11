import { createStore } from "@/lib/store";

/** Meja Perbandingan menampung paling banyak dua barang. */
export const COMPARE_LIMIT = 2;

const store = createStore<string[]>([], "pickathrift.compare");

export type CompareResult = "added" | "exists" | "full";

export function useCompare() {
  const ids = store.use();
  return {
    ids,
    has: (id: string) => ids.includes(id),
    add(id: string): CompareResult {
      const current = store.get();
      if (current.includes(id)) return "exists";
      if (current.length >= COMPARE_LIMIT) return "full";
      store.set([...current, id]);
      return "added";
    },
    remove: (id: string) => store.set(store.get().filter((x) => x !== id)),
    clear: () => store.set([]),
  };
}
