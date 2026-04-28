const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/users - Sadece admin ve manager
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users ORDER BY full_name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/users
router.post('/',
  authorize('admin'),
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Kullanici adi en az 3 karakter.'),
    body('email').isEmail().withMessage('Gecerli bir e-posta girin.'),
    body('password').isLength({ min: 8 }).withMessage('Sifre en az 8 karakter olmali.'),
    body('full_name').trim().notEmpty().withMessage('Ad soyad gerekli.'),
    body('role').isIn(['admin', 'manager', 'driver']).withMessage('Gecersiz rol.'),
  ],
  validate,
  async (req, res) => {
    const { username, email, password, full_name, role, phone } = req.body;
    try {
      const hash = await bcrypt.hash(password, 12);
      const result = await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, phone)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, username, email, full_name, role, phone, is_active, created_at
      `, [username, email, hash, full_name, role, phone]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Bu kullanici adi veya e-posta zaten kullaniliyor.' });
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/users/:id
router.put('/:id', authorize('admin'), async (req, res) => {
  const { full_name, email, role, phone, is_active } = req.body;
  try {
    const result = await db.query(`
      UPDATE users SET full_name=$1, email=$2, role=$3, phone=$4, is_active=$5, updated_at=NOW()
      WHERE id=$6 RETURNING id, username, email, full_name, role, phone, is_active
    `, [full_name, email, role, phone, is_active, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kullanici bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
