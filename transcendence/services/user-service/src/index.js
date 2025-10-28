const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// JWT verification decorator
fastify.decorate('authenticate', async function (request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.code(401).send({ message: 'Kein Token bereitgestellt' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.userId);
    if (!user) {
      reply.code(404).send({ message: 'Benutzer nicht gefunden' });
      return;
    }

    request.user = {
      userId: payload.userId,
      username: payload.username
    };
    request.userDetails = user;
  } catch (err) {
    reply.code(403).send({ message: 'Token ungültig oder abgelaufen' });
  }
});

// Register endpoint
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { username, email, password } = request.body;

    if (!username || !email || !password) {
      return reply.code(400).send({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    //Message Username exist
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return reply.code(409).send({
        success: false,
        message: `Username "${username}" is already taken. Please choose another.`,
        error: 'Username already exists'
      });
    }

    //Message Email exitst 
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return reply.code(409).send({
        success: false,
        message: `Email "${email}" is already registered. Please use another email or login.`,
        error: 'Email already exists'
      });
    }

    const result = await AuthService.register(username, email, password);

    return reply.code(201).send({
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('already')) {
      return reply.code(409).send({ message: error.message });
    }
    return reply.code(500).send({ message: 'Server error', error: error.message });
  }
});

// Login endpoint
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    return reply.code(200).send({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    return reply.code(401).send({ message: 'Invalid credentials' });
  }
});

// ════════════════════════════════════════════════════════
// GUEST LOGIN ENDPOINT
// ════════════════════════════════════════════════════════
fastify.post('/auth/guest', async (request, reply) => {
  console.log('🎮 Guest login request received');
  console.log('Body:', request.body);
  
  try {
    const { alias } = request.body || {};
    
    // Generate unique guest ID (für Email und fallback username)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    const guestId = `${timestamp}${random}`;
    
    let username;
    
    // ════════════════════════════════════════════════════════
    // Username mit "guest_" Prefix erstellen
    // ════════════════════════════════════════════════════════
    if (alias) {
      // User hat einen Alias angegeben → guest_alias
      username = `guest_${alias}`;
      
      // CHECK: Ist dieser Username schon vergeben?
      const existingUser = await User.findByUsername(username);
      
      if (existingUser) {
        // Username schon vergeben → FEHLER zurückgeben!
        console.log('❌ Username already taken:', username);
        return reply.code(409).send({
          success: false,
          message: `Username "${alias}" is already taken. Please choose another name.`,
          error: 'Username already exists'
        });
      }
      
      console.log('✅ Username available:', username);
    } else {
      // Kein Alias angegeben → guest_xxxxxxxx (immer unique)
      username = `guest_${guestId.substring(0, 8)}`;
      console.log('📝 Generated username:', username);
    }
    
    const email = `${guestId}@guest.local`;  // Immer unique
    
    console.log('📝 Creating guest with username:', username);

    // Hash a random password
    const password_hash = await bcrypt.hash(guestId, 10);

    // Create guest user
    const guestUser = await User.create({
      username,
      email,
      password_hash,
      is_guest: 1
    });

    console.log('✅ Guest created with ID:', guestUser.id);

    // Generate token
    const token = jwt.sign(
      { 
        userId: guestUser.id, 
        username: guestUser.username,
        isGuest: true 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return reply.code(201).send({
      success: true,
      message: 'Guest user created',
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        is_guest: true
      },
      token
    });
  } catch (error) {
    console.error('❌ Guest login error:', error.message);
    
    // Fallback: UNIQUE constraint error (sollte nicht mehr passieren)
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return reply.code(409).send({ 
        success: false,
        message: 'Username already exists. Please choose another name.',
        error: 'Duplicate username'
      });
    }
    
    return reply.code(500).send({ 
      success: false,
      message: 'Failed to create guest user', 
      error: error.message
    });
  }
});
// ════════════════════════════════════════════════════════


// Get profile endpoint (protected)
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { password, two_factor_auth_secret, ...userWithoutSensitive } = request.userDetails;
    return reply.send(userWithoutSensitive);
  } catch (error) {
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'user-service', status: 'healthy', timestamp: new Date() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 User service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();