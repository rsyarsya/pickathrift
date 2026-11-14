const mongoose = require("mongoose");
const {
  CATEGORIES,
  CONDITIONS,
  STYLES,
  STATUSES,
  sizesFor,
  measurementsFor,
  isImageReference,
} = require("../lib/product-options");

const measurementSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    cm: {
      type: Number,
      required: true,
      min: Number.MIN_VALUE,
      max: 200,
      validate: Number.isFinite,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    brand: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, enum: CATEGORIES },
    size: { type: String, required: true },
    condition: { type: String, required: true, enum: CONDITIONS },
    style: { type: String, required: true, enum: STYLES },
    color: { type: String, default: "", trim: true, maxlength: 100 },
    price: { type: Number, required: true, min: 1000, validate: Number.isSafeInteger },
    status: { type: String, enum: STATUSES, default: "available" },
    active: { type: Boolean, default: true },
    images: {
      type: [String],
      required: true,
      default: undefined,
      validate: (images) =>
        Array.isArray(images) &&
        images.length >= 1 &&
        images.length <= 4 &&
        images.every(isImageReference),
    },
    measurements: {
      type: [measurementSchema],
      default: [],
      validate: (items) => items.length <= 4,
    },
  },
  { timestamps: true },
);

productSchema.pre("validate", function () {
  if (!sizesFor(this.category).includes(this.size))
    this.invalidate("size", "Ukuran label tidak sesuai kategori.");
  const labels = (this.measurements ?? []).map((entry) => entry.label);
  if (
    new Set(labels).size !== labels.length ||
    labels.some((label) => !measurementsFor(this.category).includes(label))
  ) {
    this.invalidate("measurements", "Label ukuran harus unik dan sesuai kategori.");
  }
});
productSchema.index({ active: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Product", productSchema, "products");
