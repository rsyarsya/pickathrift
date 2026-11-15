import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { useCompare } from "@/modules/compare/useCompare";
import type { Product } from "@/modules/catalog/types";
import { useWishlist } from "@/modules/wishlist/useWishlist";

const WISHLIST_LINK = { label: "Lihat wishlist", href: "/wishlist" };
const COMPARE_LINK = { label: "Lihat meja", href: "/meja-perbandingan" };

/** Aksi wishlist dan bandingkan yang sama di katalog dan detail, lengkap dengan toast-nya. */
export function useProductActions() {
  const wishlist = useWishlist();
  const router = useRouter();
  const compare = useCompare();
  const { toast, show, fail, clear } = useToast();

  function requireBuyer() {
    if (wishlist.isLoggedIn) return true;
    const back = window.location.pathname + window.location.search + window.location.hash;
    router.push(`/masuk?kembali=${encodeURIComponent(back)}`);
    return false;
  }

  async function save(productId: string, saved: boolean) {
    if (!requireBuyer()) return;
    try {
      await wishlist.setSaved(productId, saved);
      if (saved) show("✓ Disimpan ke wishlist", WISHLIST_LINK);
      else show("Dihapus dari wishlist");
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Gagal memperbarui wishlist.", () => {
        void save(productId, saved);
      });
    }
  }

  async function remove(ids: string[]) {
    if (!requireBuyer()) return;
    try {
      await wishlist.remove(ids);
      show("Dihapus dari wishlist");
    } catch (error) {
      fail(error instanceof ApiError ? error.message : "Gagal menghapus dari wishlist.", () => {
        void remove(ids);
      });
    }
  }

  return {
    toast,
    clearToast: clear,
    /** X1.7: galat dengan tombol "Coba lagi" kalau `retry` diisi. */
    showError: (message: string, retry?: () => void) => fail(message, retry),
    isSaved: wishlist.has,
    toggleWishlist(product: Product) {
      if (!requireBuyer()) return;
      const saved = !wishlist.has(product.id);
      void save(product.id, saved);
    },
    saveToWishlist(product: Product) {
      void save(product.id, true);
    },
    removeFromWishlist: (ids: string[]) => {
      void remove(ids);
    },
    /** Dipakai tombol "+ Bandingkan" dan drag ke tray, jadi aturannya sama. */
    compare(product: Pick<Product, "id" | "category">) {
      const result = compare.add(product);
      if (result === "added") show("✓ Masuk Meja Perbandingan", COMPARE_LINK);
      if (result === "exists") show("Sudah ada di Meja Perbandingan", COMPARE_LINK);
      if (result === "full") show("Meja penuh. Hapus satu barang dulu, maksimal 2.", COMPARE_LINK);
      if (result === "mismatch")
        show("Hanya bisa membandingkan barang sejenis. Kosongkan meja dulu.", COMPARE_LINK);
    },
  };
}
