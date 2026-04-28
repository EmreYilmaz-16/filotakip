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

// GET /api/assignments
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, status } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`a.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (driver_id) { where.push(`a.driver_id = $${i++}`); params.push(driver_id); }
    if (status) { where.push(`a.status = $${i++}`); params.push(status); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await db.query(`
      SELECT a.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS assigned_by_name
      FROM assignments a
      JOIN vehicles v ON v.id = a.vehicle_id
      JOIN drivers d ON d.id = a.driver_id
      LEFT JOIN users u ON u.id = a.assigned_by
      ${whereClause}
      ORDER BY a.assigned_date DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/assignments
router.post('/',
  authorize('admin', 'manager'),
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('driver_id').isInt().withMessage('Surucu ID gerekli.'),
    body('assigned_date').isDate().withMessage('Zimmet tarihi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, driver_id, assigned_date, km_at_assignment, purpose, notes } = req.body;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // Aktif zimmet varsa hata ver
      const existing = await client.query(
        "SELECT id FROM assignments WHERE vehicle_id=$1 AND status='active'",
        [vehicle_id]
      );
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Bu aracin aktif zimmeti bulunuyor. Once iade alinmali.' });
      }
      const result = await client.query(`
        INSERT INTO assignments (vehicle_id, driver_id, assigned_by, assigned_date, km_at_assignment, purpose, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [vehicle_id, driver_id, req.user.id, assigned_date, km_at_assignment, purpose, notes]);
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/assignments/:id/return - Zimmet iadesi
router.put('/:id/return',
  authorize('admin', 'manager'),
  [
    body('return_date').isDate().withMessage('Iade tarihi gerekli.'),
    body('km_at_return').isInt({ min: 0 }).withMessage('KM bilgisi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { return_date, km_at_return, notes } = req.body;
    try {
      const result = await db.query(`
        UPDATE assignments SET
          return_date=$1, km_at_return=$2, status='returned',
          notes=COALESCE(notes || E'\n', '') || COALESCE($3,''), updated_at=NOW()
        WHERE id=$4 AND status='active' RETURNING *
      `, [return_date, km_at_return, notes, req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Aktif zimmet bulunamadi.' });
      // Araç KM güncelle
      await db.query('UPDATE vehicles SET current_km=$1 WHERE id=$2', [km_at_return, result.rows[0].vehicle_id]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

module.exports = router;
