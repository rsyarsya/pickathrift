const express = require('express');
const router = express.Router();
const Order = require('../models/order'); // Pastikan merujuk ke file model order Anda
const Product = require('../models/products');
const Setting = require('../models/settingModel'); 
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 1. POST /api/orders (Membuat pesanan & mengunci barang)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    // Kunci barang secara atomik (hanya jika status 'available')[cite: 2]
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

    // Membuat data pesanan baru dengan status awal 'pending'
    const order = new Order({
      buyer_id: req.user.id,
      product_id: product._id,
      total_price: product.price,
      status: 'pending',
      payment_proof: ''
    });
    await order.save();

    res.status(201).json({ 
      success: true, 
      message: 'Pesanan berhasil dibuat, barang dikunci. Silakan lakukan transfer manual.', 
      data: order 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/orders/my (Melihat daftar pesanan pembeli yang sedang login)[cite: 2]
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ buyer_id: req.user.id }).populate('product_id');
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/admin/orders (Admin - Melihat seluruh pesanan)[cite: 2]
router.get('/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('buyer_id', 'name email').populate('product_id');
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/orders/:id (Melihat detail pesanan berdasarkan ID)[cite: 2]
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('product_id');
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. PATCH /api/orders/:id/pay (User - Mengunggah bukti pembayaran manual)
router.patch('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { payment_proof } = req.body; // Bisa berupa URL gambar atau teks catatan transfer
    
    // Cari pesanan milik user yang sedang login lalu update bukti bayar & statusnya
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, buyer_id: req.user.id },
      { 
        payment_proof: payment_proof, 
        status: 'waiting_for_verification' // Berubah jadi menunggu verifikasi admin
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pesanan tidak ditemukan atau bukan milik Anda' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.', 
      data: order 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. PATCH /api/admin/orders/:id/status (Admin - Ubah Status, Verifikasi, & Resi)[cite: 2]
router.patch('/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, tracking_number } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, tracking_number },
      { new: true }
    );

    // Jika status pesanan menjadi success, delivered, atau completed, ubah status produk menjadi 'sold'[cite: 2]
    if (status === 'success' || status === 'delivered' || status === 'completed') {
      await Product.findByIdAndUpdate(order.product_id, { status: 'sold' });
    }

    res.status(200).json({ success: true, message: 'Status pesanan berhasil diperbarui', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/bank-settings (Admin - Mengatur info rekening bank)
router.patch('/admin/bank-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bank_name, account_number, account_holder } = req.body;

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }

    if (bank_name) setting.bank_name = bank_name;
    if (account_number) setting.account_number = account_number;
    if (account_holder) setting.account_holder = account_holder;

    await setting.save();

    res.status(200).json({ 
      success: true, 
      message: 'Informasi rekening bank berhasil diperbarui', 
      data: setting 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;