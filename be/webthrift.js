const mongoose = require("mongoose");
const { once } = require("node:events");
const { getConfig } = require("./config");
const { createApp } = require("./app");
const { prepareDatabase } = require("./services/database");

async function start(config = getConfig()) {
  try {
    await prepareDatabase(config);
    const server = createApp(config).listen(config.port);
    await once(server, "listening");
    return server;
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV !== "test") {
    require("dotenv").config({ path: require("node:path").join(__dirname, ".env"), quiet: true });
  }
  start()
    .then((server) => {
      console.log(`Backend PickaThrift berjalan pada port ${server.address().port}.`);
      const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    })
    .catch((error) => {
      if (error.code === "REPLICA_SET_REQUIRED") {
        console.error(
          "REPLICA_SET_REQUIRED: gunakan MongoDB replica set/Atlas untuk transaksi stok.",
        );
        process.exitCode = 1;
        return;
      }
      if (error.code === "DATA_MIGRATION_REQUIRED") {
        console.error(
          "Data lama belum siap. Jalankan pnpm --filter @pickathrift/be migrate:legacy untuk pemeriksaan.",
        );
        process.exitCode = 1;
        return;
      }
      console.error(
        "Backend gagal dimulai. Periksa konfigurasi database, Storage, JWT_SECRET, PORT, dan koneksi.",
      );
      process.exitCode = 1;
    });
}

module.exports = { start };
