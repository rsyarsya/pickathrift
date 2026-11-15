const { Router } = require("express");
const orderRouter = Router();
const adminOrderRouter = Router();
const Order = require("../models/order");
const { createOrder, cancelOrder, expireOrders } = require("../services/orders");
const { authenticateToken, requireAdmin, requireBuyer } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

orderRouter.use(authenticateToken);
orderRouter.post("/", requireBuyer, async (req, res) => {
  const order = await createOrder(req.account, req.body);
  res.status(201).json({ success: true, data: serialize.order(order) });
});

orderRouter.post("/:id/cancel", requireBuyer, validate.idParam("id"), async (req, res) => {
  validate.fields(req.body, []);
  const order = await cancelOrder(req.params.id, req.user.id);
  res.json({ success: true, data: serialize.order(order) });
});

orderRouter.get("/my", requireBuyer, async (req, res) => {
  await expireOrders();
  const orders = await Order.find({ buyer_id: req.user.id }).populate("product_id");
  res.json({ success: true, data: orders.map(serialize.order) });
});

orderRouter.get("/:id", validate.idParam("id"), async (req, res) => {
  await expireOrders();
  const order = await Order.findById(req.params.id).populate("product_id");
  if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  if (req.user.role !== "admin" && String(order.buyer_id) !== req.user.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pesanan ini.");
  }
  res.json({ success: true, data: serialize.order(order) });
});

adminOrderRouter.use(authenticateToken, requireAdmin);
adminOrderRouter.get("/", async (req, res) => {
  await expireOrders();
  const orders = await Order.find().populate("buyer_id", "name email").populate("product_id");
  res.json({ success: true, data: orders.map(serialize.order) });
});

adminOrderRouter.patch("/:id/status", validate.idParam("id"), async (req) => {
  if (!(await Order.exists({ _id: req.params.id })))
    throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  throw new ApiError(
    409,
    "TRANSITION_UNAVAILABLE",
    "Gunakan tindakan pembayaran/pengiriman setelah batch berikutnya tersedia.",
  );
});

module.exports = { orderRouter, adminOrderRouter };
