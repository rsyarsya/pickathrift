const validate = require("./validation");
const { CATEGORIES, TOP_SIZES, WAIST_SIZES, CONDITIONS, STATUSES } = require("./product-options");

function enumValue(value, field, options) {
  const result = validate.text(value, field);
  if (!options.includes(result)) validate.invalid(field);
  return result;
}

function many(value, field, options) {
  const values = (Array.isArray(value) ? value : [value]).flatMap((item) =>
    validate.text(item, field).split(","),
  );
  if (values.length > 30) validate.invalid(field);
  return [...new Set(values.map((item) => enumValue(item, field, options)))];
}

function numeric(value, field, settings = {}) {
  const input = validate.text(value, field, { max: 30 });
  if (!/^\d+(?:\.\d+)?$/.test(input)) validate.invalid(field);
  return validate.number(Number(input), field, settings);
}

function boolean(value, field) {
  if (!["true", "false"].includes(value)) validate.invalid(field);
  return value === "true";
}

function catalogQuery(query, admin = false) {
  validate.fields(query, [
    "q",
    "category",
    "sizes",
    "conditions",
    "minPrice",
    "maxPrice",
    "availableOnly",
    "sort",
    "page",
    "limit",
    ...(admin ? ["status", "active"] : []),
  ]);
  const filter = admin ? {} : { active: true };
  if (query.q !== undefined) {
    const literal = validate
      .text(query.q, "q", { required: false })
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (literal)
      filter.$or = ["name", "brand"].map((key) => ({ [key]: { $regex: literal, $options: "i" } }));
  }
  if (query.category !== undefined)
    filter.category = enumValue(query.category, "category", CATEGORIES);
  if (query.sizes !== undefined)
    filter.size = { $in: many(query.sizes, "sizes", [...TOP_SIZES, ...WAIST_SIZES]) };
  if (query.conditions !== undefined)
    filter.condition = { $in: many(query.conditions, "conditions", CONDITIONS) };
  for (const [field, operator] of [
    ["minPrice", "$gte"],
    ["maxPrice", "$lte"],
  ]) {
    if (query[field] !== undefined) {
      filter.price ??= {};
      filter.price[operator] = numeric(query[field], field);
    }
  }
  if (filter.price?.$gte > filter.price?.$lte) validate.invalid("minPrice");
  if (query.availableOnly !== undefined && boolean(query.availableOnly, "availableOnly"))
    filter.status = "available";
  if (admin && query.status !== undefined) {
    const status = enumValue(query.status, "status", STATUSES);
    if (filter.status && filter.status !== status)
      validate.invalid("status", "Filter status bertentangan dengan availableOnly.");
    filter.status = status;
  }
  if (admin && query.active !== undefined) filter.active = boolean(query.active, "active");
  const sort =
    query.sort === undefined
      ? "terbaru"
      : enumValue(query.sort, "sort", ["terbaru", "termurah", "termahal"]);
  const order =
    admin && sort === "terbaru"
      ? { updatedAt: -1, _id: -1 }
      : {
          ...(sort === "termurah" ? { price: 1 } : sort === "termahal" ? { price: -1 } : {}),
          createdAt: -1,
          _id: -1,
        };
  const limit =
    query.limit === undefined
      ? 12
      : numeric(query.limit, "limit", { min: 1, max: 100, integer: true });
  const page =
    query.page === undefined ? 1 : numeric(query.page, "page", { min: 1, integer: true });
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) validate.invalid("page");
  return { filter, order, page, limit, skip };
}

module.exports = { catalogQuery };
