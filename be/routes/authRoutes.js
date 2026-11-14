const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const validate = require("../lib/validation");
const { ApiError } = require("../lib/errors");
const serialize = require("../lib/serializers");

router.post("/register", async (req, res) => {
  const input = validate.registration(req.body);
  const password = await bcrypt.hash(input.password, 10);
  const user = await User.create({ ...input, password, role: "buyer" });
  res.status(201).json({ success: true, data: serialize.user(user) });
});

router.post("/login", async (req, res) => {
  const email = validate.email(req.body.email);
  const password = validate.password(req.body.password);
  const role = req.body.role;
  if (role !== undefined && !["buyer", "admin"].includes(role)) validate.invalid("role");
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
  }
  if (role !== undefined && role !== user.role) {
    throw new ApiError(403, "ROLE_MISMATCH", "Gunakan halaman masuk sesuai peran akun.");
  }
  const token = jwt.sign({ id: user.id, role: user.role }, req.app.locals.config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: user.role === "admin" ? "2h" : "1d",
  });
  res.json({ success: true, data: { token, user: serialize.user(user) } });
});

module.exports = router;
