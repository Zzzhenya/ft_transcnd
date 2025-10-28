// route: /pong/demo

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import logger from '../utils/logger.js'; // log-service

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

interface GameParams {
  gameId: string;
}

const pongDemoRoute: FastifyPluginAsync = async (fastify) => {

  fastify.get('/', async (request, reply) => {
    const existingSessionId = request.cookies.sessionId;
    if (existingSessionId)
      fastify.log.info('✅'+ existingSessionId)
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/demo`, 'GET');
  });

  fastify.post('/', async (request, reply) => {
    const existingSessionId = request.cookies.sessionId;
    if (existingSessionId)
      fastify.log.info('✅'+ existingSessionId)
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/demo`, 'POST');
  });


  fastify.delete<{Params: GameParams;}>('/:gameId', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received DELETE request for /pong/demo/${gameId}`)
      fastify.log.info(`[[Gateway]] Gateway received DELETE request for /pong/demo/${gameId}`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/demo/:gameId :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/demo/:gameId :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/demo/${gameId}`, 'DELETE');
  });


  fastify.delete('/', async (request, reply) => {
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/demo`, 'DELETE');
  });


  fastify.post<{Params: GameParams;}>('/:gameId/move', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received POST request for /pong/demo/${gameId}/move`)
      fastify.log.info(`[[Gateway]] Gateway received POST request for /pong/demo/${gameId}/move`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/demo/:gameId/move :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/demo/:gameId/move :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/demo/${gameId}/move`, 'POST');
  });

};

export default pongDemoRoute