function midtransConfig(env) {
  const flag = env.MIDTRANS_ENABLED ?? "false";
  if (!["true", "false"].includes(flag)) throw new Error("MIDTRANS_ENABLED harus true/false.");
  if (flag === "false") return { enabled: false };
  const serverKey = env.MIDTRANS_SERVER_KEY?.trim();
  if (!/^SB-Mid-server-\S+$/.test(serverKey ?? ""))
    throw new Error("MIDTRANS_SERVER_KEY sandbox wajib diisi.");
  const notificationKey = env.MIDTRANS_NOTIFICATION_KEY?.trim() || serverKey;
  // Key utama penanda tangan dapat berawalan Mid-server-, termasuk
  // notifikasi sandbox. Semua URL API tetap dikunci ke sandbox.
  if (!/^(?:SB-)?Mid-server-\S+$/.test(notificationKey))
    throw new Error("MIDTRANS_NOTIFICATION_KEY harus Server Key utama akun.");
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
  let notificationUrl;
  if (env.MIDTRANS_NOTIFICATION_URL?.trim()) {
    try {
      const target = new globalThis.URL(env.MIDTRANS_NOTIFICATION_URL.trim());
      if (
        target.protocol !== "https:" ||
        target.username ||
        target.password ||
        target.hash ||
        target.href.includes(",")
      )
        throw new Error();
      notificationUrl = target.href;
    } catch {
      throw new Error("MIDTRANS_NOTIFICATION_URL harus satu URL HTTPS publik.");
    }
  }
  return {
    enabled: true,
    serverKey,
    notificationKey,
    frontendUrl: url.origin,
    ...(notificationUrl ? { notificationUrl } : {}),
  };
}

function getStorageConfig(env = process.env) {
  const provider = env.STORAGE_DRIVER ?? "local";
  if (provider === "local") return { provider };
  if (provider !== "supabase") throw new Error("STORAGE_DRIVER harus local/supabase.");
  let url;
  try {
    url = new globalThis.URL(env.SUPABASE_URL);
  } catch {
    throw new Error("SUPABASE_URL wajib diisi.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("SUPABASE_URL harus origin HTTPS.");
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!/^sb_secret_\S+$/.test(secretKey ?? ""))
    throw new Error("SUPABASE_SECRET_KEY wajib berupa secret key server.");
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(bucket ?? ""))
    throw new Error("SUPABASE_STORAGE_BUCKET wajib diisi dengan nama bucket.");
  return { provider, url: url.origin, secretKey, bucket };
}

function getConfig(env = process.env) {
  for (const name of ["MONGODB_URI", "JWT_SECRET"]) {
    if (typeof env[name] !== "string" || !env[name].trim()) throw new Error(`${name} wajib diisi.`);
  }
  const port = Number(env.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT tidak valid.");
  if (env.TRUST_PROXY !== undefined && !/^[0-5]$/.test(env.TRUST_PROXY))
    throw new Error("TRUST_PROXY harus jumlah proxy terpercaya 0 sampai 5.");
  return {
    mongoUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    port,
    trustProxy: env.TRUST_PROXY === undefined ? false : Number(env.TRUST_PROXY),
    uploadDir: env.UPLOAD_DIR,
    storage: getStorageConfig(env),
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || undefined,
    nodeEnv: env.NODE_ENV ?? "development",
    midtrans: midtransConfig(env),
  };
}

module.exports = { getConfig, getStorageConfig };
