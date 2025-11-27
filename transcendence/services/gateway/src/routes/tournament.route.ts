// tournament/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';
import { queueAwareProxyRequest } from '../utils/queueAwareProxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const TOURNAMENT_SERVICE_URL = process.env.TOURNAMENT_SERVICE_INTERNAL_URL || 'http://tournament-service:3005';

const tournamentRoute: FastifyPluginAsync = async (fastify) => {
	logger.info(`tournamentRoute: `)

	fastify.post('/', { preHandler: fastify.mustAuth }, async (request, reply) => {
		return queueAwareProxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments`, 'POST');
	});

	// List tournaments (proxy to tournament-service)
	fastify.get('/', { preHandler: fastify.mustAuth }, async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments`, 'GET');
	});

	fastify.get<{Params: { id: string }}>('/:id/players', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			// tournId = req.params.id;
			logger.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}/players`)
	    	fastify.log.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}/players`)
		} else {
			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/players :Required request parameter is missing`)
			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/players :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/players`, 'GET');
	});

		// Get tournament details
		fastify.get<{Params: { id: string }}>('/:id', { preHandler: fastify.mustAuth }, async (request, reply) => {
	 		let tournId = null;
	 		if (request.params) {
	 			var tournIdStr = request.params.id;
	 			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10);
	 			logger.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}`)
	 	    fastify.log.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}`)
	 		} else {
	 			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id :Required request parameter is missing`)
	 			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id :Required request parameter is missing`)
	 			throw fastify.httpErrors.badRequest('Missing required parameter: id');
	 		}
	 		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}`, 'GET');
		});

	fastify.get<{Params: { id: string }}>('/:id/bracket', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			logger.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}/bracket`)
		    fastify.log.info(`tournamentRoute: Gateway received GET request for /tournaments/${tournId}/bracket`)
		} else {
			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/bracket :Required request parameter is missing`)
			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/bracket :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/bracket`, 'GET');
	});

	fastify.post<{Params: { id: string }}>('/:id/advance', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			logger.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/advance`)
		    fastify.log.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/advance`)
		} else {
			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/advance :Required request parameter is missing`)
			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/advance :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/advance`, 'POST');
	});

	/**
	 * POST /tournaments/:id/interrupt
	 * 
	 * PURPOSE:
	 * Proxy endpoint for tournament match interruption
	 * 
	 * CONTEXT:
	 * This endpoint was added to support the match interruption feature.
	 * When a player exits during an active match, the frontend sends a POST
	 * request to this endpoint, which proxies it to the tournament-service.
	 * 
	 * REQUEST FLOW:
	 * 1. Frontend detects player exit during match
	 * 2. Frontend sends POST to gateway: /tournaments/:id/interrupt
	 * 3. Gateway extracts tournament ID and proxies to tournament-service
	 * 4. Tournament-service marks match and tournament as 'interrupted'
	 * 5. Response flows back through gateway to frontend
	 * 
	 * TECHNICAL DETAILS:
	 * - Uses keepalive:true in frontend fetch to ensure completion
	 * - Logs all requests for debugging
	 * - Validates tournament ID parameter
	 * - Returns 400 if ID missing, 404 if tournament not found
	 */
	fastify.post<{Params: { id: string }}>('/:id/interrupt', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
			logger.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/interrupt`)
		    fastify.log.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/interrupt`)
		} else {
			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/interrupt :Required request parameter is missing`)
			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/interrupt :Required request parameter is missing`)
			// throw 400 Bad Request
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/interrupt`, 'POST');
	});

	// Join tournament
	fastify.post<{Params: { id: string }}>('/:id/join', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10);
		} else {
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/join`, 'POST');
	});

	// Start tournament
	fastify.post<{Params: { id: string }}>('/:id/start', { preHandler: fastify.mustAuth }, async (request, reply) => {
		let tournId = null;
		if (request.params) {
			var tournIdStr = request.params.id;
			tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10);
			logger.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/start`)
			fastify.log.info(`tournamentRoute: Gateway received POST request for /tournaments/${tournId}/start`)
		} else {
			logger.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/start :Required request parameter is missing`)
			fastify.log.info(`tournamentRoute: 400 :Bad Request at /tournaments/:id/start :Required request parameter is missing`)
			throw fastify.httpErrors.badRequest('Missing required parameter: id');
		}
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/tournaments/${tournId}/start`, 'POST');
	});

	fastify.get('/stats', { preHandler: fastify.mustAuth }, async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/stats`, 'GET');
	});

	fastify.get('/health', async (request, reply) => {
		return proxyRequest(fastify, request, reply, `${TOURNAMENT_SERVICE_URL}/health`, 'GET');
	});


};

export default tournamentRoute