const mongoose = require("mongoose");
const Product = require("./products");
const { addressSchema } = require("../lib/address");
const { STATUSES, validPaymentDeadline } = require("../lib/order-options");
const productSnapshotSchema = new mongoose.Schema(
  {
    ...Product.schema.obj,
    id: { type: String, required: true },
    createdAt: Date,
    updatedAt: Date,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    product_snapshot: { type: productSnapshotSchema, immutable: true, required: true },
    address_snapshot: { type: addressSchema, immutable: true, required: true },
    item_price: {
      type: Number,
      required: true,
      min: 1000,
      immutable: true,
      validate: Number.isSafeInteger,
    },
    shipping_fee: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
      validate: Number.isSafeInteger,
    },
    expiresAt: { type: Date, required: true, immutable: true },
    createdAt: { type: Date, required: true, immutable: true, default: Date.now },
    cancelledAt: { type: Date, default: null },
    cancellation_reason: {
      type: String,
      enum: ["buyer", "expired", "admin", "payment", null],
      default: null,
    },
    product_snapshot_source: {
      type: String,
      enum: ["checkout", "legacy-current-product"],
      default: "checkout",
      immutable: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "MENUNGGU_PEMBAYARAN",
    },
    proof: {
      type: new mongoose.Schema(
        {
          id: { type: String, required: true },
          filename: { type: String, required: true, match: /^[a-f0-9-]+\.(jpg|png)$/ },
          name: String,
          mime: { type: String, enum: ["image/jpeg", "image/png"], required: true },
          size: { type: Number, required: true, min: 1, max: 2097152 },
          uploadedAt: { type: Date, required: true },
          unavailable: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: null,
    },
    payment: {
      type: new mongoose.Schema(
        {
          provider: { type: String, enum: ["midtrans"], required: true, immutable: true },
          merchantOrderId: {
            type: String,
            required: true,
            immutable: true,
            match: /^picka-[a-f0-9]{24}$/,
          },
          status: {
            type: String,
            enum: [
              "not_started",
              "creating",
              "ready",
              "unknown",
              "pending",
              "settled",
              "cancelled",
              "expired",
              "failed",
              "review_required",
            ],
            required: true,
            default: "not_started",
          },
          requestedAt: { type: Date, default: null },
          sessionExpiresAt: { type: Date, default: null },
          snapToken: { type: String, default: null },
          redirectUrl: { type: String, default: null },
          transactionId: { type: String, default: null },
          channel: { type: String, default: null },
          paidAt: { type: Date, default: null },
          providerStatus: { type: String, default: null },
          providerExpiresAt: { type: Date, default: null },
          checkedAt: { type: Date, default: null },
          sessionClosedAt: { type: Date, default: null },
          reviewReason: {
            type: String,
            enum: [
              "STOCK_CONFLICT",
              "PAYMENT_MISMATCH",
              "UNSUPPORTED_PAYMENT",
              "UNEXPECTED_STATUS",
              "LATE_SETTLEMENT",
              "SESSION_UNCONFIRMED",
              null,
            ],
            default: null,
          },
          syncToken: { type: String, default: null },
          syncUntil: { type: Date, default: null },
          nextSyncAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    adminNote: { type: String, default: "", maxlength: 500 },
    verifiedAt: { type: Date, default: null },
    shipment: {
      type: new mongoose.Schema(
        { service: String, number: String, shippedAt: Date },
        { _id: false },
      ),
      default: null,
    },
    receivedAt: { type: Date, default: null },
    tracking_number: { type: String, default: "" },
    total_price: { type: Number, required: true, immutable: true, validate: Number.isSafeInteger },
  },
  { timestamps: true, optimisticConcurrency: true },
);

orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ "payment.merchantOrderId": 1 }, { unique: true, sparse: true });
orderSchema.pre("validate", function () {
  for (const field of require("../lib/payment-data").paymentErrors(this))
    this.invalidate(field, "Metadata pembayaran perlu diperiksa.");
  if (!validPaymentDeadline(this.createdAt, this.expiresAt, this.status))
    this.invalidate(
      "expiresAt",
      "Batas pembayaran harus setelah pembuatan pesanan; Menunggu Pembayaran wajib enam jam.",
    );
  if (this.total_price !== this.item_price + this.shipping_fee)
    this.invalidate("total_price", "Total tidak sesuai.");
  if (this.product_snapshot?.price !== this.item_price)
    this.invalidate("item_price", "Harga snapshot tidak sesuai.");
});
orderSchema.virtual("review", {
  ref: "Review",
  localField: "_id",
  foreignField: "order_id",
  justOne: true,
});
module.exports = mongoose.model("Order", orderSchema);
