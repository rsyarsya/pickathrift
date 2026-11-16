const { expireOrders } = require("./orders");
const Product = require("../models/products");
const validate = require("../lib/validation");
const { CATEGORIES, STYLES, sizesFor, measurementsFor } = require("../lib/product-options");
const serialize = require("../lib/serializers");

async function matchProducts(body, config = {}) {
  await expireOrders(new Date(), config);
  validate.fields(body, ["category", "style", "size", "minPrice", "maxPrice", "measurements"]);
  const category = validate.text(body.category, "category");
  if (!CATEGORIES.includes(category)) validate.invalid("category");
  const query = { category, active: true, status: "available" };
  for (const [key, options] of [
    ["style", STYLES],
    ["size", sizesFor(category)],
  ]) {
    if (body[key] !== undefined) {
      query[key] = validate.text(body[key], key);
      if (!options.includes(query[key])) validate.invalid(key);
    }
  }
  for (const [key, operator] of [
    ["minPrice", "$gte"],
    ["maxPrice", "$lte"],
  ]) {
    if (body[key] !== undefined) {
      query.price ??= {};
      query.price[operator] = validate.number(body[key], key, { integer: true });
    }
  }
  if (body.minPrice !== undefined && body.maxPrice !== undefined && body.minPrice > body.maxPrice)
    validate.invalid("minPrice");
  const measurements = body.measurements ?? [];
  if (body.measurements === null || !Array.isArray(measurements) || measurements.length > 4)
    validate.invalid("measurements");
  const labels = new Set();
  const criteria = measurements.map((entry) => {
    validate.fields(entry, ["label", "cm"]);
    const label = validate.text(entry.label, "measurements.label");
    if (!measurementsFor(category).includes(label) || labels.has(label))
      validate.invalid("measurements.label");
    labels.add(label);
    return {
      label,
      cm: validate.number(entry.cm, "measurements.cm", { min: Number.MIN_VALUE, max: 200 }),
    };
  });
  const products = await Product.find(query).sort({ createdAt: -1, _id: -1 });
  const matches = [];
  for (const product of products) {
    let diffCm = 0;
    let fits = true;
    for (const entry of criteria) {
      const actual = product.measurements.find((m) => m.label === entry.label)?.cm;
      if (actual === undefined) {
        fits = false;
        break;
      }
      const diff = Math.abs(actual - entry.cm);
      // Abaikan galat representasi biner kedua operand, bukan memperlebar toleransi cm.
      const roundingError = 2 * Number.EPSILON * Math.max(1, actual, entry.cm);
      if (diff > 2 + roundingError) {
        fits = false;
        break;
      }
      diffCm += Math.abs(diff - 2) <= roundingError ? 2 : diff;
    }
    if (fits) matches.push({ product: serialize.product(product), diffCm });
  }
  // Pengukuran dibatasi 200 cm. Hasil yang seri dalam galat biner mempertahankan
  // urutan createdAt/ID dari query, bukan diurutkan ulang karena noise desimal.
  const scoreError = 2 * Number.EPSILON * 200 * criteria.length;
  return matches.sort((a, b) => {
    const difference = a.diffCm - b.diffCm;
    return Math.abs(difference) <= scoreError ? 0 : difference;
  });
}
module.exports = { matchProducts };
