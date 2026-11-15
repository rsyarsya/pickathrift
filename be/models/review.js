const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
  },
  { timestamps: true },
);

reviewSchema.index({ order_id: 1 }, { unique: true });
module.exports = mongoose.model("Review", reviewSchema);
