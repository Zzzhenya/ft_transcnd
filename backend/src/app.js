// src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDatabase } = require('./utils/database');
const authRoutes = require('./routes/authRoutes');

// Umgebungsvariablen laden
dotenv.config();

// Datenbank initialisieren
initDatabase();

// Express-App erstellen
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

// Standardroute
app.get('/', (req, res) => {
  res.send('ft_transcendence API');
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});