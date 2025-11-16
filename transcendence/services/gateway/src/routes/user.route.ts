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

	// Update email endpoint
	fastify.put('/users/:userId/update-email', async (request, reply) => {
    	const { userId } = request.params as { userId: string };
    	return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/update-email`, 'PUT');
	});

	// Update user display name
	fastify.put('/users/:userId/display-name', async (request, reply) => {
	const { userId } = request.params as { userId: string };
	return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/display-name`, 'PUT');
	});

	// Update username
	fastify.put('/users/:userId/username', async (request, reply) => {
	const { userId } = request.params as { userId: string };
	return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/username`, 'PUT');
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

	// Get user's remote match history
	fastify.get('/users/:userId/remote-matches', async (request, reply) => {
			const { userId } = request.params as { userId: string };
			return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/remote-matches`, 'GET');
	});

	// Get user's tournament history
	fastify.get('/users/:userId/tournaments', async (request, reply) => {
			const { userId } = request.params as { userId: string };
			return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/tournaments`, 'GET');
	});

		// Get matches for a specific tournament
	fastify.get('/tournaments/:tournamentId/matches', async (request, reply) => {
			const { tournamentId } = request.params as { tournamentId: string };
			return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/tournaments/${tournamentId}/matches`, 'GET');
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

	// Avatar upload endpoint
	fastify.post('/users/:userId/avatar', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/avatar`, 'POST');
	});

	// Fileupload
	fastify.get('/avatars/:filename', async (request, reply) => {
	const { filename } = request.params as { filename: string };
	
	try {
		const response = await fetch(`${USER_SERVICE_URL}/avatars/${filename}`);
		
		if (!response.ok) {
		return reply.code(response.status).send({ error: 'Avatar not found' });
		}
		
		const buffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') || 'image/jpeg';
		
		return reply
		.code(200)
		.type(contentType)
		.send(Buffer.from(buffer));
	} catch (error) {
		// TypeScript-konform: Error richtig behandeln
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		fastify.log.error(`Failed to fetch avatar: ${errorMessage}`);
		return reply.code(500).send({ error: 'Failed to fetch avatar' });
	}
	});

	// Delete account endpoint
	fastify.delete('/auth/account', async (request, reply) => {
		fastify.log.info("Gateway received DELETE request for /auth/account");
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/account`, 'DELETE');
	});

}

export default userRoutes