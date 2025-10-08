// user-service/auth

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const userRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/register', async (request, reply) => {
		try
		{
			fastify.log.error("Gateway received GET request for /register")
			const response = await fetch('http://user-service:3001/auth/register', {
			method: 'GET',
			headers: {
			'Authorization': request.headers['authorization'] || '',
		}})
		const data = await response.json();
		reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
	}
	});

	fastify.get('/login', async (request, reply) => {
		try
		{
			fastify.log.error("Gateway received GET request for /login")
			const response = await fetch('http://user-service:3001/auth/login', {
			method: 'GET',
			headers: {
			'Authorization': request.headers['authorization'] || '',
		}})
		const data = await response.json();
		reply.status(response.status).send(data);
		}
		catch (error) {
			fastify.log.error(error)
			reply.status(404);
	}
	});

	fastify.get('/profile', async (request, reply) => {
		try
		{
			fastify.log.error("Gateway received GET request for /profile")
			const response = await fetch('http://user-service:3001/auth/profile', {
			method: 'GET',
			headers: {
			'Authorization': request.headers['authorization'] || '',
		}})
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