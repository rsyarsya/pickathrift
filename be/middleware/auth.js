const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Akses ditolak. Token autentikasi tidak ditemukan.' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key_thrift', (err, user) => {
    if (err) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak valid atau sudah expired.' 
      });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Akses ditolak. Khusus Admin.' 
    });
  }
};

module.exports = { authenticateToken, requireAdmin };