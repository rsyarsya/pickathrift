const express = require("express");
const cors = require("cors");
const { ApiError, errorHandler } = require("./lib/errors");
const { objectBody } = require("./lib/validation");
const { adminOrderRouter, orderRouter } = require("./routes/orderRoutes");

function createApp(config) {
  if (!config?.jwtSecret) throw new Error("JWT_SECRET wajib diisi.");
  const app = express();
  app.set("trust proxy", config.trustProxy ?? false);
  app.locals.config = config;
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", require("./routes/uploadRoutes"));
  app.use(
    "/uploads/products",
    express.static(require("./services/files").filePath(config, "products", ""), {
      dotfiles: "deny",
      index: false,
    }),
  );
  app.use((req, res, next) => {
    if (["POST", "PATCH", "PUT"].includes(req.method)) objectBody(req.body);
    next();
  });
  app.get("/", (req, res) => res.json({ success: true, data: { service: "PickaThrift" } }));
  const limits = require("./middleware/auth-limits").authLimits(config);
  app.use("/api/auth", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.post(["/api/auth/login", "/api/auth/google"], limits.login);
  app.post("/api/auth/register", limits.register);
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/products", require("./routes/productRoutes"));
  app.use("/api/admin/products", require("./routes/adminProductRoutes"));
  app.use("/api/wishlist", require("./routes/wishlistRoutes"));
  app.use("/api/orders", orderRouter);
  app.use("/api/payments/midtrans", require("./routes/midtransRoutes"));
  app.use("/api/admin/orders", adminOrderRouter);
  app.use("/api", require("./routes/reviewRoutes"));
  app.use((req, res, next) => next(new ApiError(404, "NOT_FOUND", "Halaman API tidak ditemukan.")));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
