// user-service/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';

const userRoutes: FastifyPluginAsync = async (fastify) => {

// Health check for user-service (through gateway)
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

	// Guest login route
	fastify.post('/auth/guest', async (request, reply) => {
		fastify.log.info("Gateway received POST request for /auth/guest");
		fastify.log.info({ body: request.body }, "Guest login request body");
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
	});

	fastify.get('/auth/profile', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/profile`, 'GET');
	});

	// Friends endpoints
	fastify.get('/users/:userId/friends', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friends`, 'GET');
	});

	fastify.post('/users/:userId/friends', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friends`, 'POST');
	});

	// Online users endpoint
	fastify.get('/users/online', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/online`, 'GET');
	});

	// User status endpoint
	fastify.post('/users/:userId/status', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/status`, 'POST');
	});

}

export default userRoutes