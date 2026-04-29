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

const toNull = (v) => (v === '' || v === undefined) ? null : v;

// GET /api/accidents
router.get('/', async (req, res) => {
  try {
    const { vehicle_id, status, fault, page = 1, limit = 20 } = req.query;
    let where = []; let params = []; let i = 1;
    if (vehicle_id) { where.push(`a.vehicle_id = $${i++}`); params.push(vehicle_id); }
    if (status) { where.push(`a.status = $${i++}`); params.push(status); }
    if (fault) { where.push(`a.fault = $${i++}`); params.push(fault); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await db.query(`SELECT COUNT(*) FROM accidents a ${whereClause}`, params);
    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT a.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS reported_by_name
      FROM accidents a
      JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN drivers d ON d.id = a.driver_id
      LEFT JOIN users u ON u.id = a.reported_by
      ${whereClause}
      ORDER BY a.accident_date DESC, a.created_at DESC
      LIMIT $${i} OFFSET $${i+1}
    `, params);
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/accidents/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, open, thisMonth, cost] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM accidents`),
      db.query(`SELECT COUNT(*) FROM accidents WHERE status != 'closed'`),
      db.query(`SELECT COUNT(*) FROM accidents WHERE DATE_TRUNC('month', accident_date) = DATE_TRUNC('month', CURRENT_DATE)`),
      db.query(`SELECT COALESCE(SUM(repair_cost),0) AS total FROM accidents WHERE EXTRACT(YEAR FROM accident_date) = EXTRACT(YEAR FROM CURRENT_DATE)`),
    ]);
    res.json({
      total: parseInt(total.rows[0].count),
      open: parseInt(open.rows[0].count),
      this_month: parseInt(thisMonth.rows[0].count),
      annual_cost: parseFloat(cost.rows[0].total),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/accidents/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*,
        v.plate_no, v.brand, v.model,
        d.first_name || ' ' || d.last_name AS driver_name,
        u.full_name AS reported_by_name
      FROM accidents a
      JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN drivers d ON d.id = a.driver_id
      LEFT JOIN users u ON u.id = a.reported_by
      WHERE a.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Kaza kaydı bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/accidents
router.post('/',
  [
    body('vehicle_id').isInt().withMessage('Araç ID gerekli.'),
    body('accident_date').notEmpty().withMessage('Kaza tarihi gerekli.'),
  ],
  validate,
  async (req, res) => {
    const {
      vehicle_id, driver_id, accident_date, accident_time, location,
      accident_type, fault, description, police_report_no,
      weather_condition, road_condition,
      third_party_name, third_party_plate, third_party_insurance, third_party_phone,
      witness_info, damage_description, damage_areas,
      estimated_cost, repair_cost, repair_date, repair_shop,
      insurance_claim_no, insurance_company, claim_status, claim_amount,
      status, notes,
    } = req.body;
    try {
      const result = await db.query(`
        INSERT INTO accidents (
          vehicle_id, driver_id, reported_by, accident_date, accident_time, location,
          accident_type, fault, description, police_report_no, weather_condition, road_condition,
          third_party_name, third_party_plate, third_party_insurance, third_party_phone,
          witness_info, damage_description, damage_areas,
          estimated_cost, repair_cost, repair_date, repair_shop,
          insurance_claim_no, insurance_company, claim_status, claim_amount, status, notes
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
        ) RETURNING *
      `, [
        vehicle_id, toNull(driver_id), req.user.id, accident_date, toNull(accident_time), toNull(location),
        accident_type || 'other', fault || 'unknown', toNull(description), toNull(police_report_no),
        toNull(weather_condition), toNull(road_condition),
        toNull(third_party_name), toNull(third_party_plate), toNull(third_party_insurance), toNull(third_party_phone),
        toNull(witness_info), toNull(damage_description), damage_areas || [],
        toNull(estimated_cost), toNull(repair_cost), toNull(repair_date), toNull(repair_shop),
        toNull(insurance_claim_no), toNull(insurance_company), claim_status || 'not_filed', toNull(claim_amount),
        status || 'open', toNull(notes),
      ]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/accidents/:id
router.put('/:id',
  authorize('admin', 'manager'),
  async (req, res) => {
    const {
      vehicle_id, driver_id, accident_date, accident_time, location,
      accident_type, fault, description, police_report_no,
      weather_condition, road_condition,
      third_party_name, third_party_plate, third_party_insurance, third_party_phone,
      witness_info, damage_description, damage_areas,
      estimated_cost, repair_cost, repair_date, repair_shop,
      insurance_claim_no, insurance_company, claim_status, claim_amount,
      status, notes,
    } = req.body;
    try {
      const result = await db.query(`
        UPDATE accidents SET
          vehicle_id=$1, driver_id=$2, accident_date=$3, accident_time=$4, location=$5,
          accident_type=$6, fault=$7, description=$8, police_report_no=$9,
          weather_condition=$10, road_condition=$11,
          third_party_name=$12, third_party_plate=$13, third_party_insurance=$14, third_party_phone=$15,
          witness_info=$16, damage_description=$17, damage_areas=$18,
          estimated_cost=$19, repair_cost=$20, repair_date=$21, repair_shop=$22,
          insurance_claim_no=$23, insurance_company=$24, claim_status=$25, claim_amount=$26,
          status=$27, notes=$28, updated_at=NOW()
        WHERE id=$29 RETURNING *
      `, [
        vehicle_id, toNull(driver_id), accident_date, toNull(accident_time), toNull(location),
        accident_type || 'other', fault || 'unknown', toNull(description), toNull(police_report_no),
        toNull(weather_condition), toNull(road_condition),
        toNull(third_party_name), toNull(third_party_plate), toNull(third_party_insurance), toNull(third_party_phone),
        toNull(witness_info), toNull(damage_description), damage_areas || [],
        toNull(estimated_cost), toNull(repair_cost), toNull(repair_date), toNull(repair_shop),
        toNull(insurance_claim_no), toNull(insurance_company), claim_status || 'not_filed', toNull(claim_amount),
        status || 'open', toNull(notes), req.params.id,
      ]);
      if (!result.rows.length) return res.status(404).json({ error: 'Kaza kaydı bulunamadı.' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// DELETE /api/accidents/:id
router.delete('/:id',
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const result = await db.query('DELETE FROM accidents WHERE id=$1 RETURNING id', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Kaza kaydı bulunamadı.' });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

module.exports = router;
