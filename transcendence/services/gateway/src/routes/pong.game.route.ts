// route: /pong/game

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import logger from '../utils/logger.js'; // log-service

interface GameParams {
  gameId: string;
}

const pongGameRoute: FastifyPluginAsync = async (fastify) => {

  fastify.post('/', async (request, reply) => {
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/pong/game', 'POST');
  });

  fastify.get('/', async (request, reply) => {
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/pong/game', 'GET');
  });

  fastify.get<{Params: GameParams;}>('/:gameId', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received GET request for /pong/game/${gameId}`)
      fastify.log.info(`[[Gateway]] Gateway received GET request for /pong/game/${gameId}`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/pong/game/${gameId}`, 'GET');
  });

  fastify.post<{Params: GameParams;}>('/:gameId/join', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/join`)
      fastify.log.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/join`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/pong/game/${gameId}/join`, 'POST');
  });


  fastify.post<{Params: GameParams;}>('/:gameId/move', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/move`)
      fastify.log.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/move`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/pong/game/${gameId}/move`, 'POST');
  });


  fastify.put<{Params: GameParams;}>('/:gameId/result', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`[[Gateway]] Gateway received PUT request for /pong/game/${gameId}/result`)
      fastify.log.info(`[[Gateway]] Gateway received PUT request for /pong/game/${gameId}/result`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/pong/game/${gameId}/result`, 'PUT');
  });

};

export default pongGameRoute