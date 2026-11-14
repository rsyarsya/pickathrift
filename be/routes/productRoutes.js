const express = require('express');
const router = express.Router();
const Product = require('../models/products');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products (Katalog, Search, Filter, Sort)
router.get('/', async (req, res) => {
  try {
    const { category, clothing_type, brand, size, condition, min_price, max_price, status, search, sort } = req.query;
    let query = { status: status || 'available' };

    if (category) query.category = category;
    if (clothing_type) query.clothing_type = clothing_type;
    if (brand) query.brand = brand;
    if (size) query.size = size;
    if (condition) query.condition = condition;
    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = Number(min_price);
      if (max_price) query.price.$lte = Number(max_price);
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    if (sort === 'price_desc') sortOption.price = -1;

    const products = await Product.find(query).sort(sortOption);
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/match (Cari yang cocok)
router.post('/match', async (req, res) => {
  try {
    const { clothing_type, style, size, max_budget } = req.body;
    let query = { status: 'available' };

    if (clothing_type) query.clothing_type = clothing_type;
    if (style) query.style = style;
    if (size) query.size = size;
    if (max_budget) query.price = { $lte: Number(max_budget) };

    const matchedProducts = await Product.find(query);
    res.status(200).json({ success: true, data: matchedProducts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/products/:id (Admin)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, message: 'Data barang diperbarui', data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id (Admin - Menonaktifkan Barang)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const disabledProduct = await Product.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
    res.status(200).json({ success: true, message: 'Barang dinonaktifkan dari katalog', data: disabledProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;