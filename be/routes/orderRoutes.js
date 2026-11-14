const { Router } = require("express");
const orderRouter = Router();
const adminOrderRouter = Router();
const Order = require("../models/order");
const Product = require("../models/products");
const { authenticateToken, requireAdmin, requireBuyer } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

orderRouter.use(authenticateToken);
orderRouter.post("/", requireBuyer, async (req, res) => {
  validate.fields(req.body, ["product_id"]);
  const productId = validate.objectId(req.body.product_id, "product_id");
  // Transaksi dan pemulihan stok ditangani pada batch pesanan.
  const product = await Product.findOneAndUpdate(
    { _id: productId, status: "available", active: true },
    { status: "reserved" },
    { returnDocument: "after" },
  );
  if (!product) {
    if (!(await Product.exists({ _id: productId, active: true })))
      throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
    throw new ApiError(409, "STOCK_CONFLICT", "Barang sudah dipesan atau terjual.");
  }
  const order = await Order.create({
    buyer_id: req.user.id,
    product_id: product.id,
    product_snapshot: serialize.product(product),
    total_price: product.price,
  });
  res.status(201).json({ success: true, data: serialize.order(order) });
});

orderRouter.get("/my", requireBuyer, async (req, res) => {
  const orders = await Order.find({ buyer_id: req.user.id }).populate("product_id");
  res.json({ success: true, data: orders.map(serialize.order) });
});

orderRouter.get("/:id", validate.idParam("id"), async (req, res) => {
  const order = await Order.findById(req.params.id).populate("product_id");
  if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  if (req.user.role !== "admin" && String(order.buyer_id) !== req.user.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pesanan ini.");
  }
  res.json({ success: true, data: serialize.order(order) });
});

adminOrderRouter.use(authenticateToken, requireAdmin);
adminOrderRouter.get("/", async (req, res) => {
  const orders = await Order.find().populate("buyer_id", "name email").populate("product_id");
  res.json({ success: true, data: orders.map(serialize.order) });
});

adminOrderRouter.patch("/:id/status", validate.idParam("id"), async (req, res) => {
  validate.fields(req.body, ["status", "tracking_number"]);
  if (!Object.keys(req.body).length) validate.invalid("body");
  const update = {};
  if (req.body.status !== undefined) {
    if (!["pending", "paid", "shipped", "completed", "cancelled"].includes(req.body.status))
      validate.invalid("status");
    update.status = req.body.status;
  }
  if (req.body.tracking_number !== undefined)
    update.tracking_number = validate.text(req.body.tracking_number, "tracking_number", {
      max: 100,
      required: false,
    });
  const order = await Order.findByIdAndUpdate(req.params.id, update, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  // Transisi bisnis lengkap menggantikan pembaruan status lama pada batch pembayaran.
  if (update.status === "completed")
    await Product.findByIdAndUpdate(order.product_id, { status: "sold" });
  res.json({ success: true, data: serialize.order(order) });
});

module.exports = { orderRouter, adminOrderRouter };
