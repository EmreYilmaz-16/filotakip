require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');

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
