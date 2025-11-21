// src/routes/health.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';


const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';
const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3003';
const TESTDB_URL = process.env.TESTDB_URL || 'http://testdb:3010';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
    logger.info(`healthRoutes: `)

// health route for gateway
    fastify.get('/health', async (request, reply) => {
        logger.info('[[Gateway]] GET request for /health');
        return { service: 'gateway', status: 'healthy', timestamp: new Date() };
	});

// health route for game-service
    fastify.get('/game-service/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/health`, 'GET');
    });

// health route for log-service
    fastify.get('/log-service/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, `${LOG_SERVICE_URL}/health`, 'GET');
    });

// health route for test-db
    fastify.get('/test-db/health', async (request, reply) => {
        return proxyRequest(fastify, request, reply, `${TESTDB_URL}/health`, 'GET');
    });

// health route for tournament-service
    fastify.get('/tournament-service/health', async (request, reply) => {
        const TOURNAMENT_SERVICE_URL = process.env.TOURNAMENT_SERVICE_URL || 'http://tournament-service:3005';
        return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/health`, 'GET');
    });

};

export default healthRoutes