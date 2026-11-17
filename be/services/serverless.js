const { prepareDatabase } = require("./database");
const { createApp } = require("../application");
function attachRuntime(app, configProvider, initialize = prepareDatabase) {
  let ready;
  app.use(async (req, res, next) => {
    try {
      // Concurrent cold requests share initialization; warm requests reuse the app and pool.
      ready ??= Promise.resolve()
        .then(async () => {
          const config = configProvider();
          await initialize(config);
          return createApp(config);
        })
        .catch((error) => {
          ready = undefined;
          throw error;
        });
      const handler = await ready;
      handler(req, res, next);
    } catch {
      res.set("Cache-Control", "no-store").status(503).json({
        success: false,
        code: "SERVICE_UNAVAILABLE",
        message: "Layanan belum tersedia. Coba lagi.",
      });
    }
  });
}
module.exports = { attachRuntime };
