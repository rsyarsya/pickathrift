const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'], default: 'pending' },
  tracking_number: { type: String, default: '' },
  total_price: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);