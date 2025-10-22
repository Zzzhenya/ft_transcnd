import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions } from "fastify"
import gatewayError from '@utils/gatewayError.js';
import logger from '@utils/logger.js'; // log-service

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

}

export default routes;