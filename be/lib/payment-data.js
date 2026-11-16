const { validSnapSession } = require("./midtrans-client");
const date = (value) => value instanceof Date && Number.isFinite(value.getTime());

// Dipakai juga pada dokumen mentah saat startup: jangan mengandalkan casting Mongoose.
function paymentErrors(order) {
  const payment = order.payment;
  if (payment == null) return [];
  if (typeof payment !== "object" || Array.isArray(payment)) return ["payment"];
  const errors = [];
  const invalid = (field) => errors.push(`payment.${field}`);
  if (payment.provider !== "midtrans") invalid("provider");
  if (payment.merchantOrderId !== `picka-${order._id}`) invalid("merchantOrderId");
  if (!["not_started", "creating", "ready", "unknown"].includes(payment.status)) invalid("status");
  if (!["MENUNGGU_PEMBAYARAN", "DIBATALKAN"].includes(order.status)) errors.push("status");
  if (order.status === "DIBATALKAN" && payment.status !== "not_started") errors.push("status");
  if (order.proof != null) errors.push("proof");
  for (const field of ["transactionId", "channel", "paidAt"])
    if (payment[field] != null) invalid(field);
  if (payment.status === "not_started") {
    for (const field of ["requestedAt", "sessionExpiresAt", "snapToken", "redirectUrl"])
      if (payment[field] != null) invalid(field);
  } else {
    if (!date(payment.requestedAt) || payment.requestedAt < order.createdAt) invalid("requestedAt");
    if (
      !date(payment.sessionExpiresAt) ||
      payment.sessionExpiresAt <= payment.requestedAt ||
      payment.sessionExpiresAt > order.expiresAt
    )
      invalid("sessionExpiresAt");
    if (payment.status === "ready") {
      if (!validSnapSession(payment.snapToken, payment.redirectUrl)) invalid("redirectUrl");
    } else if (payment.snapToken != null || payment.redirectUrl != null) invalid("snapToken");
  }
  return errors;
}

module.exports = { paymentErrors };
