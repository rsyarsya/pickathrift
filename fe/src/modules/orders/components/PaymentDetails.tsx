import type { Order } from "../order";

const channels: Record<string, string> = {
  qris: "QRIS",
  bank_transfer: "Virtual Account",
  echannel: "Mandiri Bill Payment",
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
};
const statuses: Record<string, string> = {
  not_started: "Belum dimulai",
  creating: "Sedang disiapkan",
  ready: "Menunggu pembayaran",
  unknown: "Perlu diperiksa",
  pending: "Menunggu pembayaran",
  settled: "Lunas",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  review_required: "Perlu pemeriksaan Admin",
};
const date = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function PaymentDetails({ order, admin = false }: { order: Order; admin?: boolean }) {
  const payment = order.payment;
  if (payment?.provider !== "midtrans") return null;
  return (
    <section
      aria-label="Pembayaran Midtrans"
      className="grid gap-6 rounded-md border border-line bg-surface p-16 text-caption wrap-anywhere"
    >
      <h2 className="text-body font-medium">Pembayaran · Midtrans</h2>
      <p>
        {payment.channel
          ? (channels[payment.channel] ?? payment.channel)
          : "Virtual Account / QRIS"}{" "}
        · {statuses[payment.status ?? ""] ?? "Periksa status"}
      </p>
      {payment.paidAt && <p>Dikonfirmasi {date.format(payment.paidAt)} WIB</p>}
      {payment.merchantOrderId && (
        <p className="font-mono text-micro text-muted">Referensi {payment.merchantOrderId}</p>
      )}
      {payment.reviewReason && (
        <p role="status" className="text-danger">
          {admin
            ? "Periksa transaksi di dashboard Midtrans sebelum melanjutkan. Pengiriman dinonaktifkan."
            : "Pembayaran ini perlu diperiksa Admin. Jangan melakukan pembayaran lagi."}
        </p>
      )}
      {admin && payment.reviewReason && (
        <p className="font-mono text-micro">{payment.reviewReason}</p>
      )}
    </section>
  );
}
