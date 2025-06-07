// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Temporarily disable database
// const { initDatabase } = require('./utils/database');
// const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['https://ft_transcendence', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100 // Limit pro IP
});
app.use('/api/', limiter);

// Temporary test routes
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  res.json({ message: 'Registration endpoint working', user: { username: req.body.username, email: req.body.email } });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({ 
    message: 'Login endpoint working', 
    access_token: 'dummy_token',
    user: { username: req.body.username, email: 'test@example.com' }
  });
});

// Routes (temporarily commented out)
// app.use('/api/auth', authRoutes);

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
    // Temporarily skip database initialization
    console.log('Database initialization skipped for testing');
    
    // Server starten
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
      console.log(`Umgebung: ${process.env.NODE_ENV || 'development'}`);
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