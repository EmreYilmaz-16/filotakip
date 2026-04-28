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

// GET /api/vehicle-taxes — liste (filtreli)
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, year, status } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`t.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (year) { where.push(`t.year = $${i++}`); params.push(year); }
    if (status) { where.push(`t.status = $${i++}`); params.push(status); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await db.query(`
      SELECT
        t.*,
        v.plate_no, v.brand, v.model
      FROM vehicle_taxes t
      JOIN vehicles v ON v.id = t.vehicle_id
      ${whereClause}
      ORDER BY t.year DESC, t.installment ASC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/vehicle-taxes/summary — yıl bazlı özet
router.get('/summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const result = await db.query(`
      SELECT
        t.*,
        v.plate_no, v.brand, v.model
      FROM vehicle_taxes t
      JOIN vehicles v ON v.id = t.vehicle_id
      WHERE t.year = $1
      ORDER BY v.plate_no, t.installment
    `, [year]);
    const totalAmount = result.rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const paidAmount = result.rows.filter(r => r.status === 'paid').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    res.json({
      year: parseInt(year),
      records: result.rows,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount: totalAmount - paidAmount,
      total_count: result.rows.length,
      paid_count: result.rows.filter(r => r.status === 'paid').length,
      pending_count: result.rows.filter(r => r.status === 'pending').length,
      overdue_count: result.rows.filter(r => r.status === 'overdue').length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/vehicle-taxes
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Araç gerekli.'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Geçerli bir yıl girin.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, tax_type = 'mtv', year, installment, amount, due_date, paid_date, status, notes } = req.body;
    try {
      const result = await db.query(`
        INSERT INTO vehicle_taxes (vehicle_id, tax_type, year, installment, amount, due_date, paid_date, status, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [vehicle_id, tax_type, year, n(installment), n(amount), n(due_date), n(paid_date), status || 'pending', n(notes)]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/vehicle-taxes/:id
router.put('/:id', async (req, res) => {
  const { tax_type, year, installment, amount, due_date, paid_date, status, notes } = req.body;
  try {
    const result = await db.query(`
      UPDATE vehicle_taxes SET
        tax_type=$1, year=$2, installment=$3, amount=$4, due_date=$5,
        paid_date=$6, status=$7, notes=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [tax_type, year, n(installment), n(amount), n(due_date), n(paid_date), status, n(notes), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// PATCH /api/vehicle-taxes/:id/pay — hızlı ödeme işaretle
router.patch('/:id/pay', async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE vehicle_taxes SET status='paid', paid_date=COALESCE($1, CURRENT_DATE), updated_at=NOW()
      WHERE id=$2 RETURNING *
    `, [n(req.body.paid_date), req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/vehicle-taxes/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicle_taxes WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json({ message: 'Kayıt silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
