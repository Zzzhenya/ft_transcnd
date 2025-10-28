import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

const statsRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/user-service/stats', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/stats`, 'GET');
	});

};

export default statsRoutes