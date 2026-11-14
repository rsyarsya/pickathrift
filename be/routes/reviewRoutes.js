const router = require("express").Router();
const Review = require("../models/review");
const Order = require("../models/order");
const { authenticateToken, requireBuyer } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

router.post(
  "/orders/:id/review",
  authenticateToken,
  requireBuyer,
  validate.idParam("id"),
  async (req, res) => {
    validate.fields(req.body, ["rating", "comment"]);
    const rating = validate.number(req.body.rating, "rating", { min: 1, max: 5, integer: true });
    const comment = validate.text(req.body.comment, "comment", { max: 500 });
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Pesanan tidak ditemukan.");
    if (String(order.buyer_id) !== req.user.id)
      throw new ApiError(403, "FORBIDDEN", "Ulasan hanya untuk pesanan sendiri.");
    // Aturan Selesai dan satu ulasan per order menyusul pada batch ulasan.
    const review = await Review.create({
      order_id: order.id,
      buyer_id: req.user.id,
      rating,
      comment,
    });
    await review.populate("buyer_id", "name");
    res.status(201).json({ success: true, data: serialize.review(review) });
  },
);

router.get("/reviews", async (req, res) => {
  const reviews = await Review.find().populate("buyer_id", "name");
  res.json({ success: true, data: reviews.map(serialize.review) });
});

module.exports = router;
