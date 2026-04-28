const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/drivers
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let where = []; let params = []; let i = 1;
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (search) {
      where.push(`(first_name ILIKE $${i} OR last_name ILIKE $${i} OR phone ILIKE $${i} OR license_no ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await db.query(
      `SELECT *, first_name || ' ' || last_name AS full_name FROM drivers ${whereClause} ORDER BY last_name, first_name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT *, first_name || \' \' || last_name AS full_name FROM drivers WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Surucu bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/drivers
router.post('/',
  authorize('admin', 'manager'),
  [
    body('first_name').trim().notEmpty().withMessage('Ad gerekli.'),
    body('last_name').trim().notEmpty().withMessage('Soyad gerekli.'),
    body('phone').trim().notEmpty().withMessage('Telefon gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { first_name, last_name, tc_no, phone, email, address, birth_date,
            license_no, license_class, license_expiry, notes } = req.body;
    const n = (v) => (v === '' || v === undefined) ? null : v;
    try {
      const result = await db.query(`
        INSERT INTO drivers (first_name, last_name, tc_no, phone, email, address, birth_date,
          license_no, license_class, license_expiry, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [first_name, last_name, n(tc_no), phone, n(email), n(address), n(birth_date),
          n(license_no), n(license_class), n(license_expiry), n(notes)]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Bu TC/ehliyet no zaten kayitli.' });
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/drivers/:id
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  const { first_name, last_name, tc_no, phone, email, address, birth_date,
          license_no, license_class, license_expiry, status, notes } = req.body;
  const n = (v) => (v === '' || v === undefined) ? null : v;
  try {
    const result = await db.query(`
      UPDATE drivers SET first_name=$1, last_name=$2, tc_no=$3, phone=$4, email=$5,
        address=$6, birth_date=$7, license_no=$8, license_class=$9, license_expiry=$10,
        status=$11, notes=$12, updated_at=NOW()
      WHERE id=$13 RETURNING *
    `, [first_name, last_name, n(tc_no), phone, n(email), n(address), n(birth_date),
        n(license_no), n(license_class), n(license_expiry), status, n(notes), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Surucu bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/drivers/:id
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM drivers WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Surucu bulunamadi.' });
    res.json({ message: 'Surucu silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/drivers/:id/photo
router.post('/:id/photo',
  authorize('admin', 'manager'),
  (req, res, next) => { req.uploadSubfolder = 'drivers'; next(); },
  upload.single('photo'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yuklenmedi.' });
    const photoUrl = `/uploads/drivers/${req.file.filename}`;
    await db.query('UPDATE drivers SET photo_url=$1, updated_at=NOW() WHERE id=$2', [photoUrl, req.params.id]);
    res.json({ photo_url: photoUrl });
  }
);

module.exports = router;
