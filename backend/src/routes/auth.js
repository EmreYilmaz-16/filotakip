const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/auth/login
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Kullanici adi gerekli.'),
    body('password').notEmpty().withMessage('Sifre gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await db.query(
        'SELECT id, username, email, password_hash, full_name, role, is_active FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      const user = result.rows[0];
      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Kullanici adi veya sifre hatali.' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Kullanici adi veya sifre hatali.' });
      }
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// POST /api/auth/change-password
const { authenticate } = require('../middleware/auth');
router.post('/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }).withMessage('Yeni sifre en az 8 karakter olmali.'),
  ],
  validate,
  async (req, res) => {
    const { current_password, new_password } = req.body;
    try {
      const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Mevcut sifre yanlis.' });
      const hash = await bcrypt.hash(new_password, 12);
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
      res.json({ message: 'Sifre basariyla degistirildi.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
