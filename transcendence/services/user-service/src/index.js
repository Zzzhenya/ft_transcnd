const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const Logger = require('../../shared/utils/logger'); // ✅ Ya lo tienes

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// ===== NUEVO: Middleware de logging para todas las requests =====
fastify.addHook('onRequest', async (request, reply) => {
  await Logger.info('Incoming request', {
    method: request.method,
    url: request.url,
    ip: request.ip
  });
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = reply.getResponseTime();
  const level = reply.statusCode >= 400 ? 'error' : 'info';

  await Logger[level]('Request completed', {
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration: `${duration.toFixed(2)}ms`
  });
});
// ================================================================

// JWT verification decorator
fastify.decorate('authenticate', async function (request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      await Logger.warn('Authentication failed - No token provided', {
        ip: request.ip,
        url: request.url
      });
      reply.code(401).send({ message: 'Kein Token bereitgestellt' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.userId);
    if (!user) {
      await Logger.warn('Authentication failed - User not found', {
        userId: payload.userId
      });
      reply.code(404).send({ message: 'Benutzer nicht gefunden' });
      return;
    }

    request.user = {
      userId: payload.userId,
      username: payload.username
    };
    request.userDetails = user;
  } catch (err) {
    await Logger.error('Authentication error', {
      error: err.message,
      ip: request.ip
    });
    reply.code(403).send({ message: 'Token ungültig oder abgelaufen' });
  }
});

// Register endpoint
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { username, email, password } = request.body;

    // Log registration attempt
    await Logger.info('Registration attempt', {
      username,
      email
    });

    if (!username || !email || !password) {
      await Logger.warn('Registration failed - Missing fields', {
        username: !!username,
        email: !!email,
        password: !!password
      });
      return reply.code(400).send({
        message: 'Username, email and password are required'
      });
    }

    const result = await AuthService.register(username, email, password);

    // Log successful registration
    await Logger.info('User registered successfully', {
      userId: result.user.id,
      username: result.user.username,
      email: result.user.email
    });

    return reply.code(201).send({
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.message.includes('already')) {
      await Logger.warn('Registration failed - User already exists', {
        username: request.body.username,
        email: request.body.email
      });
      return reply.code(409).send({ message: error.message });
    }

    // Log unexpected errors
    await Logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
      username: request.body.username
    });

    return reply.code(500).send({ message: 'Server error', error: error.message });
  }
});

// Login endpoint
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;

    // Log login attempt
    await Logger.info('Login attempt', { email });

    if (!email || !password) {
      await Logger.warn('Login failed - Missing credentials', {
        email: !!email,
        password: !!password
      });
      return reply.code(400).send({
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    // Log successful login
    await Logger.info('Login successful', {
      userId: result.user.id,
      username: result.user.username,
      email: result.user.email
    });

    return reply.code(200).send({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);

    // Log failed login
    await Logger.warn('Login failed - Invalid credentials', {
      email: request.body.email,
      error: error.message
    });

    return reply.code(401).send({ message: 'Invalid credentials' });
  }
});

// Get profile endpoint (protected)
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    await Logger.info('Profile accessed', {
      userId: request.user.userId,
      username: request.user.username
    });

    const { password, two_factor_auth_secret, ...userWithoutSensitive } = request.userDetails;
    return reply.send(userWithoutSensitive);
  } catch (error) {
    await Logger.error('Profile access error', {
      error: error.message,
      userId: request.user?.userId
    });
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'user-service', status: 'healthy', timestamp: new Date() };
});

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  await Logger.error('Unhandled error in user-service', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method
  });

  reply.code(error.statusCode || 500).send({
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });

    // Log service started
    await Logger.info('User service started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });

    console.log(`🚀 User service running on port ${PORT}`);
  } catch (err) {
    await Logger.error('Failed to start user service', {
      error: err.message,
      stack: err.stack
    });
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Logger.info('User service shutting down (SIGTERM)');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await Logger.info('User service shutting down (SIGINT)');
  await fastify.close();
  process.exit(0);
});

start();