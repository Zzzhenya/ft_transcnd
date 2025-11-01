// tournament/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const TOURNAMENT_SERVICE_URL = process.env.TOURNAMENT_SERVICE_INTERNAL_URL || 'http://tournament-service:3005';

const tournamentRoute: FastifyPluginAsync = async (fastify) => {

	fastify.post('/', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments`, 'POST');
	});

	// List tournaments (proxy to tournament-service)
	fastify.get('/', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments`, 'GET');
	});

	fastify.get<{Params: { id: string }}>('/:id/players', async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			// tournId = req.params.id;
			logger.info(`[[Gateway]] Gateway received GET request for /tournaments/${tournId}/players`)
	    	fastify.log.info(`[[Gateway]] Gateway received GET request for /tournaments/${tournId}/players`)
		} else {
			logger.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/players :Required request parameter is missing`)
			fastify.log.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/players :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/players`, 'GET');
	});

	fastify.get<{Params: { id: string }}>('/:id/bracket', async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			logger.info(`[[Gateway]] Gateway received GET request for /tournaments/${tournId}/bracket`)
		    fastify.log.info(`Gateway received GET request for /tournaments/${tournId}/bracket`)
		} else {
			logger.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/bracket :Required request parameter is missing`)
			fastify.log.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/bracket :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/bracket`, 'GET');
	});

	fastify.post<{Params: { id: string }}>('/:id/advance', async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			logger.info(`[[Gateway]] Gateway received POST request for /tournaments/${tournId}/advance`)
		    fastify.log.info(`Gateway received POST request for /tournaments/${tournId}/advance`)
		} else {
			logger.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/advance :Required request parameter is missing`)
			fastify.log.info(`[[Gateway]] 400 :Bad Request at /tournaments/:id/advance :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/advance`, 'POST');
	});

	// Join tournament
	fastify.post<{Params: { id: string }}>('/:id/join', async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10);
		} else {
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/join`, 'POST');
	});

	fastify.get('/stats', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/stats`, 'GET');
	});

	fastify.get('/health', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/health`, 'GET');
	});


};

export default tournamentRoute