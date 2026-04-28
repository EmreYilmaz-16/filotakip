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

// GET /api/fuel
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, start_date, end_date, page = 1, limit = 30 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`f.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (driver_id) { where.push(`f.driver_id = $${i++}`); params.push(driver_id); }
    if (start_date) { where.push(`f.date >= $${i++}`); params.push(start_date); }
    if (end_date) { where.push(`f.date <= $${i++}`); params.push(end_date); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const countRes = await db.query(`SELECT COUNT(*) FROM fuel_records f ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT f.*, v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      LEFT JOIN drivers d ON d.id = f.driver_id
      ${whereClause}
      ORDER BY f.date DESC, f.created_at DESC
      LIMIT $${i} OFFSET $${i+1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/fuel
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('date').isDate().withMessage('Tarih gerekli.'),
    body('km_at_fuel').isInt({ min: 0 }).withMessage('KM bilgisi gerekli.'),
    body('liters').isFloat({ min: 0.1 }).withMessage('Litre miktari gerekli.'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Birim fiyat gerekli.'),
    body('total_cost').isFloat({ min: 0 }).withMessage('Toplam tutar gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, driver_id, date, km_at_fuel, liters, unit_price, total_cost,
            fuel_type, station_name, receipt_no, is_full_tank, notes } = req.body;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO fuel_records (vehicle_id, driver_id, recorded_by, date, km_at_fuel, liters,
          unit_price, total_cost, fuel_type, station_name, receipt_no, is_full_tank, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
      `, [vehicle_id, driver_id, req.user.id, date, km_at_fuel, liters, unit_price,
          total_cost, fuel_type || 'dizel', station_name, receipt_no,
          is_full_tank !== false, notes]);
      // KM güncelle
      await client.query(
        'UPDATE vehicles SET current_km = GREATEST(current_km, $1) WHERE id = $2',
        [km_at_fuel, vehicle_id]
      );
      // KM kayıt ekle
      await client.query(
        'INSERT INTO km_records (vehicle_id, driver_id, recorded_by, date, km_value, notes) VALUES ($1,$2,$3,$4,$5,$6)',
        [vehicle_id, driver_id, req.user.id, date, km_at_fuel, 'Yakit kaydindan otomatik']
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

// DELETE /api/fuel/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM fuel_records WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayit bulunamadi.' });
    res.json({ message: 'Kayit silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/fuel/stats/:vehicle_id - Araç bazlı yakıt istatistikleri
router.get('/stats/:vehicle_id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_fills,
        SUM(liters) AS total_liters,
        SUM(total_cost) AS total_cost,
        AVG(liters) AS avg_liters_per_fill,
        AVG(unit_price) AS avg_unit_price,
        MIN(km_at_fuel) AS first_km,
        MAX(km_at_fuel) AS last_km
      FROM fuel_records
      WHERE vehicle_id = $1
    `, [req.params.vehicle_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
