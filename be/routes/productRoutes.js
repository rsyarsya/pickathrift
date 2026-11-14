const router = require("express").Router();
const Product = require("../models/products");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const validate = require("../lib/validation");
const { productInput } = require("../lib/product-input");
const { CATEGORIES, STYLES, TOP_SIZES, WAIST_SIZES } = require("../lib/product-options");
const serialize = require("../lib/serializers");
const products = require("../services/products");

router.get("/", async (req, res) => {
  res.json({ success: true, data: await products.listProducts(req.query) });
});

// Filter dasar lama dipertahankan sampai algoritme pencocokan batch 3 selesai.
router.post("/match", async (req, res) => {
  validate.fields(req.body, ["clothing_type", "style", "size", "max_budget"]);
  const query = { status: "available", active: true };
  for (const [key, target, options] of [
    ["clothing_type", "category", CATEGORIES],
    ["style", "style", STYLES],
    ["size", "size", [...TOP_SIZES, ...WAIST_SIZES]],
  ]) {
    if (req.body[key] !== undefined) {
      const value = validate.text(req.body[key], key);
      if (!options.includes(value)) validate.invalid(key);
      query[target] = value;
    }
  }
  if (req.body.max_budget !== undefined)
    query.price = { $lte: validate.number(req.body.max_budget, "max_budget") };
  const matches = await Product.find(query);
  res.json({ success: true, data: matches.map(serialize.product) });
});

router.get("/:id", validate.idParam("id"), async (req, res) => {
  res.json({ success: true, data: serialize.product(await products.getProduct(req.params.id)) });
});

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const product = await Product.create(productInput(req.body));
  res.status(201).json({ success: true, data: serialize.product(product) });
});

router.patch("/:id", authenticateToken, requireAdmin, validate.idParam("id"), async (req, res) => {
  const product = await products.updateProduct(req.params.id, productInput(req.body, true));
  res.json({ success: true, data: serialize.product(product) });
});

router.delete("/:id", authenticateToken, requireAdmin, validate.idParam("id"), async (req, res) => {
  const product = await products.updateProduct(req.params.id, { active: false });
  res.json({ success: true, data: serialize.product(product) });
});

module.exports = router;
