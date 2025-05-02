// src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const { authenticateJWT, userExists } = require('../middlewares/authMiddleware');

const router = express.Router();

// Anmelderoute
router.post('/login', authController.login);

// Registrierungsroute
router.post('/register', authController.register);

// Profilroute (geschützt)
router.get('/profile', authenticateJWT, userExists, authController.getProfile);

module.exports = router;