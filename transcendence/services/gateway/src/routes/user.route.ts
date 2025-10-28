// user-service/

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const userRoutes: FastifyPluginAsync = async (fastify) => {

	// route:/user-service/health for user-service
	fastify.get('/health', async (request , reply) => {
		try
		{
			fastify.log.error("Gateway received GET request for /users")
			const response = await fetch('http://user-service:3001/health', {
				method: 'GET',
				headers: {
					'Authorization': request.headers['authorization'] || '',
				}
			})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
		}
	})

	fastify.post('/auth/register', async (request, reply) => {
		try
		{
			fastify.log.info("Gateway received POST request for /register")
			fastify.log.info({ body: request.body }, "Request body")
			const response = await fetch('http://user-service:3001/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': request.headers['authorization'] || '',
				},
				body:JSON.stringify(request.body),
			})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
		}
	});

	fastify.post('/auth/login', async (request, reply) => {
		try
		{
			fastify.log.error("Gateway received POST request for /login")
			const response = await fetch('http://user-service:3001/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': request.headers['authorization'] || '',
				},
				body:JSON.stringify(request.body),
			})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
		}
	});

	// ════════════════════════════════════════════════════════
	// GUEST LOGIN ROUTE - NEU!
	// ════════════════════════════════════════════════════════
	fastify.post('/auth/guest', async (request, reply) => {
		try
		{
			fastify.log.info("Gateway received POST request for /guest")
			fastify.log.info({ body: request.body }, "Request body")
			const response = await fetch('http://user-service:3001/auth/guest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': request.headers['authorization'] || '',
				},
				body:JSON.stringify(request.body),
			})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(500);
		}
	});
	// ════════════════════════════════════════════════════════

	fastify.get('/auth/profile', async (request, reply) => {
		try
		{
			fastify.log.error("Gateway received GET request for /profile")
			const response = await fetch('http://user-service:3001/auth/profile', {
				method: 'GET',
				headers: {
					'Authorization': request.headers['authorization'] || '',
				}
			})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
		}
	});

}

export default userRoutes