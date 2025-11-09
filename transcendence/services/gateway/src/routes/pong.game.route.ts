// route: /pong/game

import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import logger from '../utils/logger.js'; // log-service
import { queueAwareProxyRequest } from '../utils/queueAwareProxyHandler.js';
import { queueAwareIntermediateRequest } from '../utils/queueAwareIntermediateRequest.js';
import { intermediateRequest } from '../utils/intermediateRequest.js';
// import authPreHandlerPlugin from "../plugins/authPreHandler.plugin.js";

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';

interface GameParams {
  gameId: string;
}

const pongGameRoute: FastifyPluginAsync = async (fastify) => {

// Creates a game
  fastify.post('/', {  preHandler: fastify.verifyAuth }, async (request, reply) => {
    fastify.log.info("GAME START~~ >>> POST REQUEST ")
    fastify.log.info("Request headers: ");
    fastify.log.info(request.headers);

    const authHeader = request.headers['authorization'] || '';
    
    if (!authHeader.startsWith('Bearer')) {
      fastify.log.info("Missing or invalid token ");
      // return reply.code(401).send({ error: 'Missing or invalid token' });
    }
    else{
      fastify.log.info(`authHeader: ${authHeader}`);
    }

  //   const res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
  //   if (!res)
  //     throw fastify.httpErrors.badRequest('Database failed for storing cookie data');
  //   reply.setCookie('token', res.token, {
  //     httpOnly: true,
  //     secure: true,           // ✅ Only HTTPS for production
  //     sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
  //     path: '/',              // ✅ Valid across all routes
  //   })
  //   // return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
  //   reply.send(res);
  // });



    // const session = request.cookies;
    const user: any = request.user || null;
    // if (!session){
    if (!user){
      throw fastify.httpErrors.badRequest('Missing required parameter: no cookies');
      fastify.log.info("400: No session cookie");
    }
    else {
      fastify.log.info("Has user: ");
      fastify.log.info(user);
      var res = null;
      if (user.role && user.role === 'registered'){
        fastify.log.info("user already exists")
        // returning guest user or guest user
        const res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/verify`, 'POST');
        if (!res)
          throw fastify.httpErrors.badRequest('Database failed to authenticate user id');
      } else {
      // create guest user
        if (user.role && user.role === 'unregistred'){
          res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
          if (!res){
            throw fastify.httpErrors.badRequest('Database failed for storing cookie data');
          }
        } else {
          fastify.log.info("This is a registered user");
        }
      }
    }  

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
      logger.info(`[[Gateway]] Gateway received GET request for /pong/game/${gameId}`)
      fastify.log.info(`[[Gateway]] Gateway received GET request for /pong/game/${gameId}`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId :Required request parameter is missing`)
      // throw 400 Bad Request
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
      logger.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/join`)
      fastify.log.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/join`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/join :Required request parameter is missing`)
      // throw 400 Bad Request
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
      logger.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/move`)
      fastify.log.info(`[[Gateway]] Gateway received POST request for /pong/game/${gameId}/move`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/move :Required request parameter is missing`)
      // throw 400 Bad Request
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
      logger.info(`[[Gateway]] Gateway received PUT request for /pong/game/${gameId}/result`)
      fastify.log.info(`[[Gateway]] Gateway received PUT request for /pong/game/${gameId}/result`)
    } else {
      logger.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      fastify.log.info(`[[Gateway]] 400 :Bad Request at /pong/game/:gameId/result :Required request parameter is missing`)
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
    }
    return proxyRequest(fastify, request, reply, `${GAME_SERVICE_URL}/pong/game/${gameId}/result`, 'PUT');
  });

};

export default pongGameRoute