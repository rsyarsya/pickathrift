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
  const { toast, show, fail, clear } = useToast();

  function toggle(product: Product) {
    if (wishlist.toggle(product.id)) show("✓ Disimpan ke wishlist", WISHLIST_LINK);
    else show("Dihapus dari wishlist");
  }

  return {
    toast,
    clearToast: clear,
    /** X1.7: galat dengan tombol "Coba lagi" kalau `retry` diisi. */
    showError: (message: string, retry?: () => void) => fail(message, retry),
    isSaved: wishlist.has,
    toggleWishlist(product: Product) {
      // SEMENTARA: wishlist belum memanggil server, jadi galatnya hanya bisa dipaksa lewat
      // ?demo=aksi-gagal. Nanti galat dari POST /wishlist memakai jalur yang sama.
      if (new URLSearchParams(window.location.search).get("demo") === "aksi-gagal") {
        fail("Gagal menyimpan ke wishlist.", () => toggle(product));
        return;
      }
      toggle(product);
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
