const fastify = require('fastify')({ logger: true });
const logger = require('./logger');
const axios = require('axios');

const LOGSTASH_URL = process.env.LOGSTASH_URL || 'http://logstash:5000';

// Send logs to Logstash
async function sendToLogstash(logData) {
  try {
    await axios.post(LOGSTASH_URL, logData, {
      timeout: 2000,
      validateStatus: () => true
    });
  } catch (error) {
    // Silently fail if Logstash is not available
    console.log('Logstash unavailable:', error.message);
  }
}

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    service: 'log-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    logstash: LOGSTASH_URL
  };
});

// Endpoint to receive logs
fastify.post('/api/logs', async (request, reply) => {
  try {
    const { level, message, service, metadata } = request.body;

    // Validate required fields
    if (!level || !message || !service) {
      return reply.status(400).send({
        error: 'Missing required fields: level, message, service'
      });
    }

    const logData = {
      level,
      message,
      service,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // Log locally for debugging (console only)
    logger.log({
      level,
      message: `[${service}] ${message}`,
      metadata
    });

    // Forward to Logstash
    await sendToLogstash(logData);

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

// Endpoint for batch logs
fastify.post('/api/logs/batch', async (request, reply) => {
  try {
    const { logs } = request.body;

    if (!Array.isArray(logs)) {
      return reply.status(400).send({
        error: 'logs must be an array'
      });
    }

    for (const log of logs) {
      const { level, message, service, metadata } = log;
      if (level && message && service) {
        const logData = {
          level,
          message,
          service,
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        };

        logger.log({
          level,
          message: `[${service}] ${message}`
        });

        await sendToLogstash(logData);
      }
    }

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
    console.log('Forwarding logs to:', LOGSTASH_URL);
  } catch (err) {
    logger.error('Failed to start log-service:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start();