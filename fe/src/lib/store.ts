import { useSyncExternalStore } from "react";

/**
 * State kecil yang dibagi antarlayar (wishlist, meja perbandingan) tanpa pustaka.
 * Dengan `storageKey`, isinya disimpan di localStorage supaya tetap ada setelah refresh.
 */
export function createStore<T>(initial: T, storageKey?: string) {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  // Baca localStorage saat pertama dipakai di browser, bukan saat modul dimuat di server.
  function read(): T {
    if (!loaded && storageKey && typeof window !== "undefined") {
      loaded = true;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) state = JSON.parse(saved) as T;
      } catch {
        // Penyimpanan diblokir atau rusak: mulai dari nilai awal.
      }
    }
    return state;
  }

  return {
    get: read,
    set(next: T) {
      state = next;
      loaded = true;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Tetap jalan di memori kalau localStorage tidak tersedia.
        }
      }
      listeners.forEach((listener) => listener());
    },
    use(): T {
      return useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        read,
        () => initial,
      );
    },
  };
}
