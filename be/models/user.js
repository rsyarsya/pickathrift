const mongoose = require("mongoose");

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
    address: { type: String, default: "", maxlength: 1000 },
    role: { type: String, enum: ["buyer", "admin"], default: "buyer" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
