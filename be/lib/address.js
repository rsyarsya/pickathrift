const mongoose = require("mongoose");
const validate = require("./validation");

const addressSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^08\d{8,11}$/ },
    street: { type: String, required: true, trim: true, maxlength: 1000 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, match: /^\d{5}$/ },
  },
  { _id: false },
);

/**
 * strict dipakai untuk input baru dari pengguna. Tanpa strict, aturan lama tetap berlaku agar
 * pemeriksaan data lama saat startup dan alamat profil yang sudah tersimpan tidak ikut ditolak.
 */
function addressInput(body, { strict = false } = {}) {
  const fields = ["recipient", "phone", "street", "city", "postalCode"];
  validate.fields(body, fields);
  const result = Object.fromEntries(
    fields.map((key) => [
      key,
      validate.text(body[key], `address.${key}`, {
        max: key === "street" ? 1000 : key === "phone" ? 30 : key === "postalCode" ? 5 : 100,
      }),
    ]),
  );
  if (strict) {
    result.recipient = validate.personName(result.recipient, "address.recipient");
    result.phone = validate.phone(result.phone, "address.phone");
    if (result.street.length < 8)
      validate.invalid("address.street", "Alamat lengkap minimal 8 karakter.");
    result.city = validate.personName(result.city, "address.city", validate.CITY);
    if (!/^[1-9]\d{4}$/.test(result.postalCode))
      validate.invalid("address.postalCode", "Kode pos 5 angka.");
    return result;
  }
  result.phone = result.phone.replace(/[\s()-]/g, "");
  if (!/^08\d{8,11}$/.test(result.phone)) validate.invalid("address.phone");
  if (!/^\d{5}$/.test(result.postalCode)) validate.invalid("address.postalCode");
  return result;
}

module.exports = { addressSchema, addressInput };
