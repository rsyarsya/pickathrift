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
  };
}

module.exports = { getConfig };
