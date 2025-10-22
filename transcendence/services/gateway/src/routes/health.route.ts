// src/routes/health.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service


const healthRoutes: FastifyPluginAsync = async (fastify) => {

// health route for gateway
    fastify.get('/health', async (request, reply) => {
        logger.info('[[Gateway]] GET request for /health');
        return { service: 'gateway', status: 'healthy', timestamp: new Date() };
	});

// health route for game-service
    fastify.get('/game-service/health', async (request , reply) => {
        logger.info('[[Gateway]] GET request for /game-service/health');
        try
        {
            const response = await fetch('http://game-service:3002/health', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error: any) {
            logger.error('[[Gateway]] GET request for /game-service/health failed', error);
            fastify.log.error(error);
            return gatewayError( reply, 503 );
        }
  });

// health route for log-service
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
        catch (error: any) {
            logger.error('[[Gateway]] GET request for /log-service/health failed', error);
            fastify.log.error(error);
            return gatewayError( reply, 503 );
        }
  });

// health route for test-db
    fastify.get('/test-db/health', async (request , reply) => {
        try
        {
            fastify.log.error("Gateway received GET request for /log-service")
            const response = await fetch('http://testdb:3010/health', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error: any) {
            logger.error('[[Gateway]] GET request for /test-db/health failed', error);
            fastify.log.error(error);
            return gatewayError( reply, 503 );
        }
  });

};

export default healthRoutes