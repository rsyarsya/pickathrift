const express = require('express');
const router = express.Router();
const Wishlist = require('../models/wishlist');
const { authenticateToken } = require('../middleware/auth');

// GET /api/wishlist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ user_id: req.user.id }).populate('product_id');
    res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/wishlist/:productId
router.post('/:productId', authenticateToken, async (req, res) => {
  try {
    const exists = await Wishlist.findOne({ user_id: req.user.id, product_id: req.params.productId });
    if (exists) return res.status(400).json({ success: false, message: 'Barang sudah ada di wishlist' });

    const item = new Wishlist({ user_id: req.user.id, product_id: req.params.productId });
    await item.save();
    res.status(201).json({ success: true, message: 'Berhasil menambahkan ke wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', authenticateToken, async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({ user_id: req.user.id, product_id: req.params.productId });
    res.status(200).json({ success: true, message: 'Barang dihapus dari wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;