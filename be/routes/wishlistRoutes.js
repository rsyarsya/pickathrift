const { expireOrders } = require("../services/orders");
const router = require("express").Router();
const Wishlist = require("../models/wishlist");
const Product = require("../models/products");
const { authenticateToken, requireBuyer } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

router.use(authenticateToken, requireBuyer);
router.get("/", async (req, res) => {
  await expireOrders(new Date(), req.app.locals.config);
  const items = await Wishlist.find({ user_id: req.user.id }).populate("product_id");
  res.json({ success: true, data: items.map(serialize.wishlist) });
});

router.post("/:productId", validate.idParam("productId"), async (req, res) => {
  if (!(await Product.exists({ _id: req.params.productId, active: true })))
    throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
  const key = { user_id: req.user.id, product_id: req.params.productId };
  if (await Wishlist.exists(key))
    throw new ApiError(409, "CONFLICT", "Barang sudah ada di wishlist.");
  const item = await Wishlist.create(key);
  await item.populate("product_id");
  res.status(201).json({ success: true, data: serialize.wishlist(item) });
});

router.delete("/:productId", validate.idParam("productId"), async (req, res) => {
  const item = await Wishlist.findOneAndDelete({
    user_id: req.user.id,
    product_id: req.params.productId,
  });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Barang tidak ada di wishlist Anda.");
  res.json({ success: true, data: { id: item.id } });
});

module.exports = router;
