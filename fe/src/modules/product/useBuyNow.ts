import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { reserveProduct, type Demo } from "@/modules/catalog/data/products";

/**
 * Tombol "Beli sekarang": cek stok sebelum ke checkout. Kalau server menjawab
 * 409, pembeli lain lebih dulu memesan dan layar menampilkan dialog keduluan (B2.4).
 */
export function useBuyNow(
  productId: string,
  demo: Demo,
  onError: (message: string, retry: () => void) => void,
) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [conflict, setConflict] = useState(false);

  async function buy() {
    setBuying(true);
    try {
      await reserveProduct(productId, demo);
      router.push(`/checkout/${productId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else onError(error instanceof ApiError ? error.message : "Gagal memproses. Coba lagi.", buy);
      setBuying(false);
    }
  }

  return { buy, buying, conflict, closeConflict: () => setConflict(false) };
}
