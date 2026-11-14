const router = require("express").Router();
const Product = require("../models/products");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

const productFields = [
  "title",
  "price",
  "category",
  "clothing_type",
  "brand",
  "size",
  "condition",
  "style",
  "status",
  "image_url",
];
const statuses = ["available", "reserved", "sold", "inactive"];

function productInput(body) {
  validate.fields(body, productFields);
  if (!Object.keys(body).length) validate.invalid("body");
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    result[key] =
      key === "price"
        ? validate.number(value, key)
        : validate.text(value, key, {
            required: ["title", "category", "status"].includes(key),
            max: key === "image_url" ? 2000 : 200,
          });
  }
  if (result.status !== undefined && !statuses.includes(result.status)) validate.invalid("status");
  return result;
}

router.get("/", async (req, res) => {
  validate.fields(req.query, [
    "category",
    "clothing_type",
    "brand",
    "size",
    "condition",
    "status",
    "min_price",
    "max_price",
    "search",
    "sort",
  ]);
  const query = { status: "available" };
  for (const key of ["category", "clothing_type", "brand", "size", "condition", "status"]) {
    if (req.query[key] !== undefined) query[key] = validate.text(req.query[key], key);
  }
  if (!statuses.includes(query.status)) validate.invalid("status");
  for (const [key, operator] of [
    ["min_price", "$gte"],
    ["max_price", "$lte"],
  ]) {
    if (req.query[key] !== undefined) {
      const input = validate.text(req.query[key], key);
      query.price ??= {};
      query.price[operator] = validate.number(Number(input), key);
    }
  }
  if (query.price?.$gte > query.price?.$lte) validate.invalid("min_price");
  if (req.query.search !== undefined) {
    const literal = validate
      .text(req.query.search, "search", { required: false })
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.title = { $regex: literal, $options: "i" };
  }
  const sort = req.query.sort;
  if (sort !== undefined && !["price_asc", "price_desc"].includes(sort)) validate.invalid("sort");
  const sortOption =
    sort === "price_asc" ? { price: 1 } : sort === "price_desc" ? { price: -1 } : {};
  const products = await Product.find(query).sort(sortOption);
  res.json({ success: true, count: products.length, data: products.map(serialize.product) });
});

router.post("/match", async (req, res) => {
  validate.fields(req.body, ["clothing_type", "style", "size", "max_budget"]);
  const query = { status: "available" };
  for (const key of ["clothing_type", "style", "size"]) {
    if (req.body[key] !== undefined) query[key] = validate.text(req.body[key], key);
  }
  if (req.body.max_budget !== undefined)
    query.price = { $lte: validate.number(req.body.max_budget, "max_budget") };
  const products = await Product.find(query);
  res.json({ success: true, data: products.map(serialize.product) });
});

router.get("/:id", validate.idParam("id"), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
  res.json({ success: true, data: serialize.product(product) });
});

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const product = await Product.create(productInput(req.body));
  res.status(201).json({ success: true, data: serialize.product(product) });
});

router.patch("/:id", authenticateToken, requireAdmin, validate.idParam("id"), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, productInput(req.body), {
    returnDocument: "after",
    runValidators: true,
  });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
  res.json({ success: true, data: serialize.product(product) });
});

router.delete("/:id", authenticateToken, requireAdmin, validate.idParam("id"), async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { status: "inactive" },
    { returnDocument: "after", runValidators: true },
  );
  if (!product) throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
  res.json({ success: true, data: serialize.product(product) });
});

module.exports = router;
