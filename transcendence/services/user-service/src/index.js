const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./utils/logger');
const PORT = parseInt(process.env.USER_SERVICE_PORT || process.env.PORT || '3001');
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
      logger.warn('Authentication failed - No token');
      reply.code(401).send({ message: 'Kein Token bereitgestellt' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.userId);
    if (!user) {
      logger.warn('User not found:', payload.userId);
      reply.code(404).send({ message: 'Benutzer nicht gefunden' });
      return;
    }

    request.user = {
      userId: payload.userId,
      username: payload.username
    };
    request.userDetails = user;
  } catch (err) {
    logger.error('Authentication error:', err.message);
    reply.code(403).send({ message: 'Token ungültig oder abgelaufen' });
  }
});

// Register endpoint
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { username, email, password } = request.body;

    logger.info('Registration attempt:', { username, email });

    if (!username || !email || !password) {
      logger.warn('Missing fields');
      return reply.code(400).send({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      logger.warn('Username already taken:', username);
      return reply.code(409).send({
        success: false,
        message: `Username "${username}" is already taken. Please choose another.`,
        error: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      logger.warn('Email already registered:', email);
      return reply.code(409).send({
        success: false,
        message: `Email "${email}" is already registered. Please use another email or login.`,
        error: 'Email already exists'
      });
    }

    const result = await AuthService.register(username, email, password);

    logger.info('User registered:', { userId: result.user.id, username });

    return reply.code(201).send({
      success: true,
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('already')) {
      logger.warn('User already exists:', request.body.username);
      return reply.code(409).send({ 
        success: false, 
        message: error.message 
      });
    }

    logger.error('Registration failed:', error);
    return reply.code(500).send({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Login endpoint
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;

    logger.info('Login attempt:', { email });

    if (!email || !password) {
      logger.warn('Missing credentials');
      return reply.code(400).send({
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    logger.info('Login successful:', { userId: result.user.id });

    return reply.code(200).send({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    logger.warn('Invalid credentials for:', request.body.email);
    return reply.code(401).send({ message: 'Invalid credentials' });
  }
});

// Guest login endpoint
fastify.post('/auth/guest', async (request, reply) => {
  try {
    const { alias } = request.body || {};
    
    logger.info('Guest login attempt:', { alias });
    
    // Generate unique guest ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    const guestId = `${timestamp}${random}`;
    
    let username;
    
    // Create username with "guest_" prefix
    if (alias) {
      username = `guest_${alias}`;
      
      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      
      if (existingUser) {
        logger.warn('Guest username already taken:', username);
        return reply.code(409).send({
          success: false,
          message: `Username "${alias}" is already taken. Please choose another name.`,
          error: 'Username already exists'
        });
      }
      
      logger.info('Guest username available:', username);
    } else {
      // No alias provided → guest_xxxxxxxx (always unique)
      username = `guest_${guestId.substring(0, 8)}`;
      logger.info('Generated guest username:', username);
    }
    
    const email = `${guestId}@guest.local`;  // Always unique
    
    // Hash a random password
    const password_hash = await bcrypt.hash(guestId, 10);

    // Create guest user
    const guestUser = await User.create({
      username,
      email,
      password: password_hash, // Using password field as in current schema
      display_name: username
    });

    logger.info('Guest user created:', { id: guestUser.id, username: guestUser.username });

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
    logger.error('Guest login error:', error);
    
    // Fallback: UNIQUE constraint error
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

// Get profile endpoint (protected)
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    logger.info('Profile accessed:', request.user.userId);
    const { password, two_factor_auth_secret, ...userWithoutSensitive } = request.userDetails;
    return reply.send(userWithoutSensitive);
  } catch (error) {
    logger.error('Profile error:', error);
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'user-service', status: 'healthy', timestamp: new Date() };
});

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  logger.error('Unhandled error:', error);
  reply.code(error.statusCode || 500).send({
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`🚀 User service running on port ${PORT}`);
  } catch (err) {
    logger.error('Failed to start:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});

start();