const mongoose = require("mongoose");
const { migrateLegacyData } = require("../lib/legacy-data");

async function main() {
  if (process.env.NODE_ENV !== "test") {
    require("dotenv").config({
      path: require("node:path").join(__dirname, "../.env"),
      quiet: true,
    });
  }
  const args = process.argv.slice(2);
  if (args.some((value) => value !== "--apply") || args.length > 1)
    throw new Error("Argumen tidak didukung.");
  if (!process.env.MONGODB_URI?.trim()) throw new Error("MONGODB_URI wajib diisi.");
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    serverSelectionTimeoutMS: 5000,
  });
  const apply = args.includes("--apply");
  const config = {
    uploadDir: process.env.UPLOAD_DIR,
    storage: require("../config").getStorageConfig(),
  };
  await require("../services/files").assertStorageReady(config);
  const result = await migrateLegacyData(mongoose.connection, apply, config);
  console.log(
    JSON.stringify(
      { mode: apply ? "applied" : "dry-run", summary: result.summary, issues: result.issues },
      null,
      2,
    ),
  );
  if (result.issues.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      error.code === "DATA_MIGRATION_REQUIRED"
        ? "Migrasi dibatalkan: selesaikan blocker pada dry-run. Tidak ada data yang diubah."
        : "Migrasi gagal. Periksa argumen, konfigurasi, dan dukungan transaksi MongoDB. Tidak ada perubahan parsial.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
