const mongoose = require("mongoose");
const { addressSchema } = require("../lib/address");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "", maxlength: 30 },
    address: { type: addressSchema, default: null },
    legacy_address: { type: String, select: false },
    role: { type: String, enum: ["buyer", "admin"], default: "buyer" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
