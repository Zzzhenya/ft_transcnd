// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';

import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

import type {  } from '@fastify/websocket'

import WebSocket from 'ws'

export function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    console.log(ws)
    ws.onopen = () =>
    {
      console.log('WebSocket Open')
      resolve(ws)
    }
    ws.onerror = (err) =>
    {
      console.error('Websocket error: ', err)
      reject(err)
    }
  })
}

export function forwardMessages (
  clientSocket: WebSocket, // why make it any type
  backendSocket: WebSocket
  ) {

  console.log('Setting up message forwarding...');
  // fastify.log.info('Client socket type:', typeof clientSocket);
  // fastify.log.info('Client socket keys:', Object.keys(clientSocket || {}));


  // Forward from client -> backend
  clientSocket.on('message', (msg) => {
    if (backendSocket.readyState === WebSocket.OPEN) {
      try {
        const parsed = JSON.parse(msg.toString()); // Ensure text
        backendSocket.send(JSON.stringify(parsed)); // Force stringified JSON
        // backendSocket.send(JSON.stringify(msg)); // Force stringified JSON
        // console.log(msg)
      } catch (err) {
        console.error('Invalid JSON from client:', err);
      }
    }
  })

  // Forward from backend -> client
  backendSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        // not necessary to parse but doing all the same
        const parsed = JSON.parse(msg.toString()); // Ensure text
        clientSocket.send(JSON.stringify(parsed)); // Force stringified JSON
        // clientSocket.send(JSON.stringify(msg)); // Force stringified JSON
        // console.log(msg)
        // console.log(msg)
        // clientSocket.send(msg)
      } catch (err) {
        console.error('Invalid JSON from game-service:', msg);
      }
    }
  })

  // Handle closures
  const closeBoth = () => {
    // if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close()
    // if (backendSocket.readyState === WebSocket.OPEN) backendSocket.close()
    console.log('Close both connections')
    
    try {
      if (clientSocket && typeof clientSocket.close === 'function') {
        if (clientSocket.readyState === WebSocket.OPEN){
          clientSocket.close();
        }
      }
    } catch (error) {
      console.error('❌ Error closing client socket:', error)
    }

    try {
      if (backendSocket && backendSocket.readyState === WebSocket.OPEN){
        backendSocket.close()
      }
    } catch (error) {
      console.error('❌ Error closing backend socket:', error)
    }

  }

  // if (clientSocket && typeof clientSocket.on === 'function') {
  //   clientSocket.on('close', closeBoth)
  //   console.log('Client disconnected the ws connection')
  // }

  // backendSocket.on('close', closeBoth)
  // console.log('Backend disconnected the ws connection')

  const pingInterval = setInterval(() => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.ping();
    }
    if (backendSocket.readyState === WebSocket.OPEN) {
      backendSocket.ping();
    }
  }, 30_000); // every 30s

  // ⛔️ Stop the interval when either side disconnects
  const clear = () => clearInterval(pingInterval);
  clientSocket.on('close', clear);
  backendSocket.on('close', clear);
}


interface GameParams {
  gameId: string;
}



const wsProxyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{Params: GameParams;}>('/pong/game-ws/:gameId', { websocket: true }, async (connection, req) => {
    const clientSocket = connection
    if (req.cookies)
    {
      const existingSessionId = req.cookies.sessionId;
      if (existingSessionId)
        fastify.log.info('✅' + existingSessionId)
    }

    fastify.log.info("Extract gameId")

    // Extract gameId from URL path since req.params may not work in WebSocket handlers
    let gameId = null;
    
    // Method 1: Try req.params first

    if (req.params)
    {
      var gameIdStr = req.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      // gameId = req.params.gameId;
      console.log('other: ', gameId)
    }
    // if (req.params && req.params.gameId) {
    //   gameId = req.params.gameId;
    //   console.log('GameId from req.params:', gameId);
    // }
    
    // Method 2: Extract from URL if params didn't work
    // if (!gameId && req.url) {
    //   const urlMatch = req.url.match(/\/pong\/game-ws\/(\d+)/);
    //   gameId = urlMatch ? urlMatch[1] : null;
    //   console.log('GameId from URL regex:', gameId);
    // }
    
    // Method 3: Try raw URL if available
    if (!gameId && req.raw && req.raw.url) {
      const rawUrlMatch = req.raw.url.match(/\/ws\/pong\/game-ws\/(\d+)/);
      gameId = rawUrlMatch ? rawUrlMatch[1] : null;
      console.log('GameId from raw URL:', gameId);
    }
    
    console.log('Final gameId:', gameId);
    
    if (!gameId) {
      console.error('GameId not found in request');
      console.log('Request details:', {
        url: req.url,
        rawUrl: req.raw?.url,
        params: req.params
      });
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close();
      }
      return;
    }
    console.log(gameId)
    // const backendUrl = 'ws://game-service:3002/ws/pong/game-ws'
    const backendUrl = `ws://game-service:3002/ws/pong/game-ws/${gameId}`;
    try {
      const backendSocket = await createBackendSocket(backendUrl)
      fastify.log.info('WebSocket proxy connected successfully');
      forwardMessages(clientSocket, backendSocket)
      fastify.log.info('Message forward setup successfully');
    } catch (err) {
      fastify.log.info('Failed to connect to backend:');
      if (clientSocket && typeof clientSocket.close === 'function'){
        clientSocket.close();
      }
    }
  });

// demo

  fastify.get('/pong/demo', async (request, reply) => {
    const existingSessionId = request.cookies.sessionId;
    if (existingSessionId)
      fastify.log.info('✅'+ existingSessionId)
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/ws/pong/demo', 'GET');
  });

  fastify.post('/pong/demo', async (request, reply) => {
    const existingSessionId = request.cookies.sessionId;
    if (existingSessionId)
      fastify.log.info('✅'+ existingSessionId)
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/ws/pong/demo', 'POST');
  });


  fastify.delete<{Params: GameParams;}>('/pong/demo/:gameId', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/demo/${gameId}`, 'DELETE');
  });


  fastify.delete('/pong/demo', async (request, reply) => {
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/ws/pong/demo', 'DELETE');
  });


  fastify.post<{Params: GameParams;}>('/pong/demo/:gameId/move', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/demo/${gameId}/move`, 'POST');
  });

// game

  fastify.post('/pong/game', async (request, reply) => {
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/ws/pong/game', 'POST');
  });

  fastify.get('/pong/game', async (request, reply) => {
    return proxyRequest(fastify, request, reply, 'http://game-service:3002/ws/pong/game', 'GET');
  });

  fastify.get<{Params: GameParams;}>('/pong/game/:gameId', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/game/${gameId}`, 'GET');
  });


  fastify.post<{Params: GameParams;}>('/pong/game/:gameId/join', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/game/${gameId}/join`, 'POST');
  });

  fastify.post<{Params: GameParams;}>('/pong/game/:gameId/move', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/game/${gameId}/move`, 'POST');
  });


  fastify.put<{Params: GameParams;}>('/pong/game/:gameId/result', async (request, reply) => {
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
      return gatewayError(
            reply,
            400,
            'Bad Request',
            "Required request parameter 'id' for method 'type:String' is not present");
    }
    return proxyRequest(fastify, request, reply, `http://game-service:3002/ws/pong/game/${gameId}/result`, 'PUT');
  });

}

export default wsProxyRoute


