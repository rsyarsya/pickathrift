const validate = require("./validation");
const {
  CATEGORIES,
  TOP_SIZES,
  WAIST_SIZES,
  CONDITIONS,
  STYLES,
  isImageReference,
} = require("./product-options");

const mutableFields = [
  "name",
  "brand",
  "category",
  "size",
  "condition",
  "style",
  "color",
  "price",
  "images",
  "measurements",
];

function choice(value, key, options) {
  const result = validate.text(value, key);
  if (!options.includes(result)) validate.invalid(key);
  return result;
}

function productInput(body, partial = false) {
  validate.fields(body, partial ? [...mutableFields, "active"] : mutableFields);
  if (!Object.keys(body).length) validate.invalid("body");
  const input = {};
  for (const [key, max] of [
    ["name", 200],
    ["brand", 100],
    ["color", 100],
  ]) {
    if (body[key] !== undefined || (!partial && key !== "color")) {
      input[key] = validate.text(body[key], key, { max, required: key !== "color" });
    }
  }
  for (const [key, options] of [
    ["category", CATEGORIES],
    ["size", [...TOP_SIZES, ...WAIST_SIZES]],
    ["condition", CONDITIONS],
    ["style", STYLES],
  ]) {
    if (body[key] !== undefined || !partial) input[key] = choice(body[key], key, options);
  }
  if (body.price !== undefined || !partial)
    input.price = validate.number(body.price, "price", { min: 1000, integer: true });
  if (body.images !== undefined || !partial) {
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 4)
      validate.invalid("images");
    input.images = body.images.map((image) => {
      const result = validate.text(image, "images", { max: 2000 });
      if (!isImageReference(result))
        validate.invalid("images", "Gunakan URL HTTP(S) atau path publik lokal.");
      return result;
    });
  }
  if (body.measurements !== undefined) {
    if (!Array.isArray(body.measurements) || body.measurements.length > 4)
      validate.invalid("measurements");
    input.measurements = body.measurements.map((entry) => {
      validate.fields(entry, ["label", "cm"]);
      const label = validate.text(entry.label, "measurements.label");
      const cm = validate.number(entry.cm, "measurements.cm", { min: Number.MIN_VALUE, max: 200 });
      return { label, cm };
    });
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") validate.invalid("active");
    input.active = body.active;
  }
  return input;
}

module.exports = { productInput };
