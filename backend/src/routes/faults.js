const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/faults
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, status, severity, page = 1, limit = 20 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`f.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (status) { where.push(`f.status = $${i++}`); params.push(status); }
    if (severity) { where.push(`f.severity = $${i++}`); params.push(severity); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await db.query(`SELECT COUNT(*) FROM fault_reports f ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT f.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS reported_by_name,
        a.full_name AS assigned_to_name
      FROM fault_reports f
      JOIN vehicles v ON v.id = f.vehicle_id
      LEFT JOIN drivers d ON d.id = f.driver_id
      LEFT JOIN users u ON u.id = f.reported_by
      LEFT JOIN users a ON a.id = f.assigned_to
      ${whereClause}
      ORDER BY
        CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        f.reported_date DESC
      LIMIT $${i} OFFSET $${i+1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/faults/:id
router.get('/:id', async (req, res) => {
  try {
    const [fault, activities] = await Promise.all([
      db.query(`
        SELECT f.*, v.plate_no, v.brand, v.model,
          d.first_name || ' ' || d.last_name AS driver_name,
          u.full_name AS reported_by_name
        FROM fault_reports f
        JOIN vehicles v ON v.id = f.vehicle_id
        LEFT JOIN drivers d ON d.id = f.driver_id
        LEFT JOIN users u ON u.id = f.reported_by
        WHERE f.id = $1
      `, [req.params.id]),
      db.query(`
        SELECT fa.*, u.full_name AS user_name
        FROM fault_activities fa
        JOIN users u ON u.id = fa.user_id
        WHERE fa.fault_id = $1
        ORDER BY fa.created_at ASC
      `, [req.params.id]),
    ]);
    if (!fault.rows.length) return res.status(404).json({ error: 'Ariza bulunamadi.' });
    res.json({ ...fault.rows[0], activities: activities.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/faults
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Arac ID gerekli.'),
    body('title').trim().notEmpty().withMessage('Ariza basligi gerekli.'),
    body('description').trim().notEmpty().withMessage('Ariza aciklamasi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const { vehicle_id, driver_id, fault_type, title, description, severity } = req.body;
    try {
      const result = await db.query(`
        INSERT INTO fault_reports (vehicle_id, driver_id, reported_by, fault_type, title, description, severity)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [vehicle_id, driver_id, req.user.id, fault_type, title, description, severity || 'medium']);
      // Araç durumunu güncelle
      if (severity === 'critical' || severity === 'high') {
        await db.query("UPDATE vehicles SET status='faulty' WHERE id=$1", [vehicle_id]);
      }
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/faults/:id/status - Durum güncelle
router.put('/:id/status', async (req, res) => {
  const { status, resolution_notes, repair_cost, downtime_hours } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const resolved_date = status === 'resolved' ? new Date() : null;
    const result = await client.query(`
      UPDATE fault_reports SET status=$1, resolution_notes=$2, repair_cost=$3,
        downtime_hours=$4, resolved_date=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [status, resolution_notes, repair_cost, downtime_hours, resolved_date, req.params.id]);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ariza bulunamadi.' });
    }
    // Aktivite log
    await client.query(
      'INSERT INTO fault_activities (fault_id, user_id, activity_type, content) VALUES ($1,$2,$3,$4)',
      [req.params.id, req.user.id, 'status_change', `Durum "${status}" olarak guncellendi.`]
    );
    // Araç durumunu güncelle
    if (status === 'resolved') {
      await client.query(
        "UPDATE vehicles SET status='active' WHERE id=$1 AND status='faulty'",
        [result.rows[0].vehicle_id]
      );
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  } finally {
    client.release();
  }
});

// POST /api/faults/:id/comment
router.post('/:id/comment', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Yorum icerigi gerekli.' });
  try {
    const result = await db.query(
      'INSERT INTO fault_activities (fault_id, user_id, activity_type, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, req.user.id, 'comment', content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/faults/:id/images
router.post('/:id/images',
  (req, res, next) => { req.uploadSubfolder = 'faults'; next(); },
  upload.array('images', 5),
  async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ error: 'Dosya yuklenmedi.' });
    const urls = req.files.map(f => `/uploads/faults/${f.filename}`);
    try {
      await db.query(
        'UPDATE fault_reports SET image_urls = COALESCE(image_urls, ARRAY[]::text[]) || $1::text[] WHERE id = $2',
        [urls, req.params.id]
      );
      res.json({ image_urls: urls });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

module.exports = router;
