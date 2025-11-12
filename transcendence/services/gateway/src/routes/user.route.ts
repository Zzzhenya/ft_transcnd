// user-service/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';
import { queueAwareIntermediateRequest } from '../utils/queueAwareIntermediateRequest.js';
import { queueAwareProxyRequest } from '../utils/queueAwareProxyHandler.js';
// import { authPreHandlerPlugin } from '../plugins/authPreHandler.plugin.js';

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
		// const res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
		// if (!res)
		// 	throw fastify.httpErrors.badRequest('Database failed for storing cookie data');
		// reply.setCookie('token', res.token, {
		// 	httpOnly: true,
		// 	secure: true,           // ✅ Only HTTPS for production
		// 	sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
		// 	path: '/',              // ✅ Valid across all routes
		// })
		// return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
		// reply.send(res);
		return queueAwareProxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
	});

	fastify.post('/auth/login', async (request, reply) => {
		// fastify.log.info("Gatewa{ preHandler: authPreHandler }y received POST request for /register")
		// fastify.log.info({ body: request.body }, "Request body")
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/login`, 'POST');
	});

	// Guest login route
	fastify.post('/auth/guest', {  preHandler: fastify.verifyAuth },  async (request, reply) => { // {  preHandler: fastify.verifyAuth }
		fastify.log.info("Gateway received POST request for /auth/guest");
		fastify.log.info({ body: request.body }, "Guest login request body");
		return queueAwareProxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
		// return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
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

	// Friend requests endpoints
	fastify.get('/users/:userId/friend-requests', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friend-requests`, 'GET');
	});

	fastify.put('/users/:userId/friend-requests/:requesterId', async (request, reply) => {
		const { userId, requesterId } = request.params as { userId: string; requesterId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friend-requests/${requesterId}`, 'PUT');
	});

	// Online users endpoint
	fastify.get('/users/online', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/online`, 'GET');
	});

	// Get specific user info endpoint
	fastify.get('/users/:userId', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}`, 'GET');
	});

	// User status endpoint
	fastify.post('/users/:userId/status', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/online-status`, 'POST');
	});

	// Invite (notification) endpoint
	fastify.post('/users/:userId/invite', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/invite`, 'POST');
	});

	// Notifications for a user
	fastify.get('/users/:userId/notifications', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/notifications`, 'GET');
	});

	// Accept notification endpoint
	fastify.post('/notifications/:notificationId/accept', async (request, reply) => {
		const { notificationId } = request.params as { notificationId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/notifications/${notificationId}/accept`, 'POST');
	});

	// Decline notification endpoint
	fastify.post('/notifications/:notificationId/decline', async (request, reply) => {
		const { notificationId } = request.params as { notificationId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/notifications/${notificationId}/decline`, 'POST');
	});

}

export default userRoutes