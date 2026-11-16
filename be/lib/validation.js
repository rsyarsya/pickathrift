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

/** "+62 812-3456-7890" dan "62812…" disimpan seragam sebagai "0812…". */
function phone(value, field, { required = true } = {}) {
  const raw = text(value, field, { max: 30, required });
  if (!raw) return "";
  let result = raw.replace(/[\s().-]/g, "");
  if (result.startsWith("+62")) result = `0${result.slice(3)}`;
  else if (result.startsWith("62")) result = `0${result.slice(2)}`;
  if (!/^08\d{8,11}$/.test(result))
    invalid(field, "Nomor HP 10 sampai 13 angka, diawali 08 atau +62.");
  return result;
}

const PERSON = /^[\p{L}\p{M} .,'-]+$/u;
const CITY = /^[\p{L}\p{M} .,'()-]+$/u;

/** Nama orang (atau kota dengan pattern CITY): 2–100 karakter, ada huruf, tanpa angka/simbol. */
function personName(value, field, pattern = PERSON) {
  const result = text(value, field, { max: 100 });
  if (result.length < 2 || !/\p{L}/u.test(result) || !pattern.test(result))
    invalid(field, "Minimal 2 huruf, tanpa angka atau simbol.");
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
  if (body.phone !== undefined) result.phone = phone(body.phone, "phone", { required: false });
  if (body.address !== undefined)
    result.address = require("./address").addressInput(body.address, { strict: true });
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
  phone,
  personName,
  CITY,
  registration,
  objectId,
  idParam,
  number,
};
