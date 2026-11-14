const mongoose = require("mongoose");
const { once } = require("node:events");
const { getConfig } = require("./config");
const { createApp } = require("./app");
const User = require("./models/user");

async function start(config = getConfig()) {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    await User.init();
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
    .catch(() => {
      console.error(
        "Backend gagal dimulai. Periksa MONGODB_URI, JWT_SECRET, PORT, dan koneksi database.",
      );
      process.exitCode = 1;
    });
}

module.exports = { start };
