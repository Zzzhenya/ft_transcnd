// src/routes/game.route.ts
import type { FastifyPluginAsync } from 'fastify'
import { proxyRequest } from '../utils/proxyHandler.js';
import { queueAwareProxyRequest } from '../utils/queueAwareProxyHandler.js';
import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002'

const gameRoute: FastifyPluginAsync = async (fastify) => {

  logger.info(`gameRoute: `)
  
  // POST /api/rooms - Create new room
  fastify.post('/rooms', { preHandler: fastify.mustAuth }, async (request, reply) => {
      return queueAwareProxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/api/rooms`, 'POST');
  });

  // GET /api/rooms - List all rooms
  fastify.get('/rooms', { preHandler: fastify.mustAuth }, async (request, reply) => {
      return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/api/rooms`, 'GET');
  });

  // GET /api/rooms/:roomId - Get room info
  fastify.get('/rooms/:roomId',{ preHandler: fastify.mustAuth }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    if (!roomId){
      // throw 400 Bad Request
      logger.info(`400 :Bad Request at '/rooms/:roomId' :Required request parameter is missing`)
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/api/rooms/${roomId}`, 'GET');
  })

  // POST /api/matchmaking/join - Quick match
  fastify.post('/matchmaking/join', { preHandler: fastify.mustAuth }, async (request, reply) => {
      return queueAwareProxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/api/matchmaking/join`, 'POST');
  });

  // GET /api/stats - Get server stats
  fastify.get('/stats', { preHandler: fastify.mustAuth }, async (request, reply) => {
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/api/stats`, 'GET');
  });

}

export default gameRoute