// tournament/
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service
import { proxyRequest } from '../utils/proxyHandler.js';

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

const tournamentRoute: FastifyPluginAsync = async (fastify) => {

	fastify.post('/', async (request, reply) => {
		return proxyRequest(fastify, request, reply, 'http://tournament-service:3005/tournaments', 'POST');
	});

	fastify.get<{Params: { id: string }}>('/:id/players', async (request, reply) => {
		let tournId = null;
		try
		{
			// Method 1: Try req.params first
			if (request.params) {
				var tournIdStr = request.params.id;
				tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
				// tournId = req.params.id;
				console.log('other: ', tournId)
			}
			logger.info(`Gateway received GET request for /tournaments/${tournId}/players`)
		    fastify.log.info("Gateway received GET request for /tournaments/:id/players")
		    const response = await fetch(`http://tournament-service:3005/tournaments/${tournId}/players`, {
			    method: 'GET',
			    headers: {
			    'Authorization': request.headers['authorization'] || '',
			}})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
	    catch (error: any) {
	        logger.error('[[Gateway]] GET request for /tournaments/:id/players failed', error);
	        fastify.log.error(error);
	        return gatewayError(
	        	reply,
	        	503,
	        	'Service Unavailable',
	        	'The upstream service is currently unavailable.');
        }
	});

	fastify.get<{Params: { id: string }}>('/:id/bracket', async (request, reply) => {
		let tournId = null;
		try
		{
			// Method 1: Try req.params first
			if (request.params) {
				var tournIdStr = request.params.id;
				tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
				// tournId = req.params.id;
				console.log('other: ', tournId)
			}
			logger.info(`Gateway received GET request for /tournaments/${tournId}/bracket`)
		    fastify.log.info("Gateway received GET request for /tournaments/:id/bracket")
		    const response = await fetch(`http://tournament-service:3005/tournaments/${tournId}/bracket`, {
			    method: 'GET',
			    headers: {
			    'Authorization': request.headers['authorization'] || '',
			}})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
		catch (error: any) {
			logger.error('[[Gateway]] GET request for /tournaments/:id/bracket failed', error);
			fastify.log.error(error);
			return gatewayError(
				reply,
				503,
				'Service Unavailable',
				'The upstream service is currently unavailable.');
	    }
	});

	fastify.post<{Params: { id: string }}>('/:id/advance', async (request, reply) => {
		let tournId = null;
		try
		{
			// Method 1: Try req.params first
			if (request.params) {
				var tournIdStr = request.params.id;
				tournId = parseInt(tournIdStr.replace(/[^0-9]/g, ''),10); 
				// tournId = req.params.id;
				console.log('other: ', tournId)
			}
			logger.info(`Gateway received POST request for /tournaments/${tournId}/advance`)
		    fastify.log.info("Gateway received POST request for /tournaments/:id/advance")
		    const response = await fetch(`http://tournament-service:3005/tournaments/${tournId}/advance`, {
			    method: 'POST',
			    headers: {
			    'Authorization': request.headers['authorization'] || '',
			}})
			const data = await response.json();
			reply.status(response.status).send(data);
		}
	    catch (error: any) {
	        logger.error('[[Gateway]] POST request for /tournaments/:id/advance failed', error);
	        fastify.log.error(error);
	        return gatewayError(
	        	reply,
	        	503,
	        	'Service Unavailable',
	        	'The upstream service is currently unavailable.');
	    }
	});

	fastify.get('/stats', async (request, reply) => {
	try
	{
	    fastify.log.error("Gateway received GET request for /tournaments/stats")
	    const response = await fetch('http://tournament-service:3005/stats', {
	    method: 'GET',
	    headers: {
	    'Authorization': request.headers['authorization'] || '',
	}})
	const data = await response.json();
	reply.status(response.status).send(data);
	}
	catch (error: any) {
		logger.error('[[Gateway]] GET request for /tournaments/stats failed', error);
		fastify.log.error(error);
		return gatewayError(
			reply,
			503,
			'Service Unavailable',
			'The upstream service is currently unavailable.');
    }
	});

	fastify.get('/health', async (request, reply) => {
	try
	{
	    fastify.log.error("Gateway received GET request for /tournaments/health")
	    const response = await fetch('http://tournament-service:3005/health', {
	    method: 'GET',
	    headers: {
	    'Authorization': request.headers['authorization'] || '',
	}})
	const data = await response.json();
	reply.status(response.status).send(data);
	}
	catch (error: any) {
		logger.error('[[Gateway]] GET request for /tournaments/health failed', error);
		fastify.log.error(error);
		return gatewayError(
			reply,
			503,
			'Service Unavailable',
			'The upstream service is currently unavailable.');
	}
	});


};

export default tournamentRoute