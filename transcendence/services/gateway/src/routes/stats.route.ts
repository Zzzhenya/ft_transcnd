import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

const statsRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/user-service/stats', async (request, reply) => {
		return proxyRequest(fastify, request, reply, 'http://game-service:3002/stats', 'GET');
	});

};

export default statsRoutes