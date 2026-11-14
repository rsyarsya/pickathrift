const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  clothing_type: { type: String }, // jenis pakaian
  brand: { type: String },
  size: { type: String },
  condition: { type: String },
  style: { type: String },
  status: { type: String, enum: ['available', 'reserved', 'sold', 'inactive'], default: 'available' },
  image_url: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema, 'products');