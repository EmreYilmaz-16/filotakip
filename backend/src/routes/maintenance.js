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

// GET /api/maintenance/schedules
router.get('/schedules', async (req, res) => {
  try {
    const { vehicle_id, overdue } = req.query;
    let where = ['s.is_active = true']; let params = []; let i = 1;
    if (vehicle_id) { where.push(`s.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (overdue === 'true') {
      where.push(`(
        (s.next_due_date IS NOT NULL AND s.next_due_date <= CURRENT_DATE)
        OR (s.next_due_km IS NOT NULL AND v.current_km >= s.next_due_km)
        OR (
          s.next_due_date IS NULL AND s.next_due_km IS NULL
          AND s.interval_km IS NOT NULL AND s.last_done_km IS NOT NULL
          AND s.last_done_km + s.interval_km <= v.current_km
        )
      )`);
    }
    const result = await db.query(`
      SELECT s.*, mt.name AS maintenance_type_name,
        v.plate_no, v.brand, v.model, v.current_km,
        CASE
          WHEN s.next_due_date IS NOT NULL AND s.next_due_date <= CURRENT_DATE THEN true
          WHEN s.next_due_km IS NOT NULL AND v.current_km >= s.next_due_km THEN true
          WHEN s.next_due_date IS NULL AND s.next_due_km IS NULL
               AND s.interval_km IS NOT NULL AND s.last_done_km IS NOT NULL
               AND s.last_done_km + s.interval_km <= v.current_km THEN true
          ELSE false
        END AS is_overdue,
        CASE
          WHEN s.next_due_date IS NOT NULL AND s.next_due_date <= CURRENT_DATE + INTERVAL '15 days' THEN true
          WHEN s.next_due_km IS NOT NULL AND v.current_km + 1000 >= s.next_due_km THEN true
          WHEN s.next_due_date IS NULL AND s.next_due_km IS NULL
               AND s.interval_km IS NOT NULL AND s.last_done_km IS NOT NULL
               AND s.last_done_km + s.interval_km <= v.current_km + 1000 THEN true
          ELSE false
        END AS is_upcoming
      FROM maintenance_schedules s
      LEFT JOIN maintenance_types mt ON mt.id = s.maintenance_type_id
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.next_due_date ASC NULLS LAST
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/maintenance/schedules
router.post('/schedules',
  authorize('admin', 'manager'),
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, maintenance_type_id, custom_name, interval_km, interval_days,
            last_done_km, last_done_date, next_due_km, next_due_date, notes } = req.body;
    const toNull = (v) => (v === '' || v === undefined) ? null : v;
    try {
      const result = await db.query(`
        INSERT INTO maintenance_schedules (vehicle_id, maintenance_type_id, custom_name,
          interval_km, interval_days, last_done_km, last_done_date, next_due_km, next_due_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
      `, [vehicle_id, toNull(maintenance_type_id), toNull(custom_name), toNull(interval_km), toNull(interval_days),
          toNull(last_done_km), toNull(last_done_date), toNull(next_due_km), toNull(next_due_date), toNull(notes)]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/maintenance/schedules/:id
router.put('/schedules/:id',
  authorize('admin', 'manager'),
  async (req, res) => {
    const { vehicle_id, maintenance_type_id, custom_name, interval_km, interval_days,
            last_done_km, last_done_date, next_due_km, next_due_date, notes } = req.body;
    const toNull = (v) => (v === '' || v === undefined || v === null) ? null : v;
    try {
      const result = await db.query(`
        UPDATE maintenance_schedules SET
          vehicle_id=$1, maintenance_type_id=$2, custom_name=$3,
          interval_km=$4, interval_days=$5, last_done_km=$6, last_done_date=$7,
          next_due_km=$8, next_due_date=$9, notes=$10, updated_at=NOW()
        WHERE id=$11 RETURNING *
      `, [vehicle_id, toNull(maintenance_type_id), toNull(custom_name), toNull(interval_km), toNull(interval_days),
          toNull(last_done_km), toNull(last_done_date), toNull(next_due_km), toNull(next_due_date),
          toNull(notes), req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Plan bulunamadi.' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// DELETE /api/maintenance/schedules/:id
router.delete('/schedules/:id',
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const result = await db.query(
        'DELETE FROM maintenance_schedules WHERE id=$1 RETURNING id',
        [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Plan bulunamadi.' });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// GET /api/maintenance/records
router.get('/records', async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, page = 1, limit = 30 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`r.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (start_date) { where.push(`r.date >= $${i++}`); params.push(start_date); }
    if (end_date) { where.push(`r.date <= $${i++}`); params.push(end_date); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await db.query(`SELECT COUNT(*) FROM maintenance_records r ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT r.*, mt.name AS maintenance_type_name, v.plate_no, v.brand, v.model
      FROM maintenance_records r
      LEFT JOIN maintenance_types mt ON mt.id = r.maintenance_type_id
      JOIN vehicles v ON v.id = r.vehicle_id
      ${whereClause}
      ORDER BY r.date DESC
      LIMIT $${i} OFFSET $${i+1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/maintenance/records
router.post('/records',
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('date').isDate().withMessage('Tarih gerekli.'),
    body('km_at_maintenance').isInt({ min: 0 }).withMessage('KM bilgisi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, maintenance_type_id, schedule_id, date, km_at_maintenance,
            description, service_name, invoice_no, labor_cost, parts_cost,
            total_cost, next_maintenance_km, next_maintenance_date, notes } = req.body;
    const toNull = (v) => (v === '' || v === undefined) ? null : v;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO maintenance_records (vehicle_id, maintenance_type_id, schedule_id, recorded_by,
          date, km_at_maintenance, description, service_name, invoice_no, labor_cost, parts_cost,
          total_cost, next_maintenance_km, next_maintenance_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
      `, [vehicle_id, toNull(maintenance_type_id), toNull(schedule_id), req.user.id, date, km_at_maintenance,
          toNull(description), toNull(service_name), toNull(invoice_no), labor_cost || 0, parts_cost || 0,
          total_cost || 0, toNull(next_maintenance_km), toNull(next_maintenance_date), toNull(notes)]);

      // Plan güncelle
      if (schedule_id) {
        await client.query(`
          UPDATE maintenance_schedules SET
            last_done_km=$1, last_done_date=$2, next_due_km=$3, next_due_date=$4, updated_at=NOW()
          WHERE id=$5
        `, [km_at_maintenance, date, next_maintenance_km, next_maintenance_date, schedule_id]);
      }
      // KM güncelle
      await client.query(
        'UPDATE vehicles SET current_km = GREATEST(current_km, $1) WHERE id = $2',
        [km_at_maintenance, vehicle_id]
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

// GET /api/maintenance/types
router.get('/types', async (req, res) => {
  const result = await db.query('SELECT * FROM maintenance_types ORDER BY name');
  res.json(result.rows);
});

module.exports = router;
