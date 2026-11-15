import { useSyncExternalStore } from "react";

/**
 * State kecil yang dibagi antarlayar (wishlist, meja perbandingan) tanpa pustaka.
 * Dengan `storageKey`, isinya disimpan di localStorage supaya tetap ada setelah refresh,
 * dan ikut berubah saat tab lain mengubah key yang sama (mis. logout di tab lain).
 */
export function createStore<T>(initial: T, storageKey?: string) {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  // Baca localStorage saat pertama dipakai di browser, bukan saat modul dimuat di server.
  function read(): T {
    if (!loaded && storageKey && typeof window !== "undefined") {
      loaded = true;
      state = initial;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          const parsed: unknown = JSON.parse(saved);
          // Data lama/rusak dengan bentuk lain ({} untuk daftar) dibuang, bukan menjatuhkan layar.
          if (sameShape(parsed, initial)) state = parsed as T;
          else localStorage.removeItem(storageKey);
        }
      } catch {
        // Penyimpanan diblokir atau JSON rusak: mulai dari nilai awal.
      }
    }
    return state;
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    loaded = false;
    notify();
  }

  return {
    get: read,
    /** Mengembalikan false kalau perubahan hanya tersimpan di memori (hilang saat refresh). */
    set(next: T, { requireStorage = false } = {}): boolean {
      let persisted = true;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (error) {
          if (requireStorage) throw error;
          persisted = false;
        }
      }
      state = next;
      loaded = true;
      notify();
      return persisted;
    },
    use(): T {
      return useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          if (storageKey && listeners.size === 1) window.addEventListener("storage", onStorage);
          return () => {
            listeners.delete(listener);
            if (listeners.size === 0) window.removeEventListener("storage", onStorage);
          };
        },
        read,
        () => initial,
      );
    },
  };
}

function sameShape(value: unknown, initial: unknown) {
  if (Array.isArray(initial)) return Array.isArray(value);
  if (initial === null || typeof initial === "object") {
    return value === null || (typeof value === "object" && !Array.isArray(value));
  }
  return typeof value === typeof initial;
}
