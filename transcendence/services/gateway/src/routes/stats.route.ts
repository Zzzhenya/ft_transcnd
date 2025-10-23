import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

const statsRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/user-service/stats', async (request, reply) => {
	try
	{
	    fastify.log.error("Gateway received GET request for /game-service")
	    const response = await fetch(`${GAME_SERVICE_URL}/stats`, {
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

};

export default statsRoutes