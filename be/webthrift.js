require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Koneksi Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Terhubung ke MongoDB Atlas'))
  .catch((err) => console.error('Gagal koneksi MongoDB:', err));

// Register Base Route
app.get('/', (req, res) => {
  res.send('Server pickathrift Berjalan!');
});

// Mount Routes Sesuai Spesifikasi Milestone 1
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', orderRoutes);  // Menampung /api/admin/orders
app.use('/api', reviewRoutes); // Menampung /api/orders/:id/review dan /api/reviews

// Jalankan Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});