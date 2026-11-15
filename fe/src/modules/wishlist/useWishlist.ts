import { useCallback, useEffect } from "react";
import { useSession } from "@/modules/auth/useSession";
import { loadWishlist, setWishlistSaved, wishlistSessionKey, wishlistState } from "./data/wishlist";

/** Wishlist berasal dari API; cache memori hanya berlaku untuk sesi Buyer saat ini. */
export function useWishlist() {
  const { user } = useSession();
  const state = wishlistState.use();
  const key = user ? wishlistSessionKey() : null;
  const current = key !== null && state.sessionKey === key;
  const items = current ? state.items : [];
  const reload = useCallback(() => {
    void loadWishlist(true).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("pickathrift.wishlist");
    } catch {
      // Wishlist API tetap berfungsi ketika penyimpanan browser diblokir.
    }
    if (key) void loadWishlist().catch(() => {});
  }, [key]);

  return {
    items,
    ids: items.map((item) => item.productId),
    isLoggedIn: key !== null,
    status: !key ? "success" : current ? state.status : "loading",
    error: current ? state.error : undefined,
    has: (id: string) => items.some((item) => item.productId === id),
    setSaved: setWishlistSaved,
    remove: (ids: string[]) => Promise.all(ids.map((id) => setWishlistSaved(id, false))),
    reload,
  };
}
