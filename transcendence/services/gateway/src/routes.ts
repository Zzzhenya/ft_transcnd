import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions } from "fastify"

async function routes (fastify: FastifyInstance, options: FastifyServerOptions) {

// // route:/health for health check
//     fastify.get('/health', async (request, reply) => {
//       return { service: 'gateway', status: 'healthy', timestamp: new Date() };
//     });

// route:/ for root/index
    fastify.get('/', async (request , reply) => {
        reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    return { hello: 'Hello from API Gateway!' }
  })

  // Proxy routes for game service
  // Create demo game
  fastify.post('/ws/pong/demo', async (request, reply) => {
    try {
      const response = await fetch('http://game-service:3002/ws/pong/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.body)
      });
      
      const data = await response.json();
      reply.code(response.status).send(data);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to proxy request to game service' });
    }
  });

  // Get games list
  fastify.get('/ws/pong/game', async (request, reply) => {
    try {
      const response = await fetch('http://game-service:3002/ws/pong/game');
      const data = await response.json();
      reply.code(response.status).send(data);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to proxy request to game service' });
    }
  });

  // Create game
  fastify.post('/ws/pong/game', async (request, reply) => {
    try {
      const response = await fetch('http://game-service:3002/ws/pong/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.body)
      });
      
      const data = await response.json();
      reply.code(response.status).send(data);
    } catch (error) {
      reply.code(500).send({ error: 'Failed to proxy request to game service' });
    }
  });

}

export default routes;