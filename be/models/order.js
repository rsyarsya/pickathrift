const mongoose = require("mongoose");
const Product = require("./products");
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
    product_snapshot: { type: productSnapshotSchema, immutable: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "completed", "cancelled"],
      default: "pending",
    },
    tracking_number: { type: String, default: "" },
    total_price: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
