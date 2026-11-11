import { useToast } from "@/hooks/useToast";
import { useCompare } from "@/modules/compare/useCompare";
import type { Product } from "@/modules/catalog/types";
import { useWishlist } from "@/modules/wishlist/useWishlist";

const WISHLIST_LINK = { label: "Lihat wishlist", href: "/wishlist" };
const COMPARE_LINK = { label: "Lihat meja", href: "/meja-perbandingan" };

/** Aksi wishlist dan bandingkan yang sama di katalog dan detail, lengkap dengan toast-nya. */
export function useProductActions() {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast, show, clear } = useToast();

  return {
    toast,
    clearToast: clear,
    showError: (message: string) => show(message),
    isSaved: wishlist.has,
    toggleWishlist(product: Product) {
      if (wishlist.toggle(product.id)) show("✓ Disimpan ke wishlist", WISHLIST_LINK);
      else show("Dihapus dari wishlist");
    },
    saveToWishlist(product: Product) {
      if (!wishlist.has(product.id)) wishlist.toggle(product.id);
      show("✓ Disimpan ke wishlist", WISHLIST_LINK);
    },
    compare(product: Product) {
      const result = compare.add(product.id);
      if (result === "added") show("✓ Masuk Meja Perbandingan", COMPARE_LINK);
      if (result === "exists") show("Sudah ada di Meja Perbandingan", COMPARE_LINK);
      if (result === "full") show("Meja Perbandingan penuh, maksimal 2 barang", COMPARE_LINK);
    },
  };
}
