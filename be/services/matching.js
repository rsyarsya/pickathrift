const Product = require("../models/products");
const validate = require("../lib/validation");
const { CATEGORIES, STYLES, sizesFor, measurementsFor } = require("../lib/product-options");
const serialize = require("../lib/serializers");

async function matchProducts(body) {
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
      const diff = actual === undefined ? Infinity : Math.abs(actual - entry.cm);
      if (diff > 2) {
        fits = false;
        break;
      }
      diffCm += diff;
    }
    if (fits) matches.push({ product: serialize.product(product), diffCm });
  }
  return matches.sort((a, b) => a.diffCm - b.diffCm);
}
module.exports = { matchProducts };
