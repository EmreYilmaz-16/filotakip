const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const toNull = (v) => (v === '' || v === undefined) ? null : v;

// GET /api/tires/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'scrapped') AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        COUNT(*) FILTER (WHERE status = 'storage') AS in_storage,
        COUNT(*) FILTER (WHERE status = 'scrapped') AS scrapped,
        COUNT(*) FILTER (WHERE status = 'active' AND tread_depth IS NOT NULL AND tread_depth < 3) AS low_tread
      FROM tires
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/tires
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, status, type, page = 1, limit = 20 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`t.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (status) { where.push(`t.status = $${i++}`); params.push(status); }
    if (type) { where.push(`t.type = $${i++}`); params.push(type); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await db.query(`SELECT COUNT(*) FROM tires t ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT t.*,
        v.plate_no, v.brand AS vehicle_brand, v.model AS vehicle_model
      FROM tires t
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      ${whereClause}
      ORDER BY
        CASE t.status WHEN 'active' THEN 1 WHEN 'storage' THEN 2 ELSE 3 END,
        CASE WHEN t.tread_depth IS NOT NULL AND t.tread_depth < 3 THEN 0 ELSE 1 END,
        t.brand, t.model
      LIMIT $${i} OFFSET $${i + 1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/tires/:id
router.get('/:id', async (req, res) => {
  try {
    const [tireRes, historyRes] = await Promise.all([
      db.query(`
        SELECT t.*, v.plate_no, v.brand AS vehicle_brand, v.model AS vehicle_model
        FROM tires t
        LEFT JOIN vehicles v ON v.id = t.vehicle_id
        WHERE t.id = $1
      `, [req.params.id]),
      db.query(`
        SELECT th.*, v.plate_no,
          u.full_name AS performed_by_name
        FROM tire_history th
        LEFT JOIN vehicles v ON v.id = th.vehicle_id
        LEFT JOIN users u ON u.id = th.performed_by
        WHERE th.tire_id = $1
        ORDER BY th.action_date DESC, th.created_at DESC
      `, [req.params.id]),
    ]);
    if (!tireRes.rows[0]) return res.status(404).json({ error: 'Lastik bulunamadi.' });
    res.json({ ...tireRes.rows[0], history: historyRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/tires
router.post('/', async (req, res) => {
  try {
    const {
      vehicle_id, serial_no, brand, model, size, type, position, status,
      purchase_date, purchase_price, installed_date, installed_km, current_km,
      tread_depth, pressure, notes,
    } = req.body;
    if (!brand) return res.status(400).json({ error: 'Marka zorunludur.' });
    const result = await db.query(`
      INSERT INTO tires (
        vehicle_id, serial_no, brand, model, size, type, position, status,
        purchase_date, purchase_price, installed_date, installed_km, current_km,
        tread_depth, pressure, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [
      toNull(vehicle_id), toNull(serial_no), brand, toNull(model), toNull(size),
      type || 'all_season', position || 'storage', status || 'storage',
      toNull(purchase_date), toNull(purchase_price),
      toNull(installed_date), toNull(installed_km), toNull(current_km),
      toNull(tread_depth), toNull(pressure), toNull(notes),
    ]);
    // İlk montaj geçmişi kaydı
    if (status === 'active' && vehicle_id) {
      await db.query(`
        INSERT INTO tire_history (tire_id, vehicle_id, action, to_position, action_date, km_at_action, tread_depth, pressure, performed_by)
        VALUES ($1,$2,'installed',$3,$4,$5,$6,$7,$8)
      `, [
        result.rows[0].id, vehicle_id, position || null,
        installed_date || new Date().toISOString().split('T')[0],
        toNull(installed_km), toNull(tread_depth), toNull(pressure), req.user.id,
      ]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// PUT /api/tires/:id — authorize admin/manager
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      vehicle_id, serial_no, brand, model, size, type, position, status,
      purchase_date, purchase_price, installed_date, installed_km, current_km,
      tread_depth, pressure, notes,
    } = req.body;
    const result = await db.query(`
      UPDATE tires SET
        vehicle_id = $1, serial_no = $2, brand = $3, model = $4, size = $5,
        type = $6, position = $7, status = $8,
        purchase_date = $9, purchase_price = $10,
        installed_date = $11, installed_km = $12, current_km = $13,
        tread_depth = $14, pressure = $15, notes = $16,
        updated_at = NOW()
      WHERE id = $17 RETURNING *
    `, [
      toNull(vehicle_id), toNull(serial_no), brand, toNull(model), toNull(size),
      type || 'all_season', position || 'storage', status || 'storage',
      toNull(purchase_date), toNull(purchase_price),
      toNull(installed_date), toNull(installed_km), toNull(current_km),
      toNull(tread_depth), toNull(pressure), toNull(notes),
      req.params.id,
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Lastik bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// DELETE /api/tires/:id
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tires WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Lastik bulunamadi.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/tires/:id/history — Geçmiş işlem ekle (montaj, söküm, rotasyon, vs)
router.post('/:id/history', authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      action, vehicle_id, from_position, to_position,
      action_date, km_at_action, tread_depth, pressure, notes,
    } = req.body;
    if (!action || !action_date) return res.status(400).json({ error: 'İşlem ve tarih zorunludur.' });

    // Tire_history kaydı ekle
    const histResult = await db.query(`
      INSERT INTO tire_history (
        tire_id, vehicle_id, action, from_position, to_position,
        action_date, km_at_action, tread_depth, pressure, notes, performed_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [
      req.params.id, toNull(vehicle_id), action,
      toNull(from_position), toNull(to_position),
      action_date, toNull(km_at_action),
      toNull(tread_depth), toNull(pressure), toNull(notes), req.user.id,
    ]);

    // Tire tablosunu da güncelle
    if (action === 'installed') {
      await db.query(
        `UPDATE tires SET vehicle_id=$1, position=$2, status='active', installed_date=$3, installed_km=$4,
          tread_depth=COALESCE($5, tread_depth), pressure=COALESCE($6, pressure), updated_at=NOW()
         WHERE id=$7`,
        [toNull(vehicle_id), toNull(to_position), action_date, toNull(km_at_action),
         toNull(tread_depth), toNull(pressure), req.params.id]
      );
    } else if (action === 'removed') {
      await db.query(
        `UPDATE tires SET vehicle_id=NULL, position='storage', status='storage',
          tread_depth=COALESCE($1, tread_depth), pressure=COALESCE($2, pressure), updated_at=NOW()
         WHERE id=$3`,
        [toNull(tread_depth), toNull(pressure), req.params.id]
      );
    } else if (action === 'rotated') {
      await db.query(
        `UPDATE tires SET position=$1, updated_at=NOW() WHERE id=$2`,
        [toNull(to_position), req.params.id]
      );
    } else if (action === 'inspected') {
      await db.query(
        `UPDATE tires SET tread_depth=COALESCE($1, tread_depth), pressure=COALESCE($2, pressure), current_km=COALESCE($3, current_km), updated_at=NOW() WHERE id=$4`,
        [toNull(tread_depth), toNull(pressure), toNull(km_at_action), req.params.id]
      );
    } else if (action === 'scrapped') {
      await db.query(
        `UPDATE tires SET vehicle_id=NULL, position='storage', status='scrapped', updated_at=NOW() WHERE id=$1`,
        [req.params.id]
      );
    }

    res.status(201).json(histResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
