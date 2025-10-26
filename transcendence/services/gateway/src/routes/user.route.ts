// user-service/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

const userRoutes: FastifyPluginAsync = async (fastify) => {

// route:/user-service/health for user-service
	fastify.get('/health', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/health`, 'GET');
	});

	fastify.post('/auth/register', async (request, reply) => {
		// fastify.log.info("Gateway received POST request for /register")
		// fastify.log.info({ body: request.body }, "Request body")
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
	});

	fastify.post('/auth/login', async (request, reply) => {
		// fastify.log.info("Gateway received POST request for /register")
		// fastify.log.info({ body: request.body }, "Request body")
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/login`, 'POST');
	});

	fastify.get('/auth/profile', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/profile`, 'GET');
	});

}

export default userRoutes