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
    cancellation_reason: { type: String, enum: ["buyer", "expired", null], default: null },
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
    tracking_number: { type: String, default: "" },
    total_price: { type: Number, required: true, immutable: true, validate: Number.isSafeInteger },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.pre("validate", function () {
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
module.exports = mongoose.model("Order", orderSchema);
