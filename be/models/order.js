const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  status: { 
    type: String, 
    enum: [
      'pending',                  // 1. Baru dibuat, belum bayar
      'waiting_for_verification', // 2. User sudah upload bukti transfer, menunggu admin
      'success',                  // 3. Pembayaran diverifikasi valid oleh admin
      'shipped',                  // 4. Barang dikirim (Admin mengisi nomor resi)
      'delivered',                // 5. Barang sudah sampai ke tangan pembeli
      'completed',                // 6. Pesanan selesai sepenuhnya
      'cancelled'                 // 7. Pesanan dibatalkan
    ], 
    default: 'pending' 
  },
  tracking_number: { type: String, default: '' }, // Untuk nomor resi pengiriman
  total_price: { type: Number, required: true },
  payment_proof: { type: String, default: '' }     // Untuk link/catatan bukti transfer manual
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);