const STATUSES = [
  "MENUNGGU_PEMBAYARAN",
  "MENUNGGU_VERIFIKASI",
  "PERLU_UNGGAH_ULANG",
  "DIPROSES",
  "DIKIRIM",
  "SELESAI",
  "DIBATALKAN",
];
const RESERVED_STATUSES = STATUSES.slice(0, 3);
const SHIPPING_FEE = 15000;
const PAYMENT_WINDOW_MS = 6 * 60 * 60 * 1000;

function validPaymentDeadline(createdAt, expiresAt, status) {
  if (
    !(createdAt instanceof Date) ||
    !Number.isFinite(createdAt.getTime()) ||
    !(expiresAt instanceof Date) ||
    !Number.isFinite(expiresAt.getTime())
  )
    return false;
  const duration = expiresAt.getTime() - createdAt.getTime();
  return duration > 0 && (status !== "MENUNGGU_PEMBAYARAN" || duration === PAYMENT_WINDOW_MS);
}

module.exports = {
  STATUSES,
  RESERVED_STATUSES,
  SHIPPING_FEE,
  PAYMENT_WINDOW_MS,
  validPaymentDeadline,
};
