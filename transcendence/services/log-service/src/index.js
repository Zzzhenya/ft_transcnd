const fastify = require('fastify')({ logger: true });
const logger = require('./logger');
const axios = require('axios');

// Logstash is on port 5000 INSIDE the Docker network
const LOGSTASH_URL = process.env.LOGSTASH_URL || 'http://logstash:5000';

// Send logs to Logstash
async function sendToLogstash(logData) {
  try {
    await axios.post(LOGSTASH_URL, logData, {
      timeout: 2000,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json'
      }
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
    timestamp: new Date(),
    elasticsearch: process.env.ELASTICSEARCH_URL ? 'connected' : 'not configured',
    logstash: LOGSTASH_URL
  };
});

// Receive logs from services
fastify.post('/api/logs', async (request, reply) => {
  try {
    const { level, message, service, metadata } = request.body;

    if (!level || !message || !service) {
      return reply.status(400).send({
        error: 'Missing required fields: level, message, service'
      });
    }

    const logData = {
      level: level.toLowerCase(),
      message,
      service,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // Log locally with Winston (to Elasticsearch)
    logger.log(level, message, logData);

    // Also send to Logstash for additional processing
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

// Batch logging endpoint
fastify.post('/api/logs/batch', async (request, reply) => {
  try {
    const { logs } = request.body;

    if (!Array.isArray(logs)) {
      return reply.status(400).send({
        error: 'logs must be an array'
      });
    }

    const processed = [];

    for (const log of logs) {
      const { level, message, service, metadata } = log;
      if (level && message && service) {
        const logData = {
          level: level.toLowerCase(),
          message,
          service,
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        };

        logger.log(level, message, logData);
        await sendToLogstash(logData);
        processed.push(logData);
      }
    }

    return {
      success: true,
      count: processed.length
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
    console.log(`log-service running on port 3003`);
    console.log(`Sending logs to: ${LOGSTASH_URL}`);
  } catch (err) {
    logger.error('Failed to start log-service:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start();