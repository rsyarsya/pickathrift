const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  bank_name: { type: String, required: true },       // Contoh: BCA, Mandiri, dll
  account_number: { type: String, required: true },  // Contoh: 1234567890
  account_holder: { type: String, required: true },  // Contoh: a.n PickaThrift Official
  qr_code_image: { type: String, default: '' }       // Opsional: Link gambar QRIS
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);