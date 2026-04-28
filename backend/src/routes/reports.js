const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/dashboard - Ana panel özeti
router.get('/dashboard', async (req, res) => {
  try {
    const [vehicles, faults, maintenance, fuel, expiring, assignments, driverDocs, taxes] = await Promise.all([
      // Araç durumu özeti
      db.query(`
        SELECT status, COUNT(*) AS count
        FROM vehicles GROUP BY status
      `),
      // Açık arızalar
      db.query(`
        SELECT severity, COUNT(*) AS count
        FROM fault_reports WHERE status IN ('open','in_progress') GROUP BY severity
      `),
      // Yaklaşan bakımlar (15 gün içinde)
      db.query(`
        SELECT COUNT(*) AS count FROM maintenance_schedules s
        JOIN vehicles v ON v.id = s.vehicle_id
        WHERE s.is_active = true AND (
          (s.next_due_date IS NOT NULL AND s.next_due_date <= CURRENT_DATE + INTERVAL '15 days')
          OR (s.next_due_km IS NOT NULL AND v.current_km + 1000 >= s.next_due_km)
          OR (
            s.next_due_date IS NULL AND s.next_due_km IS NULL
            AND s.interval_km IS NOT NULL AND s.last_done_km IS NOT NULL
            AND s.last_done_km + s.interval_km <= v.current_km + 1000
          )
        )
      `),
      // Bu ay yakıt harcaması
      db.query(`
        SELECT SUM(total_cost) AS total_cost, SUM(liters) AS total_liters
        FROM fuel_records
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      // 30 gün içinde sona erecek belgeler
      db.query(`
        SELECT COUNT(*) AS count FROM vehicle_documents
        WHERE expiry_date IS NOT NULL
          AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          AND expiry_date >= CURRENT_DATE
      `),
      // Aktif zimmetler
      db.query(`SELECT COUNT(*) AS count FROM assignments WHERE status='active'`),
      // Süresi geçmiş veya yaklaşan sürücü belgeleri (30 gün)
      db.query(`
        SELECT COUNT(*) AS count FROM driver_documents
        WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      `),
      // Bu yılın bekleyen MTV kayıtları
      db.query(`
        SELECT COUNT(*) AS count FROM vehicle_taxes
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::int AND status IN ('pending','overdue')
      `),
    ]);

    // Araç sayılarını nesneye çevir
    const vehicleStats = {};
    vehicles.rows.forEach(r => { vehicleStats[r.status] = parseInt(r.count); });

    const faultStats = {};
    faults.rows.forEach(r => { faultStats[r.severity] = parseInt(r.count); });

    res.json({
      vehicles: {
        total: Object.values(vehicleStats).reduce((a, b) => a + b, 0),
        ...vehicleStats,
      },
      faults: {
        total_open: faults.rows.reduce((a, r) => a + parseInt(r.count), 0),
        ...faultStats,
      },
      upcoming_maintenance: parseInt(maintenance.rows[0].count),
      monthly_fuel: {
        cost: parseFloat(fuel.rows[0].total_cost) || 0,
        liters: parseFloat(fuel.rows[0].total_liters) || 0,
      },
      expiring_documents: parseInt(expiring.rows[0].count),
      active_assignments: parseInt(assignments.rows[0].count),
      expiring_driver_docs: parseInt(driverDocs.rows[0].count),
      pending_taxes: parseInt(taxes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/reports/fuel-monthly - Aylık yakıt raporu
router.get('/fuel-monthly', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), vehicle_id } = req.query;
    let params = [year];
    let vehicleFilter = '';
    if (vehicle_id) { vehicleFilter = ' AND vehicle_id = $2'; params.push(vehicle_id); }
    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM date) AS month,
        SUM(liters) AS total_liters,
        SUM(total_cost) AS total_cost,
        COUNT(*) AS fill_count,
        AVG(unit_price) AS avg_unit_price
      FROM fuel_records
      WHERE EXTRACT(YEAR FROM date) = $1 ${vehicleFilter}
      GROUP BY month ORDER BY month
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/reports/maintenance-cost - Bakım maliyet raporu
router.get('/maintenance-cost', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), vehicle_id } = req.query;
    let params = [year];
    let vehicleFilter = '';
    if (vehicle_id) { vehicleFilter = ' AND r.vehicle_id = $2'; params.push(vehicle_id); }
    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM r.date) AS month,
        SUM(r.total_cost) AS total_cost,
        SUM(r.labor_cost) AS labor_cost,
        SUM(r.parts_cost) AS parts_cost,
        COUNT(*) AS maintenance_count
      FROM maintenance_records r
      WHERE EXTRACT(YEAR FROM r.date) = $1 ${vehicleFilter}
      GROUP BY month ORDER BY month
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/reports/vehicle-costs - Araç başına toplam maliyet
router.get('/vehicle-costs', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const result = await db.query(`
      SELECT v.id, v.plate_no, v.brand, v.model,
        COALESCE(f.fuel_cost, 0) AS fuel_cost,
        COALESCE(m.maintenance_cost, 0) AS maintenance_cost,
        COALESCE(fa.fault_cost, 0) AS fault_cost,
        COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0) + COALESCE(fa.fault_cost, 0) AS total_cost
      FROM vehicles v
      LEFT JOIN (
        SELECT vehicle_id, SUM(total_cost) AS fuel_cost
        FROM fuel_records WHERE EXTRACT(YEAR FROM date) = $1
        GROUP BY vehicle_id
      ) f ON f.vehicle_id = v.id
      LEFT JOIN (
        SELECT vehicle_id, SUM(total_cost) AS maintenance_cost
        FROM maintenance_records WHERE EXTRACT(YEAR FROM date) = $1
        GROUP BY vehicle_id
      ) m ON m.vehicle_id = v.id
      LEFT JOIN (
        SELECT vehicle_id, SUM(repair_cost) AS fault_cost
        FROM fault_reports WHERE EXTRACT(YEAR FROM reported_date) = $1 AND status = 'resolved'
        GROUP BY vehicle_id
      ) fa ON fa.vehicle_id = v.id
      ORDER BY total_cost DESC
    `, [year]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

// GET /api/reports/km-monthly - Aylık KM raporu
router.get('/km-monthly', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), vehicle_id } = req.query;
    let params = [year];
    let vehicleFilter = '';
    if (vehicle_id) { vehicleFilter = ' AND vehicle_id = $2'; params.push(vehicle_id); }
    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM date) AS month,
        MAX(km_value) - MIN(km_value) AS km_driven,
        MAX(km_value) AS max_km,
        MIN(km_value) AS min_km
      FROM km_records
      WHERE EXTRACT(YEAR FROM date) = $1 ${vehicleFilter}
      GROUP BY month ORDER BY month
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatasi.' });
  }
});

module.exports = router;
