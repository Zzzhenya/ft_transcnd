// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./utils/database');
const authRoutes = require('./routes/authRoutes');

const app = express();

// WICHTIG: Trust Proxy richtig konfigurieren BEVOR rate limiting
// Nur dem ersten Proxy vertrauen (nginx)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// CORS konfigurieren
const corsOptions = {
  origin: [
    'https://ft_transcendence',
    'http://ft_transcendence',
    'https://localhost',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting mit korrekter Proxy-Konfiguration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Limit pro IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Sichere IP-Extraktion für Proxy-Setup
  skip: (req) => {
    // Entwicklungsmodus: Rate limiting für localhost überspringen
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server starten
async function startServer() {
  try {
    // Datenbank initialisieren
    await initDatabase();
    console.log('Datenbank erfolgreich initialisiert');
    
    // Server starten
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
      console.log(`Umgebung: ${process.env.NODE_ENV || 'production'}`);
      console.log('CORS konfiguriert für:', corsOptions.origin);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM empfangen, fahre Server herunter...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT empfangen, fahre Server herunter...');
  process.exit(0);
});

// Server starten
startServer();