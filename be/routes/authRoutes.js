const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const validate = require("../lib/validation");
const { ApiError } = require("../lib/errors");
const serialize = require("../lib/serializers");

const googleClient = new OAuth2Client();

function sendSession(req, res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, req.app.locals.config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: user.role === "admin" ? "2h" : "1d",
  });
  res.json({ success: true, data: { token, user: serialize.user(user) } });
}

async function verifyGoogleCredential(config, credential) {
  // Tes menyuntikkan verifyGoogleIdToken agar tidak memanggil server Google.
  if (config.verifyGoogleIdToken) return config.verifyGoogleIdToken(credential);
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: config.googleClientId,
  });
  return ticket.getPayload();
}

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
  // Akun Google tanpa kata sandi dijawab sama seperti sandi salah.
  const googleOnly = Boolean(user?.googleId) && !user.password;
  if (!user || googleOnly || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
  }
  if (role !== undefined && role !== user.role) {
    throw new ApiError(403, "ROLE_MISMATCH", "Gunakan halaman masuk sesuai peran akun.");
  }
  sendSession(req, res, user);
});

// Masuk atau daftar Buyer dengan ID token dari Google Identity Services.
router.post("/google", async (req, res) => {
  const config = req.app.locals.config;
  if (!config.googleClientId) {
    throw new ApiError(503, "GOOGLE_DISABLED", "Masuk dengan Google belum diaktifkan.");
  }
  validate.fields(req.body, ["credential"]);
  const credential = validate.text(req.body.credential, "credential", { max: 4096 });
  const rejected = () =>
    new ApiError(
      401,
      "GOOGLE_TOKEN_INVALID",
      "Gagal masuk dengan Google. Coba lagi, atau masuk pakai email dan kata sandi.",
    );
  let profile;
  try {
    profile = await verifyGoogleCredential(config, credential);
  } catch {
    throw rejected();
  }
  if (
    typeof profile?.sub !== "string" ||
    typeof profile.email !== "string" ||
    profile.email_verified !== true
  ) {
    throw rejected();
  }
  const email = profile.email.trim().toLowerCase();
  let user = (await User.findOne({ googleId: profile.sub })) ?? (await User.findOne({ email }));
  if (!user) {
    const given = typeof profile.name === "string" ? profile.name.trim() : "";
    const name = (given || email.split("@")[0]).slice(0, 100);
    try {
      user = await User.create({ name, email, googleId: profile.sub, role: "buyer" });
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Request lain mungkin sudah membuat akun ini. Indeks unik tetap menjadi penjaga.
      user = (await User.findOne({ googleId: profile.sub })) ?? (await User.findOne({ email }));
      if (!user) throw error;
    }
  }
  if (user.role === "admin")
    throw new ApiError(403, "ROLE_MISMATCH", "Akun admin masuk lewat halaman admin.");
  if (!user.googleId) {
    // email_verified pihak ketiga tidak membuktikan kepemilikan email saat ini.
    const authoritative =
      email.endsWith("@gmail.com") ||
      (typeof profile.hd === "string" && profile.hd.trim().length > 0);
    if (!authoritative)
      throw new ApiError(
        409,
        "GOOGLE_LINK_REQUIRED",
        "Email ini sudah terdaftar. Masuk menggunakan kata sandi.",
      );
    const userId = user._id;
    try {
      user = await User.findOneAndUpdate(
        { _id: userId, role: "buyer", googleId: { $exists: false } },
        { $set: { googleId: profile.sub } },
        { returnDocument: "after" },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      throw rejected();
    }
    // Jika kalah race, sesi hanya diberikan jika identitas yang tersimpan memang sama.
    user ??= await User.findById(userId);
    if (user?.role !== "buyer" || user.googleId !== profile.sub) throw rejected();
  } else if (user.googleId !== profile.sub) {
    throw rejected();
  }
  sendSession(req, res, user);
});

module.exports = router;
