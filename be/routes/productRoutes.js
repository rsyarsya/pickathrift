const router = require("express").Router();
const Product = require("../models/products");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const validate = require("../lib/validation");
const { productInput } = require("../lib/product-input");
const { matchProducts } = require("../services/matching");
const serialize = require("../lib/serializers");
const products = require("../services/products");

router.get("/", async (req, res) => {
  res.json({ success: true, data: await products.listProducts(req.query) });
});

router.post("/match", async (req, res) => {
  res.json({ success: true, data: await matchProducts(req.body) });
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
