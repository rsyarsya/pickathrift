class ApiError extends Error {
  constructor(status, code, message, errors) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let failure = error;
  if (error.code === 11000) {
    const email = Boolean(error.keyPattern?.email);
    failure = new ApiError(
      409,
      email ? "EMAIL_EXISTS" : "CONFLICT",
      email ? "Email sudah terdaftar." : "Data sudah tersedia.",
    );
  } else if (error.name === "VersionError") {
    failure = new ApiError(409, "STALE_ORDER", "Pesanan sudah berubah. Muat ulang dan coba lagi.");
  } else if (error.name === "ValidationError") {
    const errors = Object.fromEntries(
      Object.keys(error.errors).map((key) => [key, "Nilai tidak valid."]),
    );
    failure = new ApiError(422, "VALIDATION_ERROR", "Periksa kembali isian.", errors);
  } else if (
    error.name === "CastError" ||
    error instanceof URIError ||
    error.type === "entity.parse.failed"
  ) {
    failure = new ApiError(422, "VALIDATION_ERROR", "Format input tidak valid.");
  } else if (error.type === "entity.too.large") {
    failure = new ApiError(413, "PAYLOAD_TOO_LARGE", "Ukuran request terlalu besar.");
  } else if (["encoding.unsupported", "charset.unsupported"].includes(error.type)) {
    failure = new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Encoding atau charset request tidak didukung.",
    );
  }
  if (!(failure instanceof ApiError)) {
    if (req.app.locals.config.nodeEnv !== "test") console.error("Request gagal:", error.name);
    failure = new ApiError(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server.");
  }
  res.status(failure.status).json({
    success: false,
    code: failure.code,
    message: failure.message,
    ...(failure.errors ? { errors: failure.errors } : {}),
  });
}

module.exports = { ApiError, errorHandler };
