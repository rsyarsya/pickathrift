import type { Product } from "@/modules/catalog/types";
import { DEMO_ADDRESS } from "@/modules/profile/data/fixtures";
import { paymentExpiry, type Order } from "@/modules/orders/order";

// SEMENTARA: contoh transfer dan data demo Figma. Gunakan data uji.
export const TRANSFER_ACCOUNT = { bank: "BCA", number: "123 456 7890", holder: "PickaThrift" };
export const REJECTED_PROOF = { name: "bukti-transfer.heic", size: 6_500_000, type: "image/heic" };

export function demoOrder(product: Product, buyerEmail: string, demo: string, now: number): Order {
  return {
    id: "PCT-001",
    demo: true,
    buyerEmail,
    product,
    address: DEMO_ADDRESS,
    createdAt: now,
    expiresAt: paymentExpiry(now),
    status:
      demo === "verifikasi"
        ? "MENUNGGU_VERIFIKASI"
        : demo === "unggah-ulang"
          ? "PERLU_UNGGAH_ULANG"
          : "MENUNGGU_PEMBAYARAN",
    ...(demo === "verifikasi" && {
      proof: { name: "bukti-transfer.jpg", size: 412 * 1024, uploadedAt: now },
    }),
    ...(demo === "unggah-ulang" && {
      adminNote: "Bukti tidak terbaca. Unggah foto yang lebih jelas.",
    }),
  };
}
