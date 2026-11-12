import { ApiError } from "@/lib/api";
import type { Order, OrderStatus } from "@/modules/orders/order";

/*
 * Aksi admin pada pesanan (M3), sesuai docs/aturan-pesanan.md:
 *   MENUNGGU_VERIFIKASI → terima (DIPROSES) | minta unggah ulang | tolak (DIBATALKAN)
 *   PERLU_UNGGAH_ULANG  → terima | tolak
 *   DIPROSES            → simpan resi (DIKIRIM)
 * Pesanan yang sudah Diproses tidak bisa dibatalkan. Transisi lain ditolak dengan 409.
 */

export type AdminOrderAction =
  | { type: "approve" }
  | { type: "reupload"; note: string }
  | { type: "reject"; note: string }
  | { type: "ship"; service: string; number: string };

export const COURIERS = ["JNE REG", "J&T EZ", "SiCepat REG", "POS Kilat"];

export const REJECT_REASONS = ["Nominal tidak sesuai total", "Tidak ada dana masuk", "Alasan lain"];
export const REUPLOAD_REASONS = [
  "Bukti tidak terbaca atau buram",
  "Nominal atau rekening tidak terlihat",
  "Alasan lain",
];

const allowed: Record<AdminOrderAction["type"], OrderStatus[]> = {
  approve: ["MENUNGGU_VERIFIKASI", "PERLU_UNGGAH_ULANG"],
  reupload: ["MENUNGGU_VERIFIKASI"],
  reject: ["MENUNGGU_VERIFIKASI", "PERLU_UNGGAH_ULANG"],
  ship: ["DIPROSES"],
};

export function canAdmin(order: Pick<Order, "status">, type: AdminOrderAction["type"]) {
  return allowed[type].includes(order.status);
}

/** Validasi nomor resi. null = boleh disimpan. */
export function trackingError(number: string): string | null {
  const value = number.trim();
  if (!value) return "Nomor resi wajib diisi sebelum menandai Dikirim.";
  if (!/^[A-Za-z0-9 -]{8,30}$/.test(value)) return "Nomor resi 8–30 karakter, huruf dan angka.";
  return null;
}

export function applyAdminAction(order: Order, action: AdminOrderAction, now: number): Order {
  if (!canAdmin(order, action.type)) {
    throw new ApiError(
      409,
      "Status pesanan sudah berubah. Muat ulang untuk melihat status terbaru.",
    );
  }
  switch (action.type) {
    case "approve":
      return { ...order, status: "DIPROSES", verifiedAt: now };
    case "reupload":
      return { ...order, status: "PERLU_UNGGAH_ULANG", adminNote: action.note };
    case "reject":
      return { ...order, status: "DIBATALKAN", cancellation: "admin", adminNote: action.note };
    case "ship": {
      const problem = trackingError(action.number);
      if (problem) throw new ApiError(422, problem);
      return {
        ...order,
        status: "DIKIRIM",
        shipment: { service: action.service, number: action.number.trim(), shippedAt: now },
      };
    }
  }
}
