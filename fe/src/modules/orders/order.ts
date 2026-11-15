import type { Product } from "@/modules/catalog/types";
import type { ShippingAddress } from "@/modules/profile/address";

export const PAYMENT_WINDOW_HOURS = 6;
export const SHIPPING_FEE = 15_000;
export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png"];

export type OrderStatus =
  | "MENUNGGU_PEMBAYARAN"
  | "MENUNGGU_VERIFIKASI"
  | "PERLU_UNGGAH_ULANG"
  | "DIPROSES"
  | "DIKIRIM"
  | "SELESAI"
  | "DIBATALKAN";

export type Order = {
  id: string;
  buyerEmail: string;
  product: Product;
  address: ShippingAddress;
  createdAt: number;
  expiresAt: number;
  status: OrderStatus;
  version?: number;
  totalPrice?: number;
  itemPrice?: number;
  shippingFee?: number;
  cancelledAt?: number;
  proof?: {
    id?: string;
    name: string;
    mime?: string;
    size: number;
    uploadedAt: number;
    url?: string;
    unavailable?: boolean;
  };
  adminNote?: string;
  /** Waktu admin menyetujui pembayaran. */
  verifiedAt?: number;
  cancellation?: "expired" | "buyer" | "admin";
  shipment?: { service: string; number: string; shippedAt: number };
  receivedAt?: number;
  review?: { rating: number; body: string; author: string; createdAt: number };
};

export function paymentSeconds(order: Pick<Order, "status" | "expiresAt">, now: number) {
  if (order.status !== "MENUNGGU_PEMBAYARAN") return null;
  return Math.max(0, Math.ceil((order.expiresAt - now) / 1000));
}

export function formatCountdown(seconds: number) {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function validateProof(file: Pick<File, "type" | "size"> | null) {
  if (!file) return "Pilih gambar bukti pembayaran.";
  if (!PROOF_TYPES.includes(file.type) || file.size === 0 || file.size > PROOF_MAX_BYTES) {
    return "Format atau ukuran tidak didukung. Pakai JPG atau PNG, maksimal 2 MB.";
  }
}

export function orderTotal(product: Pick<Product, "price">) {
  return product.price + SHIPPING_FEE;
}

export function orderAmount(order: Pick<Order, "totalPrice" | "product">) {
  return order.totalPrice ?? orderTotal(order.product);
}
