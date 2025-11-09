// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware zur Überprüfung des JWT-Tokens
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) {
        return res.status(403).json({ message: 'Token ungültig oder abgelaufen' });
      }
      
      req.user = {
        userId: payload.userId,
        username: payload.username
        isGuest: payload.isGuest
      };
      
      next();
    });
  } else {
    res.status(401).json({ message: 'Kein Token bereitgestellt' });
  }
};

// Middleware zur Überprüfung, ob der Benutzer existiert
const userExists = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    
    req.userDetails = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

module.exports = {
  authenticateJWT,
  userExists
};