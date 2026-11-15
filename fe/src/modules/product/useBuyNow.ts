import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";

/**
 * Tombol "Beli sekarang" menuju checkout. Reservasi stok dilakukan saat membuat
 * pesanan.
 */
export function useBuyNow(
  productId: string,
  onError: (message: string, retry: () => void) => void,
) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);

  async function buy() {
    setBuying(true);
    try {
      router.push(`/checkout/${productId}`);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "Gagal memproses. Coba lagi.", buy);
      setBuying(false);
    }
  }

  return { buy, buying };
}
