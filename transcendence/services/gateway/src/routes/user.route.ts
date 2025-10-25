// user-service/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const userRoutes: FastifyPluginAsync = async (fastify) => {

// route:/user-service/health for user-service
	fastify.get('/health', async (request, reply) => {
		return proxyRequest(fastify, request, reply, 'http://user-service:3001/health', 'GET');
	});

	fastify.post('/auth/register', async (request, reply) => {
		// fastify.log.info("Gateway received POST request for /register")
		// fastify.log.info({ body: request.body }, "Request body")
		return proxyRequest(fastify, request, reply, 'http://user-service:3001/auth/register', 'POST');
	});

	fastify.post('/auth/login', async (request, reply) => {
		// fastify.log.info("Gateway received POST request for /register")
		// fastify.log.info({ body: request.body }, "Request body")
		return proxyRequest(fastify, request, reply, 'http://user-service:3001/auth/login', 'POST');
	});

	fastify.get('/auth/profile', async (request, reply) => {
		return proxyRequest(fastify, request, reply, 'http://user-service:3001/auth/profile', 'GET');
	});

}

export default userRoutes