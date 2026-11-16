const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/products");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const { addressInput } = require("../lib/address");
const serialize = require("../lib/serializers");
const { SHIPPING_FEE, PAYMENT_WINDOW_MS } = require("../lib/order-options");

// Lepas kunci hanya milik order yang dibatalkan, dalam transaksi yang sama.
async function release(order, session, now, reason) {
  order.status = "DIBATALKAN";
  order.cancelledAt = now;
  order.cancellation_reason = reason;
  await order.save({ session });
  await Product.updateOne(
    { _id: order.product_id, status: "reserved", reservation_order_id: order._id },
    { $set: { status: "available", reservation_order_id: null }, $inc: { __v: 1 } },
    { session },
  );
}

async function expireOrders(now = new Date(), config = {}) {
  const due = await Order.find({
    status: "MENUNGGU_PEMBAYARAN",
    $or: [{ expiresAt: { $lte: now } }, { "payment.providerExpiresAt": { $lte: now } }],
  })
    .select("_id payment")
    .lean();
  for (const entry of due) {
    if (entry.payment && entry.payment.status !== "not_started") {
      if (config.midtrans?.enabled) {
        try {
          await require("./payment-sync").reconcile(String(entry._id), config, {
            mode: "expire",
            now,
          });
        } catch (error) {
          // Provider gagal tidak membuat katalog gagal atau melepas stok yang belum pasti.
          if (!(error instanceof ApiError)) throw error;
        }
      }
      continue;
    }
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findOne({
        _id: entry._id,
        status: "MENUNGGU_PEMBAYARAN",
        expiresAt: { $lte: now },
      }).session(session);
      // Sesi gateway yang sudah dimulai perlu rekonsiliasi provider sebelum stok dilepas.
      if (order && (!order.payment || order.payment.status === "not_started"))
        await release(order, session, now, "expired");
    });
  }
}

async function createOrder(account, body, config = {}) {
  validate.fields(body, ["product_id", "address"]);
  const productId = validate.objectId(body.product_id, "product_id");
  // Pertahankan validasi alamat baru dari main dan tenggat/konfigurasi gateway.
  const address =
    body.address === undefined
      ? addressInput(account.address?.toObject() ?? account.address)
      : addressInput(body.address, { strict: true });
  if (config.midtrans?.enabled === false)
    throw new ApiError(
      503,
      "PAYMENT_UNAVAILABLE",
      "Pembayaran belum tersedia. Coba lagi setelah layanan pembayaran siap.",
    );
  await expireOrders(new Date(), config);
  return mongoose.connection.transaction(async (session) => {
    const now = new Date();
    const orderId = new mongoose.Types.ObjectId();
    const product = await Product.findOneAndUpdate(
      { _id: productId, status: "available", active: true, reservation_order_id: null },
      { $set: { status: "reserved", reservation_order_id: orderId }, $inc: { __v: 1 } },
      { returnDocument: "after", session },
    );
    if (!product) {
      if (!(await Product.exists({ _id: productId, active: true }).session(session)))
        throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
      throw new ApiError(409, "STOCK_CONFLICT", "Barang sudah dipesan atau terjual.");
    }
    if (!Number.isSafeInteger(product.price + SHIPPING_FEE))
      throw new ApiError(409, "PRICE_UNSUPPORTED", "Harga barang tidak dapat diproses.");
    const [order] = await Order.create(
      [
        {
          _id: orderId,
          buyer_id: account._id,
          product_id: product._id,
          product_snapshot: serialize.product(product),
          address_snapshot: address,
          item_price: product.price,
          shipping_fee: SHIPPING_FEE,
          total_price: product.price + SHIPPING_FEE,
          expiresAt: new Date(now.getTime() + PAYMENT_WINDOW_MS),
          createdAt: now,
          updatedAt: now,
          payment: config.midtrans?.enabled
            ? { provider: "midtrans", merchantOrderId: `picka-${orderId}`, status: "not_started" }
            : null,
        },
      ],
      { session },
    );
    return order;
  });
}

async function cancelOrder(id, buyerId, now = new Date(), config = {}) {
  const current = await Order.findById(id);
  if (current?.payment && config.midtrans?.enabled) {
    if (String(current.buyer_id) !== buyerId)
      throw new ApiError(403, "FORBIDDEN", "Pesanan bukan milik Anda.");
    if (current.status === "DIBATALKAN") return current;
    if (current.status !== "MENUNGGU_PEMBAYARAN")
      throw new ApiError(409, "INVALID_TRANSITION", "Pesanan ini tidak bisa dibatalkan.");
    const checked = await require("./payment-sync").reconcile(id, config, { mode: "cancel", now });
    if (checked.status !== "DIBATALKAN")
      throw new ApiError(
        409,
        "INVALID_TRANSITION",
        "Pembayaran berhasil atau memerlukan pemeriksaan Admin. Muat ulang pesanan.",
      );
    return checked;
  }
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== buyerId)
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pesanan ini.");
    if (order.status === "DIBATALKAN") return order;
    if (order.status !== "MENUNGGU_PEMBAYARAN")
      throw new ApiError(409, "INVALID_TRANSITION", "Pesanan ini tidak bisa dibatalkan.");
    if (order.payment && (order.payment.status !== "not_started" || order.payment.syncUntil > now))
      throw new ApiError(
        409,
        "PAYMENT_CHECK_REQUIRED",
        "Status pembayaran perlu diperiksa sebelum pembatalan.",
      );
    await release(order, session, now, order.expiresAt <= now ? "expired" : "buyer");
    return order;
  });
}
module.exports = { createOrder, cancelOrder, expireOrders, release };
