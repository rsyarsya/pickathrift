const { ApiError } = require("./errors");

function invalid(field, message = "Nilai tidak valid.") {
  throw new ApiError(422, "VALIDATION_ERROR", "Periksa kembali isian.", { [field]: message });
}

function objectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    invalid("body", "Body harus objek JSON.");
  return body;
}

function fields(body, allowed) {
  objectBody(body);
  for (const key of Object.keys(body))
    if (!allowed.includes(key)) invalid(key, "Field tidak didukung.");
}

function text(value, field, { max = 200, required = true, trim = true } = {}) {
  if (typeof value !== "string") invalid(field, "Harus berupa teks.");
  const result = trim ? value.trim() : value;
  if ((required && !result) || result.length > max) invalid(field);
  return result;
}

function email(value) {
  const result = text(value, "email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) invalid("email", "Format email belum benar.");
  return result;
}

function password(value, registration = false) {
  const result = text(value, "password", { max: 72, trim: false });
  if ((registration && result.length < 8) || Buffer.byteLength(result, "utf8") > 72) {
    invalid("password", "Kata sandi registrasi minimal 8 karakter; batas maksimal 72 byte UTF-8.");
  }
  return result;
}

function registration(body) {
  objectBody(body);
  const result = {
    name: text(body.name, "name", { max: 100 }),
    email: email(body.email),
    password: password(body.password, true),
  };
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password)
    invalid("confirmPassword");
  if (body.phone !== undefined)
    result.phone = text(body.phone, "phone", { max: 30, required: false });
  if (body.address !== undefined)
    result.address = text(body.address, "address", { max: 1000, required: false });
  return result;
}

function objectId(value, field = "id") {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) invalid(field, "ID tidak valid.");
  return value;
}

function idParam(name) {
  return (req, res, next) => {
    objectId(req.params[name], name);
    next();
  };
}

function number(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    invalid(field);
  return value;
}

module.exports = {
  invalid,
  objectBody,
  fields,
  text,
  email,
  password,
  registration,
  objectId,
  idParam,
  number,
};
