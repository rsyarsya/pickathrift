const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { ApiError } = require("../lib/errors");

async function authenticateToken(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? "");
  const unauthorized = () => new ApiError(401, "UNAUTHENTICATED", "Silakan masuk kembali.");
  if (!match) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(match[1], req.app.locals.config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    throw unauthorized();
  }
  if (
    typeof payload !== "object" ||
    typeof payload.id !== "string" ||
    !/^[a-f\d]{24}$/i.test(payload.id)
  ) {
    throw unauthorized();
  }
  const account = await User.findById(payload.id);
  if (!account) throw unauthorized();
  req.user = { id: account.id, role: account.role };
  req.account = account;
  next();
}

const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role)
    throw new ApiError(403, "FORBIDDEN", `Akses khusus ${role === "admin" ? "Admin" : "Buyer"}.`);
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin: requireRole("admin"),
  requireBuyer: requireRole("buyer"),
};
