const { createHash, timingSafeEqual, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/products");
const { ApiError } = require("../lib/errors");
const client = require("../lib/midtrans-client");
const { release } = require("./orders");

const uncertain = () =>
  new ApiError(
    503,
    "PAYMENT_STATUS_UNKNOWN",
    "Status pembayaran sedang diperiksa. Stok tetap dipesan; coba periksa kembali.",
  );
const amountMatches = (value, total) =>
  typeof value === "string" &&
  /^\d+(?:\.00)?$/.test(value) &&
  BigInt(value.split(".")[0]) === BigInt(total);
const providerDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)) return null;
  const date = new Date(value.replace(" ", "T") + "+07:00");
  return Number.isFinite(date.getTime()) ? date : null;
};

function verifyNotification(body, key) {
  if (
    typeof body.order_id !== "string" ||
    !/^picka-[a-f0-9]{24}$/.test(body.order_id) ||
    typeof body.status_code !== "string" ||
    !/^\d{3}$/.test(body.status_code) ||
    typeof body.gross_amount !== "string" ||
    !/^\d{1,16}(?:\.00)?$/.test(body.gross_amount) ||
    typeof body.signature_key !== "string" ||
    !/^[a-f0-9]{128}$/i.test(body.signature_key)
  )
    throw new ApiError(422, "INVALID_NOTIFICATION", "Format notifikasi tidak valid.");
  const expected = createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + key)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(body.signature_key, "hex")))
    throw new ApiError(403, "INVALID_SIGNATURE", "Signature notifikasi tidak valid.");
}

function snapshotIssue(data, order) {
  if (
    !data ||
    data.order_id !== order.payment.merchantOrderId ||
    !amountMatches(data.gross_amount, order.total_price) ||
    (data.currency !== undefined && data.currency !== "IDR")
  )
    return "PAYMENT_MISMATCH";
  if (
    !["bank_transfer", "echannel", "qris"].includes(data.payment_type) ||
    (data.fraud_status !== undefined && data.fraud_status !== "accept")
  )
    return "UNSUPPORTED_PAYMENT";
  if (
    typeof data.transaction_id !== "string" ||
    !data.transaction_id ||
    data.transaction_id.length > 100 ||
    !["settlement", "pending", "deny", "failure", "cancel", "expire"].includes(
      data.transaction_status,
    )
  )
    return "UNEXPECTED_STATUS";
  return null;
}

// Lease di DB berlaku lintas instance. Network selalu di luar transaksi MongoDB.
async function claim(id, mode, now) {
  const filter = {
    _id: id,
    payment: { $ne: null },
    $nor: [
      {
        "payment.status": "creating",
        "payment.requestedAt": { $gt: new Date(now.getTime() - client.REQUEST_TIMEOUT_MS - 5000) },
      },
    ],
    $or: [{ "payment.syncUntil": null }, { "payment.syncUntil": { $lte: now } }],
  };
  if (["sync", "expire"].includes(mode))
    filter.$and = [
      { $or: [{ "payment.nextSyncAt": null }, { "payment.nextSyncAt": { $lte: now } }] },
    ];
  const token = randomUUID();
  const order = await Order.findOneAndUpdate(
    filter,
    {
      $set: {
        "payment.syncToken": token,
        "payment.syncUntil": new Date(now.getTime() + 90000),
        "payment.nextSyncAt": new Date(now.getTime() + 5000),
      },
    },
    { returnDocument: "after", timestamps: false },
  );
  if (!order) {
    const current = await Order.findById(id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (!current.payment)
      throw new ApiError(409, "PAYMENT_METHOD_CONFLICT", "Pesanan memakai pembayaran manual.");
    if (
      current.payment.status === "creating" &&
      now - current.payment.requestedAt < client.REQUEST_TIMEOUT_MS + 5000
    )
      throw new ApiError(
        mode === "notification" ? 503 : 409,
        "PAYMENT_IN_PROGRESS",
        "Pembayaran sedang disiapkan.",
      );
    if (current.payment.syncUntil > now)
      throw new ApiError(
        mode === "notification" ? 503 : 409,
        "PAYMENT_SYNC_IN_PROGRESS",
        "Pemeriksaan pembayaran sedang berjalan.",
      );
    throw new ApiError(
      429,
      "PAYMENT_SYNC_THROTTLED",
      "Tunggu lima detik sebelum memeriksa kembali.",
    );
  }
  return { order, token };
}

async function apply(id, token, data, { closed = false, reason, reviewReason, now }) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findOne({
      _id: id,
      "payment.syncToken": token,
      "payment.syncUntil": { $gt: new Date() },
    }).session(session);
    if (!order) throw uncertain();
    const payment = order.payment;
    const before = JSON.stringify({
      status: order.status,
      payment: payment.toObject(),
      verifiedAt: order.verifiedAt,
    });
    const review = (reason) => {
      payment.reviewReason = reason;
      if (payment.status !== "settled") payment.status = "review_required";
    };
    const issue = data ? snapshotIssue(data, order) : null;
    if (reviewReason || issue) review(reviewReason ?? issue);
    else if (!payment.reviewReason) {
      // Hasil berhasil monotonik: pembacaan pending/cancel yang terlambat tidak menurunkannya.
      if (payment.status !== "settled") {
        if (data) {
          payment.providerStatus = data.transaction_status;
          payment.transactionId = data.transaction_id;
          const bank = data.va_numbers?.[0]?.bank;
          payment.channel =
            data.payment_type === "bank_transfer" && ["bca", "bni", "bri", "permata"].includes(bank)
              ? `${bank}_va`
              : data.payment_type;
          payment.providerExpiresAt = providerDate(data.expiry_time);
        }
        if (data?.transaction_status === "settlement") {
          payment.paidAt = providerDate(data.settlement_time) ?? now;
          if (order.status === "DIBATALKAN") review("LATE_SETTLEMENT");
          else {
            const stock = await Product.updateOne(
              { _id: order.product_id, status: "reserved", reservation_order_id: order._id },
              { $set: { status: "sold", reservation_order_id: null }, $inc: { __v: 1 } },
              { session },
            );
            if (!stock.matchedCount) review("STOCK_CONFLICT");
            else {
              payment.status = "settled";
              order.status = "DIPROSES";
              order.verifiedAt = now;
            }
          }
        } else if (closed && order.status === "MENUNGGU_PEMBAYARAN") {
          payment.sessionClosedAt = now;
          payment.checkedAt = now;
          payment.status =
            data?.transaction_status === "expire" || reason === "expired"
              ? "expired"
              : ["deny", "failure"].includes(data?.transaction_status)
                ? "failed"
                : "cancelled";
          await release(order, session, now, reason ?? "payment");
          return order;
        } else if (data?.transaction_status === "pending" && order.status === "MENUNGGU_PEMBAYARAN")
          payment.status = "pending";
      }
    }
    const after = JSON.stringify({
      status: order.status,
      payment: payment.toObject(),
      verifiedAt: order.verifiedAt,
    });
    payment.checkedAt = now;
    if (before !== after) await order.save({ session });
    else
      await Order.updateOne(
        { _id: id, "payment.syncToken": token },
        { $set: { "payment.checkedAt": now } },
        { session, timestamps: false },
      );
    return order;
  });
}

async function recoverSession(order, config, token, now) {
  const minutes = Math.floor((order.expiresAt - now - client.REQUEST_TIMEOUT_MS) / 60000);
  if (minutes < client.MIN_PAGE_MINUTES) throw uncertain();
  const payload = client.snapPayload(order, {}, config.midtrans.frontendUrl, minutes);
  // Alamat snapshot cukup; email sengaja tidak ditebak jika proses awal terputus.
  const result = await client.createSnap(config.midtrans, payload);
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: "MENUNGGU_PEMBAYARAN", "payment.syncToken": token },
    {
      $set: {
        "payment.status": "ready",
        "payment.requestedAt": now,
        "payment.sessionExpiresAt": new Date(now.getTime() + minutes * 60000),
        "payment.snapToken": result.snapToken,
        "payment.redirectUrl": result.redirectUrl,
      },
      $inc: { __v: 1 },
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw uncertain();
  return updated;
}

async function reconcile(id, config, { mode = "sync", now = new Date() } = {}) {
  if (!config.midtrans?.enabled)
    throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Pembayaran Midtrans belum tersedia.");
  let { order, token } = await claim(id, mode, now);
  try {
    if (
      order.payment.status === "creating" &&
      now - order.payment.requestedAt < client.REQUEST_TIMEOUT_MS + 5000
    )
      throw new ApiError(409, "PAYMENT_IN_PROGRESS", "Pembayaran sedang disiapkan.");
    if (order.payment.status === "not_started") {
      if (mode === "cancel" || mode === "expire") {
        // Tidak ada sesi eksternal; transaksi order biasa tetap menangani race dengan pembuat sesi.
        return await mongoose.connection.transaction(async (session) => {
          const current = await Order.findOne({ _id: id, "payment.syncToken": token }).session(
            session,
          );
          if (current.status === "MENUNGGU_PEMBAYARAN" && current.payment.status === "not_started")
            await release(current, session, now, mode === "cancel" ? "buyer" : "expired");
          return current;
        });
      }
      return order;
    }
    let data = await client.getStatus(config.midtrans, order.payment.merchantOrderId);
    if (
      data &&
      (snapshotIssue(data, order) ||
        data.transaction_status === "settlement" ||
        order.payment.status === "settled")
    )
      return await apply(id, token, data, { now });
    const providerExpiry = data && providerDate(data.expiry_time);
    const due = order.expiresAt <= now || (providerExpiry !== null && providerExpiry <= now);
    const stopping =
      ["cancel", "expire"].includes(mode) ||
      due ||
      ["cancel", "expire", "deny", "failure"].includes(data?.transaction_status);
    if (!data && !order.payment.snapToken) {
      if (order.expiresAt - now < client.MIN_PAGE_MINUTES * 60000 + client.REQUEST_TIMEOUT_MS)
        return await apply(id, token, null, { now, reviewReason: "SESSION_UNCONFIRMED" });
      order = await recoverSession(order, config, token, now);
    }
    if (!stopping) return data ? await apply(id, token, data, { now }) : order;

    if (data?.transaction_status === "pending") {
      await client.stopTransaction(
        config.midtrans,
        order.payment.merchantOrderId,
        mode === "expire" || due,
      );
      data = await client.getStatus(config.midtrans, order.payment.merchantOrderId);
      if (!data) throw uncertain();
      if (snapshotIssue(data, order) || data.transaction_status === "settlement")
        return await apply(id, token, data, { now });
    }
    let closed = false;
    if (order.payment.snapToken)
      closed = await client.closeSnap(config.midtrans, order.payment.snapToken);
    // Jam lokal atau GET 404 tidak membuktikan sesi Snap sudah ditutup.
    if (!closed) throw uncertain();
    const latest = await client.getStatus(config.midtrans, order.payment.merchantOrderId);
    if (latest && (snapshotIssue(latest, order) || latest.transaction_status === "settlement"))
      return await apply(id, token, latest, { now });
    if (latest?.transaction_status === "pending") throw uncertain();
    return await apply(id, token, latest, {
      closed: true,
      now,
      reason: mode === "cancel" ? "buyer" : due || mode === "expire" ? "expired" : undefined,
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 503) {
      await Order.updateOne(
        {
          _id: id,
          "payment.syncToken": token,
          status: "MENUNGGU_PEMBAYARAN",
          "payment.status": { $nin: ["not_started", "settled", "review_required"] },
        },
        { $set: { "payment.status": "unknown" } },
        { timestamps: false },
      );
      throw uncertain();
    }
    throw error;
  } finally {
    await Order.updateOne(
      { _id: id, "payment.syncToken": token },
      { $set: { "payment.syncToken": null, "payment.syncUntil": null } },
      { timestamps: false },
    );
  }
}

async function notification(body, config) {
  if (!config.midtrans?.enabled)
    throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Pembayaran Midtrans belum tersedia.");
  verifyNotification(body, config.midtrans.notificationKey ?? config.midtrans.serverKey);
  const order = await Order.findOne({ "payment.merchantOrderId": body.order_id });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Transaksi tidak ditemukan.");
  if (!amountMatches(body.gross_amount, order.total_price))
    throw new ApiError(409, "PAYMENT_MISMATCH", "Nominal pembayaran tidak sesuai.");
  await reconcile(order.id, config, { mode: "notification" });
}

module.exports = { reconcile, notification };
