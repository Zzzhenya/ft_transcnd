// route: /pong/game

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import logger from '../utils/logger.js'; // log-service

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

interface GameParams {
  gameId: string;
}

const pongGameRoute: FastifyPluginAsync = async (fastify) => {

  logger.info(`pongGameRoute: `)

  fastify.post('/', async (request, reply) => {
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game`, 'POST');
  });

  fastify.get('/', async (request, reply) => {
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game`, 'GET');
  });

  fastify.get<{Params: GameParams;}>('/:gameId', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`pongGameRoute: Gateway received GET request for /pong/game/${gameId}`)
      fastify.log.info(`pongGameRoute: Gateway received GET request for /pong/game/${gameId}`)
    } else {
      logger.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      fastify.log.info(`4pongGameRoute: 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game/${gameId}`, 'GET');
  });

  fastify.post<{Params: GameParams;}>('/:gameId/join', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`pongGameRoute: Gateway received POST request for /pong/game/${gameId}/join`)
      fastify.log.info(`pongGameRoute: Gateway received POST request for /pong/game/${gameId}/join`)
    } else {
      logger.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      fastify.log.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game/${gameId}/join`, 'POST');
  });


  fastify.post<{Params: GameParams;}>('/:gameId/move', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`pongGameRoute: Gateway received POST request for /pong/game/${gameId}/move`)
      fastify.log.info(`pongGameRoute: Gateway received POST request for /pong/game/${gameId}/move`)
    } else {
      logger.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      fastify.log.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game/${gameId}/move`, 'POST');
  });


  fastify.put<{Params: GameParams;}>('/:gameId/result', async (request, reply) => {
    let gameId = null;
    if (request.params)
    {
      var gameIdStr = request.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      logger.info(`pongGameRoute: Gateway received PUT request for /pong/game/${gameId}/result`)
      fastify.log.info(`pongGameRoute: Gateway received PUT request for /pong/game/${gameId}/result`)
    } else {
      logger.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      fastify.log.info(`pongGameRoute: 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game/${gameId}/result`, 'PUT');
  });

};

export default pongGameRoute