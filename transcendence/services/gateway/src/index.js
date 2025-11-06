const fastify = require('fastify')({ logger: true });
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer();

fastify.get('/health', async (request, reply) => {
  return { service: 'gateway', status: 'healthy', timestamp: new Date() };
});

// Read
fastify.get('/db/user/:id', async (request, reply) => {
  const { id } = request.params;
  console.log('🟢 DB USER ROUTE - ID:', id);  // Debug log
  
  try {
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'SELECT * FROM users WHERE id = ?',
        params: [parseInt(id)]
      })
    });
    
    const data = await response.json();
    console.log('🟢 DB Response:', data);
    return reply.send(data);
  } catch (error) {
    console.error('🔴 DB Error:', error);
    return reply.code(500).send({ error: error.message });
  }
});

// Start function
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('gateway running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// ⚠️ Catch-all MUSS NACH allen anderen Routes kommen!
fastify.all('/*', async (request, reply) => {
  console.log(`📌 Unhandled: ${request.method} ${request.url}`);
  return { 
    message: `Route ${request.method}:${request.url} not found`,
    error: 'Not Found',
    statusCode: 404 
  };
});

start();