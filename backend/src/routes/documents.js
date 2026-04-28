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

// GET /api/documents/:vehicle_id
router.get('/:vehicle_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM vehicle_documents WHERE vehicle_id=$1 ORDER BY expiry_date ASC NULLS LAST',
      [req.params.vehicle_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/documents/expiring/soon - Yakında bitecek belgeler
router.get('/expiring/soon', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await db.query(`
      SELECT d.*, v.plate_no, v.brand, v.model
      FROM vehicle_documents d
      JOIN vehicles v ON v.id = d.vehicle_id
      WHERE d.expiry_date IS NOT NULL
        AND d.expiry_date <= CURRENT_DATE + ($1 || ' days')::INTERVAL
        AND d.expiry_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY d.expiry_date ASC
    `, [parseInt(days, 10)]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/documents
router.post('/',
  authorize('admin', 'manager'),
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('document_type').notEmpty().withMessage('Belge tipi gerekli.'),
    body('document_name').trim().notEmpty().withMessage('Belge adi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, document_type, document_name, issue_date, expiry_date,
            insurance_company, policy_no, amount, notes } = req.body;
    const n = (v) => (v === '' || v === undefined) ? null : v;
    try {
      const result = await db.query(`
        INSERT INTO vehicle_documents (vehicle_id, document_type, document_name, issue_date,
          expiry_date, insurance_company, policy_no, amount, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [vehicle_id, document_type, document_name, n(issue_date), n(expiry_date),
          n(insurance_company), n(policy_no), n(amount), n(notes)]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/documents/:id
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  const { document_type, document_name, issue_date, expiry_date,
          insurance_company, policy_no, amount, notes } = req.body;
  const n = (v) => (v === '' || v === undefined) ? null : v;
  try {
    const result = await db.query(`
      UPDATE vehicle_documents SET document_type=$1, document_name=$2, issue_date=$3,
        expiry_date=$4, insurance_company=$5, policy_no=$6, amount=$7, notes=$8
      WHERE id=$9 RETURNING *
    `, [document_type, document_name, n(issue_date), n(expiry_date),
        n(insurance_company), n(policy_no), n(amount), n(notes), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Belge bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicle_documents WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Belge bulunamadi.' });
    res.json({ message: 'Belge silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/documents/:id/file
router.post('/:id/file',
  authorize('admin', 'manager'),
  (req, res, next) => { req.uploadSubfolder = 'documents'; next(); },
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yuklenmedi.' });
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    await db.query('UPDATE vehicle_documents SET file_url=$1 WHERE id=$2', [fileUrl, req.params.id]);
    res.json({ file_url: fileUrl });
  }
);

module.exports = router;
