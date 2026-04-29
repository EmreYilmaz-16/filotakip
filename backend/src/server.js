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
