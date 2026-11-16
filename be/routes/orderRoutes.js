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
  const order = await createOrder(req.account, req.body, req.app.locals.config);
  res.status(201).json({ success: true, data: serialize.order(order) });
});

orderRouter.post("/:id/payment", requireBuyer, validate.idParam("id"), async (req, res) => {
  res.set("Cache-Control", "no-store");
  validate.fields(req.body, []);
  const result = await require("../services/midtrans").paymentSession(
    req.params.id,
    req.account,
    req.app.locals.config,
  );
  res.status(result.created ? 201 : 200).json({ success: true, data: result.data });
});

orderRouter.post("/:id/cancel", requireBuyer, validate.idParam("id"), async (req, res) => {
  validate.fields(req.body, []);
  const order = await cancelOrder(req.params.id, req.user.id, new Date(), req.app.locals.config);
  res.json({ success: true, data: serialize.order(order) });
});

orderRouter.post("/:id/payment/sync", validate.idParam("id"), async (req, res) => {
  res.set("Cache-Control", "no-store");
  validate.fields(req.body, []);
  await require("../services/payments").ownedOrder(req.params.id, req.account);
  const order = await require("../services/payment-sync").reconcile(
    req.params.id,
    req.app.locals.config,
  );
  res.json({ success: true, data: serialize.order(order) });
});

orderRouter.post("/:id/receive", requireBuyer, validate.idParam("id"), async (req, res) => {
  validate.fields(req.body, []);
  const order = await require("../services/payments").receiveOrder(req.params.id, req.account);
  res.json({ success: true, data: serialize.order(order) });
});
orderRouter.get("/my", requireBuyer, async (req, res) => {
  await expireOrders(new Date(), req.app.locals.config);
  const orders = await Order.find({ buyer_id: req.user.id })
    .populate("product_id")
    .populate({ path: "review", populate: { path: "buyer_id", select: "name" } });
  res.json({ success: true, data: orders.map(serialize.order) });
});

orderRouter.get("/:id", validate.idParam("id"), async (req, res) => {
  await expireOrders(new Date(), req.app.locals.config);
  const order = await Order.findById(req.params.id)
    .populate("product_id")
    .populate({ path: "review", populate: { path: "buyer_id", select: "name" } });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  if (req.user.role !== "admin" && String(order.buyer_id) !== req.user.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pesanan ini.");
  }
  res.json({ success: true, data: serialize.order(order) });
});

adminOrderRouter.use(authenticateToken, requireAdmin);
adminOrderRouter.post("/:id/actions", validate.idParam("id"), async (req, res) => {
  const order = await require("../services/payments").adminAction(
    req.params.id,
    req.body,
    req.app.locals.config,
  );
  res.json({ success: true, data: serialize.order(order) });
});
adminOrderRouter.get("/", async (req, res) => {
  await expireOrders(new Date(), req.app.locals.config);
  validate.fields(req.query, ["status", "page", "limit"]);
  const statuses = require("../lib/order-options").STATUSES;
  if (req.query.status !== undefined && !statuses.includes(req.query.status))
    validate.invalid("status");
  const positive = (key, fallback, max) => {
    const value = req.query[key];
    if (value === undefined) return fallback;
    if (
      typeof value !== "string" ||
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) > max
    )
      validate.invalid(key);
    return Number(value);
  };
  const page = positive("page", 1, 1000000),
    limit = positive("limit", 20, 100);
  const filter = req.query.status ? { status: req.query.status } : {};
  const orders = await Order.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("buyer_id", "name email")
    .populate("product_id")
    .populate({ path: "review", populate: { path: "buyer_id", select: "name" } });
  const groups = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const group of groups) counts[group._id] = group.count;
  const total = await Order.countDocuments(filter);
  res.json({
    success: true,
    data: orders.map(serialize.order),
    total,
    counts,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

adminOrderRouter.patch("/:id/status", validate.idParam("id"), async (req) => {
  if (!(await Order.exists({ _id: req.params.id })))
    throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
  throw new ApiError(
    409,
    "TRANSITION_UNAVAILABLE",
    "Gunakan endpoint actions untuk tindakan pembayaran/pengiriman.",
  );
});

module.exports = { orderRouter, adminOrderRouter };
