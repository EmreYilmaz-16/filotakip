const express = require('express');
const { body, query, validationResult } = require('express-validator');
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

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let i = 1;

    if (status) { where.push(`v.status = $${i++}`); params.push(status); }
    if (search) {
      where.push(`(v.plate_no ILIKE $${i} OR v.brand ILIKE $${i} OR v.model ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countRes = await db.query(
      `SELECT COUNT(*) FROM vehicles v ${whereClause}`, params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(parseInt(limit, 10)); params.push(offset);
    const result = await db.query(`
      SELECT v.*, vt.name AS vehicle_type_name,
        (SELECT d.first_name || ' ' || d.last_name FROM assignments a
         JOIN drivers d ON d.id = a.driver_id
         WHERE a.vehicle_id = v.id AND a.status = 'active' LIMIT 1) AS current_driver
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
      ${whereClause}
      ORDER BY v.plate_no ASC
      LIMIT $${i} OFFSET $${i+1}
    `, params);

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, vt.name AS vehicle_type_name
      FROM vehicles v
      LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
      WHERE v.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Arac bulunamadi.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/vehicles
router.post('/',
  authorize('admin', 'manager'),
  [
    body('plate_no').trim().notEmpty().withMessage('Plaka gerekli.'),
    body('brand').trim().notEmpty().withMessage('Marka gerekli.'),
    body('model').trim().notEmpty().withMessage('Model gerekli.'),
    body('year').isInt({ min: 1950, max: new Date().getFullYear() + 1 }).withMessage('Gecerli bir yil girin.'),
  ],
  validate,
  async (req, res) => {
    const { plate_no, brand, model, year, color, vin_no, engine_no, vehicle_type_id,
            fuel_type, status, current_km, purchase_date, purchase_price, notes } = req.body;
    try {
      const result = await db.query(`
        INSERT INTO vehicles (plate_no, brand, model, year, color, vin_no, engine_no,
          vehicle_type_id, fuel_type, status, current_km, purchase_date, purchase_price, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
      `, [plate_no.toUpperCase(), brand, model, year, color, vin_no, engine_no,
          vehicle_type_id, fuel_type || 'dizel', status || 'active',
          current_km || 0, purchase_date, purchase_price, notes]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Bu plaka zaten kayitli.' });
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// PUT /api/vehicles/:id
router.put('/:id',
  authorize('admin', 'manager'),
  async (req, res) => {
    const { plate_no, brand, model, year, color, vin_no, engine_no, vehicle_type_id,
            fuel_type, status, current_km, purchase_date, purchase_price, notes } = req.body;
    try {
      const result = await db.query(`
        UPDATE vehicles SET
          plate_no=$1, brand=$2, model=$3, year=$4, color=$5, vin_no=$6, engine_no=$7,
          vehicle_type_id=$8, fuel_type=$9, status=$10, current_km=$11, purchase_date=$12,
          purchase_price=$13, notes=$14, updated_at=NOW()
        WHERE id=$15 RETURNING *
      `, [plate_no?.toUpperCase(), brand, model, year, color, vin_no, engine_no,
          vehicle_type_id, fuel_type, status, current_km, purchase_date, purchase_price,
          notes, req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Arac bulunamadi.' });
      res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Bu plaka zaten kayitli.' });
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// DELETE /api/vehicles/:id
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicles WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Arac bulunamadi.' });
    res.json({ message: 'Arac silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// POST /api/vehicles/:id/image
router.post('/:id/image',
  authorize('admin', 'manager'),
  (req, res, next) => { req.uploadSubfolder = 'vehicles'; next(); },
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Dosya yuklenmedi.' });
    const imageUrl = `/uploads/vehicles/${req.file.filename}`;
    try {
      await db.query('UPDATE vehicles SET image_url=$1, updated_at=NOW() WHERE id=$2', [imageUrl, req.params.id]);
      res.json({ image_url: imageUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatasi.' });
    }
  }
);

// GET /api/vehicles/lookup/types
router.get('/lookup/types', async (req, res) => {
  const result = await db.query('SELECT * FROM vehicle_types ORDER BY name');
  res.json(result.rows);
});

module.exports = router;
