const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};
const n = (v) => (v === '' || v === undefined) ? null : v;

// GET /api/driver-documents — tümünü listele (filtreli)
router.get('/', async (req, res) => {
  try {
    const { driver_id, document_type, expiring_days } = req.query;
    let where = []; let params = []; let i = 1;
    if (driver_id) { where.push(`dd.driver_id = $${i++}`); params.push(driver_id); }
    if (document_type) { where.push(`dd.document_type = $${i++}`); params.push(document_type); }
    if (expiring_days) {
      where.push(`dd.expiry_date IS NOT NULL AND dd.expiry_date <= CURRENT_DATE + ($${i++} || ' days')::INTERVAL`);
      params.push(expiring_days);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await db.query(`
      SELECT
        dd.*,
        d.first_name || ' ' || d.last_name AS driver_name,
        d.license_class,
        CASE
          WHEN dd.expiry_date IS NOT NULL AND dd.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN dd.expiry_date IS NOT NULL AND dd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
          ELSE 'valid'
        END AS validity_status,
        CASE
          WHEN dd.expiry_date IS NOT NULL THEN dd.expiry_date - CURRENT_DATE
          ELSE NULL
        END AS days_until_expiry
      FROM driver_documents dd
      JOIN drivers d ON d.id = dd.driver_id
      ${whereClause}
      ORDER BY dd.expiry_date ASC NULLS LAST, d.last_name
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/driver-documents/driver/:driverId — bir sürücünün belgeleri
router.get('/driver/:driverId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *,
        CASE
          WHEN expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE THEN 'expired'
          WHEN expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
          ELSE 'valid'
        END AS validity_status,
        CASE WHEN expiry_date IS NOT NULL THEN expiry_date - CURRENT_DATE ELSE NULL END AS days_until_expiry
      FROM driver_documents
      WHERE driver_id = $1
      ORDER BY expiry_date ASC NULLS LAST
    `, [req.params.driverId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/driver-documents
router.post('/',
  [
    body('driver_id').isInt().withMessage('Sürücü gerekli.'),
    body('document_type').notEmpty().withMessage('Belge tipi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { driver_id, document_type, src_type, document_no, issue_date,
            expiry_date, issuing_authority, notes } = req.body;
    try {
      const result = await db.query(`
        INSERT INTO driver_documents
          (driver_id, document_type, src_type, document_no, issue_date, expiry_date, issuing_authority, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [driver_id, document_type, n(src_type), n(document_no),
          n(issue_date), n(expiry_date), n(issuing_authority), n(notes)]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/driver-documents/:id
router.put('/:id', async (req, res) => {
  const { document_type, src_type, document_no, issue_date,
          expiry_date, issuing_authority, notes } = req.body;
  try {
    const result = await db.query(`
      UPDATE driver_documents SET
        document_type=$1, src_type=$2, document_no=$3, issue_date=$4,
        expiry_date=$5, issuing_authority=$6, notes=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [document_type, n(src_type), n(document_no), n(issue_date),
        n(expiry_date), n(issuing_authority), n(notes), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/driver-documents/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM driver_documents WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json({ message: 'Kayıt silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
