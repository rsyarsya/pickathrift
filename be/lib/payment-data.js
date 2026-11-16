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
  const paid = ["DIPROSES", "DIKIRIM", "SELESAI"].includes(order.status);
  const terminal = ["cancelled", "expired", "failed"];
  if (
    ![
      "not_started",
      "creating",
      "ready",
      "unknown",
      "pending",
      "settled",
      ...terminal,
      "review_required",
    ].includes(payment.status)
  )
    invalid("status");
  if (["MENUNGGU_VERIFIKASI", "PERLU_UNGGAH_ULANG"].includes(order.status)) errors.push("status");
  if (paid && payment.status !== "settled") invalid("status");
  if (payment.status === "settled" && !paid) errors.push("status");
  if (terminal.includes(payment.status) && order.status !== "DIBATALKAN") errors.push("status");
  if (
    order.status === "DIBATALKAN" &&
    !["not_started", ...terminal, "review_required"].includes(payment.status)
  )
    errors.push("status");
  if (order.proof != null) errors.push("proof");
  for (const field of [
    "requestedAt",
    "sessionExpiresAt",
    "paidAt",
    "providerExpiresAt",
    "checkedAt",
    "sessionClosedAt",
    "syncUntil",
    "nextSyncAt",
  ])
    if (payment[field] != null && !date(payment[field])) invalid(field);
  if (
    payment.status === "settled" &&
    (!date(payment.paidAt) ||
      typeof payment.transactionId !== "string" ||
      !payment.transactionId ||
      !["bank_transfer", "echannel", "qris", "bca_va", "bni_va", "bri_va", "permata_va"].includes(
        payment.channel,
      ) ||
      payment.providerStatus !== "settlement")
  )
    invalid("paidAt");
  if (payment.status === "review_required" && !payment.reviewReason) invalid("reviewReason");
  if (terminal.includes(payment.status) && !date(payment.sessionClosedAt))
    invalid("sessionClosedAt");
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
    } else if (
      (payment.snapToken != null || payment.redirectUrl != null) &&
      !validSnapSession(payment.snapToken, payment.redirectUrl)
    )
      invalid("snapToken");
  }
  return errors;
}

module.exports = { paymentErrors };
