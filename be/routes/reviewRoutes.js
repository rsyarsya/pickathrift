const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Order = require('../models/order');
const { authenticateToken } = require('../middleware/auth');

// POST /api/orders/:id/review (Buyer)
router.post('/orders/:id/review', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    if (order.buyer_id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses memberikan ulasan untuk pesanan ini.' });
    }

    const review = new Review({
      order_id: order._id,
      buyer_id: req.user.id,
      rating,
      comment
    });
    await review.save();

    res.status(201).json({ success: true, message: 'Ulasan berhasil diberikan', data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews (Publik)
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().populate('buyer_id', 'name');
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;