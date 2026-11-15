const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/products");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const { release, expireOrders } = require("./orders");
const conflict = () =>
  new ApiError(
    409,
    "INVALID_TRANSITION",
    "Status, bukti, atau kunci stok sudah berubah. Muat ulang pesanan.",
  );
async function ownedOrder(id, account) {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  if (account.role !== "admin" && String(order.buyer_id) !== String(account._id))
    throw new ApiError(403, "FORBIDDEN", "Pesanan bukan milik Anda.");
  return order;
}
async function stock(order, session, sold = false) {
  const result = await Product.updateOne(
    { _id: order.product_id, status: "reserved", reservation_order_id: order._id },
    {
      $set: { status: sold ? "sold" : "reserved", reservation_order_id: sold ? null : order._id },
      $inc: { __v: 1 },
    },
    { session },
  );
  if (!result.matchedCount) throw conflict();
}
async function uploadProof(id, account, proof, expectedProofId) {
  await expireOrders();
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== String(account._id))
      throw new ApiError(403, "FORBIDDEN", "Pesanan bukan milik Anda.");
    const now = new Date();
    if (order.status === "MENUNGGU_PEMBAYARAN" && order.expiresAt <= now) {
      await release(order, session, now, "expired");
      return { expired: true };
    }
    if (
      !["MENUNGGU_PEMBAYARAN", "PERLU_UNGGAH_ULANG"].includes(order.status) ||
      String(order.proof?.id ?? "") !== expectedProofId
    )
      throw conflict();
    await stock(order, session);
    order.proof = { ...proof, uploadedAt: now };
    order.status = "MENUNGGU_VERIFIKASI";
    order.adminNote = "";
    await order.save({ session });
    return { order };
  });
}
async function adminAction(id, body, config = {}) {
  const type = body.type;
  if (!["approve", "reupload", "reject", "ship"].includes(type)) validate.invalid("type");
  validate.fields(
    body,
    type === "ship"
      ? ["type", "service", "number"]
      : ["type", "proofId", ...(type === "approve" ? [] : ["note"])],
  );
  const proofId = type === "ship" ? null : validate.objectId(body.proofId, "proofId");
  const note = ["reupload", "reject"].includes(type)
    ? validate.text(body.note, "note", { max: 500 })
    : "";
  let shipment;
  if (type === "ship") {
    const service = validate.text(body.service, "service");
    const number = validate.text(body.number, "number", { max: 30 });
    if (!["JNE REG", "J&T EZ", "SiCepat REG", "POS Kilat"].includes(service))
      validate.invalid("service");
    if (!/^[A-Za-z0-9 -]{8,30}$/.test(number) || !/[A-Za-z0-9]/.test(number))
      validate.invalid("number");
    shipment = { service, number };
  }
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    const now = new Date();
    if (type === "ship") {
      if (order.status !== "DIPROSES") throw conflict();
      order.status = "DIKIRIM";
      order.shipment = { ...shipment, shippedAt: now };
      order.tracking_number = shipment.number;
    } else {
      const allowed =
        type === "reupload"
          ? ["MENUNGGU_VERIFIKASI"]
          : ["MENUNGGU_VERIFIKASI", "PERLU_UNGGAH_ULANG"];
      if (!allowed.includes(order.status) || !order.proof || order.proof.id !== proofId)
        throw conflict();
      try {
        await require("node:fs/promises").access(
          require("./files").filePath(config, "proofs", order.proof.filename),
        );
      } catch {
        throw new ApiError(409, "PROOF_UNAVAILABLE", "Berkas bukti tidak dapat dibaca.");
      }
      await stock(order, session, type === "approve");
      if (type === "reject") {
        order.adminNote = note;
        await release(order, session, now, "admin");
        return order;
      }
      if (type === "approve") {
        order.status = "DIPROSES";
        order.verifiedAt = now;
      } else {
        order.status = "PERLU_UNGGAH_ULANG";
        order.adminNote = note;
      }
    }
    await order.save({ session });
    return order;
  });
}
async function receiveOrder(id, account) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== String(account._id))
      throw new ApiError(403, "FORBIDDEN", "Pesanan bukan milik Anda.");
    if (order.status !== "DIKIRIM") throw conflict();
    order.status = "SELESAI";
    order.receivedAt = new Date();
    await order.save({ session });
    return order;
  });
}
module.exports = { ownedOrder, uploadProof, adminAction, receiveOrder };
