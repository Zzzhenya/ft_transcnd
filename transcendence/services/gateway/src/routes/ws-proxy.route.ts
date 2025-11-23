// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import fp from 'fastify-plugin';

import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

import type {  } from '@fastify/websocket'

import WebSocket from 'ws'

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';
const GAME_SERVICE_WS_URL = GAME_SERVICE_URL.replace('http://', 'ws://');
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const USER_SERVICE_WS_URL = USER_SERVICE_URL.replace('http://', 'ws://');

export function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
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
  clientSocket: WebSocket,
  backendSocket: WebSocket
  ) {

  console.log('Setting up message forwarding...');


  // Forward from client -> backend
  clientSocket.on('message', (msg) => {
    if (backendSocket.readyState === WebSocket.OPEN) {
      try {
        const parsed = JSON.parse(msg.toString()); // Ensure text
        backendSocket.send(JSON.stringify(parsed)); // Force stringified JSON
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

  fastify.log.info('🔔 Registering WebSocket proxy routes...');
  

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
      // throw 400 Bad Request
      throw fastify.httpErrors.badRequest('Missing required parameter: id');
      return;
    }
    console.log(gameId)
    // const backendUrl = 'ws://game-service:3002/ws/pong/game-ws'
    const backendUrl =`${GAME_SERVICE_WS_URL}/ws/pong/game-ws/${gameId}`;
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

}

export default wsProxyRoute


