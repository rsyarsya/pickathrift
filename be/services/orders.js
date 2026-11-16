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

async function expireOrders(now = new Date()) {
  const due = await Order.find({ status: "MENUNGGU_PEMBAYARAN", expiresAt: { $lte: now } })
    .select("_id")
    .lean();
  for (const entry of due) {
    await mongoose.connection.transaction(async (session) => {
      const order = await Order.findOne({
        _id: entry._id,
        status: "MENUNGGU_PEMBAYARAN",
        expiresAt: { $lte: now },
      }).session(session);
      if (order) await release(order, session, now, "expired");
    });
  }
}

async function createOrder(account, body) {
  validate.fields(body, ["product_id", "address"]);
  const productId = validate.objectId(body.product_id, "product_id");
  // Alamat baru dari form dicek dengan aturan ketat; alamat profil lama tetap dengan aturan lama.
  const address =
    body.address === undefined
      ? addressInput(account.address?.toObject() ?? account.address)
      : addressInput(body.address, { strict: true });
  await expireOrders();
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
        },
      ],
      { session },
    );
    return order;
  });
}

async function cancelOrder(id, buyerId, now = new Date()) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== buyerId)
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pesanan ini.");
    if (order.status === "DIBATALKAN") return order;
    if (order.status !== "MENUNGGU_PEMBAYARAN")
      throw new ApiError(409, "INVALID_TRANSITION", "Pesanan ini tidak bisa dibatalkan.");
    await release(order, session, now, order.expiresAt <= now ? "expired" : "buyer");
    return order;
  });
}
module.exports = { createOrder, cancelOrder, expireOrders, release };
