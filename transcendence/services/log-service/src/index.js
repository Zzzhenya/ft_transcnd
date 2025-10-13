const fastify = require('fastify')({ logger: true });
const logger = require('./logger');

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    service: 'log-service',
    status: 'healthy',
    timestamp: new Date(),
    elasticsearch: process.env.ELASTICSEARCH_URL ? 'connected' : 'not configured'
  };
});

// Endpoint para recibir logs
fastify.post('/api/logs', async (request, reply) => {
  try {
    const { level, message, service, metadata } = request.body;

    // Validar campos requeridos
    if (!level || !message || !service) {
      return reply.status(400).send({
        error: 'Missing required fields: level, message, service'
      });
    }

    // Enviar log a Winston (que lo manda a Elasticsearch)
    logger.log({
      level,
      message,
      service,
      ...metadata,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Log recorded'
    };
  } catch (error) {
    logger.error('Error processing log:', error);
    return reply.status(500).send({
      error: 'Failed to process log'
    });
  }
});

// Endpoint para logs en batch
fastify.post('/api/logs/batch', async (request, reply) => {
  try {
    const { logs } = request.body;

    if (!Array.isArray(logs)) {
      return reply.status(400).send({
        error: 'logs must be an array'
      });
    }

    logs.forEach(log => {
      const { level, message, service, metadata } = log;
      if (level && message && service) {
        logger.log({
          level,
          message,
          service,
          ...metadata,
          timestamp: new Date().toISOString()
        });
      }
    });

    return {
      success: true,
      count: logs.length
    };
  } catch (error) {
    logger.error('Error processing batch logs:', error);
    return reply.status(500).send({
      error: 'Failed to process batch logs'
    });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3003, host: '0.0.0.0' });
    logger.info('log-service running on port 3003');
    console.log('log-service running on port 3003');
  } catch (err) {
    logger.error('Failed to start log-service:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start();