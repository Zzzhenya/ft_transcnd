// src/routes/health.route.ts
// import { FastifyPluginAsync } from 'fastify'
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const healthRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/health', async (request, reply) => {
	  return { service: 'gateway', status: 'healthy', timestamp: new Date() };
	});

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


export default healthRoutes