const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { registration } = require("../lib/validation");
const { assertDataReady } = require("../lib/legacy-data");

async function createAdmin(env = process.env) {
  if (typeof env.MONGODB_URI !== "string" || !env.MONGODB_URI.trim())
    throw new Error("MONGODB_URI wajib diisi.");
  const input = registration({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  const password = await bcrypt.hash(input.password, 10);
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, autoIndex: false });
    const config = {
      uploadDir: env.UPLOAD_DIR,
      storage: require("../config").getStorageConfig(env),
    };
    await require("../services/files").assertStorageReady(config);
    await assertDataReady(mongoose.connection, config);
    await User.createIndexes();
    await User.create({ ...input, password, role: "admin" });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV !== "test") {
    require("dotenv").config({
      path: require("node:path").join(__dirname, "../.env"),
      quiet: true,
    });
  }
  createAdmin()
    .then(() => console.log("Akun Admin berhasil dibuat."))
    .catch((error) => {
      console.error(
        error.code === 11000
          ? "Email sudah terdaftar; akun lama tidak diubah."
          : "Gagal membuat Admin. Periksa konfigurasi dan input.",
      );
      process.exitCode = 1;
    });
}

module.exports = { createAdmin };
