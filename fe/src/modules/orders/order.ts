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
  proof?: { name: string; size: number; uploadedAt: number; file?: Blob };
  adminNote?: string;
  cancellation?: "expired" | "buyer" | "admin";
  shipment?: { service: string; number: string; shippedAt: number };
  receivedAt?: number;
  review?: { rating: number; body: string; author: string; createdAt: number };
  demo?: true;
};

export function paymentExpiry(createdAt: number) {
  return createdAt + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000;
}

export function paymentSeconds(order: Pick<Order, "status" | "expiresAt">, now: number) {
  if (order.status !== "MENUNGGU_PEMBAYARAN") return null;
  return Math.max(0, Math.ceil((order.expiresAt - now) / 1000));
}

export function expireOrder(order: Order, now: number): Order {
  return paymentSeconds(order, now) === 0
    ? { ...order, status: "DIBATALKAN", cancellation: "expired" }
    : order;
}

export function buyerOrderAction(
  order: Order,
  action: "upload" | "cancel" | "receive",
  now: number,
) {
  if (action === "receive") return order.status === "DIKIRIM";
  if (paymentSeconds(order, now) === 0) return false;
  return (
    order.status === "MENUNGGU_PEMBAYARAN" ||
    (action === "upload" && order.status === "PERLU_UNGGAH_ULANG")
  );
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

export function applyOrderStock(product: Product, orders: Order[]): Product {
  const active = orders.find(
    (order) => order.product.id === product.id && order.status !== "DIBATALKAN",
  );
  if (!active || product.status === "sold") return product;
  const sold =
    active.status === "DIPROSES" || active.status === "DIKIRIM" || active.status === "SELESAI";
  return { ...product, status: sold ? "sold" : "reserved" };
}
