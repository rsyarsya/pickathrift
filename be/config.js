function midtransConfig(env) {
  const flag = env.MIDTRANS_ENABLED ?? "false";
  if (!["true", "false"].includes(flag)) throw new Error("MIDTRANS_ENABLED harus true/false.");
  if (flag === "false") return { enabled: false };
  const serverKey = env.MIDTRANS_SERVER_KEY?.trim();
  if (!/^SB-Mid-server-\S+$/.test(serverKey ?? ""))
    throw new Error("MIDTRANS_SERVER_KEY sandbox wajib diisi.");
  let url;
  try {
    url = new globalThis.URL(env.FRONTEND_URL);
  } catch {
    throw new Error("FRONTEND_URL wajib berupa origin FE.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    throw new Error("FRONTEND_URL harus origin HTTPS atau HTTP localhost.");
  return { enabled: true, serverKey, frontendUrl: url.origin };
}

function getConfig(env = process.env) {
  for (const name of ["MONGODB_URI", "JWT_SECRET"]) {
    if (typeof env[name] !== "string" || !env[name].trim()) throw new Error(`${name} wajib diisi.`);
  }
  const port = Number(env.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT tidak valid.");
  return {
    mongoUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    port,
    uploadDir: env.UPLOAD_DIR,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || undefined,
    nodeEnv: env.NODE_ENV ?? "development",
    midtrans: midtransConfig(env),
  };
}

module.exports = { getConfig };
