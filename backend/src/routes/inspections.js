const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const toNull = (v) => (v === '' || v === undefined) ? null : v;

// GET /api/inspections/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE overall_status = 'fail') AS total_fail,
        COUNT(*) FILTER (WHERE overall_status = 'warning') AS total_warning,
        COUNT(*) FILTER (WHERE inspection_date >= date_trunc('month', NOW())) AS this_month
      FROM vehicle_inspections
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/inspections
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, inspection_type, overall_status, page = 1, limit = 20 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`vi.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (driver_id) { where.push(`vi.driver_id = $${i++}`); params.push(driver_id); }
    if (inspection_type) { where.push(`vi.inspection_type = $${i++}`); params.push(inspection_type); }
    if (overall_status) { where.push(`vi.overall_status = $${i++}`); params.push(overall_status); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await db.query(`SELECT COUNT(*) FROM vehicle_inspections vi ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT vi.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS reported_by_name
      FROM vehicle_inspections vi
      JOIN vehicles v ON v.id = vi.vehicle_id
      LEFT JOIN drivers d ON d.id = vi.driver_id
      LEFT JOIN users u ON u.id = vi.reported_by
      ${whereClause}
      ORDER BY vi.inspection_date DESC, vi.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/inspections/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT vi.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS reported_by_name
      FROM vehicle_inspections vi
      JOIN vehicles v ON v.id = vi.vehicle_id
      LEFT JOIN drivers d ON d.id = vi.driver_id
      LEFT JOIN users u ON u.id = vi.reported_by
      WHERE vi.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Form bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/inspections
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, inspection_type, inspection_date, km, overall_status, items, notes } = req.body;
    if (!vehicle_id || !inspection_date) return res.status(400).json({ error: 'Araç ve tarih zorunludur.' });
    const result = await db.query(`
      INSERT INTO vehicle_inspections
        (vehicle_id, driver_id, reported_by, inspection_type, inspection_date, km, overall_status, items, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      vehicle_id, toNull(driver_id), req.user.id,
      inspection_type || 'departure',
      inspection_date,
      toNull(km),
      overall_status || 'pass',
      JSON.stringify(items || []),
      toNull(notes),
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// PUT /api/inspections/:id
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, inspection_type, inspection_date, km, overall_status, items, notes } = req.body;
    const result = await db.query(`
      UPDATE vehicle_inspections SET
        vehicle_id=$1, driver_id=$2, inspection_type=$3, inspection_date=$4,
        km=$5, overall_status=$6, items=$7, notes=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [
      vehicle_id, toNull(driver_id), inspection_type || 'departure',
      inspection_date, toNull(km), overall_status || 'pass',
      JSON.stringify(items || []), toNull(notes),
      req.params.id,
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Form bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/inspections/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicle_inspections WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Form bulunamadi.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
