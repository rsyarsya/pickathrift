const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Product = require('../models/products');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/orders (Membuat pesanan & mengunci barang)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    // Kunci barang secara atomik (hanya jika status 'available')
    const product = await Product.findOneAndUpdate(
      { _id: product_id, status: 'available' },
      { status: 'reserved' },
      { new: true }
    );

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Barang sudah dipesan atau terjual oleh pembeli lain.'
      });
    }

    const order = new Order({
      buyer_id: req.user.id,
      product_id: product._id,
      total_price: product.price
    });
    await order.save();

    res.status(201).json({ success: true, message: 'Pesanan berhasil dibuat, barang dikunci', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/my
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ buyer_id: req.user.id }).populate('product_id');
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/orders (Admin - Seluruh Pesanan)
router.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('buyer_id', 'name email').populate('product_id');
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('product_id');
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/orders/:id/status (Admin - Ubah Status & Resi)
router.patch('/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, tracking_number } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, tracking_number },
      { new: true }
    );

    // Jika pesanan selesai, update status produk jadi 'sold'
    if (status === 'completed') {
      await Product.findByIdAndUpdate(order.product_id, { status: 'sold' });
    }

    res.status(200).json({ success: true, message: 'Status pesanan diperbarui', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;