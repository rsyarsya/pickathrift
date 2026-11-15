import { apiData, ApiError } from "@/lib/api";
import { getToken, onTokenCleared } from "@/lib/auth-token";
import { createStore } from "@/lib/store";
import { authState } from "@/modules/auth/lib/auth-service";
import { fromApiProduct } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";

export type WishlistItem = {
  id: string;
  productId: string;
  product_id: Product | null;
  unavailable: boolean;
  createdAt: string;
};

type WishlistState = {
  sessionKey: string | null;
  items: WishlistItem[];
  status: "idle" | "loading" | "success" | "error";
  error?: ApiError;
};

const INITIAL: WishlistState = { sessionKey: null, items: [], status: "idle" };
export const wishlistState = createStore<WishlistState>(INITIAL);
let queue: Promise<unknown> = Promise.resolve();
let loading: Promise<WishlistItem[]> | null = null;

/** Identitas sesi ikut diperiksa agar respons akun lama tidak masuk ke akun baru. */
export function wishlistSessionKey() {
  const user = authState.get().user;
  const token = getToken();
  return user?.role === "buyer" && token ? `${user.id}:${token}` : null;
}

function reset(sessionKey: string | null) {
  queue = Promise.resolve();
  loading = null;
  wishlistState.set({ ...INITIAL, sessionKey });
}

onTokenCleared(() => reset(null));

function requireSession() {
  const key = wishlistSessionKey();
  if (!key) throw new ApiError(401, "Masuk sebagai Buyer untuk menyimpan wishlist.");
  if (wishlistState.get().sessionKey !== key) reset(key);
  return key;
}

function checkSession(key: string) {
  if (wishlistSessionKey() !== key || wishlistState.get().sessionKey !== key)
    throw new ApiError(401, "Sesi berubah. Masuk kembali untuk melanjutkan.");
}

/** Urutkan baca/tulis supaya GET lama tidak menimpa perubahan yang baru berhasil. */
function enqueue<T>(key: string, work: () => Promise<T>): Promise<T> {
  const result = queue.then(() => {
    checkSession(key);
    return work();
  });
  queue = result.catch(() => undefined);
  return result;
}

function normalize(item: WishlistItem): WishlistItem {
  return { ...item, product_id: item.product_id ? fromApiProduct(item.product_id) : null };
}

async function readItems(key: string) {
  checkSession(key);
  const items = (await apiData<WishlistItem[]>("/api/wishlist")).map(normalize);
  checkSession(key);
  wishlistState.set({ sessionKey: key, items, status: "success" });
  return items;
}

export async function loadWishlist(force = false): Promise<WishlistItem[]> {
  const key = requireSession();
  if (loading) return loading;
  const current = wishlistState.get();
  if (!force && current.status === "success") return current.items;
  wishlistState.set({ ...current, status: "loading", error: undefined });
  const request = enqueue(key, async () => {
    try {
      return await readItems(key);
    } catch (error) {
      if (wishlistSessionKey() === key && wishlistState.get().sessionKey === key) {
        wishlistState.set({
          ...wishlistState.get(),
          status: "error",
          error: error instanceof ApiError ? error : new ApiError(0, "Wishlist gagal dimuat."),
        });
      }
      throw error;
    }
  });
  loading = request;
  try {
    return await request;
  } finally {
    if (loading === request) loading = null;
  }
}

/** Simpan tujuan aksi, sehingga klik ganda dan retry tidak membalikkan hasilnya. */
export async function setWishlistSaved(productId: string, saved: boolean): Promise<void> {
  const key = requireSession();
  await loadWishlist();
  return enqueue(key, async () => {
    const current = wishlistState.get();
    if (current.items.some((item) => item.productId === productId) === saved) return;
    const path = `/api/wishlist/${encodeURIComponent(productId)}`;
    if (saved) {
      let item: WishlistItem;
      try {
        item = normalize(await apiData<WishlistItem>(path, { method: "POST", body: "{}" }));
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        const items = await readItems(key);
        if (!items.some((entry) => entry.productId === productId)) throw error;
        return;
      }
      checkSession(key);
      wishlistState.set({ sessionKey: key, items: [...current.items, item], status: "success" });
    } else {
      try {
        await apiData<{ id: string }>(path, { method: "DELETE" });
      } catch (error) {
        // Sudah dihapus lewat tab lain: tujuan aksi tetap terpenuhi.
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
      }
      checkSession(key);
      wishlistState.set({
        sessionKey: key,
        items: current.items.filter((item) => item.productId !== productId),
        status: "success",
      });
    }
  });
}
