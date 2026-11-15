import { useToast } from "@/hooks/useToast";
import { useCompare } from "@/modules/compare/useCompare";
import type { Product } from "@/modules/catalog/types";
import { useWishlist } from "@/modules/wishlist/useWishlist";

const WISHLIST_LINK = { label: "Lihat wishlist", href: "/wishlist" };
// QA-006: penyimpanan browser penuh/diblokir. Jangan klaim tersimpan permanen.
const TEMPORARY = "Tersimpan sementara. Penyimpanan browser penuh, hilang saat dimuat ulang.";
const COMPARE_LINK = { label: "Lihat meja", href: "/meja-perbandingan" };

/** Aksi wishlist dan bandingkan yang sama di katalog dan detail, lengkap dengan toast-nya. */
export function useProductActions() {
  const wishlist = useWishlist();
  const compare = useCompare();
  const { toast, show, fail, clear } = useToast();

  function toggle(product: Product) {
    const { saved, persisted } = wishlist.toggle(product.id);
    if (!persisted) show(TEMPORARY, WISHLIST_LINK);
    else if (saved) show("✓ Disimpan ke wishlist", WISHLIST_LINK);
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
      const persisted = wishlist.has(product.id) || wishlist.toggle(product.id).persisted;
      show(persisted ? "✓ Disimpan ke wishlist" : TEMPORARY, WISHLIST_LINK);
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
