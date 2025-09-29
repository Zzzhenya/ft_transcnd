const fastify = require('fastify')({ logger: true });

fastify.get('/health', async (request, reply) => {
  return { service: 'game-service', status: 'healthy', timestamp: new Date() };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('game-service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
