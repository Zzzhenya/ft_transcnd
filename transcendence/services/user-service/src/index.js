const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

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
        message: 'Benutzername, E-Mail und Passwort sind erforderlich'
      });
    }

    const result = await AuthService.register(username, email, password);

    return reply.code(201).send({
      message: 'Benutzer erfolgreich registriert',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message.includes('bereits')) {
      return reply.code(409).send({ message: error.message });
    }
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

// Login endpoint
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.code(400).send({
        message: 'Benutzername und Passwort sind erforderlich'
      });
    }

    const user = await AuthService.validateUser(username, password);

    if (!user) {
      return reply.code(401).send({ message: 'Ungültige Anmeldedaten' });
    }

    const token = AuthService.generateToken(user);

    return reply.code(200).send({
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

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
  return { service: 'gateway', status: 'healthy', timestamp: new Date() };
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