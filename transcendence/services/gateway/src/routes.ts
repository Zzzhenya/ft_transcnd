import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions } from "fastify"

async function routes (fastify: FastifyInstance, options: FastifyServerOptions) {

// route:/health for health check
    fastify.get('/health', async (request, reply) => {
      return { service: 'gateway', status: 'healthy', timestamp: new Date() };
    });

// route:/ for root/index
    fastify.get('/', async (request , reply) => {
        reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    return { hello: 'Hello from API Gateway!' }
  })

// route:/users for user-service
    fastify.get('/user-service/health', async (request , reply) => {
        try
        {
            fastify.log.error("Gateway received GET request for /users")
            const response = await fetch('http://user-service:3001/health', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error) {
		    fastify.log.error(error)
		    reply.status(404);
	}
    // reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    // return { hello: 'Users' }
  })

// route:/game-service for game-service
    fastify.get('/game-service/health', async (request , reply) => {
        try
        {
            fastify.log.error("Gateway received GET request for /game-service")
            const response = await fetch('http://game-service:3002/health', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error) {
            fastify.log.error(error)
            reply.status(404);
    }
    // reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    // return { hello: 'Users' }
  })

// route:/game-service for game-service
    fastify.get('/log-service/health', async (request , reply) => {
        try
        {
            fastify.log.error("Gateway received GET request for /log-service")
            const response = await fetch('http://log-service:3003/health', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error) {
            fastify.log.error(error)
            reply.status(404);
    }
    // reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    // return { hello: 'Users' }
  })


}

export default routes;