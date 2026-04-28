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

// GET /api/trips — liste (filtreli, sayfalı)
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`t.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (driver_id) { where.push(`t.driver_id = $${i++}`); params.push(driver_id); }
    if (status) { where.push(`t.status = $${i++}`); params.push(status); }
    if (start_date) { where.push(`t.date >= $${i++}`); params.push(start_date); }
    if (end_date) { where.push(`t.date <= $${i++}`); params.push(end_date); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countRes = await db.query(`SELECT COUNT(*) FROM trip_logs t ${whereClause}`, params);
    const dataParams = [...params, parseInt(limit), offset];
    const result = await db.query(`
      SELECT
        t.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        CASE
          WHEN t.return_km IS NOT NULL AND t.departure_km IS NOT NULL
          THEN t.return_km - t.departure_km
          ELSE NULL
        END AS total_km
      FROM trip_logs t
      JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN drivers d ON d.id = t.driver_id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `, dataParams);
    res.json({
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/trips/stats — özet istatistikler
router.get('/stats', async (req, res) => {
  try {
    const { vehicle_id, driver_id, start_date, end_date } = req.query;
    let where = ['t.status = \'completed\' AND t.return_km IS NOT NULL AND t.departure_km IS NOT NULL'];
    let params = []; let i = 1;
    if (vehicle_id) { where.push(`t.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (driver_id) { where.push(`t.driver_id = $${i++}`); params.push(driver_id); }
    if (start_date) { where.push(`t.date >= $${i++}`); params.push(start_date); }
    if (end_date) { where.push(`t.date <= $${i++}`); params.push(end_date); }
    const whereClause = 'WHERE ' + where.join(' AND ');
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_trips,
        SUM(t.return_km - t.departure_km) AS total_km,
        ROUND(AVG(t.return_km - t.departure_km), 1) AS avg_km_per_trip,
        MAX(t.return_km - t.departure_km) AS max_km,
        MIN(t.return_km - t.departure_km) AS min_km
      FROM trip_logs t
      ${whereClause}
    `, params);
    // Günlük ortalama
    const dailyResult = await db.query(`
      SELECT
        t.date,
        SUM(t.return_km - t.departure_km) AS daily_km
      FROM trip_logs t
      ${whereClause}
      GROUP BY t.date
      ORDER BY t.date DESC
      LIMIT 30
    `, params);
    res.json({
      ...result.rows[0],
      daily: dailyResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/trips — yeni sefer aç (çıkış kaydı)
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Araç gerekli.'),
    body('departure_km').isInt({ min: 0 }).withMessage('Çıkış KM gerekli.'),
    body('date').notEmpty().withMessage('Tarih gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, driver_id, date, departure_km, departure_time, purpose, notes } = req.body;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO trip_logs (vehicle_id, driver_id, date, departure_km, departure_time, purpose, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [vehicle_id, n(driver_id), date, departure_km, n(departure_time), n(purpose), n(notes), req.user.id]);
      // Araç KM'sini güncelle
      await client.query(
        'UPDATE vehicles SET current_km = GREATEST(current_km, $1) WHERE id = $2',
        [departure_km, vehicle_id]
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

// PUT /api/trips/:id/return — dönüş kaydı tamamla
router.put('/:id/return',
  [
    body('return_km').isInt({ min: 0 }).withMessage('Dönüş KM gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { return_km, return_time, notes } = req.body;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // Mevcut kaydı al
      const existing = await client.query('SELECT * FROM trip_logs WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
      const trip = existing.rows[0];
      if (trip.status === 'completed') return res.status(400).json({ error: 'Bu kayıt zaten tamamlandı.' });
      if (return_km < trip.departure_km) return res.status(400).json({ error: 'Dönüş KM, çıkış KM\'den küçük olamaz.' });
      const result = await client.query(`
        UPDATE trip_logs SET
          return_km = $1, return_time = $2,
          notes = COALESCE($3, notes),
          status = 'completed', updated_at = NOW()
        WHERE id = $4 RETURNING *
      `, [return_km, n(return_time), n(notes), req.params.id]);
      // Araç KM'sini güncelle
      await client.query(
        'UPDATE vehicles SET current_km = GREATEST(current_km, $1) WHERE id = $2',
        [return_km, trip.vehicle_id]
      );
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/trips/:id — güncelle (tam düzenleme)
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  const { vehicle_id, driver_id, date, departure_km, departure_time,
          return_km, return_time, purpose, notes, status } = req.body;
  try {
    const result = await db.query(`
      UPDATE trip_logs SET
        vehicle_id=$1, driver_id=$2, date=$3, departure_km=$4, departure_time=$5,
        return_km=$6, return_time=$7, purpose=$8, notes=$9, status=$10, updated_at=NOW()
      WHERE id=$11 RETURNING *
    `, [vehicle_id, n(driver_id), date, departure_km, n(departure_time),
        n(return_km), n(return_time), n(purpose), n(notes), status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM trip_logs WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
    res.json({ message: 'Kayıt silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
