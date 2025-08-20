// Minimale app.js ohne externe Dependencies
const express = require('express');

console.log('🔄 Starting Transcendence Backend...');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Memory storage
const users = [
  { id: 1, username: 'admin', email: 'admin@test.com', password: 'admin123' },
  { id: 2, username: 'user1', email: 'user1@test.com', password: 'password' }
];
let nextUserId = 3;

// Auth routes
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register request:', req.body);
  
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      message: 'Alle Felder sind erforderlich' 
    });
  }

  // Check if user exists
  if (users.find(u => u.username === username || u.email === email)) {
    return res.status(409).json({ 
      message: 'Benutzername oder E-Mail bereits vergeben' 
    });
  }

  // Create user
  const newUser = {
    id: nextUserId++,
    username,
    email,
    password // In production: hash this!
  };
  
  users.push(newUser);
  
  console.log(`✅ User registered: ${username}`);
  
  res.status(201).json({
    message: 'Benutzer erfolgreich registriert',
    access_token: `token_${newUser.id}_${Date.now()}`,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: null
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      message: 'Benutzername und Passwort sind erforderlich' 
    });
  }

  // Find user
  const user = users.find(u => 
    (u.username === username || u.email === username) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ 
      message: 'Ungültige Anmeldedaten' 
    });
  }

  console.log(`✅ User logged in: ${user.username}`);

  res.json({
    access_token: `token_${user.id}_${Date.now()}`,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: null
    }
  });
});

// Debug endpoints
app.get('/api/debug/users', (req, res) => {
  res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email })));
});

// Health checks
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    users: users.length
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend API running',
    timestamp: new Date().toISOString()
  });
});

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'Transcendence Backend',
    status: 'running',
    users: users.length
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at: http://0.0.0.0:${PORT}/api`);
  console.log(`💚 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`👥 Pre-loaded users: ${users.length}`);
  console.log('✅ Backend ready!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});