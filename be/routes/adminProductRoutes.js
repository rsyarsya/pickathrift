const router = require("express").Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");
const products = require("../services/products");

router.use(authenticateToken, requireAdmin);
router.get("/", async (req, res) => {
  res.json({ success: true, data: await products.listProducts(req.query, true) });
});
router.get("/:id", validate.idParam("id"), async (req, res) => {
  res.json({
    success: true,
    data: serialize.product(await products.getProduct(req.params.id, true)),
  });
});

module.exports = router;
