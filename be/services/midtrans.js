const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/products");
const { ApiError } = require("../lib/errors");
const { createSnap, snapPayload, REQUEST_TIMEOUT_MS } = require("../lib/midtrans-client");

const unknown = () =>
  new ApiError(
    503,
    "PAYMENT_STATUS_UNKNOWN",
    "Status pembayaran sedang diperiksa. Jangan membuat pesanan baru.",
  );

function sessionData(order) {
  return {
    provider: "midtrans",
    status: order.payment.status,
    merchantOrderId: order.payment.merchantOrderId,
    redirectUrl: order.payment.redirectUrl,
    expiresAt: order.expiresAt,
    sessionExpiresAt: order.payment.sessionExpiresAt,
  };
}

async function paymentSession(id, account, config) {
  // Transaksi hanya mengklaim sesi. Tidak ada network call di callback yang bisa diulang MongoDB.
  const claimed = await mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== String(account._id))
      throw new ApiError(403, "FORBIDDEN", "Pesanan bukan milik Anda.");
    if (!config.midtrans?.enabled)
      throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Pembayaran Midtrans belum tersedia.");
    if (!order.payment)
      throw new ApiError(409, "PAYMENT_METHOD_CONFLICT", "Pesanan ini memakai pembayaran manual.");
    if (order.status !== "MENUNGGU_PEMBAYARAN")
      throw new ApiError(409, "INVALID_TRANSITION", "Pesanan tidak menerima pembayaran.");
    const ownsStock = await Product.exists({
      _id: order.product_id,
      status: "reserved",
      reservation_order_id: order._id,
    }).session(session);
    if (!ownsStock) throw new ApiError(409, "STOCK_CONFLICT", "Kunci barang sudah berubah.");
    const now = new Date();
    if (order.payment.status === "creating") {
      if (now - order.payment.requestedAt < REQUEST_TIMEOUT_MS + 5000)
        throw new ApiError(
          409,
          "PAYMENT_IN_PROGRESS",
          "Pembayaran sedang disiapkan. Coba periksa kembali.",
        );
      // Proses sebelumnya mungkin terhenti setelah request dikirim. Jangan mengambil alih dan mengirim ulang.
      order.payment.status = "unknown";
      await order.save({ session });
      return { uncertain: true };
    }
    if (order.payment.status === "unknown") return { uncertain: true };
    if (order.expiresAt <= now)
      throw new ApiError(409, "PAYMENT_EXPIRED", "Batas pembayaran sudah habis.");
    if (order.payment.status === "ready") {
      if (order.payment.sessionExpiresAt <= now)
        throw new ApiError(
          409,
          "PAYMENT_SESSION_EXPIRED",
          "Sesi pembayaran sudah berakhir. Periksa status pesanan.",
        );
      return { created: false, order };
    }
    const pageMinutes = Math.floor((order.expiresAt - now - REQUEST_TIMEOUT_MS) / 60000);
    if (pageMinutes < 1)
      throw new ApiError(
        409,
        "PAYMENT_WINDOW_TOO_SHORT",
        "Waktu pembayaran tersisa terlalu singkat untuk membuka sesi baru.",
      );
    order.payment.status = "creating";
    order.payment.requestedAt = now;
    order.payment.sessionExpiresAt = new Date(now.getTime() + pageMinutes * 60000);
    await order.save({ session });
    return { created: true, order, pageMinutes };
  });
  if (claimed.uncertain) throw unknown();
  if (!claimed.created) return { created: false, data: sessionData(claimed.order) };

  const order = claimed.order;
  const filter = {
    _id: order._id,
    status: "MENUNGGU_PEMBAYARAN",
    "payment.merchantOrderId": order.payment.merchantOrderId,
    "payment.requestedAt": order.payment.requestedAt,
    "payment.status": { $in: ["creating", "unknown"] },
  };
  try {
    const payload = snapPayload(order, account, config.midtrans.frontendUrl, claimed.pageMinutes);
    const result = await createSnap(config.midtrans, payload);
    const stored = await Order.findOneAndUpdate(
      filter,
      {
        $set: {
          "payment.status": "ready",
          "payment.snapToken": result.snapToken,
          "payment.redirectUrl": result.redirectUrl,
        },
        $inc: { __v: 1 },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!stored) throw unknown();
    return { created: true, data: sessionData(stored) };
  } catch {
    // Termasuk gagal menyimpan respons sukses: jangan mengembalikan URL yang belum tersimpan.
    // Jika DB juga terputus, state creating tetap menghalangi pembuatan sesi kedua setelah restart.
    try {
      await Order.updateOne(
        { ...filter, "payment.status": "creating" },
        {
          $set: { "payment.status": "unknown" },
          $inc: { __v: 1 },
        },
      );
    } catch {
      /* Rekonsiliasi berikutnya menangani creating yang terhenti. */
    }
    throw unknown();
  }
}

module.exports = { paymentSession };
