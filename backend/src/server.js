require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');
const db = require('./db');

// Migrations - yeni tablolar için
async function runMigrations() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS accidents (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        accident_date DATE NOT NULL,
        accident_time TIME,
        location TEXT,
        accident_type VARCHAR(30) DEFAULT 'other' CHECK (accident_type IN ('rear_end','side_impact','head_on','rollover','parking','animal','other')),
        fault VARCHAR(20) DEFAULT 'unknown' CHECK (fault IN ('our_fault','third_party_fault','shared','unknown')),
        description TEXT,
        police_report_no VARCHAR(50),
        weather_condition VARCHAR(20) CHECK (weather_condition IN ('clear','rainy','foggy','snowy','icy')),
        road_condition VARCHAR(20) CHECK (road_condition IN ('dry','wet','icy','under_construction')),
        third_party_name VARCHAR(100),
        third_party_plate VARCHAR(20),
        third_party_insurance VARCHAR(100),
        third_party_phone VARCHAR(20),
        witness_info TEXT,
        damage_description TEXT,
        damage_areas TEXT[],
        estimated_cost NUMERIC(12,2),
        repair_cost NUMERIC(12,2),
        repair_date DATE,
        repair_shop VARCHAR(100),
        insurance_claim_no VARCHAR(50),
        insurance_company VARCHAR(100),
        claim_status VARCHAR(20) DEFAULT 'not_filed' CHECK (claim_status IN ('not_filed','pending','approved','rejected','settled')),
        claim_amount NUMERIC(12,2),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_repair','closed')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Vehicle inspection forms
    await db.query(`
      CREATE TABLE IF NOT EXISTS vehicle_inspections (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        inspection_type VARCHAR(20) DEFAULT 'departure' CHECK (inspection_type IN ('departure','return','periodic')),
        inspection_date DATE NOT NULL,
        km INTEGER,
        overall_status VARCHAR(10) DEFAULT 'pass' CHECK (overall_status IN ('pass','fail','warning')),
        items JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Tire management tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS tires (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        serial_no VARCHAR(100),
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100),
        size VARCHAR(50),
        type VARCHAR(20) DEFAULT 'all_season' CHECK (type IN ('summer','winter','all_season')),
        position VARCHAR(20) DEFAULT 'storage' CHECK (position IN ('front_left','front_right','rear_left','rear_right','spare','storage')),
        status VARCHAR(20) DEFAULT 'storage' CHECK (status IN ('active','storage','scrapped')),
        purchase_date DATE,
        purchase_price NUMERIC(10,2),
        installed_date DATE,
        installed_km INTEGER,
        current_km INTEGER,
        tread_depth NUMERIC(4,1),
        pressure NUMERIC(5,1),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS tire_history (
        id SERIAL PRIMARY KEY,
        tire_id INTEGER NOT NULL REFERENCES tires(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        action VARCHAR(30) NOT NULL CHECK (action IN ('installed','removed','rotated','inspected','repaired','scrapped')),
        from_position VARCHAR(20),
        to_position VARCHAR(20),
        action_date DATE NOT NULL,
        km_at_action INTEGER,
        tread_depth NUMERIC(4,1),
        pressure NUMERIC(5,1),
        notes TEXT,
        performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Migrations tamamlandi.');
  } catch (err) {
    console.error('Migration hatasi:', err.message);
  }
}
runMigrations();

const app = express();
const PORT = process.env.PORT || 5000;

// Guvenlik middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || 'http://localhost'
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Cok fazla istek gonderdiniz. Lutfen 15 dakika bekleyin.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Cok fazla giris denemesi. Lutfen 15 dakika bekleyin.' },
});
app.use('/api/auth/login', authLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik dosyalar (yuklenen belgeler)
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadPath));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadi.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Dosya boyutu cok buyuk (max 10MB).' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Sunucu hatasi.' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Filo Takip API sunucusu ${PORT} portunda calisiyor.`);
});

module.exports = app;
