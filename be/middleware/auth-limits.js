const { rateLimit } = require("express-rate-limit");
const { ApiError } = require("../lib/errors");

function authLimits(config) {
  const common = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    // Tes alur memakai database sementara; pembatasan diuji terpisah dengan mode production.
    skip: () => config.nodeEnv === "test",
    handler: (_req, _res, next) =>
      next(
        new ApiError(429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi beberapa menit."),
      ),
  };
  return {
    login: rateLimit({ ...common, limit: 20, skipSuccessfulRequests: true }),
    register: rateLimit({ ...common, limit: 30 }),
  };
}

module.exports = { authLimits };
