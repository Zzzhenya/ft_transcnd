// user-service/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';
import { queueAwareProxyRequest } from '../utils/queueAwareProxyHandler.js';

// How to include authentication for protected(registered user only) routes: { preHandler: fastify.mustAuth }

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync, FastifyRequest } from "fastify"

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const PROXY_TIMEOUT = 5000;


const userRoutes: FastifyPluginAsync = async (fastify) => {

	logger.info(`userRoutes: `)
	// Health check for user-service (through gateway)
	fastify.get('/health', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/health`, 'GET');
	});

	fastify.post('/auth/clear', async (request, reply) => {
		reply.clearCookie('token', { path: '/' });
		reply.clearCookie('sessionId', { path: '/' });
		reply.clearCookie('session', { path: '/' });
		return reply.status(200).send({ success: true, message: 'Session cleared' });
	});

	fastify.post('/auth/logout', { preHandler: fastify.mustAuth }, async (request, reply) => {
		reply.clearCookie('token', { path: '/' });
		reply.clearCookie('sessionId', { path: '/' });
		reply.clearCookie('session', { path: '/' });
		return reply.status(200).send({ success: true, message: 'Logged out' });
	});

	// ✅ FIXED: Only clear cookies on successful registration
	fastify.post('/auth/register', async (request, reply) => {
		try {
			const upstreamUrl = `${USER_SERVICE_URL}/auth/register`;
			const response = await request.customFetch(
				upstreamUrl,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request.body)
				},
				PROXY_TIMEOUT
			);

			const data = await response.json();

			// Only clear cookies if registration was successful
			if (response.ok) {
				reply.clearCookie('token', { path: '/' });
				reply.clearCookie('sessionId', { path: '/' });
				reply.clearCookie('session', { path: '/' });

				// Set new token cookie
				if (data.token) {
					reply.setCookie('token', data.token, {
						httpOnly: true,
						secure: true,
						sameSite: 'lax',
						path: '/',
					});
					delete data.token;
				}
			}

			return reply.status(response.status).send(data);
		} catch (error: any) {
			fastify.log.error('Registration error:', error);
			return reply.status(500).send({
				success: false,
				message: 'Internal server error'
			});
		}
	});

	// ✅ FIXED: Only clear cookies on successful login
	fastify.post('/auth/login', async (request, reply) => {
		try {
			const upstreamUrl = `${USER_SERVICE_URL}/auth/login`;
			const response = await request.customFetch(
				upstreamUrl,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request.body)
				},
				PROXY_TIMEOUT
			);

			const data = await response.json();

			// Only clear cookies if login was successful
			if (response.ok) {
				reply.clearCookie('token', { path: '/' });
				reply.clearCookie('sessionId', { path: '/' });
				reply.clearCookie('session', { path: '/' });

				// Set new token cookie
				if (data.token) {
					reply.setCookie('token', data.token, {
						httpOnly: true,
						secure: true,
						sameSite: 'lax',
						path: '/',
					});
					delete data.token;
				}
			}

			return reply.status(response.status).send(data);
		} catch (error: any) {
			fastify.log.error('Login error:', error);
			return reply.status(500).send({
				success: false,
				message: 'Internal server error'
			});
		}
	});

	// Guest login route
	// fastify.post('/auth/guest', async (request, reply) => {
	// 	fastify.log.info("userRoutes: Gateway received POST request for /auth/guest");
	// 	fastify.log.info({ body: request.body }, "Guest login request body");
	// 	return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
	// });

	fastify.get('/auth/profile', { preHandler: fastify.mustAuth }, async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/profile`, 'GET');
	});

	// Friends endpoints
	fastify.get('/users/:userId/friends', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friends`, 'GET');
	});

	fastify.post('/users/:userId/friends', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friends`, 'POST');
	});

	// Friend requests endpoints
	fastify.get('/users/:userId/friend-requests', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friend-requests`, 'GET');
	});


	fastify.put('/users/:userId/friend-requests/:requesterId', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId, requesterId } = request.params as { userId: string; requesterId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/friend-requests/${requesterId}`, 'PUT');
	});

	// Online users endpoint
	fastify.get('/users/online', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/online`, 'GET');
	});

	// Get specific user info endpoint
	fastify.get('/users/:userId', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}`, 'GET');
	});


	// User status endpoint { preHandler: fastify.mustAuth },?
	fastify.post('/users/:userId/status', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/online-status`, 'POST');
	});

	// Weiterleitung von Online status
	fastify.post('/users/:userId/online-status', async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/online-status`, 'POST');
	});

	// Update email endpoint
	fastify.put('/users/:userId/update-email', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/update-email`, 'PUT');
	});

	// Update user display name
	fastify.put('/users/:userId/display-name', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/display-name`, 'PUT');
	});

	// Update username
	fastify.put('/users/:userId/username', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/username`, 'PUT');
	});

	// Invite (notification) endpoint
	fastify.post('/users/:userId/invite', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/invite`, 'POST');
	});

	// Notifications for a user
	fastify.get('/users/:userId/notifications', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/notifications`, 'GET');
	});

	// Get unread notifications (for polling)
	fastify.get('/notifications/unread', { preHandler: fastify.mustAuth }, async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/notifications/unread`, 'GET');
	});

	// Get user's remote match history
	fastify.get('/users/:userId/remote-matches', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/remote-matches`, 'GET');
	});

	// Get user's tournament history
	fastify.get('/users/:userId/tournaments', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/tournaments`, 'GET');
	});

	// Get matches for a specific tournament
	fastify.get('/tournaments/:tournamentId/matches', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { tournamentId } = request.params as { tournamentId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/tournaments/${tournamentId}/matches`, 'GET');
	});

	// Accept notification endpoint
	fastify.post('/notifications/:notificationId/accept', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { notificationId } = request.params as { notificationId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/notifications/${notificationId}/accept`, 'POST');
	});

	// Decline notification endpoint
	fastify.post('/notifications/:notificationId/decline', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { notificationId } = request.params as { notificationId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/notifications/${notificationId}/decline`, 'POST');
	});

	// Avatar upload endpoint
	fastify.post('/users/:userId/avatar', { preHandler: fastify.mustAuth }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/users/${userId}/avatar`, 'POST');
	});

	// Fileupload
	fastify.get('/avatars/:filename', { preHandler: fastify.mustAuth }, async (request, reply) => {
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
			fastify.log.error(`userRoutes: Failed to fetch avatar: ${errorMessage}`);
			return reply.code(500).send({ error: 'Failed to fetch avatar' });
		}
	});

	// Delete account endpoint
	// fastify.delete('/auth/account', { preHandler: fastify.mustAuth }, async (request, reply) => {
	// 	fastify.log.info("userRoutes: Gateway received DELETE request for /auth/account");
	// 	return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/account`, 'DELETE');
	// });

}

export default userRoutes