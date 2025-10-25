import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

const statsRoutes: FastifyPluginAsync = async (fastify) => {

	fastify.get('/user-service/stats', async (request, reply) => {
	try
	{
	    fastify.log.error("Gateway received GET request for /game-service")
	    const response = await fetch('http://game-service:3002/stats', {
	    method: 'GET',
	    headers: {
	    'Authorization': request.headers['authorization'] || '',
	}})
	const data = await response.json();
	reply.status(response.status).send(data);
	}
    catch (error: any) {
        logger.error('[[Gateway]] GET request for /user-service/stats failed', error);
        fastify.log.error(error);
        return gatewayError( reply, 503 );
    }
	});

};

export default statsRoutes