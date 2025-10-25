// src/routes/health.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';


const healthRoutes: FastifyPluginAsync = async (fastify) => {

// health route for gateway
    fastify.get('/health', async (request, reply) => {
        logger.info('[[Gateway]] GET request for /health');
        return { service: 'gateway', status: 'healthy', timestamp: new Date() };
	});

// health route for game-service
    fastify.get('/game-service/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, 'http://game-service:3002/health', 'GET');
    });

// health route for log-service
    fastify.get('/log-service/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, 'http://log-service:3003/health', 'GET');
    });

// health route for test-db
    fastify.get('/test-db/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, 'http://testdb:3010/health', 'GET');
    });

};

export default healthRoutes