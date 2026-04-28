const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme token\'i gerekli.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Gecersiz veya devre disi kullanici.' });
    }
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus token.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Bu islem icin yetkiniz bulunmuyor.' });
  }
  next();
};

module.exports = { authenticate, authorize };
