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

function addressInput(body) {
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
  result.phone = result.phone.replace(/[\s()-]/g, "");
  if (!/^08\d{8,11}$/.test(result.phone)) validate.invalid("address.phone");
  if (!/^\d{5}$/.test(result.postalCode)) validate.invalid("address.postalCode");
  return result;
}

module.exports = { addressSchema, addressInput };
