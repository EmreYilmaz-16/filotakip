const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/km/:vehicle_id
router.get('/:vehicle_id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT k.*, d.first_name || ' ' || d.last_name AS driver_name
      FROM km_records k
      LEFT JOIN drivers d ON d.id = k.driver_id
      WHERE k.vehicle_id = $1
      ORDER BY k.date DESC, k.created_at DESC
      LIMIT 100
    `, [req.params.vehicle_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/km
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('date').isDate().withMessage('Tarih gerekli.'),
    body('km_value').isInt({ min: 0 }).withMessage('KM degeri gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, driver_id, date, km_value, notes } = req.body;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO km_records (vehicle_id, driver_id, recorded_by, date, km_value, notes)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [vehicle_id, driver_id, req.user.id, date, km_value, notes]);
      await client.query(
        'UPDATE vehicles SET current_km = GREATEST(current_km, $1) WHERE id = $2',
        [km_value, vehicle_id]
      );
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

module.exports = router;
