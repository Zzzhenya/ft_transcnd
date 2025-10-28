const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
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
        message: 'Username, email and password are required'
      });
    }

    const result = await AuthService.register(username, email, password);

    logger.info('User registered:', { userId: result.user.id, username });

    return reply.code(201).send({
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('already')) {
      logger.warn('User already exists:', request.body.username);
      return reply.code(409).send({ message: error.message });
    }

    logger.error('Registration failed:', error);
    return reply.code(500).send({ message: 'Server error', error: error.message });
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