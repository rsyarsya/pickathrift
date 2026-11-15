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
